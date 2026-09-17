import { normalizedToStorageData } from './normalizeStorage';
import { SCHEMA_VERSION, StorageData } from './schema';

/**
 * Aplica las migraciones necesarias a los datos guardados.
 *
 * `SCHEMA_VERSION` existía pero nunca se leía: cualquier JSON con un array
 * `plans` se daba por bueno tal cual. Aquí sí se comprueba la versión y se
 * normaliza el contenido, de modo que datos antiguos o parcialmente corruptos
 * se cargan en lugar de perderse. Devuelve `null` si no hay nada recuperable.
 */
export function migrateStorageData(raw: unknown): StorageData | null {
  const normalized = normalizedToStorageData(raw);
  if (!normalized) return null;

  return {
    ...normalized,
    schemaVersion: SCHEMA_VERSION,
  };
}
