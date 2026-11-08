import { describe, expect, it } from 'vitest';
import {
  addActivity,
  duplicateActivityToRow,
  moveActivityToRow,
  removeActivity,
  replaceActivity,
  setActivityTimes,
  upsertActivity,
} from '../planOperations';
import { DayPlan } from '../types';

function makePlan(): DayPlan {
  return {
    id: 'plan-1',
    name: 'Día',
    activities: {
      'row-carlos': [
        { id: 'a1', title: 'Trabajo', startMinutes: 480, endMinutes: 1020, color: 'cyan' },
      ],
      'row-leo': [
        { id: 'a2', title: 'Natación', startMinutes: 1050, endMinutes: 1140, color: 'cyan' },
      ],
    },
  };
}

const acts = (plan: DayPlan, memberId: string) => plan.activities[memberId] ?? [];

describe('replaceActivity', () => {
  it('aplica los cambios del editor en su propia línea', () => {
    const plan = replaceActivity(makePlan(), 'row-leo', {
      id: 'a2',
      title: 'Natación (nuevo horario)',
      startMinutes: 1110,
      endMinutes: 1200,
      color: 'magenta',
    });
    const updated = acts(plan, 'row-leo')[0];

    expect(updated.title).toBe('Natación (nuevo horario)');
    expect(updated.startMinutes).toBe(1110);
    expect(acts(plan, 'row-carlos')).toHaveLength(1);
  });

  it('ignora actividades que no existen (no inventa entradas)', () => {
    const original = makePlan();
    expect(replaceActivity(original, 'row-leo', { ...acts(original, 'row-leo')[0], id: 'fantasma' })).toBe(
      original
    );
  });
});

describe('setActivityTimes / removeActivity', () => {
  it('cambia las horas de una actividad', () => {
    const plan = setActivityTimes(makePlan(), 'row-carlos', 'a1', 540, 1080);
    expect(acts(plan, 'row-carlos')[0]).toMatchObject({ startMinutes: 540, endMinutes: 1080 });
  });

  it('no crea un estado nuevo si las horas no cambian o la actividad no existe', () => {
    const original = makePlan();
    expect(setActivityTimes(original, 'row-carlos', 'a1', 480, 1020)).toBe(original);
    expect(setActivityTimes(original, 'row-carlos', 'fantasma', 0, 60)).toBe(original);
  });

  it('elimina una actividad', () => {
    const plan = removeActivity(makePlan(), 'row-leo', 'a2');
    expect(acts(plan, 'row-leo')).toHaveLength(0);
    expect(removeActivity(plan, 'row-leo', 'a2')).toBe(plan);
  });
});

describe('moveActivityToRow', () => {
  it('mueve la actividad conservando su duración', () => {
    const plan = moveActivityToRow(makePlan(), 'row-carlos', 'a1', 'row-leo');

    expect(acts(plan, 'row-carlos')).toHaveLength(0);
    expect(acts(plan, 'row-leo')).toHaveLength(2);
    const moved = acts(plan, 'row-leo').find((a) => a.id === 'a1')!;
    expect(moved.startMinutes).toBe(480);
    expect(moved.endMinutes).toBe(1020);
  });

  it('permite mover a una persona que aún no tiene actividades ese día', () => {
    const plan = moveActivityToRow(makePlan(), 'row-leo', 'a2', 'row-pilar');
    expect(acts(plan, 'row-pilar').map((a) => a.id)).toEqual(['a2']);
  });

  it('permite mover y cambiar de hora a la vez', () => {
    const plan = moveActivityToRow(makePlan(), 'row-leo', 'a2', 'row-carlos', 600);
    const moved = acts(plan, 'row-carlos').find((a) => a.id === 'a2')!;

    expect(moved.startMinutes).toBe(600);
    expect(moved.endMinutes).toBe(690); // conserva 90 min
  });

  it('no deja que la actividad se salga del día', () => {
    const plan = moveActivityToRow(makePlan(), 'row-leo', 'a2', 'row-carlos', 1430);
    const moved = acts(plan, 'row-carlos').find((a) => a.id === 'a2')!;

    expect(moved.endMinutes).toBe(1440);
    expect(moved.startMinutes).toBe(1350);
  });

  it('no hace nada si el destino es la misma línea', () => {
    const original = makePlan();
    expect(moveActivityToRow(original, 'row-carlos', 'a1', 'row-carlos')).toBe(original);
  });

  it('no hace nada si la actividad o el origen no existen', () => {
    const original = makePlan();
    expect(moveActivityToRow(original, 'row-carlos', 'fantasma', 'row-leo')).toBe(original);
    expect(moveActivityToRow(original, 'row-fantasma', 'a1', 'row-leo')).toBe(original);
  });

  it('no muta el plan original', () => {
    const original = makePlan();
    moveActivityToRow(original, 'row-carlos', 'a1', 'row-leo');

    expect(acts(original, 'row-carlos')).toHaveLength(1);
    expect(acts(original, 'row-leo')).toHaveLength(1);
  });
});

