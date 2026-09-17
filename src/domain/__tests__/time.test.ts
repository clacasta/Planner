import { describe, expect, it } from 'vitest';
import {
  TOTAL_MINUTES_IN_DAY,
  clampMinutes,
  formatTime,
  minutesToPixels,
  parseTime,
  pixelsToMinutes,
  snapToGrid,
} from '../time';

describe('formatTime', () => {
  it('formatea minutos con dos dígitos', () => {
    expect(formatTime(0)).toBe('00:00');
    expect(formatTime(90)).toBe('01:30');
    expect(formatTime(1439)).toBe('23:59');
  });

  it('trata 1440 como 24:00 (fin del día)', () => {
    expect(formatTime(1440)).toBe('24:00');
  });

  it('recorta valores fuera de rango en lugar de mostrar horas absurdas', () => {
    expect(formatTime(-30)).toBe('00:00');
    expect(formatTime(9999)).toBe('24:00');
  });
});

describe('parseTime', () => {
  it('acepta horas válidas', () => {
    expect(parseTime('00:00')).toBe(0);
    expect(parseTime('8:05')).toBe(485);
    expect(parseTime('24:00')).toBe(TOTAL_MINUTES_IN_DAY);
  });

  it('rechaza formatos y valores inválidos', () => {
    expect(parseTime('25:00')).toBeNull();
    expect(parseTime('12:60')).toBeNull();
    expect(parseTime('mediodía')).toBeNull();
    expect(parseTime('')).toBeNull();
  });
});

describe('snapToGrid', () => {
  it('ajusta a incrementos de 15 minutos', () => {
    expect(snapToGrid(7)).toBe(0);
    expect(snapToGrid(8)).toBe(15);
    expect(snapToGrid(67)).toBe(60);
    expect(snapToGrid(128)).toBe(135);
  });

  it('nunca devuelve valores fuera del día', () => {
    expect(snapToGrid(-10)).toBe(0);
    expect(snapToGrid(2000)).toBe(TOTAL_MINUTES_IN_DAY);
  });
});

describe('clampMinutes', () => {
  it('limita al rango pedido', () => {
    expect(clampMinutes(-5)).toBe(0);
    expect(clampMinutes(1500)).toBe(TOTAL_MINUTES_IN_DAY);
    expect(clampMinutes(120, 60, 180)).toBe(120);
    expect(clampMinutes(30, 60, 180)).toBe(60);
  });
});

describe('conversión minutos <-> píxeles', () => {
  it('es coherente en ambos sentidos', () => {
    expect(minutesToPixels(60, 80)).toBe(80);
    expect(minutesToPixels(90, 80)).toBe(120);
    expect(pixelsToMinutes(80, 80)).toBe(60);
    expect(pixelsToMinutes(minutesToPixels(375, 45), 45)).toBeCloseTo(375, 6);
  });
});
