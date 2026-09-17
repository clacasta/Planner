import { useState, useEffect, useCallback, useRef } from 'react';
import { DayPlan, Activity, FlexokiColorKey } from './domain/types';
import { DEFAULT_PIXELS_PER_HOUR, MIN_PIXELS_PER_HOUR, MAX_PIXELS_PER_HOUR, formatTime } from './domain/time';
import { createId } from './domain/id';
import {
  duplicateActivityToRow,
  moveActivityToRow,
  replaceActivity,
} from './domain/planOperations';
import { loadStorageData, saveStorageData, savePreImportBackup, readRawStorageValue } from './storage/localStorage';
import { StorageData } from './storage/schema';
import { useHistoryState } from './storage/useHistoryState';
import { ImportPayload, summarizeImport } from './storage/validate';
import { AppHeader } from './components/AppHeader';
import { DayPlanner } from './components/DayPlanner';
import { ActivityEditorModal } from './components/ActivityEditorModal';
import { PlanManagerModal } from './components/PlanManagerModal';
import { ExportMenuModal } from './components/ExportMenuModal';
import './styles/app.css';
import './export/print.css';

// Breakpoint en px por debajo del cual aplicamos zoom compacto
const MOBILE_BREAKPOINT = 768;
// Zoom por defecto en móvil: cabe ~2.5 pantallas en lugar de ~2
const MOBILE_DEFAULT_PIXELS_PER_HOUR = 45;

const isMobileViewport = () => window.innerWidth < MOBILE_BREAKPOINT;

const AVAILABLE_COLORS: FlexokiColorKey[] = [
  'blue',
  'purple',
  'green',
  'orange',
  'cyan',
  'red',
  'magenta',
  'yellow',
];

interface Toast {
  text: string;
  kind: 'info' | 'error';
  actionLabel?: string;
  action?: () => void;
}

const TOAST_TIMEOUT_MS = 6000;

