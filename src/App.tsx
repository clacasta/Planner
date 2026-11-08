import { useState, useEffect, useCallback, useRef } from 'react';
import { DayPlan, Activity, FlexokiColorKey } from './domain/types';
import { DEFAULT_PIXELS_PER_HOUR, MIN_PIXELS_PER_HOUR, MAX_PIXELS_PER_HOUR, formatTime } from './domain/time';
import { createId } from './domain/id';
import {
  duplicateActivityToRow,
  findActivity,
  moveActivityToRow,
  removeActivity,
  setActivityTimes,
  upsertActivity,
} from './domain/planOperations';
import {
  addMember,
  countMemberActivities,
  mergeViewsIntoFamily,
  moveMember,
  nextMemberColor,
  planToView,
  removeMember,
  updateMember,
} from './domain/family';
import { loadStorageData, saveStorageData, savePreImportBackup, readRawStorageValue } from './storage/localStorage';
import { migrateStorageData } from './storage/migrations';
import { StorageData, STORAGE_KEY } from './storage/schema';
import { useHistoryState } from './storage/useHistoryState';
import { ImportPayload, summarizeImport } from './storage/validate';
import { AppHeader } from './components/AppHeader';
import { DayPlanner } from './components/DayPlanner';
import { ActivityEditorModal } from './components/ActivityEditorModal';
import { PlanManagerModal } from './components/PlanManagerModal';
import { ExportMenuModal } from './components/ExportMenuModal';
import { PersonEditorModal } from './components/PersonEditorModal';
import './styles/app.css';
import './export/print.css';

// Breakpoint en px por debajo del cual aplicamos zoom compacto
const MOBILE_BREAKPOINT = 768;
// Zoom por defecto en móvil: cabe ~2.5 pantallas en lugar de ~2
const MOBILE_DEFAULT_PIXELS_PER_HOUR = 45;

const isMobileViewport = () => window.innerWidth < MOBILE_BREAKPOINT;

