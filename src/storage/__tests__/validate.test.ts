import { describe, expect, it } from 'vitest';
import { normalizeActivity, normalizePlan, normalizeRow, parseImportPayload } from '../validate';
import { SCHEMA_VERSION } from '../schema';

const VALID_PLAN = {
  id: 'plan-1',
  name: 'Sábado',
  date: '2026-09-19',
  rows: [
    {
      id: 'row-1',
      name: 'Leo',
      color: 'green',
      visible: true,
      activities: [
        { id: 'act-1', title: 'Colegio', startMinutes: 540, endMinutes: 1020, color: 'yellow' },
      ],
    },
  ],
};

describe('normalizeActivity', () => {
  it('acepta una actividad válida', () => {
    const result = normalizeActivity({ id: 'a', title: 'Gimnasio', startMinutes: 1080, endMinutes: 1170, color: 'green' });
    expect(result?.value.title).toBe('Gimnasio');
    expect(result?.issues).toEqual([]);
  });

  it('descarta actividades sin horas utilizables', () => {
    expect(normalizeActivity({ title: 'x', color: 'blue' })).toBeNull();
    expect(normalizeActivity({ title: 'x', startMinutes: 600, endMinutes: 600, color: 'blue' })).toBeNull();
    expect(normalizeActivity({ title: 'x', startMinutes: 600, endMinutes: 610, color: 'blue' })).toBeNull();
  });

  it('recorta horas fuera del día y lo avisa', () => {
    const result = normalizeActivity({ title: 'x', startMinutes: -30, endMinutes: 5000, color: 'blue' });
    expect(result?.value.startMinutes).toBe(0);
    expect(result?.value.endMinutes).toBe(1440);
    expect(result?.issues.length).toBeGreaterThan(0);
  });

  it('corrige color desconocido y título vacío en lugar de romper', () => {
    const result = normalizeActivity({ title: '   ', startMinutes: 60, endMinutes: 120, color: 'fucsia' });
    expect(result?.value.title).toBe('Sin título');
    expect(result?.value.color).toBe('blue');
    expect(result?.issues).toHaveLength(2);
  });

  it('genera id cuando falta', () => {
    const result = normalizeActivity({ title: 'x', startMinutes: 0, endMinutes: 60, color: 'red' });
    expect(result?.value.id).toMatch(/^act-/);
  });
});

describe('normalizeRow', () => {
  it('descarta actividades inválidas y avisa', () => {
    const result = normalizeRow({
      id: 'r',
      name: 'Carlos',
      color: 'blue',
      visible: true,
      activities: [{ title: 'ok', startMinutes: 0, endMinutes: 60, color: 'blue' }, { foo: 'bar' }],
    });

    expect(result?.value.activities).toHaveLength(1);
    expect(result?.issues.some((i) => i.includes('descartado'))).toBe(true);
  });

  it('trata actividades ausentes como lista vacía', () => {
    const result = normalizeRow({ id: 'r', name: 'Pilar', color: 'purple', visible: true });
    expect(result?.value.activities).toEqual([]);
  });

  it('rechaza líneas que no son líneas (objetos vacíos)', () => {
    expect(normalizeRow({})).toBeNull();
    expect(normalizeRow({ foo: 'bar' })).toBeNull();
  });

  it('rechaza cualquier cosa que no sea un objeto', () => {
    expect(normalizeRow(null)).toBeNull();
    expect(normalizeRow('Carlos')).toBeNull();
  });
});

describe('normalizePlan', () => {
  it('normaliza un plan correcto', () => {
    const result = normalizePlan(VALID_PLAN);
    expect(result?.value.name).toBe('Sábado');
    expect(result?.value.rows).toHaveLength(1);
  });

  it('rechaza planes sin lista de líneas (el caso que rompía el render)', () => {
    expect(normalizePlan({ id: 'p', name: 'Roto', rows: [{}] })?.value.rows).toEqual([]);
    expect(normalizePlan({ id: 'p', name: 'Roto' })).toBeNull();
    expect(normalizePlan('texto')).toBeNull();
  });

  it('descarta fechas con formato inválido', () => {
    const result = normalizePlan({ ...VALID_PLAN, date: '19/09/2026' });
    expect(result?.value.date).toBeUndefined();
    expect(result?.issues.some((i) => i.includes('fecha'))).toBe(true);
  });

  it('renumera líneas con id duplicado', () => {
    const result = normalizePlan({
      ...VALID_PLAN,
      rows: [VALID_PLAN.rows[0], { ...VALID_PLAN.rows[0], name: 'Copia' }],
    });
    const ids = result?.value.rows.map((r) => r.id);
    expect(new Set(ids).size).toBe(2);
  });
});

describe('parseImportPayload', () => {
  it('lanza error legible con un JSON inválido', () => {
    expect(() => parseImportPayload('{no soy json')).toThrowError('El archivo no es un JSON válido.');
  });

  it('lanza error si el JSON no es un plan ni una copia', () => {
    expect(() => parseImportPayload('{"hola":1}')).toThrowError(/formato de planificación/);
  });

  it('reconoce una copia de seguridad y normaliza sus días', () => {
    const payload = parseImportPayload(
      JSON.stringify({ schemaVersion: 1, activePlanId: 'plan-1', plans: [VALID_PLAN] })
    );

    expect(payload.kind).toBe('backup');
    if (payload.kind !== 'backup') return;
    expect(payload.data.plans).toHaveLength(1);
    expect(payload.data.schemaVersion).toBe(SCHEMA_VERSION);
  });

  it('cae al primer día si el activePlanId de la copia no existe', () => {
    const payload = parseImportPayload(JSON.stringify({ activePlanId: 'fantasma', plans: [VALID_PLAN] }));
    expect(payload.kind).toBe('backup');
    if (payload.kind !== 'backup') return;
    expect(payload.data.activePlanId).toBe('plan-1');
  });

  it('rechaza copias de seguridad sin días válidos', () => {
    expect(() => parseImportPayload('{"plans":[]}')).toThrowError(/no contiene ninguna planificación/);
    expect(() => parseImportPayload('{"plans":[1,2,3]}')).toThrowError(/no contiene ninguna planificación/);
  });

  it('reconoce un día suelto y recoge los avisos', () => {
    const payload = parseImportPayload(
      JSON.stringify({ ...VALID_PLAN, rows: [{ id: 'r', name: 'X', color: 'nope', activities: [] }] })
    );

    expect(payload.kind).toBe('plan');
    if (payload.kind !== 'plan') return;
    expect(payload.plan.rows[0].color).toBe('blue');
    expect(payload.issues.length).toBeGreaterThan(0);
  });

  it('no rompe con valores nulos o arrays sueltos', () => {
    expect(() => parseImportPayload('null')).toThrowError(/formato de planificación/);
    expect(() => parseImportPayload('[]')).toThrowError(/formato de planificación/);
    expect(() => parseImportPayload('"hola"')).toThrowError(/formato de planificación/);
  });
});
