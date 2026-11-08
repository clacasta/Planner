import { useCallback, useEffect, useRef, useState } from 'react';

export interface Toast {
  text: string;
  kind: 'info' | 'error';
  actionLabel?: string;
  action?: () => void;
  /**
   * Versión del historial a la que se refiere la acción. Si después hay otro
   * cambio, el botón desaparece: «Deshacer» deshace siempre el ÚLTIMO cambio y
   * ya no sería el que anuncia el aviso.
   */
  historyVersion?: number;
}

const TOAST_TIMEOUT_MS = 6000;

/** Aviso flotante único que se cierra solo a los pocos segundos. */
export function useToast() {
  const [toast, setToast] = useState<Toast | null>(null);
  const timerRef = useRef<number | null>(null);

  const showToast = useCallback((next: Toast) => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    setToast(next);
    timerRef.current = window.setTimeout(() => setToast(null), TOAST_TIMEOUT_MS);
  }, []);

  const dismissToast = useCallback(() => setToast(null), []);

  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    },
    []
  );

  return { toast, showToast, dismissToast };
}
