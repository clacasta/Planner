import { DayView } from './types';
import { addDays, parseISODate } from './dates';
import { formatTime } from './time';

/**
 * Exportación a calendario (.ics, RFC 5545) y a hoja de cálculo (.csv).
 *
 * Las horas del .ics van en hora «flotante» (sin zona): Google, Apple y
 * Outlook las colocan en la hora local de quien importa, que es lo que se
 * espera de un planificador familiar.
 */

const pad = (n: number) => n.toString().padStart(2, '0');

function icsDateTime(isoDate: string, minutes: number): string {
  // 24:00 es las 00:00 del día siguiente.
  const date = minutes >= 1440 ? addDays(isoDate, 1) : isoDate;
  const m = minutes % 1440;
  return `${date.replace(/-/g, '')}T${pad(Math.floor(m / 60))}${pad(m % 60)}00`;
}

function utcStamp(now: Date): string {
  return now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/** Escapa texto según RFC 5545 (barra, coma, punto y coma, saltos de línea). */
export function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/** Pliega líneas de más de 75 octetos (UTF-8) continuándolas con un espacio. */
export function foldIcsLine(line: string): string {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= 75) return line;

  const parts: string[] = [];
  let current = '';
  let currentBytes = 0;
  for (const char of line) {
    const bytes = encoder.encode(char).length;
    const limit = parts.length === 0 ? 75 : 74; // la continuación empieza con espacio
    if (currentBytes + bytes > limit) {
      parts.push(current);
      current = '';
      currentBytes = 0;
    }
    current += char;
    currentBytes += bytes;
  }
  parts.push(current);
  return parts.join('\r\n ');
}

/**
 * Calendario con un evento por actividad de las personas visibles. Devuelve
 * `null` si el día no tiene fecha (un evento necesita día concreto).
 */
export function buildICS(view: DayView, now: Date = new Date()): string | null {
  if (!view.date || !parseISODate(view.date)) return null;
  const date = view.date;
  const stamp = utcStamp(now);

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Family Day Planner//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  for (const row of view.rows.filter((r) => r.visible)) {
    for (const activity of [...row.activities].sort((a, b) => a.startMinutes - b.startMinutes)) {
      lines.push(
        'BEGIN:VEVENT',
        `UID:${activity.id}-${date}@family-day-planner`,
        `DTSTAMP:${stamp}`,
        `DTSTART:${icsDateTime(date, activity.startMinutes)}`,
        `DTEND:${icsDateTime(date, activity.endMinutes)}`,
        `SUMMARY:${escapeIcsText(`${row.name}: ${activity.title}`)}`,
        `CATEGORIES:${escapeIcsText(row.name)}`
      );
      if (activity.comment) lines.push(`DESCRIPTION:${escapeIcsText(activity.comment)}`);
      lines.push('END:VEVENT');
    }
  }

  lines.push('END:VCALENDAR');
  return lines.map(foldIcsLine).join('\r\n') + '\r\n';
}

function csvCell(value: string | number): string {
  const text = String(value);
  return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * Tabla de actividades separada por punto y coma (lo que Excel espera en
 * configuración española) y con BOM para que respete los acentos.
 */
export function buildCSV(view: DayView): string {
  const header = ['Fecha', 'Persona', 'Actividad', 'Inicio', 'Fin', 'Duración (min)', 'Nota'];
  const rows: Array<Array<string | number>> = [];
  for (const row of view.rows.filter((r) => r.visible)) {
    for (const a of [...row.activities].sort((x, y) => x.startMinutes - y.startMinutes)) {
      rows.push([
        view.date ?? '',
        row.name,
        a.title,
        formatTime(a.startMinutes),
        formatTime(a.endMinutes),
        a.endMinutes - a.startMinutes,
        a.comment ?? '',
      ]);
    }
  }
  return '﻿' + [header, ...rows].map((r) => r.map(csvCell).join(';')).join('\r\n') + '\r\n';
}
