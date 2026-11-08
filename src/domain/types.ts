export type FlexokiColorKey =
  | 'red'
  | 'orange'
  | 'yellow'
  | 'green'
  | 'cyan'
  | 'blue'
  | 'purple'
  | 'magenta';

export interface Activity {
  id: string;
  title: string;
  startMinutes: number; // 0 (00:00) a 1440 (24:00)
  endMinutes: number;   // 15 a 1440
  color: FlexokiColorKey;
  comment?: string;
}

/** Miembro de la familia. Es común a todos los días. */
export interface Member {
  id: string;
  name: string;
  color: FlexokiColorKey;
  visible: boolean;
}

/**
 * Línea del planificador: un miembro con sus actividades de un día concreto.
 * Es una VISTA (miembros + día) y también el formato de los archivos .json de
 * un día suelto, que así son autocontenidos y compatibles con versiones
 * anteriores.
 */
export interface TimelineRow extends Member {
  activities: Activity[];
}

/**
 * Un día guardado: solo sus actividades, agrupadas por id de miembro. Los
 * nombres, colores, orden y visibilidad de las personas viven en la familia
 * (`StorageData.members`), así que se cambian una vez para todos los días.
 */
export interface DayPlan {
  id: string;
  name: string;
  date?: string; // Formato YYYY-MM-DD
  activities: Record<string, Activity[]>;
}

/**
 * Día con sus líneas ya resueltas (familia + actividades). Es lo que pintan los
 * componentes y lo que se exporta como JSON de un día (formato del esquema v1).
 */
export interface DayView {
  id: string;
  name: string;
  date?: string;
  rows: TimelineRow[];
}

export interface LayoutActivity extends Activity {
  laneIndex: number;
  totalLanes: number;
}

export interface PlannerConfig {
  pixelsPerHour: number;
  gridStepMinutes: number;
  minDurationMinutes: number;
  rowHeaderWidth: number;
}
