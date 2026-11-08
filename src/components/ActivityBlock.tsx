import React, { useRef, useState } from 'react';
import { LayoutActivity } from '../domain/types';
import { minutesToPixels, pixelsToMinutes, snapToGrid, formatTime, clampMinutes } from '../domain/time';
import { startPointerDrag } from '../domain/pointerDrag';
import { findRowIdAtPoint } from '../domain/dropTarget';

interface ActivityBlockProps {
  activity: LayoutActivity;
  /** Línea a la que pertenece el bloque (para detectar el cambio de persona). */
  sourceRowId: string;
  pixelsPerHour: number;
  baseLaneHeight?: number;
  onSelect?: (activity: LayoutActivity) => void;
  onMove?: (activityId: string, newStartMinutes: number) => void;
  onResize?: (activityId: string, newStartMinutes: number, newEndMinutes: number) => void;
  /** El bloque se ha soltado sobre la línea de otra persona. */
  onMoveToRow?: (activityId: string, targetRowId: string, newStartMinutes: number) => void;
  /** Avisa de la línea resaltada mientras se arrastra en vertical. */
  onDropTargetChange?: (rowId: string | null) => void;
  /** Teclado: `Supr` elimina la actividad. */
  onDelete?: (activityId: string) => void;
  /** Teclado: `Alt+↑/↓` la pasa a la persona de arriba o de abajo (si existe). */
  adjacentRowIds?: { up: string | null; down: string | null };
}

/** Paso de teclado en minutos (el mismo que la cuadrícula). */
const KEY_STEP = 15;

interface DragPreview {
  startMinutes: number;
  endMinutes: number;
  isMoving: boolean;
  isResizing: boolean;
}

