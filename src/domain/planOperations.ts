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
 * Añade una actividad a una línea. Devuelve el mismo plan si la línea no existe
 * o si ya hay una actividad con ese id (así no se duplica al reintentar).
 */
export function addActivity(plan: DayPlan, rowId: string, activity: Activity): DayPlan {
  const row = findRow(plan, rowId);
  if (!row || findActivity(row, activity.id)) return plan;

  return withUpdatedRows(plan, (current) =>
    current.id === rowId ? { ...current, activities: [...current.activities, activity] } : current
  );
}

/**
 * Guarda el resultado del editor: actualiza la actividad si ya existía o la
 * añade si es nueva (las actividades recién creadas no se guardan hasta que el
 * usuario pulsa «Guardar», para que cancelar no deje bloques vacíos).
 */
export function upsertActivity(plan: DayPlan, rowId: string, activity: Activity): DayPlan {
  return findActivity(findRow(plan, rowId), activity.id)
    ? replaceActivity(plan, rowId, activity)
    : addActivity(plan, rowId, activity);
}

/**
 * Líneas para un día nuevo: las mismas personas (nombre, color, visibilidad y
 * orden) que el día de referencia, con ids nuevos y sin actividades.
 */
export function familyRowsFrom(plan: DayPlan | undefined): TimelineRow[] {
  return (plan?.rows ?? []).map((row) => ({
    id: createId('row'),
    name: row.name,
    color: row.color,
    visible: row.visible,
    activities: [],
  }));
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