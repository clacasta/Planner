import { describe, expect, it } from 'vitest';
import { calculateLayoutActivities } from '../collisions';
import { Activity } from '../types';

function activity(id: string, startMinutes: number, endMinutes: number): Activity {
  return { id, title: id, startMinutes, endMinutes, color: 'blue' };
}

describe('calculateLayoutActivities', () => {
  it('devuelve un carril mínimo cuando no hay actividades', () => {
    expect(calculateLayoutActivities([])).toEqual({ layoutActivities: [], maxLanes: 1 });
  });

  it('asigna un solo carril a actividades que no se solapan', () => {
    const { layoutActivities, maxLanes } = calculateLayoutActivities([
      activity('a', 0, 60),
      activity('b', 60, 120),
      activity('c', 300, 360),
    ]);

    expect(maxLanes).toBe(1);
    expect(layoutActivities.map((a) => a.laneIndex)).toEqual([0, 0, 0]);
  });

  it('apila en carriles distintos las actividades solapadas', () => {
    const { layoutActivities, maxLanes } = calculateLayoutActivities([
      activity('a', 540, 600),
      activity('b', 570, 630),
      activity('c', 585, 615),
    ]);

    expect(maxLanes).toBe(3);
    expect(new Set(layoutActivities.map((a) => a.laneIndex)).size).toBe(3);
  });

  it('reutiliza el carril que se ha quedado libre', () => {
    const { layoutActivities, maxLanes } = calculateLayoutActivities([
      activity('a', 0, 60),
      activity('b', 30, 90),
      activity('c', 60, 120), // puede ir en el carril de 'a'
    ]);

    expect(maxLanes).toBe(2);
    const laneOf = (id: string) => layoutActivities.find((a) => a.id === id)?.laneIndex;
    expect(laneOf('c')).toBe(laneOf('a'));
  });

  it('ordena por hora de inicio y no muta la lista original', () => {
    const input = [activity('tarde', 900, 960), activity('mañana', 60, 120)];
    const { layoutActivities } = calculateLayoutActivities(input);

    expect(layoutActivities[0].id).toBe('mañana');
    expect(input[0].id).toBe('tarde');
  });

  it('soporta actividades que empiezan y terminan en el mismo punto que otra', () => {
    const { maxLanes } = calculateLayoutActivities([
      activity('a', 0, 1440),
      activity('b', 0, 1440),
    ]);

    expect(maxLanes).toBe(2);
  });

  it('expone totalLanes coherente con maxLanes', () => {
    const { layoutActivities, maxLanes } = calculateLayoutActivities([
      activity('a', 540, 600),
      activity('b', 560, 620),
    ]);

    expect(layoutActivities.every((a) => a.totalLanes === maxLanes)).toBe(true);
  });
});
