import { Activity, DayPlan, FlexokiColorKey, TimelineRow } from '../domain/types';
import { createId } from '../domain/id';
import { TOTAL_MINUTES_IN_DAY } from '../domain/time';
import { SCHEMA_VERSION, StorageData } from './schema';

const COLOR_KEYS: FlexokiColorKey[] = [
  'red',
  'orange',
  'yellow',
  'green',
  'cyan',
  'blue',
  'purple',
  'magenta',
];

const MIN_DURATION_MINUTES = 15;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return null;
}

function asColorKey(value: unknown): FlexokiColorKey | null {
  return typeof value === 'string' && (COLOR_KEYS as string[]).includes(value)
    ? (value as FlexokiColorKey)
    : null;
}

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

export interface NormalizeResult<T> {
  value: T;
  /** Avisos no fatales: campos corregidos o elementos descartados. */
  issues: string[];
}

/**
 * Normaliza una actividad. Devuelve `null` si es irrecuperable (por ejemplo
 * sin horas válidas o con duración inferior al mínimo).
 */
export function normalizeActivity(input: unknown): NormalizeResult<Activity> | null {
  if (!isRecord(input)) return null;

  const issues: string[] = [];
  const rawStart = asFiniteNumber(input.startMinutes);
  const rawEnd = asFiniteNumber(input.endMinutes);

  if (rawStart === null || rawEnd === null) return null;

  const startMinutes = Math.max(0, Math.min(TOTAL_MINUTES_IN_DAY, Math.round(rawStart)));
  const endMinutes = Math.max(0, Math.min(TOTAL_MINUTES_IN_DAY, Math.round(rawEnd)));

  if (endMinutes - startMinutes < MIN_DURATION_MINUTES) return null;

  const title = asNonEmptyString(input.title);
  if (!title) issues.push('Una actividad sin título se ha renombrado a "Sin título".');

  const color = asColorKey(input.color);
  if (!color) issues.push('Una actividad tenía un color no válido: se ha usado azul.');

  if (startMinutes !== rawStart || endMinutes !== rawEnd) {
    issues.push('Se han ajustado horas fuera del rango 00:00–24:00.');
  }

  const comment = typeof input.comment === 'string' ? input.comment.trim() : '';

  return {
    value: {
      id: asNonEmptyString(input.id) ?? createId('act'),
      title: title ?? 'Sin título',
      startMinutes,
      endMinutes,
      color: color ?? 'blue',
      comment: comment === '' ? undefined : comment,
    },
    issues,
  };
}

/** Normaliza una línea (persona) y sus actividades. `null` si no es recuperable. */
export function normalizeRow(input: unknown): NormalizeResult<TimelineRow> | null {
  if (!isRecord(input)) return null;

  // Un objeto sin nombre ni identificador no es una línea: es basura (p. ej.
  // `{}`), y aceptarla creaba líneas fantasma en la interfaz.
  if (typeof input.name !== 'string' && typeof input.id !== 'string') return null;

  const issues: string[] = [];
  const name = asNonEmptyString(input.name);
  if (!name) issues.push('Una línea sin nombre se ha renombrado a "Sin nombre".');

  const color = asColorKey(input.color);
  if (!color) issues.push(`La línea "${name ?? 'sin nombre'}" tenía un color no válido: se ha usado azul.`);

  const rawActivities = Array.isArray(input.activities) ? input.activities : [];
  if (!Array.isArray(input.activities) && input.activities !== undefined) {
    issues.push(`Las actividades de "${name ?? 'una línea'}" no eran una lista: se han descartado.`);
  }

  const activities: Activity[] = [];
  let dropped = 0;
  for (const raw of rawActivities) {
    const normalized = normalizeActivity(raw);
    if (normalized) {
      activities.push(normalized.value);
      issues.push(...normalized.issues);
    } else {
      dropped += 1;
    }
  }
  if (dropped > 0) {
    issues.push(`Se han descartado ${dropped} actividad(es) inválida(s) en "${name ?? 'una línea'}".`);
  }

  return {
    value: {
      id: asNonEmptyString(input.id) ?? createId('row'),
      name: name ?? 'Sin nombre',
      color: color ?? 'blue',
      visible: input.visible === false ? false : true,
      activities,
    },
    issues,
  };
}