export const ActivityBlock: React.FC<ActivityBlockProps> = ({
  activity,
  sourceRowId,
  pixelsPerHour,
  baseLaneHeight = 44,
  onSelect,
  onMove,
  onResize,
  onMoveToRow,
  onDropTargetChange,
  onDelete,
  adjacentRowIds,
}) => {
  const [dragPreview, setDragPreview] = useState<DragPreview | null>(null);
  // Línea bajo el puntero durante el arrastre (null = la propia línea).
  const dropTargetRef = useRef<string | null>(null);

  const currentStart = dragPreview ? dragPreview.startMinutes : activity.startMinutes;
  const currentEnd = dragPreview ? dragPreview.endMinutes : activity.endMinutes;
  const duration = currentEnd - currentStart;

  const left = minutesToPixels(currentStart, pixelsPerHour);
  const width = Math.max(16, minutesToPixels(duration, pixelsPerHour));
  const top = activity.laneIndex * (baseLaneHeight + 6) + 6;
  const height = baseLaneHeight;

  const clearDropTarget = () => {
    if (dropTargetRef.current !== null) {
      dropTargetRef.current = null;
      onDropTargetChange?.(null);
    }
  };

  // --- Mover el bloque (ratón, dedo o lápiz), incluso a otra persona ---
  const handlePointerDownMove = (e: React.PointerEvent) => {
    e.stopPropagation();

    const actDuration = activity.endMinutes - activity.startMinutes;
    const initialStart = activity.startMinutes;

    const computeStart = (deltaX: number) => {
      const deltaMinutes = pixelsToMinutes(deltaX, pixelsPerHour);
      const snapped = snapToGrid(initialStart + deltaMinutes, 15);
      return clampMinutes(snapped, 0, 1440 - actDuration);
    };

    dropTargetRef.current = null;

    startPointerDrag(e, {
      onMove: (delta, event) => {
        const newStart = computeStart(delta.x);
        setDragPreview({
          startMinutes: newStart,
          endMinutes: newStart + actDuration,
          isMoving: true,
          isResizing: false,
        });

        // ¿Debajo del puntero hay otra persona?
        const rowIdUnderPointer = findRowIdAtPoint(event.clientX, event.clientY);
        const target =
          rowIdUnderPointer && rowIdUnderPointer !== sourceRowId ? rowIdUnderPointer : null;
        if (target !== dropTargetRef.current) {
          dropTargetRef.current = target;
          onDropTargetChange?.(target);
        }
      },
      onEnd: (delta, moved) => {
        const targetRowId = dropTargetRef.current;
        clearDropTarget();

        if (moved) {
          const finalStart = computeStart(delta.x);
          if (targetRowId) {
            onMoveToRow?.(activity.id, targetRowId, finalStart);
          } else if (finalStart !== initialStart) {
            onMove?.(activity.id, finalStart);
          }
        } else {
          // Un clic/tap sin arrastre abre el editor.
          onSelect?.(activity);
        }
        setDragPreview(null);
      },
      onCancel: () => {
        clearDropTarget();
        setDragPreview(null);
      },
    });
  };

  // --- Redimensionar por el extremo izquierdo (hora inicial) ---
  const handlePointerDownResizeLeft = (e: React.PointerEvent) => {
    e.stopPropagation();

    const initialStart = activity.startMinutes;
    const fixedEnd = activity.endMinutes;

    const computeStart = (deltaX: number) => {
      const deltaMinutes = pixelsToMinutes(deltaX, pixelsPerHour);
      const snapped = snapToGrid(initialStart + deltaMinutes, 15);
      return clampMinutes(snapped, 0, fixedEnd - 15); // mínimo 15 min
    };

    startPointerDrag(e, {
      onMove: (delta) => {
        setDragPreview({
          startMinutes: computeStart(delta.x),
          endMinutes: fixedEnd,
          isMoving: false,
          isResizing: true,
        });
      },
      onEnd: (delta, moved) => {
        const finalStart = computeStart(delta.x);
        if (moved && finalStart !== initialStart) onResize?.(activity.id, finalStart, fixedEnd);
        setDragPreview(null);
      },
      onCancel: () => setDragPreview(null),
    });
  };

  // --- Redimensionar por el extremo derecho (hora final) ---
  const handlePointerDownResizeRight = (e: React.PointerEvent) => {
    e.stopPropagation();

    const fixedStart = activity.startMinutes;
    const initialEnd = activity.endMinutes;

    const computeEnd = (deltaX: number) => {
      const deltaMinutes = pixelsToMinutes(deltaX, pixelsPerHour);
      const snapped = snapToGrid(initialEnd + deltaMinutes, 15);
      return clampMinutes(snapped, fixedStart + 15, 1440); // mínimo 15 min
    };

    startPointerDrag(e, {
      onMove: (delta) => {
        setDragPreview({
          startMinutes: fixedStart,
          endMinutes: computeEnd(delta.x),
          isMoving: false,
          isResizing: true,
        });
      },
      onEnd: (delta, moved) => {
        const finalEnd = computeEnd(delta.x);
        if (moved && finalEnd !== initialEnd) onResize?.(activity.id, fixedStart, finalEnd);
        setDragPreview(null);
      },
      onCancel: () => setDragPreview(null),
    });
  };

  /**
   * Alternativa de teclado a los gestos (el bloque es enfocable con Tab):
   * Enter/Espacio editar · ←/→ mover 15 min · Mayús+←/→ cambiar la hora final ·
   * Alt+↑/↓ pasar a otra persona · Supr eliminar.
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const { startMinutes, endMinutes } = activity;
    const duration = endMinutes - startMinutes;

    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        onSelect?.(activity);
        return;
      case 'Delete':
      case 'Backspace':
        e.preventDefault();
        onDelete?.(activity.id);
        return;
      case 'ArrowLeft':
      case 'ArrowRight': {
        e.preventDefault();
        const delta = e.key === 'ArrowLeft' ? -KEY_STEP : KEY_STEP;
        if (e.shiftKey) {
          const newEnd = clampMinutes(endMinutes + delta, startMinutes + KEY_STEP, 1440);
          if (newEnd !== endMinutes) onResize?.(activity.id, startMinutes, newEnd);
        } else {
          const newStart = clampMinutes(startMinutes + delta, 0, 1440 - duration);
          if (newStart !== startMinutes) onMove?.(activity.id, newStart);
        }
        return;
      }
      case 'ArrowUp':
      case 'ArrowDown': {
        if (!e.altKey) return;
        e.preventDefault();
        const target = e.key === 'ArrowUp' ? adjacentRowIds?.up : adjacentRowIds?.down;
        if (target) onMoveToRow?.(activity.id, target, startMinutes);
        return;
      }
    }
  };

  const colorClass = `fx-color-${activity.color}`;
  const formattedTime = `${formatTime(currentStart)} - ${formatTime(currentEnd)}`;
  const isInteracting = dragPreview !== null;

  return (
    <div
      className={`activity-block ${colorClass} ${isInteracting ? 'is-interacting' : ''}`}
      style={{
        left: `${left}px`,
        width: `${width}px`,
        top: `${top}px`,
        height: `${height}px`,
      }}
      onPointerDown={handlePointerDownMove}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      data-activity-id={activity.id}
      aria-label={`${activity.title}, de ${formattedTime.replace(' - ', ' a ')}${activity.comment ? '. Tiene una nota' : ''}`}
      aria-describedby="activity-keyboard-help"
      title={`${activity.title} (${formattedTime})${activity.comment ? `\nNota: ${activity.comment}` : ''}`}
    >
      <div
        className="resize-handle resize-handle-left"
        onPointerDown={handlePointerDownResizeLeft}
        title="Arrastrar para ajustar hora inicial"
      />

      <div className="activity-header">
        <span className="activity-title">{activity.title}</span>
        {width > 65 && (
          <span className="activity-time-badge">{formattedTime}</span>
        )}
      </div>

      {activity.comment && width > 110 && !isInteracting && (
        <div className="activity-comment">
          💬 {activity.comment}
        </div>
      )}

      <div
        className="resize-handle resize-handle-right"
        onPointerDown={handlePointerDownResizeRight}
        title="Arrastrar para ajustar hora final"
      />
    </div>
  );
};