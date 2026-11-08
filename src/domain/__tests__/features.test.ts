import { describe, expect, it } from 'vitest';
import {
  addDays,
  adjacentPlanId,
  datesInRange,
  formatDayName,
  minutesSinceMidnight,
  navigationOrder,
  parseISODate,
  startOfWeek,
  todayISO,
} from '../dates';
import { busyMinutes, dayBalance, formatDuration, whoIsFree } from '../balance';
import { buildCSV, buildICS, escapeIcsText, foldIcsLine } from '../calendarExport';
import { copyPlanToDates } from '../templates';
import { DayPlan, DayView } from '../types';
import { FamilyState } from '../family';

const act = (id: string, start: number, end: number, color: 'blue' | 'green' | 'cyan' = 'blue', comment?: string) => ({
  id,
  title: id,
  startMinutes: start,
  endMinutes: end,
  color,
  comment,
});

const plan = (id: string, date?: string): DayPlan => ({ id, name: id, date, activities: {} });

describe('fechas', () => {
  it('usa la fecha local, no la UTC', () => {
    expect(todayISO(new Date(2026, 10, 9, 0, 30))).toBe('2026-11-09');
    expect(minutesSinceMidnight(new Date(2026, 10, 9, 17, 45))).toBe(1065);
  });

  it('valida fechas de verdad', () => {
    expect(parseISODate('2026-02-30')).toBeNull();
    expect(parseISODate('9/11/2026')).toBeNull();
    expect(parseISODate('2026-11-09')).not.toBeNull();
  });

  it('suma días cruzando meses y calcula el lunes de la semana', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(startOfWeek('2026-11-08')).toBe('2026-11-02'); // domingo → lunes anterior
    expect(startOfWeek('2026-11-09')).toBe('2026-11-09'); // lunes
  });

  it('nombra días y filtra rangos por día de la semana', () => {
    expect(formatDayName('2026-11-09')).toBe('Lunes 9 nov');
    // lunes a viernes de dos semanas
    expect(datesInRange('2026-11-09', '2026-11-22', [0, 1, 2, 3, 4])).toHaveLength(10);
    expect(datesInRange('2026-11-22', '2026-11-09', [0])).toEqual([]);
  });

  it('navega por fecha y deja los días sin fecha al final', () => {
    const plans = [plan('sin-fecha'), plan('martes', '2026-11-10'), plan('lunes', '2026-11-09')];
    expect(navigationOrder(plans).map((p) => p.id)).toEqual(['lunes', 'martes', 'sin-fecha']);
    expect(adjacentPlanId(plans, 'martes', 'prev')).toBe('lunes');
    expect(adjacentPlanId(plans, 'martes', 'next')).toBe('sin-fecha');
    expect(adjacentPlanId(plans, 'lunes', 'prev')).toBeNull();
  });
});

const view: DayView = {
  id: 'd',
  name: 'Lunes',
  date: '2026-11-09',
  rows: [
    { id: 'c', name: 'Carlos', color: 'blue', visible: true, activities: [act('Trabajo', 540, 1020), act('Llamada', 600, 660, 'green')] },
    { id: 'l', name: 'Leo', color: 'green', visible: true, activities: [act('Natación', 1050, 1140, 'cyan', 'Llevar gafas, toalla; y gorro')] },
    { id: 'o', name: 'Oculta', color: 'cyan', visible: false, activities: [act('X', 0, 1440)] },
  ],
};