describe('duplicateActivityToRow', () => {
  it('copia la actividad en otra persona con un id nuevo', () => {
    const plan = duplicateActivityToRow(makePlan(), 'row-leo', 'a2', 'row-carlos');
    const carlosActivities = acts(plan, 'row-carlos');

    expect(carlosActivities).toHaveLength(2);
    const copy = carlosActivities.find((a) => a.title === 'Natación')!;
    expect(copy.id).not.toBe('a2');
    expect(copy.startMinutes).toBe(1050);
    // el original sigue donde estaba
    expect(acts(plan, 'row-leo')).toHaveLength(1);
  });

  it('permite duplicar dentro de la misma línea (duplicar actividad)', () => {
    const plan = duplicateActivityToRow(makePlan(), 'row-leo', 'a2', 'row-leo');
    const activities = acts(plan, 'row-leo');

    expect(activities).toHaveLength(2);
    expect(new Set(activities.map((a) => a.id)).size).toBe(2);
  });

  it('aplica los cambios del editor antes de copiar', () => {
    const plan = duplicateActivityToRow(makePlan(), 'row-leo', 'a2', 'row-carlos', {
      title: 'Natación (con Leo)',
      startMinutes: 1080,
      endMinutes: 1170,
    });
    const copy = acts(plan, 'row-carlos').find((a) => a.title === 'Natación (con Leo)')!;

    expect(copy.startMinutes).toBe(1080);
    // el original no se modifica
    expect(acts(plan, 'row-leo')[0].title).toBe('Natación');
  });

  it('no hace nada si la actividad no existe', () => {
    const original = makePlan();
    expect(duplicateActivityToRow(original, 'row-leo', 'fantasma', 'row-carlos')).toBe(original);
  });
});

describe('addActivity / upsertActivity', () => {
  const nueva = { id: 'nueva', title: 'Cena', startMinutes: 1260, endMinutes: 1320, color: 'yellow' as const };

  it('añade la actividad a su persona', () => {
    const plan = addActivity(makePlan(), 'row-leo', nueva);
    expect(acts(plan, 'row-leo').map((a) => a.id)).toEqual(['a2', 'nueva']);
  });

  it('no duplica si ya existe', () => {
    const original = makePlan();
    expect(addActivity(original, 'row-leo', { ...nueva, id: 'a2' })).toBe(original);
  });

  it('upsert añade si es nueva y reemplaza si ya existía', () => {
    const added = upsertActivity(makePlan(), 'row-carlos', nueva);
    expect(acts(added, 'row-carlos')).toHaveLength(2);

    const replaced = upsertActivity(added, 'row-carlos', { ...nueva, title: 'Cena familiar' });
    expect(acts(replaced, 'row-carlos')).toHaveLength(2);
    expect(acts(replaced, 'row-carlos')[1].title).toBe('Cena familiar');
  });
});
