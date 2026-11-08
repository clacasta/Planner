import { StorageData } from './schema';
import { normalizeStorageWithIssues } from './validate';

/**
 * Convierte un objeto desconocido (contenido de localStorage) en un
 * `StorageData` v2 válido, migrando desde v1 si hace falta y descartando lo
 * irrecuperable. Devuelve `null` si no hay ninguna planificación aprovechable.
 *
 * Usa las mismas reglas que la importación de copias de seguridad
 * (`normalizeStorageWithIssues`), sin los avisos.
 */
export function normalizedToStorageData(raw: unknown): StorageData | null {
  return normalizeStorageWithIssues(raw)?.value ?? null;
}
