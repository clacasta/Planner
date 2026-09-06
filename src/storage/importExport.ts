import { DayPlan } from '../domain/types';
import { StorageData } from './schema';

/**
 * Descarga una planificación individual en formato JSON.
 */
export function exportPlanAsJSON(plan: DayPlan): void {
  const dataStr = JSON.stringify(plan, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const sanitizedName = plan.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'plan';

  const link = document.createElement('a');
  link.href = url;
  link.download = `${sanitizedName}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Descarga una copia de seguridad completa con todas las planificaciones.
 */
export function exportAllPlansAsJSON(data: StorageData): void {
  const dataStr = JSON.stringify(data, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const today = new Date().toISOString().split('T')[0];
  const link = document.createElement('a');
  link.href = url;
  link.download = `family-day-planner-backup-${today}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Valida si un objeto tiene la estructura mínima de un DayPlan.
 */
export function isValidDayPlan(obj: any): obj is DayPlan {
  return (
    obj &&
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    Array.isArray(obj.rows)
  );
}

/**
 * Importa y valida un archivo JSON (puede ser un DayPlan individual o un StorageData completo).
 */
export function importPlanFromJSONFile(
  file: File
): Promise<{ singlePlan?: DayPlan; fullBackup?: StorageData }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);

        // Caso 1: Backup completo con schemaVersion y plans[]
        if (parsed && Array.isArray(parsed.plans) && parsed.plans.length > 0) {
          resolve({ fullBackup: parsed });
          return;
        }

        // Caso 2: Plan individual
        if (isValidDayPlan(parsed)) {
          resolve({ singlePlan: parsed });
          return;
        }

        reject(new Error('El archivo no contiene un formato de planificación válido.'));
      } catch (err) {
        reject(new Error('No se pudo leer el archivo JSON: formato no válido.'));
      }
    };

    reader.onerror = () => {
      reject(new Error('Error de lectura al cargar el archivo.'));
    };

    reader.readAsText(file);
  });
}