interface Toast {
  text: string;
  kind: 'info' | 'error';
  actionLabel?: string;
  action?: () => void;
  /**
   * Versión del historial a la que se refiere la acción. Si después hay otro
   * cambio, el botón desaparece: «Deshacer» deshace siempre el ÚLTIMO cambio y
   * ya no sería el que anuncia el aviso.
   */
  historyVersion?: number;
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
    /** Recién creada: no está en el día hasta que se guarde. */
    isNew: boolean;
  } | null>(null);
  // Editor de persona: `memberId: null` para añadir una nueva.
  const [personEditor, setPersonEditor] = useState<{ memberId: string | null } | null>(null);

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

  // Con un modal abierto, Ctrl/Cmd+Z no toca el historial: podría deshacer la
  // propia actividad que se está editando y «Guardar» no haría nada.
  const isAnyModalOpen =
    isPlanManagerOpen || isExportModalOpen || editingContext !== null || personEditor !== null;
  const isAnyModalOpenRef = useRef(isAnyModalOpen);
  useEffect(() => {
    isAnyModalOpenRef.current = isAnyModalOpen;
  }, [isAnyModalOpen]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  // Último contenido guardado o recibido de otra pestaña: evita reescribir lo
  // mismo (y que dos pestañas se reenvíen los cambios una a otra sin fin).
  const lastSavedRawRef = useRef<string | null>(null);
  const storageRef = useRef(storage);
  useEffect(() => {
    storageRef.current = storage;
  }, [storage]);

  // Auto-guardado avisando si falla (cuota agotada, navegación privada...)
  useEffect(() => {
    const raw = JSON.stringify(storage);
    if (raw === lastSavedRawRef.current) return;
    lastSavedRawRef.current = raw;
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

  // Otra pestaña ha guardado cambios: se cargan aquí para no pisarlos con el
  // siguiente autoguardado (antes ganaba la última pestaña en guardar). Cada
  // pestaña conserva el día que estaba viendo.
  const resetHistory = history.reset;
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY || e.newValue === null) return;
      let parsed: unknown;
      try {
        parsed = JSON.parse(e.newValue);
      } catch {
        return;
      }
      const incoming = migrateStorageData(parsed);
      if (!incoming) return;

      const current = storageRef.current;
      const sameContent =
        JSON.stringify([incoming.members, incoming.plans]) ===
        JSON.stringify([current.members, current.plans]);
      if (sameContent) return;

      const next: StorageData = incoming.plans.some((p) => p.id === current.activePlanId)
        ? { ...incoming, activePlanId: current.activePlanId }
        : incoming;
      lastSavedRawRef.current = JSON.stringify(next);
      resetHistory(next);
      setEditingContext(null);
      setPersonEditor(null);
      showToast({ kind: 'info', text: 'Se han cargado los cambios hechos en otra pestaña.' });
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [resetHistory, showToast]);

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
        setPersonEditor(null);
        return;
      }

      const target = e.target as HTMLElement | null;
      const isTyping =
        !!target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

      if (
        (e.ctrlKey || e.metaKey) &&
        e.key.toLowerCase() === 'z' &&
        !isTyping &&
        !isAnyModalOpenRef.current
      ) {
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
      activities: {},
    };
  // Día resuelto con la familia: lo que se pinta, se imprime y se exporta.
  const currentView = planToView(storage.members, currentPlan);

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

  const memberName = (memberId: string) =>
    storage.members.find((m) => m.id === memberId)?.name ?? 'otra persona';

  const handleToggleRowVisibility = (memberId: string) => {
    const member = storage.members.find((m) => m.id === memberId);
    if (!member) return;
    history.commit(
      (prev) => updateMember(prev, memberId, { visible: !member.visible }),
      member.visible ? `ocultar a ${member.name}` : `mostrar a ${member.name}`
    );
  };

  // Reordenación vertical de la familia (común a todos los días)
  const handleMoveRow = (memberId: string, direction: 'up' | 'down') => {
    history.commit((prev) => moveMember(prev, memberId, direction), 'reordenar la familia');
  };

  const handleAddRow = () => setPersonEditor({ memberId: null });

  const handleEditRow = (memberId: string) => setPersonEditor({ memberId });

  const handleSavePerson = (changes: { name: string; color: FlexokiColorKey }) => {
    if (!personEditor) return;
    const { memberId } = personEditor;

    if (memberId === null) {
      history.commit(
        (prev) => addMember(prev, { id: createId('row'), ...changes, visible: true }),
        `añadir a ${changes.name}`
      );
      return;
    }
    history.commit(
      (prev) => updateMember(prev, memberId, changes),
      `editar a ${memberName(memberId)}`
    );
  };

  const handleDeletePerson = () => {
    if (!personEditor?.memberId) return;
    const { memberId } = personEditor;
    const name = memberName(memberId);
    history.commit((prev) => removeMember(prev, memberId), `eliminar a ${name}`);
    showUndoToast(`Se ha eliminado a ${name} de la familia.`);
  };

  /** Toast con «Deshacer» ligado al cambio que se acaba de aplicar. */
  const showUndoToast = (text: string) => {
    showToast({
      kind: 'info',
      text,
      actionLabel: 'Deshacer',
      action: undoAction,
      historyVersion: history.getVersion(),
    });
  };

  /**
   * Abre el editor con una actividad nueva SIN añadirla todavía al día: si el
   * usuario cancela (o fue un toque accidental en el móvil) no queda nada.
   */
  const handleCreateActivity = (rowId: string, startMinutes: number, endMinutes: number) => {
    const member = storage.members.find((m) => m.id === rowId);
    const defaultColor = member?.color || 'blue';

    const newActivity: Activity = {
      id: createId('act'),
      title: 'Nueva actividad',
      startMinutes,
      endMinutes,
      color: defaultColor,
    };

    setEditingContext({
      activity: newActivity,
      rowId,
      isNew: true,
    });
  };

  const handleAddActivityManual = (rowId: string) => {
    handleCreateActivity(rowId, 540, 660);
  };

  const handleMoveActivity = (rowId: string, activityId: string, newStartMinutes: number) => {
    updateActivePlan((p) => {
      const activity = findActivity(p, rowId, activityId);
      if (!activity) return p;
      const duration = activity.endMinutes - activity.startMinutes;
      return setActivityTimes(p, rowId, activityId, newStartMinutes, newStartMinutes + duration);
    }, 'mover una actividad');
  };

  const handleResizeActivity = (
    rowId: string,
    activityId: string,
    newStartMinutes: number,
    newEndMinutes: number
  ) => {
    updateActivePlan(
      (p) => setActivityTimes(p, rowId, activityId, newStartMinutes, newEndMinutes),
      'cambiar la duración de una actividad'
    );
  };

  const handleSelectActivity = (activity: Activity, rowId: string) => {
    setEditingContext({
      activity,
      rowId,
      isNew: false,
    });
  };

  const handleSaveActivity = (updatedActivity: Activity) => {
    if (!editingContext) return;
    const { rowId, isNew } = editingContext;

    updateActivePlan(
      (p) => upsertActivity(p, rowId, updatedActivity),
      isNew ? 'crear una actividad' : 'editar una actividad'
    );
  };

  const rowName = memberName;

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
    showUndoToast(`Actividad movida a la línea de ${targetName}.`);
  };

  /** Desde el editor: mover la actividad (con los cambios del formulario) a otra persona. */
  const handleMoveActivityToPerson = (targetRowId: string, updatedActivity: Activity) => {
    if (!editingContext) return;
    const { rowId } = editingContext;
    const targetName = rowName(targetRowId);

    updateActivePlan((p) => {
      const withEdits = upsertActivity(p, rowId, updatedActivity);
      return moveActivityToRow(withEdits, rowId, updatedActivity.id, targetRowId);
    }, `mover la actividad a ${targetName}`);

    setEditingContext(null);
    showUndoToast(`Actividad movida a la línea de ${targetName}.`);
  };

  /** Desde el editor: copiar la actividad a otra persona (o duplicarla en la misma). */
  const handleDuplicateActivityToPerson = (targetRowId: string, updatedActivity: Activity) => {
    if (!editingContext) return;
    const { rowId } = editingContext;
    const isSameRow = targetRowId === rowId;
    const targetName = rowName(targetRowId);

    updateActivePlan((p) => {
      const withEdits = upsertActivity(p, rowId, updatedActivity);
      return duplicateActivityToRow(withEdits, rowId, updatedActivity.id, targetRowId, updatedActivity);
    }, isSameRow ? 'duplicar una actividad' : `copiar una actividad a ${targetName}`);

    setEditingContext(null);
    showUndoToast(
      isSameRow ? 'Actividad duplicada.' : `Actividad copiada a la línea de ${targetName}.`
    );
  };

  const handleDeleteActivity = (activityId: string) => {
    if (!editingContext) return;
    const { rowId, isNew } = editingContext;
    // Una actividad nueva aún no está en el día: no hay nada que borrar.
    if (isNew) return;
    const target = findActivity(currentPlan, rowId, activityId);

    updateActivePlan((p) => removeActivity(p, rowId, activityId), 'eliminar una actividad');

    // Cualquier cambio es deshacible: avisamos para que se descubra la función.
    showUndoToast(`Actividad «${target?.title ?? 'sin título'}» eliminada.`);
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
    // La familia es común: el día nuevo solo necesita sus actividades (vacías).
    const newPlan: DayPlan = { id: newPlanId, name, activities: {} };

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

    showUndoToast('Día eliminado.');
  };

  const handleImportPlan = (payload: ImportPayload) => {
    // Copia de seguridad del estado actual ANTES de tocar nada.
    const backupSaved = savePreImportBackup(storage);
    const summary = summarizeImport(payload);

    if (payload.kind === 'backup') {
      history.commit(() => payload.data, 'importar una copia de seguridad');
    } else {
      // Las líneas del archivo se asocian a la familia por id o por nombre; las
      // personas que no existan se añaden.
      const importedId = createId('plan');
      history.commit((prev) => {
        const merged = mergeViewsIntoFamily([{ ...payload.plan, id: importedId }], prev.members);
        return {
          ...prev,
          activePlanId: importedId,
          members: merged.members,
          plans: [...prev.plans, merged.plans[0]],
        };
      }, 'importar un día');
    }

    setIsPlanManagerOpen(false);
    showUndoToast(
      `${summary.title} importado.${backupSaved ? '' : ' No se pudo guardar copia previa.'}`
    );
  };

  const totalActivities = currentView.rows.reduce(
    (acc, row) => acc + (row.visible ? row.activities.length : 0),
    0
  );

  // Recopilar notas para la sección de impresión
  const printNotes: Array<{ person: string; title: string; time: string; comment: string }> = [];
  currentView.rows
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
        plan={currentView}
        pixelsPerHour={pixelsPerHour}
        rowHeaderWidth={200}
        onMoveRow={handleMoveRow}
        onToggleRowVisibility={handleToggleRowVisibility}
        onEditRow={handleEditRow}
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
          <strong>{currentView.rows.filter((r) => r.visible).length}</strong> líneas visibles •{' '}
          <strong>{totalActivities}</strong> actividades en <em>{currentPlan.name}</em>
        </div>
        <div>
          <span>Arrastra sobre una línea para crear · toca (móvil) para crear 1 h · arrastra un bloque en horizontal para moverlo y en vertical para pasarlo a otra persona · Ctrl/Cmd+Z deshace</span>
        </div>
      </footer>

      {toast && (
        <div className={`app-toast app-toast-${toast.kind}`} role="status">
          <span>{toast.text}</span>
          {toast.action &&
            (toast.historyVersion === undefined || toast.historyVersion === history.version) && (
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
          isNew={editingContext.isNew}
          rowName={memberName(editingContext.rowId)}
          rows={currentView.rows}
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
          members={storage.members}
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
          plan={currentView}
          onClose={() => setIsExportModalOpen(false)}
        />
      )}

      {personEditor && (
        <PersonEditorModal
          key={personEditor.memberId ?? 'nueva'}
          member={storage.members.find((m) => m.id === personEditor.memberId) ?? null}
          defaultColor={nextMemberColor(storage.members)}
          activityCount={
            personEditor.memberId ? countMemberActivities(storage, personEditor.memberId) : 0
          }
          onSave={handleSavePerson}
          onDelete={handleDeletePerson}
          onClose={() => setPersonEditor(null)}
        />
      )}
    </div>
  );
}

export default App;
