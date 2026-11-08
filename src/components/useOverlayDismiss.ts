import { useRef } from 'react';
import type React from 'react';

/**
 * Cierra un modal al hacer clic en el fondo, pero solo si el gesto EMPEZÓ en el
 * fondo.
 *
 * Con un simple `onClick` en el fondo, seleccionar texto dentro de un campo
 * arrastrando y soltar fuera del cuadro generaba un `click` sobre el fondo y
 * cerraba el modal descartando lo escrito.
 */
export function useOverlayDismiss(onClose: () => void) {
  const pressStartedOnOverlay = useRef(false);

  return {
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
      pressStartedOnOverlay.current = e.target === e.currentTarget;
    },
    onClick: (e: React.MouseEvent<HTMLElement>) => {
      const startedHere = pressStartedOnOverlay.current;
      pressStartedOnOverlay.current = false;
      if (startedHere && e.target === e.currentTarget) onClose();
    },
  };
}
