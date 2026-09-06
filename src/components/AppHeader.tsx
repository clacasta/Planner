import React from 'react';
import { ZoomIn, ZoomOut, UserPlus, Download, RotateCcw, FolderOpen } from 'lucide-react';
import { DayPlan } from '../domain/types';

interface AppHeaderProps {
  plan: DayPlan;
  plans: DayPlan[];
  pixelsPerHour: number;
  onTitleChange: (newTitle: string) => void;
  onDateChange: (newDate: string) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onAddRow: () => void;
  onOpenPlanManager: () => void;
  onExport: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  plan,
  plans,
  pixelsPerHour,
  onTitleChange,
  onDateChange,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onAddRow,
  onOpenPlanManager,
  onExport,
}) => {
  return (
    <header className="app-header">
      <div className="app-title-section">
        {/* Botón para abrir el gestor de planificaciones */}
        <button
          className="btn btn-plan-selector"
          onClick={onOpenPlanManager}
          title="Abrir gestor de días y copias de seguridad"
        >
          <FolderOpen size={16} />
          <span>Días ({plans.length})</span>
        </button>

        <input
          type="text"
          className="app-title-input"
          value={plan.name}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Nombre de la planificación..."
          title="Haz clic para editar el nombre del día"
        />

        <input
          type="date"
          className="app-date-input"
          value={plan.date || ''}
          onChange={(e) => onDateChange(e.target.value)}
          title="Fecha opcional"
        />
      </div>

      <div className="app-actions">
        {/* Controles de Zoom */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', marginRight: '0.5rem' }}>
          <button className="icon-btn" onClick={onZoomOut} title="Alejar escala (Zoom -)">
            <ZoomOut size={18} />
          </button>
          <span style={{ fontSize: '0.78rem', minWidth: '42px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            {pixelsPerHour}px/h
          </span>
          <button className="icon-btn" onClick={onZoomIn} title="Acercar escala (Zoom +)">
            <ZoomIn size={18} />
          </button>
          <button className="icon-btn" onClick={onResetZoom} title="Restablecer zoom">
            <RotateCcw size={15} />
          </button>
        </div>

        <button className="btn" onClick={onAddRow}>
          <UserPlus size={16} />
          <span>Añadir miembro</span>
        </button>

        <button className="btn btn-primary" onClick={onExport} title="Imprimir o guardar como PDF">
          <Download size={16} />
          <span>Exportar</span>
        </button>
      </div>
    </header>
  );
};
