import React, { useRef, useState } from 'react';
import { DayPlan } from '../domain/types';
import { StorageData } from '../storage/schema';
import { exportPlanAsJSON, exportAllPlansAsJSON, importPlanFromJSONFile } from '../storage/importExport';
import { X, Plus, Copy, Trash2, Download, Upload, Check, Calendar, Users, Activity as ActivityIcon } from 'lucide-react';

interface PlanManagerModalProps {
  isOpen: boolean;
  plans: DayPlan[];
  activePlanId: string;
  onSelectPlan: (planId: string) => void;
  onCreatePlan: (name: string) => void;
  onDuplicatePlan: (planId: string) => void;
  onDeletePlan: (planId: string) => void;
  onImportPlan: (imported: { singlePlan?: DayPlan; fullBackup?: StorageData }) => void;
  onClose: () => void;
}

export const PlanManagerModal: React.FC<PlanManagerModalProps> = ({
  isOpen,
  plans,
  activePlanId,
  onSelectPlan,
  onCreatePlan,
  onDuplicatePlan,
  onDeletePlan,
  onImportPlan,
  onClose,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newPlanName, setNewPlanName] = useState('');
  const [importError, setImportError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCreateNew = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newPlanName.trim() || 'Nuevo día';
    onCreatePlan(name);
    setNewPlanName('');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError(null);
    try {
      const result = await importPlanFromJSONFile(file);
      onImportPlan(result);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err: any) {
      setImportError(err.message || 'Error al importar archivo');
    }
  };

  const handleExportAll = () => {
    exportAllPlansAsJSON({
      schemaVersion: 1,
      activePlanId,
      plans,
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog modal-large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3 className="modal-title">Gestor de planificaciones</h3>
            <span className="modal-subtitle">Organiza tus días y gestiona copias de seguridad</span>
          </div>
          <button className="icon-btn" onClick={onClose} title="Cerrar">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ padding: '1.25rem', maxHeight: '70vh', overflowY: 'auto' }}>
          {importError && <div className="modal-error-badge">{importError}</div>}

          {/* Formulario de creación rápida de nuevo día */}
          <form onSubmit={handleCreateNew} className="new-plan-form">
            <input
              type="text"
              className="form-input"
              placeholder="Nombre del nuevo día (ej. Sábado familiar)..."
              value={newPlanName}
              onChange={(e) => setNewPlanName(e.target.value)}
              style={{ flex: 1 }}
            />
            <button type="submit" className="btn btn-primary">
              <Plus size={16} />
              <span>Crear día</span>
            </button>
          </form>

          {/* Lista de planificaciones guardadas */}
          <div className="plans-list">
            <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
              Planificaciones guardadas ({plans.length})
            </h4>

            {plans.map((p) => {
              const isActive = p.id === activePlanId;
              const totalActivities = p.rows.reduce((acc, r) => acc + r.activities.length, 0);

              return (
                <div
                  key={p.id}
                  className={`plan-card ${isActive ? 'plan-card-active' : ''}`}
                  onClick={() => onSelectPlan(p.id)}
                >
                  <div className="plan-card-info">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span className="plan-card-title">{p.name}</span>
                      {isActive && <span className="badge-active">Activo</span>}
                    </div>

                    <div className="plan-card-meta">
                      {p.date && (
                        <span className="meta-item">
                          <Calendar size={13} /> {p.date}
                        </span>
                      )}
                      <span className="meta-item">
                        <Users size={13} /> {p.rows.length} líneas
                      </span>
                      <span className="meta-item">
                        <ActivityIcon size={13} /> {totalActivities} actividades
                      </span>
                    </div>
                  </div>

                  <div className="plan-card-actions" onClick={(e) => e.stopPropagation()}>
                    <button
                      className="icon-btn"
                      onClick={() => onDuplicatePlan(p.id)}
                      title="Duplicar día"
                    >
                      <Copy size={16} />
                    </button>
                    <button
                      className="icon-btn"
                      onClick={() => exportPlanAsJSON(p)}
                      title="Exportar como JSON"
                    >
                      <Download size={16} />
                    </button>
                    {plans.length > 1 && (
                      <button
                        className="icon-btn"
                        onClick={() => {
                          if (window.confirm(`¿Eliminar la planificación "${p.name}"?`)) {
                            onDeletePlan(p.id);
                          }
                        }}
                        title="Eliminar día"
                        style={{ color: 'var(--fx-red)' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sección de Copias de Seguridad */}
          <div className="backup-section">
            <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
              Copias de seguridad e importación
            </h4>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />

              <button
                type="button"
                className="btn"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={16} />
                <span>Importar archivo JSON</span>
              </button>

              <button
                type="button"
                className="btn"
                onClick={handleExportAll}
              >
                <Download size={16} />
                <span>Exportar todas las planificaciones</span>
              </button>
            </div>
          </div>
        </div>

        <div className="modal-actions" style={{ padding: '0.75rem 1.25rem' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            Los datos se guardan automáticamente en tu navegador local.
          </span>
          <button type="button" className="btn btn-primary" onClick={onClose}>
            <Check size={16} />
            <span>Listo</span>
          </button>
        </div>
      </div>
    </div>
  );
};
