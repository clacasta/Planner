import React, { useState, useRef } from 'react';
import { TimelineRow as TimelineRowType, Activity } from '../domain/types';
import { calculateLayoutActivities } from '../domain/collisions';
import { pixelsToMinutes, snapToGrid, clampMinutes, minutesToPixels, formatTime } from '../domain/time';
import { ActivityBlock } from './ActivityBlock';
import { Eye, EyeOff, Plus, ChevronUp, ChevronDown } from 'lucide-react';

interface TimelineRowProps {
  row: TimelineRowType;
  pixelsPerHour: number;
  rowHeaderWidth: number;
  isFirst?: boolean;
  isLast?: boolean;
  onMoveRow?: (rowId: string, direction: 'up' | 'down') => void;
  onToggleVisibility?: (rowId: string) => void;
  onAddActivity?: (rowId: string) => void;
  onSelectActivity?: (activity: Activity, rowId: string) => void;
  onMoveActivity?: (rowId: string, activityId: string, newStartMinutes: number) => void;
  onResizeActivity?: (rowId: string, activityId: string, newStartMinutes: number, newEndMinutes: number) => void;
  onCreateActivity?: (rowId: string, startMinutes: number, endMinutes: number) => void;
}

export const TimelineRow: React.FC<TimelineRowProps> = ({
  row,
  pixelsPerHour,
  rowHeaderWidth,
  isFirst = false,
  isLast = false,
  onMoveRow,
  onToggleVisibility,
  onAddActivity,
  onSelectActivity,
  onMoveActivity,
  onResizeActivity,
  onCreateActivity,
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [creationDraft, setCreationDraft] = useState<{
    startMinutes: number;
    endMinutes: number;
  } | null>(null);

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const { layoutActivities, maxLanes } = calculateLayoutActivities(row.activities);

  const baseLaneHeight = 44;
  const rowHeight = Math.max(64, maxLanes * (baseLaneHeight + 6) + 12);
  const totalTrackWidth = 24 * pixelsPerHour;

  // Manejo de creación por arrastre en la pista temporal
  const handleTrackMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0 || !trackRef.current) return;

    const rect = trackRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const initialMinute = snapToGrid(pixelsToMinutes(clickX, pixelsPerHour), 15);
    const clampedInitial = clampMinutes(initialMinute, 0, 1425);

    let currentDraft = {
      startMinutes: clampedInitial,
      endMinutes: clampedInitial + 15,
    };

    setCreationDraft(currentDraft);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!trackRef.current) return;
      const currentRect = trackRef.current.getBoundingClientRect();
      const currentX = moveEvent.clientX - currentRect.left;
      const currentMin = snapToGrid(pixelsToMinutes(currentX, pixelsPerHour), 15);

      if (currentMin >= clampedInitial) {
        currentDraft = {
          startMinutes: clampedInitial,
          endMinutes: clampMinutes(Math.max(clampedInitial + 15, currentMin), 15, 1440),
        };
      } else {
        currentDraft = {
          startMinutes: clampMinutes(currentMin, 0, clampedInitial - 15),
          endMinutes: clampedInitial,
        };
      }
      setCreationDraft(currentDraft);
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);

      if (currentDraft && currentDraft.endMinutes - currentDraft.startMinutes >= 15) {
        onCreateActivity?.(row.id, currentDraft.startMinutes, currentDraft.endMinutes);
      }
      setCreationDraft(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  if (!row.visible) {
    return (
      <div className="timeline-row" style={{ minHeight: '40px', opacity: 0.5 }}>
        <div
          className="row-header"
          style={{ width: `${rowHeaderWidth}px`, minWidth: `${rowHeaderWidth}px` }}
        >
          <div className="row-person-info">
            <span className={`row-color-dot fx-dot-${row.color}`} />
            <span className="row-name">{row.name} (oculto)</span>
          </div>
          <div className="row-actions">
            <button
              className="icon-btn"
              disabled={isFirst}
              onClick={() => onMoveRow?.(row.id, 'up')}
              title="Mover arriba"
            >
              <ChevronUp size={15} />
            </button>
            <button
              className="icon-btn"
              disabled={isLast}
              onClick={() => onMoveRow?.(row.id, 'down')}
              title="Mover abajo"
            >
              <ChevronDown size={15} />
            </button>
            <button
              className="icon-btn"
              onClick={() => onToggleVisibility?.(row.id)}
              title="Mostrar línea"
            >
              <EyeOff size={16} />
            </button>
          </div>
        </div>
        <div className="row-track" style={{ width: `${totalTrackWidth}px` }} />
      </div>
    );
  }

  return (
    <div className="timeline-row" style={{ minHeight: `${rowHeight}px` }}>
      {/* Columna fija de la persona */}
      <div
        className="row-header"
        style={{ width: `${rowHeaderWidth}px`, minWidth: `${rowHeaderWidth}px` }}
      >
        <div className="row-person-info">
          <span className={`row-color-dot fx-dot-${row.color}`} />
          <span className="row-name">{row.name}</span>
        </div>
        <div className="row-actions">
          {/* Botones de reordenación vertical */}
          <button
            className="icon-btn"
            disabled={isFirst}
            onClick={() => onMoveRow?.(row.id, 'up')}
            title="Mover persona arriba"
          >
            <ChevronUp size={15} />
          </button>
          <button
            className="icon-btn"
            disabled={isLast}
            onClick={() => onMoveRow?.(row.id, 'down')}
            title="Mover persona abajo"
          >
            <ChevronDown size={15} />
          </button>

          <button
            className="icon-btn"
            onClick={() => onAddActivity?.(row.id)}
            title="Añadir actividad manual"
          >
            <Plus size={16} />
          </button>
          <button
            className="icon-btn"
            onClick={() => onToggleVisibility?.(row.id)}
            title="Ocultar línea"
          >
            <Eye size={16} />
          </button>
        </div>
      </div>

      {/* Pista temporal de 24 horas */}
      <div
        ref={trackRef}
        className="row-track"
        style={{
          width: `${totalTrackWidth}px`,
          minWidth: `${totalTrackWidth}px`,
          height: `${rowHeight}px`,
        }}
        onMouseDown={handleTrackMouseDown}
      >
        {/* Cuadrícula de fondo por horas */}
        <div className="row-track-grid">
          {hours.map((hour) => (
            <div
              key={hour}
              className="track-hour-grid"
              style={{ width: `${pixelsPerHour}px` }}
            />
          ))}
        </div>

        {/* Bloques de actividades existentes */}
        {layoutActivities.map((act) => (
          <ActivityBlock
            key={act.id}
            activity={act}
            pixelsPerHour={pixelsPerHour}
            baseLaneHeight={baseLaneHeight}
            onSelect={(selected) => onSelectActivity?.(selected, row.id)}
            onMove={(actId, newStart) => onMoveActivity?.(row.id, actId, newStart)}
            onResize={(actId, newStart, newEnd) => onResizeActivity?.(row.id, actId, newStart, newEnd)}
          />
        ))}

        {/* Bloque temporal borrador durante arrastre de creación */}
        {creationDraft && (
          <div
            className="activity-block draft-activity-block"
            style={{
              left: `${minutesToPixels(creationDraft.startMinutes, pixelsPerHour)}px`,
              width: `${Math.max(16, minutesToPixels(creationDraft.endMinutes - creationDraft.startMinutes, pixelsPerHour))}px`,
              top: '6px',
              height: `${baseLaneHeight}px`,
            }}
          >
            <div className="activity-header">
              <span className="activity-title">Nueva actividad...</span>
              <span className="activity-time-badge">
                {formatTime(creationDraft.startMinutes)} - {formatTime(creationDraft.endMinutes)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
