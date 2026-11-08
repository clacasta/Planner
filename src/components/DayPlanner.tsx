import React from 'react';
import { DayView, Activity } from '../domain/types';
import { TimelineHeader } from './TimelineHeader';
import { TimelineRow } from './TimelineRow';

interface DayPlannerProps {
  plan: DayView;
  pixelsPerHour: number;
  rowHeaderWidth?: number;
  onMoveRow: (rowId: string, direction: 'up' | 'down') => void;
  onToggleRowVisibility: (rowId: string) => void;
  /** Abre el editor de la persona (nombre, color, eliminar). */
  onEditRow: (rowId: string) => void;
  onAddActivity: (rowId: string) => void;
  onSelectActivity: (activity: Activity, rowId: string) => void;
  onMoveActivity: (rowId: string, activityId: string, newStartMinutes: number) => void;
  onResizeActivity: (rowId: string, activityId: string, newStartMinutes: number, newEndMinutes: number) => void;
  onCreateActivity: (rowId: string, startMinutes: number, endMinutes: number) => void;
  /** El bloque se ha soltado en la línea de otra persona. */
  onMoveActivityToRow: (
    rowId: string,
    activityId: string,
    targetRowId: string,
    newStartMinutes: number
  ) => void;
  /** Línea resaltada como destino de un arrastre entre personas. */
  dropTargetRowId: string | null;
  onDropTargetChange: (rowId: string | null) => void;
  /** Teclado: eliminar una actividad enfocada. */
  onDeleteActivity: (rowId: string, activityId: string) => void;
}

export const DayPlanner: React.FC<DayPlannerProps> = ({
  plan,
  pixelsPerHour,
  rowHeaderWidth = 200,
  onMoveRow,
  onToggleRowVisibility,
  onEditRow,
  onAddActivity,
  onSelectActivity,
  onMoveActivity,
  onResizeActivity,
  onCreateActivity,
  onMoveActivityToRow,
  dropTargetRowId,
  onDropTargetChange,
  onDeleteActivity,
}) => {
  // Personas visibles en orden, para pasar una actividad a la de arriba/abajo.
  const visibleIds = plan.rows.filter((row) => row.visible).map((row) => row.id);
  const adjacentFor = (rowId: string) => {
    const index = visibleIds.indexOf(rowId);
    return {
      up: index > 0 ? visibleIds[index - 1] : null,
      down: index >= 0 && index < visibleIds.length - 1 ? visibleIds[index + 1] : null,
    };
  };

  return (
    <div className="planner-wrapper">
      <p id="activity-keyboard-help" className="visually-hidden">
        Enter para editar. Flechas izquierda y derecha para mover 15 minutos; con Mayúsculas,
        cambiar la hora final. Alt y flechas arriba o abajo para pasarla a otra persona. Suprimir
        para eliminarla.
      </p>
      <div className="planner-scroll-container">
        {/* Cabecera temporal de 24 horas */}
        <TimelineHeader
          pixelsPerHour={pixelsPerHour}
          rowHeaderWidth={rowHeaderWidth}
        />

        {/* Filas de miembros familiares con soporte de reordenación */}
        {plan.rows.map((row, index) => (
          <TimelineRow
            key={row.id}
            row={row}
            pixelsPerHour={pixelsPerHour}
            rowHeaderWidth={rowHeaderWidth}
            isFirst={index === 0}
            isLast={index === plan.rows.length - 1}
            isDropTarget={dropTargetRowId === row.id}
            onMoveRow={onMoveRow}
            onToggleVisibility={onToggleRowVisibility}
            onEditRow={onEditRow}
            onAddActivity={onAddActivity}
            onSelectActivity={onSelectActivity}
            onMoveActivity={onMoveActivity}
            onResizeActivity={onResizeActivity}
            onCreateActivity={onCreateActivity}
            onMoveActivityToRow={onMoveActivityToRow}
            onDropTargetChange={onDropTargetChange}
            onDeleteActivity={onDeleteActivity}
            adjacentRowIds={adjacentFor(row.id)}
          />
        ))}
      </div>
    </div>
  );
};
