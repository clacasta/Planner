import { DayPlan } from '../domain/types';
import { createId } from '../domain/id';
import { SCHEMA_VERSION, StorageData } from './schema';
import { normalizePlan } from './validate';

/**
 * Convierte un objeto desconocido (contenido de localStorage o de un fichero)
 * en un `StorageData` válido, descartando lo irrecuperable. Devuelve `null` si
 * no hay ninguna planificación aprovechable.
 *
 * Compartido por `migrations.ts` (carga) y `validate.ts` (importación) para que
 * ambas rutas apliquen exactamente las mismas reglas.
 */
export function normalizedToStorageData(raw: unknown): StorageData | null {
  if (typeof raw !== 'object' || raw === null) return null;

  const source = raw as Record<string, unknown>;
  const rawPlans = Array.isArray(source.plans) ? source.plans : null;
  if (!rawPlans) return null;

  const plans: DayPlan[] = [];
  const seenIds = new Set<string>();

  for (const rawPlan of rawPlans) {
    const normalized = normalizePlan(rawPlan);
    if (!normalized) continue;

    let plan = normalized.value;
    if (seenIds.has(plan.id)) plan = { ...plan, id: createId('plan') };
    seenIds.add(plan.id);
    plans.push(plan);
  }

  if (plans.length === 0) return null;

  const requestedActiveId = typeof source.activePlanId === 'string' ? source.activePlanId : null;
  const activePlanId = plans.some((p) => p.id === requestedActiveId)
    ? (requestedActiveId as string)
    : plans[0].id;

  return { schemaVersion: SCHEMA_VERSION, activePlanId, plans };
}