describe('equilibrio', () => {
  it('cuenta los solapes una sola vez', () => {
    expect(busyMinutes([])).toBe(0);
    expect(busyMinutes([act('a', 0, 60), act('b', 30, 90), act('c', 120, 180)])).toBe(150);
  });

  it('resume cada persona visible, con desglose por color', () => {
    const [carlos, leo] = dayBalance(view);
    expect(dayBalance(view)).toHaveLength(2);
    expect(carlos.busy).toBe(480);
    expect(carlos.free).toBe(960);
    expect(carlos.byColor).toEqual([
      { color: 'blue', minutes: 480 },
      { color: 'green', minutes: 60 },
    ]);
    expect(leo.busy).toBe(90);
  });

  it('dice quién está libre a una hora (el fin de una actividad ya es libre)', () => {
    expect(whoIsFree(view, 1050)).toEqual({ free: ['Carlos'], busy: [{ name: 'Leo', activity: 'Natación' }] });
    expect(whoIsFree(view, 1020).free).toEqual(['Carlos', 'Leo']);
  });

  it('formatea duraciones', () => {
    expect(formatDuration(450)).toBe('7 h 30 min');
    expect(formatDuration(45)).toBe('45 min');
    expect(formatDuration(0)).toBe('0 h');
  });
});

describe('exportar a calendario', () => {
  it('necesita fecha', () => {
    expect(buildICS({ ...view, date: undefined })).toBeNull();
  });

  it('crea un evento por actividad visible, con hora local y 24:00 como día siguiente', () => {
    const ics = buildICS(
      { ...view, rows: [...view.rows, { id: 'n', name: 'Noche', color: 'blue', visible: true, activities: [act('Dormir', 1380, 1440)] }] },
      new Date(Date.UTC(2026, 10, 8, 12, 0, 0))
    )!;
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(4);
    expect(ics).toContain('DTSTART:20261109T090000');
    expect(ics).toContain('SUMMARY:Leo: Natación');
    expect(ics).toContain('DESCRIPTION:Llevar gafas\\, toalla\\; y gorro');
    expect(ics).toContain('DTEND:20261110T000000');
    expect(ics).toContain('DTSTAMP:20261108T120000Z');
    expect(ics).not.toContain('Oculta');
  });

  it('escapa y pliega líneas largas', () => {
    expect(escapeIcsText('a,b;c\\d\ne')).toBe('a\\,b\\;c\\\\d\\ne');
    const folded = foldIcsLine('SUMMARY:' + 'á'.repeat(60));
    const encoder = new TextEncoder();
    expect(folded.split('\r\n').every((line) => encoder.encode(line).length <= 75)).toBe(true);
    expect(folded.split('\r\n').slice(1).every((line) => line.startsWith(' '))).toBe(true);
  });

  it('genera un CSV para Excel (punto y coma, BOM, comillas cuando hace falta)', () => {
    const csv = buildCSV(view);
    const lines = csv.replace('﻿', '').trim().split('\r\n');
    expect(csv.startsWith('﻿')).toBe(true);
    expect(lines[0]).toBe('Fecha;Persona;Actividad;Inicio;Fin;Duración (min);Nota');
    expect(lines).toHaveLength(4);
    expect(lines[3]).toBe('2026-11-09;Leo;Natación;17:30;19:00;90;"Llevar gafas, toalla; y gorro"');
  });
});

describe('plantillas: copiar un día a fechas', () => {
  const state: FamilyState = {
    members: [{ id: 'c', name: 'Carlos', color: 'blue', visible: true }],
    plans: [
      { id: 'base', name: 'Laborable', activities: { c: [act('Trabajo', 540, 1020)] } },
      plan('existente', '2026-11-10'),
    ],
  };

  it('crea un día por fecha libre, con ids nuevos, y salta las ocupadas', () => {
    const result = copyPlanToDates(state, 'base', ['2026-11-11', '2026-11-09', '2026-11-10']);
    expect(result.created.map((p) => [p.date, p.name])).toEqual([
      ['2026-11-09', 'Lunes 9 nov'],
      ['2026-11-11', 'Miércoles 11 nov'],
    ]);
    expect(result.skipped).toEqual(['2026-11-10']);
    expect(result.state.plans).toHaveLength(4);
    const copied = result.created[0].activities.c[0];
    expect(copied.title).toBe('Trabajo');
    expect(copied.id).not.toBe('Trabajo');
  });

  it('no cambia nada si no hay fechas libres o el día no existe', () => {
    expect(copyPlanToDates(state, 'base', ['2026-11-10']).state).toBe(state);
    expect(copyPlanToDates(state, 'fantasma', ['2026-11-12']).state).toBe(state);
  });
});
