import { Activity, DayPlan, DayView, FlexokiColorKey, Member, TimelineRow } from './types';
import { createId } from './id';

/**
 * La familia es común a todos los días: cada día solo guarda actividades por id
 * de miembro. Aquí viven las conversiones entre ese modelo y las «vistas» con
 * líneas (lo que pintan los componentes y el formato de los .json de un día) y
 * las operaciones sobre personas.
 */

/** Estado mínimo sobre el que operan las funciones de familia. */
export interface FamilyState {
  members: Member[];
  plans: DayPlan[];
}

/** Colores que se asignan por turnos a las personas nuevas. */
export const MEMBER_COLOR_CYCLE: FlexokiColorKey[] = [
  'blue',
  'purple',
  'green',
  'orange',
  'cyan',
  'red',
  'magenta',
  'yellow',
];

export function nextMemberColor(members: Member[]): FlexokiColorKey {
  return MEMBER_COLOR_CYCLE[members.length % MEMBER_COLOR_CYCLE.length];
}

export function activitiesOf(plan: DayPlan, memberId: string): Activity[] {
  return plan.activities[memberId] ?? [];
}

/** Líneas de un día: la familia, en su orden, con las actividades de ese día. */
export function rowsForPlan(members: Member[], plan: DayPlan): TimelineRow[] {
  return members.map((member) => ({ ...member, activities: activitiesOf(plan, member.id) }));
}

/** Día resuelto con sus líneas (vista para pintar y formato de exportación). */
export function planToView(members: Member[], plan: DayPlan): DayView {
  return { id: plan.id, name: plan.name, date: plan.date, rows: rowsForPlan(members, plan) };
}

export function countActivities(plan: DayPlan): number {
  return Object.values(plan.activities).reduce((acc, list) => acc + list.length, 0);
}

const nameKey = (name: string) => name.trim().toLocaleLowerCase('es');

/**
 * Incorpora días con líneas (formato v1 o un .json de un día) a una familia.
 *
 * Cada línea se asocia a un miembro existente por id y, si no, por nombre (sin
 * distinguir mayúsculas); si no hay ninguno, se crea un miembro nuevo al final.
 * Dentro de un mismo día un miembro solo se asocia una vez, así que dos líneas
 * que se llamen igual en el mismo día siguen siendo dos personas.
 *
 * Los datos del miembro (nombre, color, visibilidad) los fija la primera línea
 * que lo crea; las siguientes solo aportan actividades.
 */
export function mergeViewsIntoFamily(
  views: DayView[],
  existingMembers: Member[] = []
): { members: Member[]; plans: DayPlan[] } {
  const members = [...existingMembers];
  const byId = new Map(members.map((m) => [m.id, m]));
  const usedIds = new Set(members.map((m) => m.id));

  const plans = views.map((view) => {
    const matchedInThisDay = new Set<string>();
    const activities: Record<string, Activity[]> = {};

    for (const row of view.rows) {
      let member = byId.get(row.id);
      if (member && matchedInThisDay.has(member.id)) member = undefined;

      if (!member) {
        member = members.find(
          (m) => !matchedInThisDay.has(m.id) && nameKey(m.name) === nameKey(row.name)
        );
      }

      if (!member) {
        const id = usedIds.has(row.id) ? createId('row') : row.id;
        member = { id, name: row.name, color: row.color, visible: row.visible };
        members.push(member);
        byId.set(id, member);
        usedIds.add(id);
      }

      matchedInThisDay.add(member.id);
      if (row.activities.length > 0) {
        activities[member.id] = [...(activities[member.id] ?? []), ...row.activities];
      }
    }

    const plan: DayPlan = { id: view.id, name: view.name, activities };
    if (view.date) plan.date = view.date;
    return plan;
  });

  return { members, plans };
}

/* ------------------------------------------------------------------------- */
/* Operaciones sobre personas (devuelven el mismo estado si no cambia nada)  */
/* ------------------------------------------------------------------------- */

export function addMember<T extends FamilyState>(state: T, member: Member): T {
  if (state.members.some((m) => m.id === member.id)) return state;
  return { ...state, members: [...state.members, member] };
}

export function updateMember<T extends FamilyState>(
  state: T,
  memberId: string,
  changes: Partial<Omit<Member, 'id'>>
): T {
  const current = state.members.find((m) => m.id === memberId);
  if (!current) return state;
  const next = { ...current, ...changes };
  if (
    next.name === current.name &&
    next.color === current.color &&
    next.visible === current.visible
  ) {
    return state;
  }
  return { ...state, members: state.members.map((m) => (m.id === memberId ? next : m)) };
}

export function moveMember<T extends FamilyState>(
  state: T,
  memberId: string,
  direction: 'up' | 'down'
): T {
  const index = state.members.findIndex((m) => m.id === memberId);
  const target = direction === 'up' ? index - 1 : index + 1;
  if (index === -1 || target < 0 || target >= state.members.length) return state;

  const members = [...state.members];
  const [moved] = members.splice(index, 1);
  members.splice(target, 0, moved);
  return { ...state, members };
}

/** Elimina a una persona y TODAS sus actividades en todos los días. */
export function removeMember<T extends FamilyState>(state: T, memberId: string): T {
  if (!state.members.some((m) => m.id === memberId)) return state;

  return {
    ...state,
    members: state.members.filter((m) => m.id !== memberId),
    plans: state.plans.map((plan) => {
      if (!(memberId in plan.activities)) return plan;
      const activities = { ...plan.activities };
      delete activities[memberId];
      return { ...plan, activities };
    }),
  };
}

/** Número de actividades de una persona sumando todos los días. */
export function countMemberActivities(state: FamilyState, memberId: string): number {
  return state.plans.reduce((acc, plan) => acc + activitiesOf(plan, memberId).length, 0);
}
