import { useCallback, useRef, useState } from 'react';

const HISTORY_LIMIT = 50;

interface HistoryEntry<T> {
  state: T;
  /** Etiqueta de la acción que produjo el estado siguiente. */
  label: string;
}

export interface HistoryController<T> {
  value: T;
  /** Aplica un cambio y lo deja deshacer. */
  commit: (updater: (prev: T) => T, label: string, options?: { undoable?: boolean }) => void;
  /** Cambia el valor sin tocar el historial (carga inicial, reseteo...). */
  reset: (value: T) => void;
  /** Deshace. Devuelve la etiqueta de la acción deshecha, o `null`. */
  undo: () => string | null;
  /** Rehace. Devuelve la etiqueta de la acción rehecha, o `null`. */
  redo: () => string | null;
  canUndo: boolean;
  canRedo: boolean;
}

/**
 * Historial de estados con deshacer/rehacer.
 *
 * Se guarda el valor en un `ref` y se calcula el siguiente estado fuera del
 * updater de React: así `StrictMode` (que invoca los updaters dos veces en
 * desarrollo) no duplica entradas del historial.
 *
 * Las pilas viven en refs (no hacen falta para pintar), pero sus tamaños se
 * reflejan en un estado para poder mostrar/ocultar los botones sin leer un ref
 * durante el render.
 */
export function useHistoryState<T>(initial: T): HistoryController<T> {
  const [value, setValue] = useState<T>(initial);
  const valueRef = useRef<T>(initial);
  const pastRef = useRef<HistoryEntry<T>[]>([]);
  const futureRef = useRef<HistoryEntry<T>[]>([]);
  const [availability, setAvailability] = useState({ canUndo: false, canRedo: false });

  const applyValue = useCallback((next: T) => {
    valueRef.current = next;
    setValue(next);
  }, []);

  const syncAvailability = useCallback(() => {
    setAvailability({
      canUndo: pastRef.current.length > 0,
      canRedo: futureRef.current.length > 0,
    });
  }, []);

  const commit = useCallback<HistoryController<T>['commit']>(
    (updater, label, options) => {
      const prev = valueRef.current;
      const next = updater(prev);
      if (next === prev) return;

      if (options?.undoable !== false) {
        pastRef.current = [...pastRef.current, { state: prev, label }].slice(-HISTORY_LIMIT);
        futureRef.current = [];
      }

      applyValue(next);
      syncAvailability();
    },
    [applyValue, syncAvailability]
  );

  const reset = useCallback(
    (next: T) => {
      pastRef.current = [];
      futureRef.current = [];
      applyValue(next);
      syncAvailability();
    },
    [applyValue, syncAvailability]
  );

  const undo = useCallback((): string | null => {
    const entry = pastRef.current[pastRef.current.length - 1];
    if (!entry) return null;

    pastRef.current = pastRef.current.slice(0, -1);
    futureRef.current = [{ state: valueRef.current, label: entry.label }, ...futureRef.current];
    applyValue(entry.state);
    syncAvailability();
    return entry.label;
  }, [applyValue, syncAvailability]);

  const redo = useCallback((): string | null => {
    const entry = futureRef.current[0];
    if (!entry) return null;

    futureRef.current = futureRef.current.slice(1);
    pastRef.current = [...pastRef.current, { state: valueRef.current, label: entry.label }].slice(
      -HISTORY_LIMIT
    );
    applyValue(entry.state);
    syncAvailability();
    return entry.label;
  }, [applyValue, syncAvailability]);

  return {
    value,
    commit,
    reset,
    undo,
    redo,
    canUndo: availability.canUndo,
    canRedo: availability.canRedo,
  };
}
