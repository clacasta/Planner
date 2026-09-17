import { describe, expect, it } from 'vitest';
import { migrateStorageData } from '../migrations';
import { normalizedToStorageData } from '../normalizeStorage';
import { SCHEMA_VERSION } from '../schema';

const PLAN = {
  id: 'plan-1',
  name: 'Lunes',
  rows: [
    {
      id: 'row-1',
      name: 'Carlos',
      color: 'blue',
      visible: true,
      activities: [{ id: 'a1', title: 'Trabajo', startMinutes: 480, endMinutes: 1020, color: 'cyan' }],
    },
  ],
};

describe('normalizedToStorageData', () => {
  it('devuelve null si no hay lista de planes', () => {
    expect(normalizedToStorageData(null)).toBeNull();
    expect(normalizedToStorageData({ activePlanId: 'x' })).toBeNull();
    expect(normalizedToStorageData('texto')).toBeNull();
  });

  it('devuelve null si ningún plan es aprovechable', () => {
    expect(normalizedToStorageData({ plans: [1, null, {}] })).toBeNull();
  });

  it('reconstruye datos válidos y respeta el día activo', () => {
    const result = normalizedToStorageData({ activePlanId: 'plan-1', plans: [PLAN] });
    expect(result?.plans).toHaveLength(1);
    expect(result?.activePlanId).toBe('plan-1');
  });

  it('usa el primer día si el activo no existe', () => {
    const result = normalizedToStorageData({ activePlanId: 'no-existe', plans: [PLAN] });
    expect(result?.activePlanId).toBe('plan-1');
  });

  it('renumera planes con id duplicado', () => {
    const result = normalizedToStorageData({ plans: [PLAN, { ...PLAN, name: 'Copia' }] });
    const ids = result?.plans.map((p) => p.id) ?? [];
    expect(new Set(ids).size).toBe(2);
  });

  it('recupera datos de una versión antigua sin schemaVersion', () => {
    const result = normalizedToStorageData({ plans: [PLAN] });
    expect(result?.schemaVersion).toBe(SCHEMA_VERSION);
  });
});

describe('migrateStorageData', () => {
  it('normaliza y fija la versión actual', () => {
    const result = migrateStorageData({ schemaVersion: 1, activePlanId: 'plan-1', plans: [PLAN] });
    expect(result?.schemaVersion).toBe(SCHEMA_VERSION);
    expect(result?.plans[0].rows[0].activities[0].title).toBe('Trabajo');
  });

  it('rechaza contenidos irrecuperables para que se conserven aparte', () => {
    expect(migrateStorageData({})).toBeNull();
    expect(migrateStorageData({ plans: 'no soy una lista' })).toBeNull();
  });
});
