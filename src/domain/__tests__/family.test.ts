import { describe, expect, it } from 'vitest';
import {
  addMember,
  countMemberActivities,
  mergeViewsIntoFamily,
  moveMember,
  planToView,
  removeMember,
  updateMember,
  FamilyState,
} from '../family';
import { DayView, Member } from '../types';

const act = (id: string, start = 480) => ({
  id,
  title: id,
  startMinutes: start,
  endMinutes: start + 60,
  color: 'blue' as const,
});

const view = (id: string, rows: DayView['rows']): DayView => ({ id, name: id, rows });

function makeState(): FamilyState {
  return {
    members: [
      { id: 'm-carlos', name: 'Carlos', color: 'blue', visible: true },
      { id: 'm-leo', name: 'Leo', color: 'green', visible: true },
    ],
    plans: [
      { id: 'lunes', name: 'Lunes', activities: { 'm-carlos': [act('a1')], 'm-leo': [act('a2')] } },
      { id: 'martes', name: 'Martes', activities: { 'm-leo': [act('a3'), act('a4', 600)] } },
    ],
  };
}

describe('mergeViewsIntoFamily (migración de días con líneas)', () => {
  it('une las líneas de varios días en una sola familia, por id y por nombre', () => {
    const { members, plans } = mergeViewsIntoFamily([
      view('lunes', [
        { id: 'r1', name: 'Carlos', color: 'blue', visible: true, activities: [act('a1')] },
        { id: 'r2', name: 'Leo', color: 'green', visible: false, activities: [] },
      ]),
      // copia del día: mismos ids
      view('martes', [
        { id: 'r1', name: 'Carlos', color: 'blue', visible: true, activities: [act('a2')] },
      ]),
      // día creado aparte: ids distintos, mismo nombre (sin distinguir mayúsculas)
      view('miercoles', [
        { id: 'x9', name: 'leo ', color: 'red', visible: true, activities: [act('a3')] },
        { id: 'x10', name: 'Ana', color: 'cyan', visible: true, activities: [] },
      ]),
    ]);

    expect(members.map((m) => m.name)).toEqual(['Carlos', 'Leo', 'Ana']);
    // los datos del miembro los fija la primera aparición
    expect(members[1]).toMatchObject({ id: 'r2', color: 'green', visible: false });
    expect(plans[1].activities.r1.map((a) => a.id)).toEqual(['a2']);
    expect(plans[2].activities.r2.map((a) => a.id)).toEqual(['a3']);
  });

  it('dos líneas con el mismo nombre en el mismo día siguen siendo dos personas', () => {
    const { members } = mergeViewsIntoFamily([
      view('d', [
        { id: 'r1', name: 'Leo', color: 'green', visible: true, activities: [] },
        { id: 'r2', name: 'Leo', color: 'red', visible: true, activities: [] },
      ]),
    ]);
    expect(members).toHaveLength(2);
  });

  it('asocia un día importado a la familia existente', () => {
    const existing: Member[] = [{ id: 'm-leo', name: 'Leo', color: 'green', visible: true }];
    const { members, plans } = mergeViewsIntoFamily(
      [view('nuevo', [{ id: 'otra', name: 'LEO', color: 'red', visible: true, activities: [act('a1')] }])],
      existing
    );
    expect(members).toHaveLength(1);
    expect(plans[0].activities['m-leo']).toHaveLength(1);
  });

  it('no reutiliza un id que ya pertenece a otra persona', () => {
    const existing: Member[] = [{ id: 'r1', name: 'Carlos', color: 'blue', visible: true }];
    const { members } = mergeViewsIntoFamily(
      [
        view('d', [
          { id: 'r1', name: 'Carlos', color: 'blue', visible: true, activities: [] },
          { id: 'r1', name: 'Pilar', color: 'purple', visible: true, activities: [] },
        ]),
      ],
      existing
    );
    expect(members.map((m) => m.name)).toEqual(['Carlos', 'Pilar']);
    expect(new Set(members.map((m) => m.id)).size).toBe(2);
  });
});

describe('planToView', () => {
  it('pinta la familia en su orden con las actividades del día (vacías si no tiene)', () => {
    const state = makeState();
    const lunes = planToView(state.members, state.plans[0]);
    const martes = planToView(state.members, state.plans[1]);

    expect(lunes.rows.map((r) => [r.name, r.activities.length])).toEqual([
      ['Carlos', 1],
      ['Leo', 1],
    ]);
    expect(martes.rows.map((r) => r.activities.length)).toEqual([0, 2]);
  });
});

describe('operaciones sobre personas', () => {
  it('renombrar y cambiar el color afecta a todos los días a la vez', () => {
    const state = updateMember(makeState(), 'm-leo', { name: 'Leonardo', color: 'red' });
    expect(planToView(state.members, state.plans[1]).rows[1]).toMatchObject({
      name: 'Leonardo',
      color: 'red',
    });
  });

  it('no crea un estado nuevo si no cambia nada', () => {
    const state = makeState();
    expect(updateMember(state, 'm-leo', { name: 'Leo' })).toBe(state);
    expect(updateMember(state, 'fantasma', { name: 'X' })).toBe(state);
    expect(moveMember(state, 'm-carlos', 'up')).toBe(state);
    expect(addMember(state, state.members[0])).toBe(state);
  });

  it('reordena personas', () => {
    const state = moveMember(makeState(), 'm-carlos', 'down');
    expect(state.members.map((m) => m.id)).toEqual(['m-leo', 'm-carlos']);
  });

  it('eliminar a una persona borra sus actividades en todos los días', () => {
    const original = makeState();
    expect(countMemberActivities(original, 'm-leo')).toBe(3);

    const state = removeMember(original, 'm-leo');
    expect(state.members.map((m) => m.id)).toEqual(['m-carlos']);
    expect(state.plans.every((p) => !('m-leo' in p.activities))).toBe(true);
    expect(state.plans[0].activities['m-carlos']).toHaveLength(1);
    // sin mutar el original
    expect(countMemberActivities(original, 'm-leo')).toBe(3);
  });
});
