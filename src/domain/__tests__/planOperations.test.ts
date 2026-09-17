import { describe, expect, it } from 'vitest';
import {
  duplicateActivityToRow,
  moveActivityToRow,
  replaceActivity,
} from '../planOperations';
import { DayPlan } from '../types';

function makePlan(): DayPlan {
  return {
    id: 'plan-1',
    name: 'Día',
    rows: [
      {
        id: 'row-carlos',
        name: 'Carlos',
        color: 'blue',
        visible: true,
        activities: [
          { id: 'a1', title: 'Trabajo', startMinutes: 480, endMinutes: 1020, color: 'cyan' },
        ],
      },
      {
        id: 'row-leo',
        name: 'Leo',
        color: 'green',
        visible: true,
        activities: [
          { id: 'a2', title: 'Natación', startMinutes: 1050, endMinutes: 1140, color: 'cyan' },
        ],
      },
    ],
  };
}

const row = (plan: DayPlan, id: string) => plan.rows.find((r) => r.id === id)!;

describe('replaceActivity', () => {
  it('aplica los cambios del editor en su propia línea', () => {
    const plan = replaceActivity(makePlan(), 'row-leo', {
      id: 'a2',
      title: 'Natación (nuevo horario)',
      startMinutes: 1110,
      endMinutes: 1200,
      color: 'magenta',
    });
    const updated = row(plan, 'row-leo').activities[0];

    expect(updated.title).toBe('Natación (nuevo horario)');
    expect(updated.startMinutes).toBe(1110);
    expect(plan.rows).toHaveLength(2);
  });

  it('ignora actividades que no existen (no inventa entradas)', () => {
    const original = makePlan();
    expect(replaceActivity(original, 'row-leo', { ...original.rows[1].activities[0], id: 'fantasma' })).toBe(
      original
    );
  });
});

describe('moveActivityToRow', () => {
  it('mueve la actividad conservando su duración', () => {
    const plan = moveActivityToRow(makePlan(), 'row-carlos', 'a1', 'row-leo');

    expect(row(plan, 'row-carlos').activities).toHaveLength(0);
    expect(row(plan, 'row-leo').activities).toHaveLength(2);
    const moved = row(plan, 'row-leo').activities.find((a) => a.id === 'a1')!;
    expect(moved.startMinutes).toBe(480);
    expect(moved.endMinutes).toBe(1020);
  });

  it('permite mover y cambiar de hora a la vez', () => {
    const plan = moveActivityToRow(makePlan(), 'row-leo', 'a2', 'row-carlos', 600);
    const moved = row(plan, 'row-carlos').activities.find((a) => a.id === 'a2')!;

    expect(moved.startMinutes).toBe(600);
    expect(moved.endMinutes).toBe(690); // conserva 90 min
  });

  it('no deja que la actividad se salga del día', () => {
    const plan = moveActivityToRow(makePlan(), 'row-leo', 'a2', 'row-carlos', 1430);
    const moved = row(plan, 'row-carlos').activities.find((a) => a.id === 'a2')!;

    expect(moved.endMinutes).toBe(1440);
    expect(moved.startMinutes).toBe(1350);
  });

  it('no hace nada si el destino es la misma línea', () => {
    const original = makePlan();
    expect(moveActivityToRow(original, 'row-carlos', 'a1', 'row-carlos')).toBe(original);
  });

  it('no hace nada si la actividad o la línea no existen', () => {
    const original = makePlan();
    expect(moveActivityToRow(original, 'row-carlos', 'fantasma', 'row-leo')).toBe(original);
    expect(moveActivityToRow(original, 'row-carlos', 'a1', 'row-fantasma')).toBe(original);
    expect(moveActivityToRow(original, 'row-fantasma', 'a1', 'row-leo')).toBe(original);
  });

  it('no muta el plan original', () => {
    const original = makePlan();
    moveActivityToRow(original, 'row-carlos', 'a1', 'row-leo');

    expect(row(original, 'row-carlos').activities).toHaveLength(1);
    expect(row(original, 'row-leo').activities).toHaveLength(1);
  });
});

describe('duplicateActivityToRow', () => {
  it('copia la actividad en otra persona con un id nuevo', () => {
    const plan = duplicateActivityToRow(makePlan(), 'row-leo', 'a2', 'row-carlos');
    const carlosActivities = row(plan, 'row-carlos').activities;

    expect(carlosActivities).toHaveLength(2);
    const copy = carlosActivities.find((a) => a.title === 'Natación')!;
    expect(copy.id).not.toBe('a2');
    expect(copy.startMinutes).toBe(1050);
    // el original sigue donde estaba
    expect(row(plan, 'row-leo').activities).toHaveLength(1);
  });

  it('permite duplicar dentro de la misma línea (duplicar actividad)', () => {
    const plan = duplicateActivityToRow(makePlan(), 'row-leo', 'a2', 'row-leo');
    const activities = row(plan, 'row-leo').activities;

    expect(activities).toHaveLength(2);
    expect(new Set(activities.map((a) => a.id)).size).toBe(2);
  });

  it('aplica los cambios del editor antes de copiar', () => {
    const plan = duplicateActivityToRow(makePlan(), 'row-leo', 'a2', 'row-carlos', {
      title: 'Natación (con Leo)',
      startMinutes: 1080,
      endMinutes: 1170,
    });
    const copy = row(plan, 'row-carlos').activities.find((a) => a.title === 'Natación (con Leo)')!;

    expect(copy.startMinutes).toBe(1080);
    // el original no se modifica
    expect(row(plan, 'row-leo').activities[0].title).toBe('Natación');
  });

  it('no hace nada si la actividad no existe', () => {
    const original = makePlan();
    expect(duplicateActivityToRow(original, 'row-leo', 'fantasma', 'row-carlos')).toBe(original);
  });
});