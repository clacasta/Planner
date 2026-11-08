import { describe, expect, it } from 'vitest';
import { normalizeStorageWithIssues, parseImportPayload } from '../validate';
import { SCHEMA_VERSION } from '../schema';

const activity = (id: string, start = 480) => ({
  id,
  title: id,
  startMinutes: start,
  endMinutes: start + 60,
  color: 'blue',
});

/** Datos tal y como los guardaba la v1: cada día con sus propias líneas. */
const V1_DATA = {
  schemaVersion: 1,
  activePlanId: 'martes',
  plans: [
    {
      id: 'lunes',
      name: 'Lunes',
      rows: [
        { id: 'r-carlos', name: 'Carlos', color: 'blue', visible: true, activities: [activity('a1')] },
        { id: 'r-leo', name: 'Leo', color: 'green', visible: true, activities: [] },
      ],
    },
    {
      // Creado con «Nuevo día» (ids distintos) y con Leo oculto y primero.
      id: 'martes',
      name: 'Martes',
      rows: [
        { id: 'x-leo', name: 'Leo', color: 'green', visible: false, activities: [activity('a2')] },
        { id: 'x-carlos', name: 'Carlos', color: 'blue', visible: true, activities: [] },
      ],
    },
  ],
};

describe('migración de datos v1 a v2', () => {
  it('une las personas de todos los días en una sola familia', () => {
    const result = normalizeStorageWithIssues(V1_DATA)!.value;

    expect(result.schemaVersion).toBe(SCHEMA_VERSION);
    expect(result.members.map((m) => m.name)).toEqual(['Leo', 'Carlos']);
    // el orden y la visibilidad salen del día activo (martes)
    expect(result.members[0].visible).toBe(false);
    // los días mantienen su orden y sus actividades, ahora por persona
    expect(result.plans.map((p) => p.id)).toEqual(['lunes', 'martes']);
    const leo = result.members[0].id;
    const carlos = result.members[1].id;
    expect(result.plans[0].activities[carlos].map((a) => a.id)).toEqual(['a1']);
    expect(result.plans[1].activities[leo].map((a) => a.id)).toEqual(['a2']);
  });

  it('una copia de seguridad v1 se importa ya en v2', () => {
    const payload = parseImportPayload(JSON.stringify(V1_DATA));
    expect(payload.kind).toBe('backup');
    if (payload.kind !== 'backup') return;
    expect(payload.data.members).toHaveLength(2);
  });
});

describe('datos v2', () => {
  const V2_DATA = {
    schemaVersion: 2,
    activePlanId: 'lunes',
    members: [
      { id: 'm1', name: 'Carlos', color: 'blue', visible: true },
      { id: 'm2', name: 'Leo', color: 'nope', visible: false },
    ],
    plans: [
      { id: 'lunes', name: 'Lunes', activities: { m1: [activity('a1')], fantasma: [activity('a9')] } },
    ],
  };

  it('se cargan tal cual, corrigiendo lo inválido y avisando', () => {
    const result = normalizeStorageWithIssues(V2_DATA)!;

    expect(result.value.members).toEqual([
      { id: 'm1', name: 'Carlos', color: 'blue', visible: true },
      { id: 'm2', name: 'Leo', color: 'blue', visible: false },
    ]);
    expect(result.value.plans[0].activities).toEqual({ m1: [expect.objectContaining({ id: 'a1' })] });
    expect(result.issues.some((i) => i.includes('personas que no existen'))).toBe(true);
    expect(result.issues.some((i) => i.includes('color no válido'))).toBe(true);
  });

  it('es estable: normalizar dos veces da el mismo resultado', () => {
    const once = normalizeStorageWithIssues(V2_DATA)!.value;
    const twice = normalizeStorageWithIssues(JSON.parse(JSON.stringify(once)))!.value;
    expect(twice).toEqual(once);
  });

  it('descarta días sin actividades por persona', () => {
    expect(
      normalizeStorageWithIssues({ members: [], plans: [{ id: 'x', name: 'x', rows: [] }] })
    ).toBeNull();
  });
});
