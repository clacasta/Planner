import type React from 'react';

/**
 * Gestos de arrastre unificados para ratón, dedo y lápiz.
 *
 * Motivo: toda la interacción del planificador (crear, mover, redimensionar)
 * estaba ligada a `mousedown`/`mousemove`, que NO se emiten al arrastrar con el
 * dedo. Con Pointer Events la misma lógica sirve para los tres dispositivos.
 *
 * Requisito imprescindible en CSS: el elemento con el que se arrastra debe
 * declarar `touch-action: none` (bloques) o `touch-action: pan-x` (pista), si no
 * el navegador se queda el gesto para hacer scroll y llega `pointercancel`.
 */
export interface PointerDragHandlers {
  /** Se llama en cada movimiento, con el desplazamiento horizontal en píxeles. */
  onMove: (deltaX: number, event: PointerEvent) => void;
  /** Fin del gesto: `moved` indica si se superó el umbral de arrastre. */
  onEnd: (deltaX: number, moved: boolean) => void;
  /** El gesto lo canceló el navegador (scroll, multitáctil...). Revertir preview. */
  onCancel?: () => void;
}

const DRAG_THRESHOLD_PX = 4;

/**
 * Arranca un gesto de arrastre horizontal. Devuelve `false` si el evento no es
 * válido como inicio de arrastre (botón secundario del ratón).
 */
export function startPointerDrag(
  event: React.PointerEvent,
  handlers: PointerDragHandlers,
  thresholdPx: number = DRAG_THRESHOLD_PX
): boolean {
  if (event.pointerType === 'mouse' && event.button !== 0) return false;

  const startClientX = event.clientX;
  let moved = false;

  const handlePointerMove = (moveEvent: PointerEvent) => {
    const deltaX = moveEvent.clientX - startClientX;
    if (Math.abs(deltaX) > thresholdPx) moved = true;
    handlers.onMove(deltaX, moveEvent);
  };

  const cleanup = () => {
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', handlePointerUp);
    window.removeEventListener('pointercancel', handlePointerCancel);
  };

  const handlePointerUp = (upEvent: PointerEvent) => {
    cleanup();
    handlers.onEnd(upEvent.clientX - startClientX, moved);
  };

  const handlePointerCancel = () => {
    cleanup();
    handlers.onCancel?.();
  };

  window.addEventListener('pointermove', handlePointerMove);
  window.addEventListener('pointerup', handlePointerUp);
  window.addEventListener('pointercancel', handlePointerCancel);

  return true;
}