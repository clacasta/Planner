import React from 'react';
import { DayView } from '../domain/types';
import { exportPlanAsPNG } from '../export/exportPng';
import { exportPlanAsJSON } from '../storage/importExport';
import { X, Printer, Image, FileJson } from 'lucide-react';
import { useOverlayDismiss } from './useOverlayDismiss';
import { useDialogFocus } from './useDialogFocus';

interface ExportMenuModalProps {
  isOpen: boolean;
  plan: DayView;
  onClose: () => void;
}

export const ExportMenuModal: React.FC<ExportMenuModalProps> = ({
  isOpen,
  plan,
  onClose,
}) => {
  const overlayProps = useOverlayDismiss(onClose);
  const dialogRef = useDialogFocus<HTMLDivElement>();

  if (!isOpen) return null;

  const handlePrint = () => {
    onClose();
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const handleExportPNG = () => {
    exportPlanAsPNG(plan);
    onClose();
  };

  const handleExportJSON = () => {
    exportPlanAsJSON(plan);
    onClose();
  };

  return (
    <div className="modal-overlay" {...overlayProps}>
      <div
        ref={dialogRef}
        className="modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-menu-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h3 className="modal-title" id="export-menu-title">Exportar planificación</h3>
            <span className="modal-subtitle">Elige el formato de salida para "{plan.name}"</span>
          </div>
          <button className="icon-btn" onClick={onClose} title="Cerrar" aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {/* Opción 1: Impresión / PDF A4 */}
          <button className="export-option-card" onClick={handlePrint}>
            <div className="export-option-icon">
              <Printer size={24} />
            </div>
            <div className="export-option-content">
              <strong>Imprimir / Guardar en PDF (A4 apaisado)</strong>
              <span>Optimizado para papel A4 horizontal con tabla de notas y comentarios al pie.</span>
            </div>
          </button>

          {/* Opción 2: Imagen PNG */}
          <button className="export-option-card" onClick={handleExportPNG}>
            <div className="export-option-icon">
              <Image size={24} />
            </div>
            <div className="export-option-content">
              <strong>Descargar imagen PNG (Alta definición)</strong>
              <span>Genera un archivo de imagen nítido con el gráfico completo de las 24 horas.</span>
            </div>
          </button>

          {/* Opción 3: JSON */}
          <button className="export-option-card" onClick={handleExportJSON}>
            <div className="export-option-icon">
              <FileJson size={24} />
            </div>
            <div className="export-option-content">
              <strong>Exportar datos en JSON</strong>
              <span>Archivo de datos para transferir a otro navegador o guardar como copia.</span>
            </div>
          </button>
        </div>

        <div className="modal-actions" style={{ padding: '0.75rem 1.25rem' }}>
          <button type="button" className="btn" onClick={onClose} style={{ marginLeft: 'auto' }}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};
