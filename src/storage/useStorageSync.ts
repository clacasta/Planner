import { useEffect, useRef } from 'react';
import { saveStorageData } from './localStorage';
import { migrateStorageData } from './migrations';
import { StorageData, STORAGE_KEY } from './schema';

interface StorageSyncOptions {
  /** Estado actual a guardar. */
  storage: StorageData;
  /** Sustituye el estado por el que llega de otra pestaña (sin historial). */
  onExternalChange: (next: StorageData) => void;
  /** Se llama una vez cada vez que se pasa de guardar bien a fallar. */
  onSaveError: () => void;
}

/**
 * Persistencia en localStorage:
 * - autoguardado de cada cambio, avisando si falla (cuota, modo privado...);
 * - sincronización entre pestañas: si otra pestaña guarda, se cargan sus
 *   cambios en lugar de pisarlos con el siguiente autoguardado. Cada pestaña
 *   conserva el día que estaba viendo, y un cambio de día en otra pestaña (lo
 *   único que difiere) no se aplica aquí.
 */
export function useStorageSync({ storage, onExternalChange, onSaveError }: StorageSyncOptions) {
  // Último contenido guardado o recibido: evita reescribir lo mismo y que dos
  // pestañas se reenvíen los cambios una a otra sin fin.
  const lastSavedRawRef = useRef<string | null>(null);
  const saveErrorShownRef = useRef(false);
  const storageRef = useRef(storage);
  const onExternalChangeRef = useRef(onExternalChange);
  const onSaveErrorRef = useRef(onSaveError);

  useEffect(() => {
    storageRef.current = storage;
    onExternalChangeRef.current = onExternalChange;
    onSaveErrorRef.current = onSaveError;
  });

  useEffect(() => {
    const raw = JSON.stringify(storage);
    if (raw === lastSavedRawRef.current) return;
    lastSavedRawRef.current = raw;

    const ok = saveStorageData(storage);
    if (!ok && !saveErrorShownRef.current) {
      saveErrorShownRef.current = true;
      onSaveErrorRef.current();
    }
    if (ok) saveErrorShownRef.current = false;
  }, [storage]);

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY || e.newValue === null) return;
      let parsed: unknown;
      try {
        parsed = JSON.parse(e.newValue);
      } catch {
        return;
      }
      const incoming = migrateStorageData(parsed);
      if (!incoming) return;

      const current = storageRef.current;
      const sameContent =
        JSON.stringify([incoming.members, incoming.plans]) ===
        JSON.stringify([current.members, current.plans]);
      if (sameContent) return;

      const next: StorageData = incoming.plans.some((p) => p.id === current.activePlanId)
        ? { ...incoming, activePlanId: current.activePlanId }
        : incoming;
      lastSavedRawRef.current = JSON.stringify(next);
      onExternalChangeRef.current(next);
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);
}
