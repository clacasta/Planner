import React, { useState, useEffect } from 'react';
import { Activity, FlexokiColorKey } from '../domain/types';
import { formatTime, parseTime } from '../domain/time';
import { X, Trash2, Check } from 'lucide-react';

interface ActivityEditorModalProps {
  isOpen: boolean;
  activity: Activity | null;
  rowName?: string;
  onSave: (updatedActivity: Activity) => void;
  onDelete: (activityId: string) => void;
  onClose: () => void;
}

const COLOR_OPTIONS: { key: FlexokiColorKey; label: string; bg: string; border: string }[] = [
  { key: 'blue', label: 'Azul', bg: 'var(--fx-blue-light)', border: 'var(--fx-blue)' },
  { key: 'purple', label: 'Morado', bg: 'var(--fx-purple-light)', border: 'var(--fx-purple)' },
  { key: 'green', label: 'Verde', bg: 'var(--fx-green-light)', border: 'var(--fx-green)' },
  { key: 'yellow', label: 'Amarillo', bg: 'var(--fx-yellow-light)', border: 'var(--fx-yellow)' },
  { key: 'orange', label: 'Naranja', bg: 'var(--fx-orange-light)', border: 'var(--fx-orange)' },
  { key: 'red', label: 'Rojo', bg: 'var(--fx-red-light)', border: 'var(--fx-red)' },
  { key: 'cyan', label: 'Cian', bg: 'var(--fx-cyan-light)', border: 'var(--fx-cyan)' },
  { key: 'magenta', label: 'Magenta', bg: 'var(--fx-magenta-light)', border: 'var(--fx-magenta)' },
];

export const ActivityEditorModal: React.FC<ActivityEditorModalProps> = ({
  isOpen,
  activity,
  rowName,
  onSave,
  onDelete,
  onClose,
}) => {
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('09:00');
  const [color, setColor] = useState<FlexokiColorKey>('blue');
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (activity) {
      setTitle(activity.title);
      setStartTime(formatTime(activity.startMinutes));
      setEndTime(formatTime(activity.endMinutes));
      setColor(activity.color);
      setComment(activity.comment || '');
      setError(null);
    }
  }, [activity]);

  if (!isOpen || !activity) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setError('El título de la actividad no puede estar vacío.');
      return;
    }

    const startMin = parseTime(startTime);
    const endMin = parseTime(endTime);

    if (startMin === null || endMin === null) {
      setError('El formato de hora debe ser válido (HH:MM).');
      return;
    }

    if (startMin >= endMin) {
      setError('La hora de inicio debe ser anterior a la hora de fin.');
      return;
    }

    if (endMin - startMin < 15) {
      setError('La duración mínima de la actividad es de 15 minutos.');
      return;
    }

    onSave({
      ...activity,
      title: cleanTitle,
      startMinutes: startMin,
      endMinutes: endMin,
      color,
      comment: comment.trim() ? comment.trim() : undefined,
    });
    onClose();
  };

  const handleDelete = () => {
    if (window.confirm(`¿Seguro que deseas eliminar la actividad "${activity.title}"?`)) {
      onDelete(activity.id);
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3 className="modal-title">Editar actividad</h3>
            {rowName && <span className="modal-subtitle">Persona: {rowName}</span>}
          </div>
          <button className="icon-btn" onClick={onClose} title="Cerrar">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {error && <div className="modal-error-badge">{error}</div>}

          <div className="form-group">
            <label className="form-label" htmlFor="act-title">Título de la actividad</label>
            <input
              id="act-title"
              type="text"
              className="form-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Trabajo, Colegio, Gimnasio..."
              autoFocus
            />
          </div>

          <div className="form-row">
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label" htmlFor="act-start">Hora inicial</label>
              <input
                id="act-start"
                type="time"
                step="900"
                className="form-input"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label" htmlFor="act-end">Hora final</label>
              <input
                id="act-end"
                type="time"
                step="900"
                className="form-input"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Color identificativo</label>
            <div className="color-palette-picker">
              {COLOR_OPTIONS.map((c) => {
                const isSelected = color === c.key;
                return (
                  <button
                    key={c.key}
                    type="button"
                    className={`color-chip ${isSelected ? 'selected' : ''}`}
                    style={{ backgroundColor: c.bg, borderColor: c.border }}
                    onClick={() => setColor(c.key)}
                    title={c.label}
                  >
                    {isSelected && <Check size={14} style={{ color: c.border }} />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="act-comment">Notas / Comentario opcional</label>
            <textarea
              id="act-comment"
              rows={3}
              className="form-input form-textarea"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Añade detalles, recordatorios o aclaraciones..."
            />
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-danger"
              onClick={handleDelete}
              title="Eliminar actividad"
            >
              <Trash2 size={16} />
              <span>Eliminar</span>
            </button>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="button" className="btn" onClick={onClose}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary">
                Guardar cambios
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
