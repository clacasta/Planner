import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
import { DayPlan, Member } from '../domain/types';
import { activitiesOf } from '../domain/family';
import { addDays, findPlanForDate, formatDayName, startOfWeek, todayISO } from '../domain/dates';
import { busyMinutes, formatDuration } from '../domain/balance';
import { formatTime, TOTAL_MINUTES_IN_DAY } from '../domain/time';
import { useOverlayDismiss } from './useOverlayDismiss';
import { useDialogFocus } from './useDialogFocus';

interface WeekViewModalProps {
  members: Member[];
  plans: DayPlan[];
  /** Fecha de referencia para la semana inicial. */
  referenceDate: string;
  onOpenDay: (planId: string) => void;
  onCreateDay: (date: string) => void;
  onClose: () => void;
}

/**
 * Vista semanal (lunes a domingo) de solo lectura: una mini línea de 24 h por
 * persona y día. Pulsar un día lo abre; si no existe, se puede crear.
 */
export const WeekViewModal: React.FC<WeekViewModalProps> = ({
  members,
  plans,
  referenceDate,
  onOpenDay,
  onCreateDay,
  onClose,
}) => {
  const overlayProps = useOverlayDismiss(onClose);
  const dialogRef = useDialogFocus<HTMLDivElement>();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(referenceDate));
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = todayISO();
  const visibleMembers = members.filter((m) => m.visible);

  return (
    <div className="modal-overlay" {...overlayProps}>
      <div
        ref={dialogRef}
        className="modal-dialog modal-large week-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="week-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="week-nav">
            <button className="icon-btn" onClick={() => setWeekStart(addDays(weekStart, -7))} title="Semana anterior" aria-label="Semana anterior">
              <ChevronLeft size={18} />
            </button>
            <h3 className="modal-title" id="week-title">
              Semana del {formatDayName(weekStart).toLowerCase()} al {formatDayName(days[6]).toLowerCase()}
            </h3>
            <button className="icon-btn" onClick={() => setWeekStart(addDays(weekStart, 7))} title="Semana siguiente" aria-label="Semana siguiente">
              <ChevronRight size={18} />
            </button>
          </div>
          <button className="icon-btn" onClick={onClose} title="Cerrar" aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        <div className="week-scroll">
          <table className="week-table">
            <thead>
              <tr>
                <th scope="col" className="week-person-col">Persona</th>
                {days.map((date) => {
                  const plan = findPlanForDate(plans, date);
                  return (
                    <th key={date} scope="col" className={date === today ? 'week-today' : undefined}>
                      {plan ? (
                        <button className="week-day-btn" onClick={() => onOpenDay(plan.id)} title={`Abrir «${plan.name}»`}>
                          {formatDayName(date)}
                        </button>
                      ) : (
                        <button
                          className="week-day-btn week-day-empty"
                          onClick={() => onCreateDay(date)}
                          title="Crear un día para esta fecha"
                        >
                          {formatDayName(date)} <Plus size={12} aria-hidden="true" />
                        </button>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {visibleMembers.map((member) => (
                <tr key={member.id}>
                  <th scope="row" className="week-person-col">
                    <span className={`row-color-dot fx-dot-${member.color}`} aria-hidden="true" /> {member.name}
                  </th>
                  {days.map((date) => {
                    const plan = findPlanForDate(plans, date);
                    const activities = plan ? activitiesOf(plan, member.id) : [];
                    const busy = busyMinutes(activities);
                    return (
                      <td key={date} className={date === today ? 'week-today' : undefined}>
                        {plan ? (
                          <div
                            className="week-mini-track"
                            role="img"
                            aria-label={
                              activities.length === 0
                                ? 'Sin actividades'
                                : activities
                                    .map((a) => `${a.title} de ${formatTime(a.startMinutes)} a ${formatTime(a.endMinutes)}`)
                                    .join('; ')
                            }
                          >
                            {activities.map((a) => (
                              <span
                                key={a.id}
                                className={`week-mini-block fx-dot-${a.color}`}
                                style={{
                                  left: `${(a.startMinutes / TOTAL_MINUTES_IN_DAY) * 100}%`,
                                  width: `${((a.endMinutes - a.startMinutes) / TOTAL_MINUTES_IN_DAY) * 100}%`,
                                }}
                                title={`${a.title} (${formatTime(a.startMinutes)} - ${formatTime(a.endMinutes)})`}
                              />
                            ))}
                          </div>
                        ) : (
                          <div className="week-mini-track week-mini-empty" aria-label="Sin día" role="img" />
                        )}
                        {plan && <span className="week-busy">{busy > 0 ? formatDuration(busy) : '—'}</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          {visibleMembers.length === 0 && <p className="balance-empty">No hay personas visibles.</p>}
        </div>
        <p className="form-hint" style={{ padding: '0 1.25rem 1rem' }}>
          Solo aparecen los días que tienen fecha. Pulsa un día para abrirlo o, si no existe, para crearlo.
        </p>
      </div>
    </div>
  );
};
