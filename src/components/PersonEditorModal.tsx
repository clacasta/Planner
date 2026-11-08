import React, { useState } from 'react';
import { FlexokiColorKey, Member } from '../domain/types';
import { X, Trash2, Check } from 'lucide-react';
import { useOverlayDismiss } from './useOverlayDismiss';
import { COLOR_OPTIONS } from './colorOptions';

interface PersonEditorModalProps {
  /** Persona a editar; `null` para añadir una nueva. */
  member: Member | null;
  /** Color propuesto para una persona nueva. */
  defaultColor: FlexokiColorKey;
  /** Actividades de la persona sumando todos los días (para avisar al eliminar). */
  activityCount: number;
  onSave: (changes: { name: string; color: FlexokiColorKey }) => void;
  onDelete: () => void;
  onClose: () => void;
}

/**
 * Añadir o editar una persona de la familia. Los cambios se aplican a TODOS los
 * días, porque la familia es común.
 */
export const PersonEditorModal: React.FC<PersonEditorModalProps> = ({
  member,
  defaultColor,
  activityCount,
  onSave,
  onDelete,
  onClose,
}) => {
  const isNew = member === null;
  const [name, setName] = useState(member?.name ?? '');
  const [color, setColor] = useState<FlexokiColorKey>(member?.color ?? defaultColor);
  const [error, setError] = useState<string | null>(null);
  const overlayProps = useOverlayDismiss(onClose);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      setError('El nombre no puede estar vacío.');
      return;
    }
    onSave({ name: cleanName, color });
    onClose();
  };

  const handleDelete = () => {
    if (!member) return;
    const detail =
      activityCount > 0
        ? ` Se borrarán también sus ${activityCount} actividad(es) en todos los días.`
        : '';
    if (window.confirm(`¿Eliminar a ${member.name} de la familia?${detail}`)) {
      onDelete();
      onClose();
    }
  };

  return (
    <div className="modal-overlay" {...overlayProps}>
      <div
        className="modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="person-editor-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h3 className="modal-title" id="person-editor-title">
              {isNew ? 'Añadir persona' : `Editar a ${member.name}`}
            </h3>
            <span className="modal-subtitle">
              {isNew
                ? 'Aparecerá en todos los días.'
                : 'Los cambios se aplican en todos los días.'}
            </span>
          </div>
          <button className="icon-btn" onClick={onClose} title="Cerrar" aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {error && <div className="modal-error-badge">{error}</div>}

          <div className="form-group">
            <label className="form-label" htmlFor="person-name">Nombre</label>
            <input
              id="person-name"
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Pilar, Abuela, Leo..."
              maxLength={40}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">Color de la línea</label>
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
                    aria-label={c.label}
                    aria-pressed={isSelected}
                  >
                    {isSelected && <Check size={14} style={{ color: c.border }} />}
                  </button>
                );
              })}
            </div>
            <p className="form-hint">
              Es el color por defecto de sus actividades nuevas; las que ya tiene conservan el suyo.
            </p>
          </div>

          <div className="modal-actions">
            {isNew ? (
              <span />
            ) : (
              <button type="button" className="btn btn-danger" onClick={handleDelete}>
                <Trash2 size={16} />
                <span>Eliminar</span>
              </button>
            )}

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="button" className="btn" onClick={onClose}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary">
                {isNew ? 'Añadir' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
