import React, { useRef, useState } from 'react';
import { DayPlan } from '../domain/types';
import { StorageData, SCHEMA_VERSION } from '../storage/schema';
import { exportPlanAsJSON, exportAllPlansAsJSON, importPlanFromJSONFile } from '../storage/importExport';
import { ImportPayload, summarizeImport } from '../storage/validate';
import {
  X,
  Plus,
  Copy,
  Trash2,
  Download,
  Upload,
  Check,
  Calendar,
  Users,
  Activity as ActivityIcon,
  AlertTriangle,
} from 'lucide-react';

interface PlanManagerModalProps {
  isOpen: boolean;
  plans: DayPlan[];
  activePlanId: string;
  onSelectPlan: (planId: string) => void;
  onCreatePlan: (name: string) => void;
  onDuplicatePlan: (planId: string) => void;
  onDeletePlan: (planId: string) => void;
  onImportPlan: (payload: ImportPayload) => void;
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
  // Importación pendiente de confirmación: nada se aplica hasta que el usuario
  // ve qué contiene el archivo y pulsa el botón correspondiente.
  const [pendingImport, setPendingImport] = useState<ImportPayload | null>(null);

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
      const payload = await importPlanFromJSONFile(file);
      setPendingImport(payload);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Error al importar archivo');
      setPendingImport(null);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleExportAll = () => {
    exportAllPlansAsJSON({
      schemaVersion: SCHEMA_VERSION,
      activePlanId,
      plans,
    });
  };

  const handleConfirmImport = () => {
    if (!pendingImport) return;
    onImportPlan(pendingImport);
    setPendingImport(null);
  };

  const currentData: StorageData = { schemaVersion: SCHEMA_VERSION, activePlanId, plans };
  const pendingSummary = pendingImport ? summarizeImport(pendingImport) : null;

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

          {/* Confirmación de importación */}
          {pendingImport && pendingSummary && (
            <div className={`import-preview ${pendingSummary.isFullBackup ? 'import-preview-warning' : ''}`}>
              <div className="import-preview-header">
                {pendingSummary.isFullBackup && <AlertTriangle size={18} />}
                <strong>{pendingSummary.title}</strong>
              </div>
              <p className="import-preview-detail">{pendingSummary.detail}</p>

              {pendingImport.issues.length > 0 && (
                <ul className="import-preview-issues">
                  {pendingImport.issues.slice(0, 6).map((issue, idx) => (
                    <li key={idx}>{issue}</li>
                  ))}
                  {pendingImport.issues.length > 6 && (
                    <li>…y {pendingImport.issues.length - 6} aviso(s) más.</li>
                  )}
                </ul>
              )}

              <div className="import-preview-actions">
                <button type="button" className="btn" onClick={() => exportAllPlansAsJSON(currentData)}>
                  <Download size={16} />
                  <span>Descargar copia actual</span>
                </button>
                <button type="button" className="btn" onClick={() => setPendingImport(null)}>
                  Cancelar
                </button>
                <button
                  type="button"
                  className={`btn ${pendingSummary.isFullBackup ? 'btn-danger' : 'btn-primary'}`}
                  onClick={handleConfirmImport}
                >
                  <Check size={16} />
                  <span>{pendingSummary.isFullBackup ? 'Reemplazar todos mis días' : 'Añadir este día'}</span>
                </button>
              </div>
            </div>
          )}

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
            <p className="backup-hint">
              Al importar, verás un resumen antes de aplicar nada y se guardará una copia del estado
              actual. Importar también se puede deshacer con Ctrl/Cmd+Z.
            </p>
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
