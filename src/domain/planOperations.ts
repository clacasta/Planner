import { Activity, DayPlan, TimelineRow } from './types';
import { createId } from './id';
import { clampMinutes, TOTAL_MINUTES_IN_DAY } from './time';

/**
 * Operaciones puras sobre una planificación (mover y duplicar actividades entre
 * líneas). Viven aquí para poder probarlas sin DOM y para que App solo tenga que
 * envolverlas en un `commit` con historial.
 */

export function findRow(plan: DayPlan, rowId: string): TimelineRow | undefined {
  return plan.rows.find((row) => row.id === rowId);
}

export function findActivity(row: TimelineRow | undefined, activityId: string): Activity | undefined {
  return row?.activities.find((activity) => activity.id === activityId);
}

function withUpdatedRows(
  plan: DayPlan,
  update: (row: TimelineRow) => TimelineRow
): DayPlan {
  return { ...plan, rows: plan.rows.map(update) };
}

export function replaceActivity(plan: DayPlan, rowId: string, activity: Activity): DayPlan {
  const row = findRow(plan, rowId);
  if (!row || !findActivity(row, activity.id)) return plan;

  return withUpdatedRows(plan, (current) =>
    current.id === rowId
      ? {
          ...current,
          activities: current.activities.map((a) => (a.id === activity.id ? activity : a)),
        }
      : current
  );
}

/**
 * Mueve una actividad a otra línea (persona), manteniendo su duración. Si se
 * indica `newStartMinutes`, la actividad se coloca a esa hora respetando los
 * límites del día.
 *
 * Devuelve el mismo plan sin tocar si el origen, el destino o la actividad no
 * existen, o si origen y destino coinciden.
 */
export function moveActivityToRow(
  plan: DayPlan,
  fromRowId: string,
  activityId: string,
  toRowId: string,
  newStartMinutes?: number
): DayPlan {
  const sourceRow = findRow(plan, fromRowId);
  const targetRow = findRow(plan, toRowId);
  const activity = findActivity(sourceRow, activityId);

  if (!activity || !targetRow || fromRowId === toRowId) return plan;

  const duration = activity.endMinutes - activity.startMinutes;
  const moved: Activity =
    newStartMinutes === undefined
      ? activity
      : (() => {
          const start = clampMinutes(Math.round(newStartMinutes), 0, TOTAL_MINUTES_IN_DAY - duration);
          return { ...activity, startMinutes: start, endMinutes: start + duration };
        })();

  return withUpdatedRows(plan, (row) => {
    if (row.id === fromRowId) {
      return { ...row, activities: row.activities.filter((a) => a.id !== activityId) };
    }
    if (row.id === toRowId) {
      return { ...row, activities: [...row.activities, moved] };
    }
    return row;
  });
}

/**
 * Copia una actividad a otra línea (misma persona u otra) con un id nuevo.
 * `overrides` permite aplicar los cambios hechos en el editor antes de copiar.
 */
export function duplicateActivityToRow(
  plan: DayPlan,
  fromRowId: string,
  activityId: string,
  toRowId: string,
  overrides?: Partial<Activity>
): DayPlan {
  const sourceRow = findRow(plan, fromRowId);
  const targetRow = findRow(plan, toRowId);
  const activity = findActivity(sourceRow, activityId);

  if (!activity || !targetRow) return plan;

  const copy: Activity = { ...activity, ...overrides, id: createId('act') };

  return withUpdatedRows(plan, (row) =>
    row.id === toRowId ? { ...row, activities: [...row.activities, copy] } : row
  );
}