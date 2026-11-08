import { Activity, DayView, FlexokiColorKey } from './types';
import { TOTAL_MINUTES_IN_DAY } from './time';

/**
 * Panel de equilibrio: cuánto tiempo tiene ocupado cada persona, en qué, y
 * quién está libre a una hora.
 */

/** Significado sugerido de cada color (el mismo que propone el README). */
export const COLOR_CATEGORY: Record<FlexokiColorKey, string> = {
  blue: 'Trabajo',
  purple: 'Salud / personal',
  green: 'Descanso',
  yellow: 'Colegio / familia',
  orange: 'Hogar / recados',
  cyan: 'Deporte / extraescolar',
  red: 'Ocio',
  magenta: 'Social',
};

/** Minutos ocupados contando una sola vez los tramos que se solapan. */
export function busyMinutes(activities: Activity[]): number {
  const intervals = activities
    .map((a) => [a.startMinutes, a.endMinutes] as const)
    .sort((x, y) => x[0] - y[0]);

  let total = 0;
  let currentStart = -1;
  let currentEnd = -1;
  for (const [start, end] of intervals) {
    if (start > currentEnd) {
      total += currentEnd - currentStart;
      currentStart = start;
      currentEnd = end;
    } else if (end > currentEnd) {
      currentEnd = end;
    }
  }
  return total + (currentEnd - currentStart);
}

export interface MemberBalance {
  id: string;
  name: string;
  color: FlexokiColorKey;
  busy: number;
  free: number;
  /** Minutos por color de actividad (los solapes cuentan en cada actividad). */
  byColor: Array<{ color: FlexokiColorKey; minutes: number }>;
}

export function dayBalance(view: DayView): MemberBalance[] {
  return view.rows
    .filter((row) => row.visible)
    .map((row) => {
      const busy = busyMinutes(row.activities);
      const totals = new Map<FlexokiColorKey, number>();
      for (const a of row.activities) {
        totals.set(a.color, (totals.get(a.color) ?? 0) + (a.endMinutes - a.startMinutes));
      }
      return {
        id: row.id,
        name: row.name,
        color: row.color,
        busy,
        free: TOTAL_MINUTES_IN_DAY - busy,
        byColor: [...totals.entries()]
          .map(([color, minutes]) => ({ color, minutes }))
          .sort((a, b) => b.minutes - a.minutes),
      };
    });
}

/** Personas visibles sin ninguna actividad que cubra ese minuto. */
export function whoIsFree(view: DayView, minute: number): { free: string[]; busy: Array<{ name: string; activity: string }> } {
  const free: string[] = [];
  const busy: Array<{ name: string; activity: string }> = [];
  for (const row of view.rows.filter((r) => r.visible)) {
    const current = row.activities.find((a) => a.startMinutes <= minute && minute < a.endMinutes);
    if (current) busy.push({ name: row.name, activity: current.title });
    else free.push(row.name);
  }
  return { free, busy };
}

/** «7 h 30 min», «45 min», «0 h». */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return m === 0 ? '0 h' : `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}