/** Normaliza una planificación completa. `null` si no tiene un array de líneas. */
export function normalizePlan(input: unknown): NormalizeResult<DayPlan> | null {
  if (!isRecord(input) || !Array.isArray(input.rows)) return null;

  const issues: string[] = [];
  const name = asNonEmptyString(input.name);
  if (!name) issues.push('Una planificación sin nombre se ha renombrado a "Día sin nombre".');

  const rows: TimelineRow[] = [];
  let dropped = 0;
  const seenRowIds = new Set<string>();

  for (const rawRow of input.rows) {
    const normalized = normalizeRow(rawRow);
    if (!normalized) {
      dropped += 1;
      continue;
    }
    let row = normalized.value;
    if (seenRowIds.has(row.id)) {
      issues.push(`La línea "${row.name}" tenía un identificador duplicado: se ha renumerado.`);
      row = { ...row, id: createId('row') };
    }
    seenRowIds.add(row.id);
    rows.push(row);
    issues.push(...normalized.issues);
  }

  if (dropped > 0) issues.push(`Se han descartado ${dropped} línea(s) inválida(s).`);

  const date = typeof input.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input.date)
    ? input.date
    : undefined;
  if (input.date !== undefined && date === undefined) {
    issues.push('La fecha no tenía formato AAAA-MM-DD: se ha descartado.');
  }

  return {
    value: {
      id: asNonEmptyString(input.id) ?? createId('plan'),
      name: name ?? 'Día sin nombre',
      date,
      rows,
    },
    issues,
  };
}

export type ImportPayload =
  | { kind: 'plan'; plan: DayPlan; issues: string[] }
  | { kind: 'backup'; data: StorageData; issues: string[] };

/**
 * Interpreta el contenido de un JSON importado (un día suelto o una copia de
 * seguridad completa) y lo devuelve normalizado. Lanza `Error` con un mensaje
 * legible si el archivo no sirve.
 *
 * Sustituye a la validación superficial anterior (`isValidDayPlan` solo miraba
 * `id`, `name` y que `rows` fuera un array: un `rows: [{}]` rompía el render y
 * una copia de seguridad se aplicaba sin comprobar absolutamente nada).
 */
export function parseImportPayload(text: string): ImportPayload {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('El archivo no es un JSON válido.');
  }

  if (isRecord(parsed) && Array.isArray(parsed.plans)) {
    const issues: string[] = [];
    const plans: DayPlan[] = [];

    for (const rawPlan of parsed.plans) {
      const normalized = normalizePlan(rawPlan);
      if (normalized) {
        plans.push(normalized.value);
        issues.push(...normalized.issues);
      } else {
        issues.push('Se ha descartado una planificación de la copia por no tener formato válido.');
      }
    }

    if (plans.length === 0) {
      throw new Error('La copia de seguridad no contiene ninguna planificación válida.');
    }

    const requestedActiveId = asNonEmptyString(parsed.activePlanId);
    const activePlanId = plans.some((p) => p.id === requestedActiveId)
      ? (requestedActiveId as string)
      : plans[0].id;

    return {
      kind: 'backup',
      data: { schemaVersion: SCHEMA_VERSION, activePlanId, plans },
      issues,
    };
  }

  const normalized = normalizePlan(parsed);
  if (normalized) {
    return { kind: 'plan', plan: normalized.value, issues: normalized.issues };
  }

  throw new Error('El archivo no contiene un formato de planificación válido.');
}

/** Resumen legible de lo que contiene un import, para pedir confirmación. */
export function summarizeImport(payload: ImportPayload): {
  title: string;
  detail: string;
  isFullBackup: boolean;
} {
  if (payload.kind === 'backup') {
    const days = payload.data.plans.length;
    const activities = payload.data.plans.reduce(
      (acc, p) => acc + p.rows.reduce((sum, r) => sum + r.activities.length, 0),
      0
    );
    return {
      title: `Copia de seguridad: ${days} día(s)`,
      detail: `${activities} actividad(es) en total. Reemplazará TODOS tus días actuales.`,
      isFullBackup: true,
    };
  }

  const activities = payload.plan.rows.reduce((acc, r) => acc + r.activities.length, 0);
  return {
    title: `Día: «${payload.plan.name}»`,
    detail: `${payload.plan.rows.length} línea(s) y ${activities} actividad(es). Se añadirá a tus días.`,
    isFullBackup: false,
  };
}
