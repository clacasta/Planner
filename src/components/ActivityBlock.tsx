import React, { useState } from 'react';
import { LayoutActivity } from '../domain/types';
import { minutesToPixels, pixelsToMinutes, snapToGrid, formatTime, clampMinutes } from '../domain/time';
import { startPointerDrag } from '../domain/pointerDrag';

interface ActivityBlockProps {
  activity: LayoutActivity;
  pixelsPerHour: number;
  baseLaneHeight?: number;
  onSelect?: (activity: LayoutActivity) => void;
  onMove?: (activityId: string, newStartMinutes: number) => void;
  onResize?: (activityId: string, newStartMinutes: number, newEndMinutes: number) => void;
}

interface DragPreview {
  startMinutes: number;
  endMinutes: number;
  isMoving: boolean;
  isResizing: boolean;
}

export const ActivityBlock: React.FC<ActivityBlockProps> = ({
  activity,
  pixelsPerHour,
  baseLaneHeight = 44,
  onSelect,
  onMove,
  onResize,
}) => {
  const [dragPreview, setDragPreview] = useState<DragPreview | null>(null);

  const currentStart = dragPreview ? dragPreview.startMinutes : activity.startMinutes;
  const currentEnd = dragPreview ? dragPreview.endMinutes : activity.endMinutes;
  const duration = currentEnd - currentStart;

  const left = minutesToPixels(currentStart, pixelsPerHour);
  const width = Math.max(16, minutesToPixels(duration, pixelsPerHour));
  const top = activity.laneIndex * (baseLaneHeight + 6) + 6;
  const height = baseLaneHeight;

  // --- Mover el bloque completo (ratón, dedo o lápiz) ---
  const handlePointerDownMove = (e: React.PointerEvent) => {
    e.stopPropagation();

    const actDuration = activity.endMinutes - activity.startMinutes;
    const initialStart = activity.startMinutes;

    const computeStart = (deltaX: number) => {
      const deltaMinutes = pixelsToMinutes(deltaX, pixelsPerHour);
      const snapped = snapToGrid(initialStart + deltaMinutes, 15);
      return clampMinutes(snapped, 0, 1440 - actDuration);
    };

    startPointerDrag(e, {
      onMove: (deltaX) => {
        const newStart = computeStart(deltaX);
        setDragPreview({
          startMinutes: newStart,
          endMinutes: newStart + actDuration,
          isMoving: true,
          isResizing: false,
        });
      },
      onEnd: (deltaX, moved) => {
        if (moved) {
          const finalStart = computeStart(deltaX);
          if (finalStart !== initialStart) onMove?.(activity.id, finalStart);
        } else {
          // Un clic/tap sin arrastre abre el editor.
          onSelect?.(activity);
        }
        setDragPreview(null);
      },
      onCancel: () => setDragPreview(null),
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
      onMove: (deltaX) => {
        setDragPreview({
          startMinutes: computeStart(deltaX),
          endMinutes: fixedEnd,
          isMoving: false,
          isResizing: true,
        });
      },
      onEnd: (deltaX, moved) => {
        const finalStart = computeStart(deltaX);
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
      onMove: (deltaX) => {
        setDragPreview({
          startMinutes: fixedStart,
          endMinutes: computeEnd(deltaX),
          isMoving: false,
          isResizing: true,
        });
      },
      onEnd: (deltaX, moved) => {
        const finalEnd = computeEnd(deltaX);
        if (moved && finalEnd !== initialEnd) onResize?.(activity.id, fixedStart, finalEnd);
        setDragPreview(null);
      },
      onCancel: () => setDragPreview(null),
    });
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