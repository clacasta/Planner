import { DayPlan } from './types';

/**
 * Fechas de los días en formato `AAAA-MM-DD`, siempre en hora LOCAL (con
 * `toISOString` un día de madrugada saldría como el anterior en España).
 */

const pad = (n: number) => n.toString().padStart(2, '0');

export function toISODate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function parseISODate(iso: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return toISODate(date) === iso ? date : null;
}

export function todayISO(now: Date = new Date()): string {
  return toISODate(now);
}

export function minutesSinceMidnight(now: Date = new Date()): number {
  return now.getHours() * 60 + now.getMinutes();
}

export function addDays(iso: string, days: number): string {
  const date = parseISODate(iso);
  if (!date) return iso;
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

/** Lunes de la semana de la fecha (semana de lunes a domingo). */
export function startOfWeek(iso: string): string {
  const date = parseISODate(iso);
  if (!date) return iso;
  const mondayOffset = (date.getDay() + 6) % 7; // 0 = lunes
  return addDays(iso, -mondayOffset);
}

/** 0 = lunes ... 6 = domingo. */
export function weekdayIndex(iso: string): number {
  const date = parseISODate(iso);
  return date ? (date.getDay() + 6) % 7 : 0;
}

export const WEEKDAY_SHORT = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const WEEKDAY_NAMES = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
const MONTH_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** «Lunes 9 nov», para nombrar días creados por fecha. */
export function formatDayName(iso: string): string {
  const date = parseISODate(iso);
  if (!date) return iso;
  const weekday = WEEKDAY_NAMES[weekdayIndex(iso)];
  return `${weekday[0].toUpperCase()}${weekday.slice(1)} ${date.getDate()} ${MONTH_SHORT[date.getMonth()]}`;
}

/** Fechas entre `start` y `end` (incluidas) cuyos días de la semana estén en `weekdays`. */
export function datesInRange(start: string, end: string, weekdays: number[]): string[] {
  if (!parseISODate(start) || !parseISODate(end) || start > end) return [];
  const result: string[] = [];
  for (let current = start; current <= end; current = addDays(current, 1)) {
    if (weekdays.includes(weekdayIndex(current))) result.push(current);
    if (result.length > 366) break; // límite de seguridad
  }
  return result;
}

export function findPlanForDate(plans: DayPlan[], iso: string): DayPlan | undefined {
  return plans.find((plan) => plan.date === iso);
}

/**
 * Orden de navegación entre días: primero los que tienen fecha, de más antiguo
 * a más reciente; después los que no tienen fecha, en el orden de la lista.
 */
export function navigationOrder(plans: DayPlan[]): DayPlan[] {
  const dated = plans.filter((p) => p.date).sort((a, b) => (a.date! < b.date! ? -1 : a.date! > b.date! ? 1 : 0));
  const undated = plans.filter((p) => !p.date);
  return [...dated, ...undated];
}

export function adjacentPlanId(
  plans: DayPlan[],
  currentId: string,
  direction: 'prev' | 'next'
): string | null {
  const ordered = navigationOrder(plans);
  const index = ordered.findIndex((p) => p.id === currentId);
  if (index === -1) return null;
  const target = ordered[direction === 'prev' ? index - 1 : index + 1];
  return target?.id ?? null;
}
