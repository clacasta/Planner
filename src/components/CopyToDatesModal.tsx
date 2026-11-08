import React, { useState } from 'react';
import { X } from 'lucide-react';
import { DayPlan } from '../domain/types';
import { addDays, datesInRange, todayISO, WEEKDAY_SHORT } from '../domain/dates';
import { useOverlayDismiss } from './useOverlayDismiss';
import { useDialogFocus } from './useDialogFocus';

interface CopyToDatesModalProps {
  plan: DayPlan;
  /** Fechas que ya tienen un día (no se sobrescriben). */
  takenDates: string[];
  onCopy: (dates: string[]) => void;
  onClose: () => void;
}

const WEEKDAY_LABELS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];

/**
 * Usar un día como plantilla: lo copia en cada fecha elegida (rango + días de
 * la semana). Las fechas que ya tienen día se saltan.
 */
export const CopyToDatesModal: React.FC<CopyToDatesModalProps> = ({
  plan,
  takenDates,
  onCopy,
  onClose,
}) => {
  const overlayProps = useOverlayDismiss(onClose);
  const dialogRef = useDialogFocus<HTMLDivElement>();
  const start0 = addDays(plan.date ?? todayISO(), 1);
  const [start, setStart] = useState(start0);
  const [end, setEnd] = useState(addDays(start0, 13));
  const [weekdays, setWeekdays] = useState<number[]>([0, 1, 2, 3, 4]);

  const dates = datesInRange(start, end, weekdays);
  const taken = new Set(takenDates);
  const free = dates.filter((d) => !taken.has(d));

  const toggleWeekday = (index: number) =>
    setWeekdays((current) =>
      current.includes(index) ? current.filter((d) => d !== index) : [...current, index].sort()
    );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (free.length === 0) return;
    onCopy(dates);
    onClose();
  };

  return (
    <div className="modal-overlay" {...overlayProps}>
      <div
        ref={dialogRef}
        className="modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="copy-dates-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h3 className="modal-title" id="copy-dates-title">Usar «{plan.name}» como plantilla</h3>
            <span className="modal-subtitle">Se crea una copia del día en cada fecha elegida.</span>
          </div>
          <button className="icon-btn" onClick={onClose} title="Cerrar" aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label" htmlFor="copy-start">Desde</label>
              <input id="copy-start" type="date" className="form-input" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label" htmlFor="copy-end">Hasta</label>
              <input id="copy-end" type="date" className="form-input" value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
          </div>

          <fieldset className="form-group weekday-picker">
            <legend className="form-label">Días de la semana</legend>
            <div className="weekday-options">
              {WEEKDAY_SHORT.map((label, index) => (
                <label key={label} className={`weekday-chip ${weekdays.includes(index) ? 'selected' : ''}`}>
                  <input
                    type="checkbox"
                    checked={weekdays.includes(index)}
                    onChange={() => toggleWeekday(index)}
                    aria-label={WEEKDAY_LABELS[index]}
                  />
                  <span aria-hidden="true">{label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <p className="form-hint" aria-live="polite">
            {dates.length === 0
              ? 'Ninguna fecha cumple el rango y los días elegidos.'
              : `Se crearán ${free.length} día(s)` +
                (dates.length > free.length ? `; ${dates.length - free.length} fecha(s) ya tienen día y se saltan.` : '.')}
          </p>

          <div className="modal-actions">
            <span />
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="button" className="btn" onClick={onClose}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary" disabled={free.length === 0}>
                Crear {free.length} día(s)
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
