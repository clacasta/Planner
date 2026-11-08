import React from 'react';
import {
  ZoomIn,
  ZoomOut,
  UserPlus,
  Download,
  RotateCcw,
  FolderOpen,
  Undo2,
  Redo2,
  ChevronLeft,
  ChevronRight,
  CalendarCheck,
  CalendarDays,
  Scale,
  Sun,
  Moon,
  SunMoon,
} from 'lucide-react';
import type { ThemePreference } from './useTheme';
import { DayPlan } from '../domain/types';

interface AppHeaderProps {
  plan: DayPlan;
  plans: DayPlan[];
  pixelsPerHour: number;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onTitleChange: (newTitle: string) => void;
  onDateChange: (newDate: string) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onAddRow: () => void;
  onOpenPlanManager: () => void;
  onExport: () => void;
  /** Día anterior / siguiente (por fecha); `null` si no hay. */
  onPrevDay: (() => void) | null;
  onNextDay: (() => void) | null;
  /** Ir al día de hoy (o crearlo) y a la hora actual. */
  onToday: () => void;
  onOpenWeek: () => void;
  isBalanceOpen: boolean;
  onToggleBalance: () => void;
  theme: ThemePreference;
  onCycleTheme: () => void;
}

const THEME_LABEL: Record<ThemePreference, string> = {
  auto: 'Tema: automático (como el sistema)',
  light: 'Tema: claro',
  dark: 'Tema: oscuro',
};

export const AppHeader: React.FC<AppHeaderProps> = ({
  plan,
  plans,
  pixelsPerHour,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onTitleChange,
  onDateChange,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onAddRow,
  onOpenPlanManager,
  onExport,
  onPrevDay,
  onNextDay,
  onToday,
  onOpenWeek,
  isBalanceOpen,
  onToggleBalance,
  theme,
  onCycleTheme,
}) => {
  const ThemeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : SunMoon;
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

        <div className="day-nav">
          <button
            className="icon-btn"
            onClick={onPrevDay ?? undefined}
            disabled={!onPrevDay}
            title="Día anterior" aria-label="Día anterior"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            className="icon-btn"
            onClick={onNextDay ?? undefined}
            disabled={!onNextDay}
            title="Día siguiente" aria-label="Día siguiente"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <input
          type="text"
          aria-label="Nombre del día"
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
          aria-label="Fecha del día"
        />

        <button className="btn btn-small" onClick={onToday} title="Ir al día de hoy y a la hora actual">
          <CalendarCheck size={15} />
          <span>Hoy</span>
        </button>
      </div>

      <div className="app-actions">
        {/* Deshacer / Rehacer */}
        <div className="header-group">
          <button
            className="icon-btn"
            onClick={onUndo}
            disabled={!canUndo}
            title="Deshacer (Ctrl/Cmd+Z)" aria-label="Deshacer (Ctrl/Cmd+Z)"
          >
            <Undo2 size={17} />
          </button>
          <button
            className="icon-btn"
            onClick={onRedo}
            disabled={!canRedo}
            title="Rehacer (Ctrl/Cmd+Shift+Z)" aria-label="Rehacer (Ctrl/Cmd+Shift+Z)"
          >
            <Redo2 size={17} />
          </button>
        </div>

        {/* Controles de Zoom */}
        <div className="header-group">
          <button className="icon-btn" onClick={onZoomOut} title="Alejar escala (Zoom -)" aria-label="Alejar escala (Zoom -)">
            <ZoomOut size={18} />
          </button>
          <span className="zoom-readout">{pixelsPerHour}px/h</span>
          <button className="icon-btn" onClick={onZoomIn} title="Acercar escala (Zoom +)" aria-label="Acercar escala (Zoom +)">
            <ZoomIn size={18} />
          </button>
          <button className="icon-btn" onClick={onResetZoom} title="Restablecer zoom" aria-label="Restablecer zoom">
            <RotateCcw size={15} />
          </button>
        </div>

        <div className="header-group">
          <button className="icon-btn" onClick={onOpenWeek} title="Vista semanal" aria-label="Vista semanal">
            <CalendarDays size={18} />
          </button>
          <button
            className={`icon-btn ${isBalanceOpen ? 'is-active' : ''}`}
            onClick={onToggleBalance}
            title="Equilibrio del día" aria-label="Equilibrio del día"
            aria-pressed={isBalanceOpen}
          >
            <Scale size={18} />
          </button>
          <button className="icon-btn" onClick={onCycleTheme} title={THEME_LABEL[theme]} aria-label={THEME_LABEL[theme]}>
            <ThemeIcon size={18} />
          </button>
        </div>

        <button className="btn" onClick={onAddRow} title="Añadir miembro" aria-label="Añadir miembro">
          <UserPlus size={16} />
          <span>Añadir miembro</span>
        </button>

        <button className="btn btn-primary" onClick={onExport} title="Exportar: imprimir, PDF, imagen, calendario..." aria-label="Exportar">
          <Download size={16} />
          <span>Exportar</span>
        </button>
      </div>
    </header>
  );
};
