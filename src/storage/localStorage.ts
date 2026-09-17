import { StorageData, SCHEMA_VERSION, STORAGE_KEY } from './schema';
import { SAMPLE_DAY_PLAN } from '../domain/sampleData';
import { migrateStorageData } from './migrations';

/** Prefijo de las copias de seguridad automáticas previas a una importación. */
export const PRE_IMPORT_KEY = `${STORAGE_KEY}:pre-import`;

/**
 * Devuelve el estado inicial por defecto con el plan de ejemplo precargado.
 */
export function getDefaultStorageData(): StorageData {
  return {
    schemaVersion: SCHEMA_VERSION,
    activePlanId: SAMPLE_DAY_PLAN.id,
    plans: [SAMPLE_DAY_PLAN],
  };
}

export interface LoadResult {
  data: StorageData;
  /** Mensaje para avisar al usuario de que algo no se pudo leer. */
  warning?: string;
  /** Clave de localStorage donde se ha conservado el contenido original. */
  preservedKey?: string;
}

/**
 * Conserva intacto el contenido que no se ha podido interpretar.
 *
 * Antes, si el JSON guardado estaba corrupto se devolvía el plan de ejemplo y
 * el autoguardado inmediato sobrescribía la clave original: los datos del
 * usuario desaparecían sin aviso ni copia.
 */
export function preserveCorruptRaw(raw: string): string | undefined {
  try {
    const key = `${STORAGE_KEY}:corrupt-${new Date().toISOString().replace(/[:.]/g, '-')}`;
    localStorage.setItem(key, raw);
    return key;
  } catch {
    return undefined;
  }
}

/**
 * Lee la clave de datos del almacenamiento local sin lanzar excepciones.
 */
function readStoredRaw(): { raw: string | null; accessible: boolean } {
  try {
    return { raw: localStorage.getItem(STORAGE_KEY), accessible: true };
  } catch {
    return { raw: null, accessible: false };
  }
}

/**
 * Carga los datos guardados, migrando/normalizando si hace falta.
 */
export function loadStorageData(): LoadResult {
  const { raw, accessible } = readStoredRaw();

  if (!accessible) {
    return {
      data: getDefaultStorageData(),
      warning: 'Este navegador no permite acceder al almacenamiento local: los cambios no se guardarán.',
    };
  }

  if (!raw) {
    const defaultData = getDefaultStorageData();
    saveStorageData(defaultData);
    return { data: defaultData };
  }

  let parsed: unknown = null;
  let corrupt = false;
  try {
    parsed = JSON.parse(raw);
  } catch {
    corrupt = true;
  }

  if (!corrupt) {
    const migrated = migrateStorageData(parsed);
    if (migrated) return { data: migrated };
  }

  const preservedKey = preserveCorruptRaw(raw);
  return {
    data: getDefaultStorageData(),
    warning: preservedKey
      ? `No se pudieron leer los datos guardados: se ha conservado una copia intacta (${preservedKey}) y se ha cargado el ejemplo.`
      : 'No se pudieron leer los datos guardados y no se ha podido conservar una copia. Se ha cargado el ejemplo.',
    preservedKey,
  };
}

/**
 * Guarda los datos en localStorage. Devuelve `false` si no se pudo guardar
 * (cuota superada, modo privado...), para que la interfaz pueda avisar.
 */
export function saveStorageData(data: StorageData): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('Error al guardar datos en localStorage:', error);
    return false;
  }
}

/** Guarda una copia del estado actual antes de importar algo encima. */
export function savePreImportBackup(data: StorageData): boolean {
  try {
    localStorage.setItem(
      PRE_IMPORT_KEY,
      JSON.stringify({ savedAt: new Date().toISOString(), data })
    );
    return true;
  } catch {
    return false;
  }
}

/** Recupera la última copia previa a una importación, si existe. */
export function loadPreImportBackup(): StorageData | null {
  try {
    const raw = localStorage.getItem(PRE_IMPORT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { data?: unknown };
    return migrateStorageData(parsed.data);
  } catch {
    return null;
  }
}

/** Lee un contenido arbitrario del almacenamiento (para descargar copias). */
export function readRawStorageValue(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
