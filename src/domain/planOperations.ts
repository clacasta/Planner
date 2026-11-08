import { Activity, DayPlan } from './types';
import { createId } from './id';
import { clampMinutes, TOTAL_MINUTES_IN_DAY } from './time';
import { activitiesOf } from './family';

/**
 * Operaciones puras sobre las actividades de un día. Las actividades se guardan
 * por id de miembro (`plan.activities[memberId]`). Viven aquí para poder
 * probarlas sin DOM y para que App solo tenga que envolverlas en un `commit`
 * con historial. Todas devuelven el MISMO plan si no hay nada que cambiar.
 */

export function findActivity(
  plan: DayPlan,
  memberId: string,
  activityId: string
): Activity | undefined {
  return activitiesOf(plan, memberId).find((activity) => activity.id === activityId);
}

function withMemberActivities(plan: DayPlan, memberId: string, list: Activity[]): DayPlan {
  return { ...plan, activities: { ...plan.activities, [memberId]: list } };
}

export function replaceActivity(plan: DayPlan, memberId: string, activity: Activity): DayPlan {
  if (!findActivity(plan, memberId, activity.id)) return plan;
  return withMemberActivities(
    plan,
    memberId,
    activitiesOf(plan, memberId).map((a) => (a.id === activity.id ? activity : a))
  );
}

/** Añade una actividad. No hace nada si ya hay una con ese id en esa persona. */
export function addActivity(plan: DayPlan, memberId: string, activity: Activity): DayPlan {
  if (findActivity(plan, memberId, activity.id)) return plan;
  return withMemberActivities(plan, memberId, [...activitiesOf(plan, memberId), activity]);
}

/**
 * Guarda el resultado del editor: actualiza la actividad si ya existía o la
 * añade si es nueva (las actividades recién creadas no se guardan hasta que el
 * usuario pulsa «Crear», para que cancelar no deje bloques vacíos).
 */
export function upsertActivity(plan: DayPlan, memberId: string, activity: Activity): DayPlan {
  return findActivity(plan, memberId, activity.id)
    ? replaceActivity(plan, memberId, activity)
    : addActivity(plan, memberId, activity);
}

export function removeActivity(plan: DayPlan, memberId: string, activityId: string): DayPlan {
  if (!findActivity(plan, memberId, activityId)) return plan;
  return withMemberActivities(
    plan,
    memberId,
    activitiesOf(plan, memberId).filter((a) => a.id !== activityId)
  );
}

/** Cambia las horas de una actividad (mover o redimensionar en la misma línea). */
export function setActivityTimes(
  plan: DayPlan,
  memberId: string,
  activityId: string,
  startMinutes: number,
  endMinutes: number
): DayPlan {
  const activity = findActivity(plan, memberId, activityId);
  if (!activity) return plan;
  if (activity.startMinutes === startMinutes && activity.endMinutes === endMinutes) return plan;
  return replaceActivity(plan, memberId, { ...activity, startMinutes, endMinutes });
}

/**
 * Mueve una actividad a otra persona, manteniendo su duración. Si se indica
 * `newStartMinutes`, la actividad se coloca a esa hora respetando los límites
 * del día.
 *
 * Devuelve el mismo plan si la actividad no existe o si origen y destino
 * coinciden.
 */
export function moveActivityToRow(
  plan: DayPlan,
  fromMemberId: string,
  activityId: string,
  toMemberId: string,
  newStartMinutes?: number
): DayPlan {
  const activity = findActivity(plan, fromMemberId, activityId);
  if (!activity || fromMemberId === toMemberId) return plan;

  const duration = activity.endMinutes - activity.startMinutes;
  const moved: Activity =
    newStartMinutes === undefined
      ? activity
      : (() => {
          const start = clampMinutes(Math.round(newStartMinutes), 0, TOTAL_MINUTES_IN_DAY - duration);
          return { ...activity, startMinutes: start, endMinutes: start + duration };
        })();

  const withoutSource = removeActivity(plan, fromMemberId, activityId);
  return withMemberActivities(withoutSource, toMemberId, [
    ...activitiesOf(withoutSource, toMemberId),
    moved,
  ]);
}

/**
 * Copia una actividad a una persona (la misma u otra) con un id nuevo.
 * `overrides` permite aplicar los cambios hechos en el editor antes de copiar.
 */
export function duplicateActivityToRow(
  plan: DayPlan,
  fromMemberId: string,
  activityId: string,
  toMemberId: string,
  overrides?: Partial<Activity>
): DayPlan {
  const activity = findActivity(plan, fromMemberId, activityId);
  if (!activity) return plan;

  const copy: Activity = { ...activity, ...overrides, id: createId('act') };
  return withMemberActivities(plan, toMemberId, [...activitiesOf(plan, toMemberId), copy]);
}
