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

export interface TimelineRow {
  id: string;
  name: string;
  color: FlexokiColorKey;
  visible: boolean;
  activities: Activity[];
}

export interface DayPlan {
  id: string;
  name: string;
  date?: string; // Formato YYYY-MM-DD
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
