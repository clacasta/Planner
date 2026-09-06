import { StorageData, SCHEMA_VERSION, STORAGE_KEY } from './schema';
import { SAMPLE_DAY_PLAN } from '../domain/sampleData';

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

/**
 * Carga los datos almacenados en localStorage o inicializa con el plan de ejemplo.
 */
export function loadStorageData(): StorageData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const defaultData = getDefaultStorageData();
      saveStorageData(defaultData);
      return defaultData;
    }

    const parsed = JSON.parse(raw);

    // Validación básica y migración si fuera necesario
    if (!parsed || !Array.isArray(parsed.plans) || parsed.plans.length === 0) {
      return getDefaultStorageData();
    }

    return {
      schemaVersion: parsed.schemaVersion || SCHEMA_VERSION,
      activePlanId: parsed.activePlanId || parsed.plans[0].id,
      plans: parsed.plans,
    };
  } catch (error) {
    console.error('Error al cargar datos desde localStorage:', error);
    return getDefaultStorageData();
  }
}

/**
 * Guarda los datos en localStorage de forma segura.
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
