import { useState, useEffect } from 'react';
import { DayPlan, Activity, FlexokiColorKey } from './domain/types';
import { DEFAULT_PIXELS_PER_HOUR, formatTime } from './domain/time';
import { loadStorageData, saveStorageData } from './storage/localStorage';
import { StorageData } from './storage/schema';
import { AppHeader } from './components/AppHeader';
import { DayPlanner } from './components/DayPlanner';
import { ActivityEditorModal } from './components/ActivityEditorModal';
import { PlanManagerModal } from './components/PlanManagerModal';
import { ExportMenuModal } from './components/ExportMenuModal';
import './styles/app.css';
import './export/print.css';

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

export function App() {
  const [storage, setStorage] = useState<StorageData>(() => loadStorageData());
  const [pixelsPerHour, setPixelsPerHour] = useState<number>(DEFAULT_PIXELS_PER_HOUR);
  
  // Modales
  const [isPlanManagerOpen, setIsPlanManagerOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [editingContext, setEditingContext] = useState<{
    activity: Activity;
    rowId: string;
  } | null>(null);

  // Auto-guardado
  useEffect(() => {
    saveStorageData(storage);
  }, [storage]);

  // Atajos de teclado (Escape para cerrar modales)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsPlanManagerOpen(false);
        setIsExportModalOpen(false);
        setEditingContext(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const currentPlan =
    storage.plans.find((p) => p.id === storage.activePlanId) ||
    storage.plans[0] || {
      id: 'default-plan',
      name: 'Mi día',
      rows: [],
    };

  const updateActivePlan = (updater: (prevPlan: DayPlan) => DayPlan) => {
    setStorage((prev) => ({
      ...prev,
      plans: prev.plans.map((p) =>
        p.id === prev.activePlanId ? updater(p) : p
      ),
    }));
  };

  const handleTitleChange = (newTitle: string) => {
    updateActivePlan((p) => ({ ...p, name: newTitle }));
  };

  const handleDateChange = (newDate: string) => {
    updateActivePlan((p) => ({ ...p, date: newDate }));
  };

  const handleZoomIn = () => {
    setPixelsPerHour((prev) => Math.min(180, prev + 15));
  };

  const handleZoomOut = () => {
    setPixelsPerHour((prev) => Math.max(45, prev - 15));
  };

  const handleResetZoom = () => {
    setPixelsPerHour(DEFAULT_PIXELS_PER_HOUR);
  };

  const handleToggleRowVisibility = (rowId: string) => {
    updateActivePlan((p) => ({
      ...p,
      rows: p.rows.map((row) =>
        row.id === rowId ? { ...row, visible: !row.visible } : row
      ),
    }));
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
    });
  };

  const handleAddRow = () => {
    const name = window.prompt('Nombre del nuevo miembro familiar:');
    if (!name || !name.trim()) return;

    const nextColorIndex = currentPlan.rows.length % AVAILABLE_COLORS.length;
    const newRowId = `row-${Date.now()}`;

    updateActivePlan((p) => ({
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
    }));
  };

  const handleCreateActivity = (rowId: string, startMinutes: number, endMinutes: number) => {
    const targetRow = currentPlan.rows.find((r) => r.id === rowId);
    const defaultColor = targetRow?.color || 'blue';

    const newActivity: Activity = {
      id: `act-${Date.now()}`,
      title: 'Nueva actividad',
      startMinutes,
      endMinutes,
      color: defaultColor,
    };

    updateActivePlan((p) => ({
      ...p,
      rows: p.rows.map((row) =>
        row.id === rowId
          ? { ...row, activities: [...row.activities, newActivity] }
          : row
      ),
    }));

    setEditingContext({
      activity: newActivity,
      rowId,
    });
  };

  const handleAddActivityManual = (rowId: string) => {
    handleCreateActivity(rowId, 540, 660);
  };

  const handleMoveActivity = (rowId: string, activityId: string, newStartMinutes: number) => {
    updateActivePlan((p) => ({
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
    }));
  };

  const handleResizeActivity = (
    rowId: string,
    activityId: string,
    newStartMinutes: number,
    newEndMinutes: number
  ) => {
    updateActivePlan((p) => ({
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
    }));
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

    updateActivePlan((p) => ({
      ...p,
      rows: p.rows.map((row) => {
        if (row.id !== rowId) return row;
        return {
          ...row,
          activities: row.activities.map((act) =>
            act.id === updatedActivity.id ? updatedActivity : act
          ),
        };
      }),
    }));
  };

  const handleDeleteActivity = (activityId: string) => {
    if (!editingContext) return;
    const { rowId } = editingContext;

    updateActivePlan((p) => ({
      ...p,
      rows: p.rows.map((row) => {
        if (row.id !== rowId) return row;
        return {
          ...row,
          activities: row.activities.filter((act) => act.id !== activityId),
        };
      }),
    }));
  };

  const handleSelectPlan = (planId: string) => {
    setStorage((prev) => ({
      ...prev,
      activePlanId: planId,
    }));
    setIsPlanManagerOpen(false);
  };

  const handleCreatePlan = (name: string) => {
    const newPlanId = `plan-${Date.now()}`;
    const newPlan: DayPlan = {
      id: newPlanId,
      name,
      rows: [
        { id: `row-1-${Date.now()}`, name: 'Carlos', color: 'blue', visible: true, activities: [] },
        { id: `row-2-${Date.now()}`, name: 'Pilar', color: 'purple', visible: true, activities: [] },
        { id: `row-3-${Date.now()}`, name: 'Leo', color: 'green', visible: true, activities: [] },
      ],
    };

    setStorage((prev) => ({
      ...prev,
      activePlanId: newPlanId,
      plans: [...prev.plans, newPlan],
    }));
    setIsPlanManagerOpen(false);
  };

  const handleDuplicatePlan = (planId: string) => {
    const sourcePlan = storage.plans.find((p) => p.id === planId);
    if (!sourcePlan) return;

    const duplicatedId = `plan-${Date.now()}`;
    const duplicatedPlan: DayPlan = {
      ...JSON.parse(JSON.stringify(sourcePlan)),
      id: duplicatedId,
      name: `${sourcePlan.name} (Copia)`,
    };

    setStorage((prev) => ({
      ...prev,
      activePlanId: duplicatedId,
      plans: [...prev.plans, duplicatedPlan],
    }));
  };

  const handleDeletePlan = (planId: string) => {
    if (storage.plans.length <= 1) return;

    setStorage((prev) => {
      const remainingPlans = prev.plans.filter((p) => p.id !== planId);
      const newActiveId =
        prev.activePlanId === planId ? remainingPlans[0].id : prev.activePlanId;

      return {
        ...prev,
        activePlanId: newActiveId,
        plans: remainingPlans,
      };
    });
  };

  const handleImportPlan = (imported: {
    singlePlan?: DayPlan;
    fullBackup?: StorageData;
  }) => {
    if (imported.fullBackup) {
      setStorage(imported.fullBackup);
      setIsPlanManagerOpen(false);
      return;
    }

    if (imported.singlePlan) {
      const planToImport = {
        ...imported.singlePlan,
        id: `imported-${Date.now()}`,
      };
      setStorage((prev) => ({
        ...prev,
        activePlanId: planToImport.id,
        plans: [...prev.plans, planToImport],
      }));
      setIsPlanManagerOpen(false);
    }
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

      <AppHeader
        plan={currentPlan}
        plans={storage.plans}
        pixelsPerHour={pixelsPerHour}
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
          <span>↕️ Flechas en cada línea para reordenar personas</span>
        </div>
      </footer>

      {editingContext && (
        <ActivityEditorModal
          isOpen={true}
          activity={editingContext.activity}
          rowName={currentPlan.rows.find((r) => r.id === editingContext.rowId)?.name}
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
