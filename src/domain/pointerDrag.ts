import type React from 'react';

/**
 * Gestos de arrastre unificados para ratón, dedo y lápiz.
 *
 * Motivo: toda la interacción del planificador (crear, mover, redimensionar)
 * estaba ligada a `mousedown`/`mousemove`, que NO se emiten al arrastrar con el
 * dedo. Con Pointer Events la misma lógica sirve para los tres dispositivos.
 *
 * Requisito imprescindible en CSS: el elemento con el que se arrastra debe
 * declarar `touch-action` (`none` en los bloques, `pan-x pan-y` en la pista); si
 * no, el navegador se queda el gesto para hacer scroll y llega `pointercancel`.
 */
export interface PointerDragDelta {
  x: number;
  y: number;
}

export interface PointerDragHandlers {
  /** Se llama en cada movimiento, con el desplazamiento en píxeles (x e y). */
  onMove: (delta: PointerDragDelta, event: PointerEvent) => void;
  /** Fin del gesto: `moved` indica si se superó el umbral de arrastre. */
  onEnd: (delta: PointerDragDelta, moved: boolean) => void;
  /** El gesto lo canceló el navegador (scroll, multitáctil...). Revertir preview. */
  onCancel?: () => void;
}

const DRAG_THRESHOLD_PX = 4;

/**
 * Arranca un gesto de arrastre. Devuelve `false` si el evento no es válido como
 * inicio de arrastre (botón secundario del ratón).
 */
export function startPointerDrag(
  event: React.PointerEvent,
  handlers: PointerDragHandlers,
  thresholdPx: number = DRAG_THRESHOLD_PX
): boolean {
  if (event.pointerType === 'mouse' && event.button !== 0) return false;

  const startClientX = event.clientX;
  const startClientY = event.clientY;
  let moved = false;

  const handlePointerMove = (moveEvent: PointerEvent) => {
    const delta: PointerDragDelta = {
      x: moveEvent.clientX - startClientX,
      y: moveEvent.clientY - startClientY,
    };
    // El umbral mira los dos ejes: arrastrar en vertical (para mover la
    // actividad a otra persona) es un arrastre igual que el horizontal.
    if (Math.abs(delta.x) > thresholdPx || Math.abs(delta.y) > thresholdPx) moved = true;
    handlers.onMove(delta, moveEvent);
  };

  const cleanup = () => {
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', handlePointerUp);
    window.removeEventListener('pointercancel', handlePointerCancel);
  };

  const handlePointerUp = (upEvent: PointerEvent) => {
    cleanup();
    handlers.onEnd(
      { x: upEvent.clientX - startClientX, y: upEvent.clientY - startClientY },
      moved
    );
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