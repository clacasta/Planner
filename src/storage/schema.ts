import { DayPlan } from '../domain/types';

export const SCHEMA_VERSION = 1;
export const STORAGE_KEY = 'family-day-planner:data';

export interface StorageData {
  schemaVersion: number;
  activePlanId: string;
  plans: DayPlan[];
}
