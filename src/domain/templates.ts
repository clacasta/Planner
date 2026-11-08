import { Activity, DayPlan } from './types';
import { createId } from './id';
import { formatDayName } from './dates';
import { FamilyState } from './family';

/**
 * Plantillas: aplicar un día a varias fechas (p. ej. «día laborable» de lunes
 * a viernes de las próximas semanas). Cada fecha recibe una copia del día con
 * ids nuevos; las fechas que ya tienen un día no se tocan.
 */
export function copyPlanToDates<T extends FamilyState>(
  state: T,
  sourcePlanId: string,
  dates: string[]
): { state: T; created: DayPlan[]; skipped: string[] } {
  const source = state.plans.find((p) => p.id === sourcePlanId);
  if (!source) return { state, created: [], skipped: [] };

  const taken = new Set(state.plans.map((p) => p.date).filter(Boolean));
  const created: DayPlan[] = [];
  const skipped: string[] = [];

  for (const date of [...new Set(dates)].sort()) {
    if (taken.has(date)) {
      skipped.push(date);
      continue;
    }
    const activities: Record<string, Activity[]> = {};
    for (const [memberId, list] of Object.entries(source.activities)) {
      activities[memberId] = list.map((a) => ({ ...a, id: createId('act') }));
    }
    created.push({ id: createId('plan'), name: formatDayName(date), date, activities });
    taken.add(date);
  }

  if (created.length === 0) return { state, created, skipped };
  return { state: { ...state, plans: [...state.plans, ...created] }, created, skipped };
}
