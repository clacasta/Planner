import React, { useState } from 'react';
import { X } from 'lucide-react';
import { DayView } from '../domain/types';
import { COLOR_CATEGORY, dayBalance, formatDuration, whoIsFree } from '../domain/balance';
import { formatTime, parseTime, TOTAL_MINUTES_IN_DAY } from '../domain/time';

interface BalancePanelProps {
  view: DayView;
  /** Hora propuesta para «¿quién está libre?» (minutos desde medianoche). */
  defaultMinute: number;
  onClose: () => void;
}

/**
 * Panel de equilibrio del día: horas ocupadas y libres de cada persona,
 * desglose por color de actividad y quién está libre a una hora.
 */
export const BalancePanel: React.FC<BalancePanelProps> = ({ view, defaultMinute, onClose }) => {
  const [time, setTime] = useState(() => formatTime(Math.floor(defaultMinute / 15) * 15));
  const balances = dayBalance(view);
  const minute = parseTime(time);
  const availability = minute === null ? null : whoIsFree(view, Math.min(minute, TOTAL_MINUTES_IN_DAY - 1));

  return (
    <section className="balance-panel" aria-labelledby="balance-title">
      <div className="balance-header">
        <h2 id="balance-title" className="balance-title">Equilibrio del día</h2>
        <button className="icon-btn" onClick={onClose} title="Cerrar panel" aria-label="Cerrar panel">
          <X size={16} />
        </button>
      </div>

      {balances.length === 0 ? (
        <p className="balance-empty">No hay personas visibles en este día.</p>
      ) : (
        <ul className="balance-list">
          {balances.map((b) => (
            <li key={b.id} className="balance-item">
              <div className="balance-person">
                <span className={`row-color-dot fx-dot-${b.color}`} aria-hidden="true" />
                <strong>{b.name}</strong>
                <span className="balance-numbers">
                  {formatDuration(b.busy)} ocupado · {formatDuration(b.free)} libre
                </span>
              </div>
              <div
                className="balance-bar"
                role="img"
                aria-label={
                  b.byColor.length === 0
                    ? 'Sin actividades'
                    : b.byColor.map((c) => `${COLOR_CATEGORY[c.color]}: ${formatDuration(c.minutes)}`).join(', ')
                }
              >
                {b.byColor.map((c) => (
                  <span
                    key={c.color}
                    className={`balance-segment fx-dot-${c.color}`}
                    style={{ width: `${(c.minutes / TOTAL_MINUTES_IN_DAY) * 100}%` }}
                    title={`${COLOR_CATEGORY[c.color]}: ${formatDuration(c.minutes)}`}
                  />
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="balance-free">
        <label htmlFor="balance-time">¿Quién está libre a las</label>
        <input
          id="balance-time"
          type="time"
          step="900"
          className="form-input balance-time-input"
          value={time}
          onChange={(e) => setTime(e.target.value)}
        />
        <span>?</span>
        <p className="balance-free-result" aria-live="polite">
          {availability === null
            ? 'Escribe una hora válida.'
            : availability.free.length === 0
              ? 'Nadie: todos tienen algo a esa hora.'
              : `Libres: ${availability.free.join(', ')}.`}
          {availability && availability.busy.length > 0 && (
            <span className="balance-busy">
              {' '}
              Ocupados: {availability.busy.map((b) => `${b.name} (${b.activity})`).join(', ')}.
            </span>
          )}
        </p>
      </div>
      <p className="balance-hint">
        Los colores se agrupan por su uso sugerido (azul trabajo, verde descanso...). Si dos
        actividades se solapan, el tiempo ocupado se cuenta una sola vez.
      </p>
    </section>
  );
};