function downloadRawJson(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function App() {
  const [initialLoad] = useState(() => loadStorageData());
  const history = useHistoryState<StorageData>(initialLoad.data);
  const storage = history.value;

  // Zoom inicial: 45 px/h en móvil (cabe el día entero en ~3 pantallas),
  // 80 px/h en desktop (default original)
  const [pixelsPerHour, setPixelsPerHour] = useState<number>(() =>
    isMobileViewport() ? MOBILE_DEFAULT_PIXELS_PER_HOUR : DEFAULT_PIXELS_PER_HOUR
  );
  const [isMobile, setIsMobile] = useState<boolean>(() => isMobileViewport());

  // Modales
  const [isPlanManagerOpen, setIsPlanManagerOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [editingContext, setEditingContext] = useState<{
    activity: Activity;
    rowId: string;
  } | null>(null);

  // Línea resaltada mientras se arrastra una actividad hacia otra persona
  const [dropTargetRowId, setDropTargetRowId] = useState<string | null>(null);

  // Avisos
  const [loadWarning, setLoadWarning] = useState<string | null>(initialLoad.warning ?? null);
  const [preservedKey] = useState<string | undefined>(initialLoad.preservedKey);
  const [toast, setToast] = useState<Toast | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const saveErrorShownRef = useRef(false);

  const showToast = useCallback((next: Toast) => {
    if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
    setToast(next);
    toastTimerRef.current = window.setTimeout(() => setToast(null), TOAST_TIMEOUT_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  // Auto-guardado avisando si falla (cuota agotada, navegación privada...)
  useEffect(() => {
    const ok = saveStorageData(storage);
    if (!ok && !saveErrorShownRef.current) {
      saveErrorShownRef.current = true;
      showToast({
        kind: 'error',
        text: 'No se han podido guardar los cambios en este navegador. Descarga una copia desde «Exportar» para no perderlos.',
      });
    }
    if (ok) saveErrorShownRef.current = false;
  }, [storage, showToast]);

  // Detectar cambios de viewport (rotación, resize de ventana).
  // Si entra en móvil y el zoom es el de escritorio, lo bajamos;
  // si sale, lo subimos al default de escritorio. Esto NO sobrescribe
  // el zoom que el usuario haya elegido manualmente.
  useEffect(() => {
    const handleResize = () => {
      const mobile = isMobileViewport();
      setIsMobile(mobile);
      setPixelsPerHour((current) => {
        if (mobile && current === DEFAULT_PIXELS_PER_HOUR) {
          return MOBILE_DEFAULT_PIXELS_PER_HOUR;
        }
        if (!mobile && current === MOBILE_DEFAULT_PIXELS_PER_HOUR) {
          return DEFAULT_PIXELS_PER_HOUR;
        }
        return current;
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const undoAction = useCallback(() => {
    const label = history.undo();
    showToast({ kind: 'info', text: label ? `Deshecho: ${label}` : 'No hay nada que deshacer.' });
  }, [history, showToast]);

  const redoAction = useCallback(() => {
    const label = history.redo();
    showToast({ kind: 'info', text: label ? `Rehecho: ${label}` : 'No hay nada que rehacer.' });
  }, [history, showToast]);

  // Atajos de teclado: Escape cierra modales, Ctrl/Cmd+Z deshace.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsPlanManagerOpen(false);
        setIsExportModalOpen(false);
        setEditingContext(null);
        return;
      }

      const target = e.target as HTMLElement | null;
      const isTyping =
        !!target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !isTyping) {
        e.preventDefault();
        if (e.shiftKey) redoAction();
        else undoAction();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undoAction, redoAction]);

  const currentPlan =
    storage.plans.find((p) => p.id === storage.activePlanId) ||
    storage.plans[0] || {
      id: 'default-plan',
      name: 'Mi día',
      rows: [],
    };

  const updateActivePlan = (
    updater: (prevPlan: DayPlan) => DayPlan,
    label: string,
    options?: { undoable?: boolean }
  ) => {
    history.commit(
      (prev) => ({
        ...prev,
        plans: prev.plans.map((p) => (p.id === prev.activePlanId ? updater(p) : p)),
      }),
      label,
      options
    );
  };

  const handleTitleChange = (newTitle: string) => {
    updateActivePlan((p) => ({ ...p, name: newTitle }), 'renombrar el día');
  };

  const handleDateChange = (newDate: string) => {
    updateActivePlan((p) => ({ ...p, date: newDate }), 'cambiar la fecha del día');
  };

  const handleZoomIn = () => {
    setPixelsPerHour((prev) => Math.min(MAX_PIXELS_PER_HOUR, prev + 15));
  };

  const handleZoomOut = () => {
    setPixelsPerHour((prev) => Math.max(MIN_PIXELS_PER_HOUR, prev - 15));
  };

  const handleResetZoom = () => {
    setPixelsPerHour(isMobile ? MOBILE_DEFAULT_PIXELS_PER_HOUR : DEFAULT_PIXELS_PER_HOUR);
  };

  const handleToggleRowVisibility = (rowId: string) => {
    updateActivePlan(
      (p) => ({
        ...p,
        rows: p.rows.map((row) =>
          row.id === rowId ? { ...row, visible: !row.visible } : row
        ),
      }),
      'cambiar la visibilidad de una línea'
    );
  };

  // Reordenación vertical de miembros familiares
  const handleMoveRow = (rowId: string, direction: 'up' | 'down') => {
    updateActivePlan((p) => {
      const index = p.rows.findIndex((r) => r.id === rowId);
      if (index === -1) return p;
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= p.rows.length) return p;

      const newRows = [...p.rows];
      const [movedRow] = newRows.splice(index, 1);
      newRows.splice(targetIndex, 0, movedRow);

      return {
        ...p,
        rows: newRows,
      };
    }, 'reordenar las líneas');
  };

  const handleAddRow = () => {
    const name = window.prompt('Nombre del nuevo miembro familiar:');
    if (!name || !name.trim()) return;

    const nextColorIndex = currentPlan.rows.length % AVAILABLE_COLORS.length;
    const newRowId = createId('row');

    updateActivePlan(
      (p) => ({
        ...p,
        rows: [
          ...p.rows,
          {
            id: newRowId,
            name: name.trim(),
            color: AVAILABLE_COLORS[nextColorIndex],
            visible: true,
            activities: [],
          },
        ],
      }),
      'añadir un miembro'
    );
  };

  const handleCreateActivity = (rowId: string, startMinutes: number, endMinutes: number) => {
    const targetRow = currentPlan.rows.find((r) => r.id === rowId);
    const defaultColor = targetRow?.color || 'blue';

    const newActivity: Activity = {
      id: createId('act'),
      title: 'Nueva actividad',
      startMinutes,
      endMinutes,
      color: defaultColor,
    };

    updateActivePlan(
      (p) => ({
        ...p,
        rows: p.rows.map((row) =>
          row.id === rowId
            ? { ...row, activities: [...row.activities, newActivity] }
            : row
        ),
      }),
      'crear una actividad'
    );

    setEditingContext({
      activity: newActivity,
      rowId,
    });
  };

  const handleAddActivityManual = (rowId: string) => {
    handleCreateActivity(rowId, 540, 660);
  };

  const handleMoveActivity = (rowId: string, activityId: string, newStartMinutes: number) => {
    updateActivePlan(
      (p) => ({
        ...p,
        rows: p.rows.map((row) => {
          if (row.id !== rowId) return row;
          return {
            ...row,
            activities: row.activities.map((act) => {
              if (act.id !== activityId) return act;
              const duration = act.endMinutes - act.startMinutes;
              return {
                ...act,
                startMinutes: newStartMinutes,
                endMinutes: newStartMinutes + duration,
              };
            }),
          };
        }),
      }),
      'mover una actividad'
    );
  };

  const handleResizeActivity = (
    rowId: string,
    activityId: string,
    newStartMinutes: number,
    newEndMinutes: number
  ) => {
    updateActivePlan(
      (p) => ({
        ...p,
        rows: p.rows.map((row) => {
          if (row.id !== rowId) return row;
          return {
            ...row,
            activities: row.activities.map((act) => {
              if (act.id !== activityId) return act;
              return {
                ...act,
                startMinutes: newStartMinutes,
                endMinutes: newEndMinutes,
              };
            }),
          };
        }),
      }),
      'cambiar la duración de una actividad'
    );
  };

  const handleSelectActivity = (activity: Activity, rowId: string) => {
    setEditingContext({
      activity,
      rowId,
    });
  };

  const handleSaveActivity = (updatedActivity: Activity) => {
    if (!editingContext) return;
    const { rowId } = editingContext;

    updateActivePlan((p) => replaceActivity(p, rowId, updatedActivity), 'editar una actividad');
  };

  const rowName = (rowId: string) =>
    currentPlan.rows.find((r) => r.id === rowId)?.name ?? 'otra persona';

  /** El bloque se ha soltado sobre la línea de otra persona. */
  const handleMoveActivityToRow = (
    rowId: string,
    activityId: string,
    targetRowId: string,
    newStartMinutes: number
  ) => {
    const targetName = rowName(targetRowId);
    updateActivePlan(
      (p) => moveActivityToRow(p, rowId, activityId, targetRowId, newStartMinutes),
      `mover una actividad a ${targetName}`
    );
    showToast({
      kind: 'info',
      text: `Actividad movida a la línea de ${targetName}.`,
      actionLabel: 'Deshacer',
      action: undoAction,
    });
  };

  /** Desde el editor: mover la actividad (con los cambios del formulario) a otra persona. */
  const handleMoveActivityToPerson = (targetRowId: string, updatedActivity: Activity) => {
    if (!editingContext) return;
    const { rowId } = editingContext;
    const targetName = rowName(targetRowId);

    updateActivePlan((p) => {
      const withEdits = replaceActivity(p, rowId, updatedActivity);
      return moveActivityToRow(withEdits, rowId, updatedActivity.id, targetRowId);
    }, `mover la actividad a ${targetName}`);

    setEditingContext(null);
    showToast({
      kind: 'info',
      text: `Actividad movida a la línea de ${targetName}.`,
      actionLabel: 'Deshacer',
      action: undoAction,
    });
  };

  /** Desde el editor: copiar la actividad a otra persona (o duplicarla en la misma). */
  const handleDuplicateActivityToPerson = (targetRowId: string, updatedActivity: Activity) => {
    if (!editingContext) return;
    const { rowId } = editingContext;
    const isSameRow = targetRowId === rowId;
    const targetName = rowName(targetRowId);

    updateActivePlan((p) => {
      const withEdits = replaceActivity(p, rowId, updatedActivity);
      return duplicateActivityToRow(withEdits, rowId, updatedActivity.id, targetRowId, updatedActivity);
    }, isSameRow ? 'duplicar una actividad' : `copiar una actividad a ${targetName}`);

    setEditingContext(null);
    showToast({
      kind: 'info',
      text: isSameRow
        ? 'Actividad duplicada.'
        : `Actividad copiada a la línea de ${targetName}.`,
      actionLabel: 'Deshacer',
      action: undoAction,
    });
  };

  const handleDeleteActivity = (activityId: string) => {
    if (!editingContext) return;
    const { rowId } = editingContext;
    const target = currentPlan.rows
      .find((r) => r.id === rowId)
      ?.activities.find((a) => a.id === activityId);

    updateActivePlan(
      (p) => ({
        ...p,
        rows: p.rows.map((row) => {
          if (row.id !== rowId) return row;
          return {
            ...row,
            activities: row.activities.filter((act) => act.id !== activityId),
          };
        }),
      }),
      'eliminar una actividad'
    );

    // Cualquier cambio es deshacible: avisamos para que se descubra la función.
    showToast({
      kind: 'info',
      text: `Actividad «${target?.title ?? 'sin título'}» eliminada.`,
      actionLabel: 'Deshacer',
      action: undoAction,
    });
  };

  const handleSelectPlan = (planId: string) => {
    history.commit(
      (prev) => ({ ...prev, activePlanId: planId }),
      'cambiar de día',
      { undoable: false }
    );
    setIsPlanManagerOpen(false);
  };

  const handleCreatePlan = (name: string) => {
    const newPlanId = createId('plan');
    const newPlan: DayPlan = {
      id: newPlanId,
      name,
      rows: [
        { id: createId('row'), name: 'Carlos', color: 'blue', visible: true, activities: [] },
        { id: createId('row'), name: 'Pilar', color: 'purple', visible: true, activities: [] },
        { id: createId('row'), name: 'Leo', color: 'green', visible: true, activities: [] },
      ],
    };

    history.commit(
      (prev) => ({
        ...prev,
        activePlanId: newPlanId,
        plans: [...prev.plans, newPlan],
      }),
      'crear un día'
    );
    setIsPlanManagerOpen(false);
  };

  const handleDuplicatePlan = (planId: string) => {
    const sourcePlan = storage.plans.find((p) => p.id === planId);
    if (!sourcePlan) return;

    const duplicatedId = createId('plan');
    const duplicatedPlan: DayPlan = {
      ...JSON.parse(JSON.stringify(sourcePlan)),
      id: duplicatedId,
      name: `${sourcePlan.name} (Copia)`,
    };

    history.commit(
      (prev) => ({
        ...prev,
        activePlanId: duplicatedId,
        plans: [...prev.plans, duplicatedPlan],
      }),
      'duplicar un día'
    );
  };

  const handleDeletePlan = (planId: string) => {
    if (storage.plans.length <= 1) return;

    history.commit((prev) => {
      const remainingPlans = prev.plans.filter((p) => p.id !== planId);
      const newActiveId =
        prev.activePlanId === planId ? remainingPlans[0].id : prev.activePlanId;

      return {
        ...prev,
        activePlanId: newActiveId,
        plans: remainingPlans,
      };
    }, 'eliminar un día');

    showToast({
      kind: 'info',
      text: 'Día eliminado.',
      actionLabel: 'Deshacer',
      action: undoAction,
    });
  };

  const handleImportPlan = (payload: ImportPayload) => {
    // Copia de seguridad del estado actual ANTES de tocar nada.
    const backupSaved = savePreImportBackup(storage);
    const summary = summarizeImport(payload);

    if (payload.kind === 'backup') {
      history.commit(() => payload.data, 'importar una copia de seguridad');
    } else {
      const importedPlan: DayPlan = { ...payload.plan, id: createId('plan') };
      history.commit(
        (prev) => ({
          ...prev,
          activePlanId: importedPlan.id,
          plans: [...prev.plans, importedPlan],
        }),
        'importar un día'
      );
    }

    setIsPlanManagerOpen(false);
    showToast({
      kind: 'info',
      text: `${summary.title} importado.${backupSaved ? '' : ' No se pudo guardar copia previa.'}`,
      actionLabel: 'Deshacer',
      action: undoAction,
    });
  };

  const totalActivities = currentPlan.rows.reduce(
    (acc, row) => acc + (row.visible ? row.activities.length : 0),
    0
  );

  // Recopilar notas para la sección de impresión
  const printNotes: Array<{ person: string; title: string; time: string; comment: string }> = [];
  currentPlan.rows
    .filter((r) => r.visible)
    .forEach((r) => {
      r.activities.forEach((a) => {
        if (a.comment && a.comment.trim()) {
          printNotes.push({
            person: r.name,
            title: a.title,
            time: `${formatTime(a.startMinutes)} - ${formatTime(a.endMinutes)}`,
            comment: a.comment.trim(),
          });
        }
      });
    });

  return (
    <div className="app-container">
      {/* Cabecera exclusiva para impresión A4 */}
      <div className="print-only-header">
        <span className="print-title">{currentPlan.name}</span>
        {currentPlan.date && <span className="print-date">Fecha: {currentPlan.date}</span>}
      </div>

      {loadWarning && (
        <div className="app-banner app-banner-warning" role="alert">
          <span>{loadWarning}</span>
          <div className="app-banner-actions">
            {preservedKey && (
              <button
                className="btn"
                onClick={() => {
                  const raw = readRawStorageValue(preservedKey);
                  if (raw) downloadRawJson(raw, 'datos-danados-family-day-planner.json');
                }}
              >
                Descargar copia intacta
              </button>
            )}
            <button className="btn" onClick={() => setLoadWarning(null)}>
              Entendido
            </button>
          </div>
        </div>
      )}

      <AppHeader
        plan={currentPlan}
        plans={storage.plans}
        pixelsPerHour={pixelsPerHour}
        canUndo={history.canUndo}
        canRedo={history.canRedo}
        onUndo={undoAction}
        onRedo={redoAction}
        onTitleChange={handleTitleChange}
        onDateChange={handleDateChange}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetZoom={handleResetZoom}
        onAddRow={handleAddRow}
        onOpenPlanManager={() => setIsPlanManagerOpen(true)}
        onExport={() => setIsExportModalOpen(true)}
      />

      <DayPlanner
        plan={currentPlan}
        pixelsPerHour={pixelsPerHour}
        rowHeaderWidth={200}
        onMoveRow={handleMoveRow}
        onToggleRowVisibility={handleToggleRowVisibility}
        onAddActivity={handleAddActivityManual}
        onSelectActivity={handleSelectActivity}
        onMoveActivity={handleMoveActivity}
        onResizeActivity={handleResizeActivity}
        onCreateActivity={handleCreateActivity}
        onMoveActivityToRow={handleMoveActivityToRow}
        dropTargetRowId={dropTargetRowId}
        onDropTargetChange={setDropTargetRowId}
      />

      {/* Sección inferior de notas exclusiva para impresión A4 */}
      {printNotes.length > 0 && (
        <div className="print-notes-section">
          <div className="print-notes-title">Notas y comentarios del día</div>
          <div className="print-notes-grid">
            {printNotes.map((note, idx) => (
              <div key={idx} className="print-note-item">
                <span className="print-note-time">
                  [{note.person}] {note.title} ({note.time}):
                </span>
                <span>{note.comment}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <footer className="app-footer">
        <div>
          <strong>{currentPlan.rows.filter((r) => r.visible).length}</strong> líneas visibles •{' '}
          <strong>{totalActivities}</strong> actividades en <em>{currentPlan.name}</em>
        </div>
        <div>
          <span>Arrastra sobre una línea para crear · toca (móvil) para crear 1 h · arrastra un bloque en horizontal para moverlo y en vertical para pasarlo a otra persona · Ctrl/Cmd+Z deshace</span>
        </div>
      </footer>

      {toast && (
        <div className={`app-toast app-toast-${toast.kind}`} role="status">
          <span>{toast.text}</span>
          {toast.action && (
            <button className="btn btn-small" onClick={toast.action}>
              {toast.actionLabel ?? 'Deshacer'}
            </button>
          )}
          <button className="icon-btn" onClick={() => setToast(null)} title="Cerrar aviso">
            ✕
          </button>
        </div>
      )}

      {editingContext && (
        <ActivityEditorModal
          key={editingContext.activity.id}
          isOpen={true}
          activity={editingContext.activity}
          rowName={currentPlan.rows.find((r) => r.id === editingContext.rowId)?.name}
          rows={currentPlan.rows}
          currentRowId={editingContext.rowId}
          onMoveTo={handleMoveActivityToPerson}
          onDuplicateTo={handleDuplicateActivityToPerson}
          onSave={handleSaveActivity}
          onDelete={handleDeleteActivity}
          onClose={() => setEditingContext(null)}
        />
      )}

      {isPlanManagerOpen && (
        <PlanManagerModal
          isOpen={true}
          plans={storage.plans}
          activePlanId={storage.activePlanId}
          onSelectPlan={handleSelectPlan}
          onCreatePlan={handleCreatePlan}
          onDuplicatePlan={handleDuplicatePlan}
          onDeletePlan={handleDeletePlan}
          onImportPlan={handleImportPlan}
          onClose={() => setIsPlanManagerOpen(false)}
        />
      )}

      {isExportModalOpen && (
        <ExportMenuModal
          isOpen={true}
          plan={currentPlan}
          onClose={() => setIsExportModalOpen(false)}
        />
      )}
    </div>
  );
}

export default App;
