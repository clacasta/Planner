import React, { useState } from 'react';
import { LayoutActivity } from '../domain/types';
import { minutesToPixels, pixelsToMinutes, snapToGrid, formatTime, clampMinutes } from '../domain/time';

interface ActivityBlockProps {
  activity: LayoutActivity;
  pixelsPerHour: number;
  baseLaneHeight?: number;
  onSelect?: (activity: LayoutActivity) => void;
  onMove?: (activityId: string, newStartMinutes: number) => void;
  onResize?: (activityId: string, newStartMinutes: number, newEndMinutes: number) => void;
}

export const ActivityBlock: React.FC<ActivityBlockProps> = ({
  activity,
  pixelsPerHour,
  baseLaneHeight = 44,
  onSelect,
  onMove,
  onResize,
}) => {
  const [dragPreview, setDragPreview] = useState<{
    startMinutes: number;
    endMinutes: number;
    isMoving: boolean;
    isResizing: boolean;
  } | null>(null);

  const currentStart = dragPreview ? dragPreview.startMinutes : activity.startMinutes;
  const currentEnd = dragPreview ? dragPreview.endMinutes : activity.endMinutes;
  const duration = currentEnd - currentStart;

  const left = minutesToPixels(currentStart, pixelsPerHour);
  const width = Math.max(16, minutesToPixels(duration, pixelsPerHour));
  const top = activity.laneIndex * (baseLaneHeight + 6) + 6;
  const height = baseLaneHeight;

  // Manejador de inicio de movimiento
  const handleMouseDownMove = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Solo clic izquierdo
    e.stopPropagation();

    const startClientX = e.clientX;
    const initialStart = activity.startMinutes;
    const actDuration = activity.endMinutes - activity.startMinutes;
    let hasMoved = false;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startClientX;
      if (Math.abs(deltaX) > 4) {
        hasMoved = true;
      }
      const deltaMinutes = pixelsToMinutes(deltaX, pixelsPerHour);
      let newStart = snapToGrid(initialStart + deltaMinutes, 15);
      
      // Limitar dentro de [0, 1440 - duration]
      newStart = clampMinutes(newStart, 0, 1440 - actDuration);
      const newEnd = newStart + actDuration;

      setDragPreview({
        startMinutes: newStart,
        endMinutes: newEnd,
        isMoving: true,
        isResizing: false,
      });
    };

    const handleMouseUp = (upEvent: MouseEvent) => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);

      const deltaX = upEvent.clientX - startClientX;
      if (hasMoved && onMove) {
        const deltaMinutes = pixelsToMinutes(deltaX, pixelsPerHour);
        let finalStart = snapToGrid(initialStart + deltaMinutes, 15);
        finalStart = clampMinutes(finalStart, 0, 1440 - actDuration);
        onMove(activity.id, finalStart);
      } else {
        onSelect?.(activity);
      }
      setDragPreview(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Manejador de redimensionado izquierdo (inicio)
  const handleMouseDownResizeLeft = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();

    const startClientX = e.clientX;
    const initialStart = activity.startMinutes;
    const fixedEnd = activity.endMinutes;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startClientX;
      const deltaMinutes = pixelsToMinutes(deltaX, pixelsPerHour);
      let newStart = snapToGrid(initialStart + deltaMinutes, 15);
      newStart = clampMinutes(newStart, 0, fixedEnd - 15); // Al menos 15m

      setDragPreview({
        startMinutes: newStart,
        endMinutes: fixedEnd,
        isMoving: false,
        isResizing: true,
      });
    };

    const handleMouseUp = (upEvent: MouseEvent) => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);

      const deltaX = upEvent.clientX - startClientX;
      const deltaMinutes = pixelsToMinutes(deltaX, pixelsPerHour);
      let finalStart = snapToGrid(initialStart + deltaMinutes, 15);
      finalStart = clampMinutes(finalStart, 0, fixedEnd - 15);

      if (finalStart !== initialStart && onResize) {
        onResize(activity.id, finalStart, fixedEnd);
      }
      setDragPreview(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Manejador de redimensionado derecho (fin)
  const handleMouseDownResizeRight = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();

    const startClientX = e.clientX;
    const initialEnd = activity.endMinutes;
    const fixedStart = activity.startMinutes;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startClientX;
      const deltaMinutes = pixelsToMinutes(deltaX, pixelsPerHour);
      let newEnd = snapToGrid(initialEnd + deltaMinutes, 15);
      newEnd = clampMinutes(newEnd, fixedStart + 15, 1440); // Al menos 15m

      setDragPreview({
        startMinutes: fixedStart,
        endMinutes: newEnd,
        isMoving: false,
        isResizing: true,
      });
    };

    const handleMouseUp = (upEvent: MouseEvent) => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);

      const deltaX = upEvent.clientX - startClientX;
      const deltaMinutes = pixelsToMinutes(deltaX, pixelsPerHour);
      let finalEnd = snapToGrid(initialEnd + deltaMinutes, 15);
      finalEnd = clampMinutes(finalEnd, fixedStart + 15, 1440);

      if (finalEnd !== initialEnd && onResize) {
        onResize(activity.id, fixedStart, finalEnd);
      }
      setDragPreview(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
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
      onMouseDown={handleMouseDownMove}
      title={`${activity.title} (${formattedTime})${activity.comment ? `\nNota: ${activity.comment}` : ''}`}
    >
      <div
        className="resize-handle resize-handle-left"
        onMouseDown={handleMouseDownResizeLeft}
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
        onMouseDown={handleMouseDownResizeRight}
        title="Arrastrar para ajustar hora final"
      />
    </div>
  );
};
