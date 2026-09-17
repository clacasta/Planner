import React, { useState, useRef } from 'react';
import { TimelineRow as TimelineRowType, Activity } from '../domain/types';
import { calculateLayoutActivities } from '../domain/collisions';
import { pixelsToMinutes, snapToGrid, clampMinutes, minutesToPixels, formatTime } from '../domain/time';
import { startPointerDrag } from '../domain/pointerDrag';
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

/** Duración por defecto al crear con un toque en pantalla táctil. */
const TOUCH_TAP_CREATE_MINUTES = 60;

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

  /**
   * Creación de actividades sobre la pista temporal.
   *
   * - Ratón: clic y arrastre (con previsualización) para definir la duración.
   * - Dedo/lápiz: un toque crea una actividad de 1 h y abre el editor; el
   *   arrastre con el dedo se deja al navegador para desplazar el día, que es
   *   el gesto que el usuario espera en móvil.
   */
  const handleTrackPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!trackRef.current) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    const rect = trackRef.current.getBoundingClientRect();
    const minuteAt = (clientX: number) =>
      clampMinutes(snapToGrid(pixelsToMinutes(clientX - rect.left, pixelsPerHour), 15), 0, 1425);

    if (e.pointerType !== 'mouse') {
      const startedAt = Date.now();
      startPointerDrag(e, {
        onMove: () => undefined,
        onEnd: (_deltaX, moved) => {
          const isTap = !moved && Date.now() - startedAt < 700;
          if (!isTap) return;
          const startMinutes = minuteAt(e.clientX);
          const endMinutes = clampMinutes(startMinutes + TOUCH_TAP_CREATE_MINUTES, 15, 1440);
          onCreateActivity?.(row.id, startMinutes, endMinutes);
        },
      });
      return;
    }

    const clampedInitial = minuteAt(e.clientX);
    let currentDraft = {
      startMinutes: clampedInitial,
      endMinutes: clampedInitial + 15,
    };
    setCreationDraft(currentDraft);

    startPointerDrag(e, {
      onMove: (deltaX) => {
        if (!trackRef.current) return;
        const currentMin = snapToGrid(
          pixelsToMinutes(e.clientX + deltaX - rect.left, pixelsPerHour),
          15
        );

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
      },
      onEnd: (_deltaX, moved) => {
        if (moved && currentDraft.endMinutes - currentDraft.startMinutes >= 15) {
          onCreateActivity?.(row.id, currentDraft.startMinutes, currentDraft.endMinutes);
        }
        setCreationDraft(null);
      },
      onCancel: () => setCreationDraft(null),
    });
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
        onPointerDown={handleTrackPointerDown}
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