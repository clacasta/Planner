export const TOTAL_MINUTES_IN_DAY = 1440; // 24 * 60
export const DEFAULT_PIXELS_PER_HOUR = 80;
export const MIN_PIXELS_PER_HOUR = 30;   // Límite inferior (zoom out)
export const MAX_PIXELS_PER_HOUR = 180;  // Límite superior (zoom in)
export const DEFAULT_GRID_STEP = 15;

/**
 * Convierte minutos desde medianoche a píxeles en el canvas.
 */
export function minutesToPixels(minutes: number, pixelsPerHour: number): number {
  return (minutes / 60) * pixelsPerHour;
}

/**
 * Convierte píxeles en minutos desde medianoche.
 */
export function pixelsToMinutes(pixels: number, pixelsPerHour: number): number {
  return (pixels / pixelsPerHour) * 60;
}

/**
 * Ajusta un valor de minutos a la cuadrícula temporal especificada (por defecto 15 minutos).
 */
export function snapToGrid(minutes: number, stepMinutes: number = DEFAULT_GRID_STEP): number {
  const clamped = Math.max(0, Math.min(TOTAL_MINUTES_IN_DAY, minutes));
  return Math.round(clamped / stepMinutes) * stepMinutes;
}

/**
 * Formatea minutos a formato legible "HH:MM".
 * Trata 1440 como "24:00".
 */
export function formatTime(minutes: number): string {
  const safeMinutes = Math.max(0, Math.min(TOTAL_MINUTES_IN_DAY, Math.round(minutes)));
  if (safeMinutes === TOTAL_MINUTES_IN_DAY) {
    return '24:00';
  }
  const hours = Math.floor(safeMinutes / 60);
  const mins = safeMinutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Parsea un string "HH:MM" a minutos desde medianoche.
 */
export function parseTime(timeStr: string): number | null {
  const match = /^([01]?[0-9]|2[0-4]):([0-5][0-9])$/.exec(timeStr.trim());
  if (!match) return null;
  const hours = parseInt(match[1], 10);
  const mins = parseInt(match[2], 10);
  const total = hours * 60 + mins;
  if (total > TOTAL_MINUTES_IN_DAY) return null;
  return total;
}

/**
 * Limita un valor de minutos entre un mínimo y un máximo.
 */
export function clampMinutes(
  minutes: number,
  min: number = 0,
  max: number = TOTAL_MINUTES_IN_DAY
): number {
  return Math.max(min, Math.min(max, minutes));
}
