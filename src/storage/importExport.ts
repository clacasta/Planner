import { StorageData, SCHEMA_VERSION } from './schema';
import { DayPlan } from '../domain/types';
import { parseImportPayload, ImportPayload } from './validate';

/** Fuerza la descarga de un contenido de texto. */
function downloadText(content: string, filename: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function sanitizeFilename(name: string, fallback: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || fallback
  );
}

/**
 * Descarga una planificación individual en formato JSON.
 */
export function exportPlanAsJSON(plan: DayPlan): void {
  downloadText(
    JSON.stringify(plan, null, 2),
    `${sanitizeFilename(plan.name, 'plan')}.json`,
    'application/json'
  );
}

/**
 * Descarga una copia de seguridad completa con todas las planificaciones.
 */
export function exportAllPlansAsJSON(data: StorageData): void {
  const today = new Date().toISOString().split('T')[0];
  downloadText(
    JSON.stringify({ ...data, schemaVersion: SCHEMA_VERSION }, null, 2),
    `family-day-planner-backup-${today}.json`,
    'application/json'
  );
}

/** Lee un fichero como texto (o lanza un error legible). */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve((event.target?.result as string) ?? '');
    reader.onerror = () => reject(new Error('Error de lectura al cargar el archivo.'));
    reader.readAsText(file);
  });
}

/**
 * Importa un archivo JSON: devuelve el contenido ya validado y normalizado,
 * sin aplicarlo. Quien llama decide si lo incorpora (y avisa al usuario).
 */
export async function importPlanFromJSONFile(file: File): Promise<ImportPayload> {
  const text = await readFileAsText(file);
  return parseImportPayload(text);
}
