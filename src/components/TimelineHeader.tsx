import React from 'react';
import { formatTime, minutesToPixels } from '../domain/time';

interface TimelineHeaderProps {
  pixelsPerHour: number;
  rowHeaderWidth: number;
  /** Minuto actual si el día que se ve es hoy. */
  nowMinutes?: number | null;
}

export const TimelineHeader: React.FC<TimelineHeaderProps> = ({
  pixelsPerHour,
  rowHeaderWidth,
  nowMinutes = null,
}) => {
  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="timeline-header-row">
      <div
        className="row-header-spacer"
        style={{ width: `${rowHeaderWidth}px`, minWidth: `${rowHeaderWidth}px` }}
      >
        <span>Miembro familiar</span>
      </div>
      <div className="timeline-hours-track">
        {hours.map((hour) => {
          const formattedHour = `${hour.toString().padStart(2, '0')}:00`;
          return (
            <div
              key={hour}
              className="hour-cell"
              style={{ width: `${pixelsPerHour}px` }}
            >
              {formattedHour}
            </div>
          );
        })}
        {nowMinutes !== null && (
          <span
            className="now-marker"
            style={{ left: `${minutesToPixels(nowMinutes, pixelsPerHour)}px` }}
          >
            {formatTime(nowMinutes)}
          </span>
        )}
      </div>
    </div>
  );
};
