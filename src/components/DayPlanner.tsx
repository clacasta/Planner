import React from 'react';
import { DayPlan, Activity } from '../domain/types';
import { TimelineHeader } from './TimelineHeader';
import { TimelineRow } from './TimelineRow';

interface DayPlannerProps {
  plan: DayPlan;
  pixelsPerHour: number;
  rowHeaderWidth?: number;
  onToggleRowVisibility: (rowId: string) => void;
  onAddActivity: (rowId: string) => void;
  onSelectActivity: (activity: Activity, rowId: string) => void;
  onMoveActivity: (rowId: string, activityId: string, newStartMinutes: number) => void;
  onResizeActivity: (rowId: string, activityId: string, newStartMinutes: number, newEndMinutes: number) => void;
  onCreateActivity: (rowId: string, startMinutes: number, endMinutes: number) => void;
}

export const DayPlanner: React.FC<DayPlannerProps> = ({
  plan,
  pixelsPerHour,
  rowHeaderWidth = 200,
  onToggleRowVisibility,
  onAddActivity,
  onSelectActivity,
  onMoveActivity,
  onResizeActivity,
  onCreateActivity,
}) => {
  return (
    <div className="planner-wrapper">
      <div className="planner-scroll-container">
        {/* Cabecera temporal de 24 horas */}
        <TimelineHeader
          pixelsPerHour={pixelsPerHour}
          rowHeaderWidth={rowHeaderWidth}
        />

        {/* Filas de miembros familiares */}
        {plan.rows.map((row) => (
          <TimelineRow
            key={row.id}
            row={row}
            pixelsPerHour={pixelsPerHour}
            rowHeaderWidth={rowHeaderWidth}
            onToggleVisibility={onToggleRowVisibility}
            onAddActivity={onAddActivity}
            onSelectActivity={onSelectActivity}
            onMoveActivity={onMoveActivity}
            onResizeActivity={onResizeActivity}
            onCreateActivity={onCreateActivity}
          />
        ))}
      </div>
    </div>
  );
};
