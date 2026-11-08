import { DayPlan, Member } from '../domain/types';

/**
 * v1: cada día guardaba sus propias líneas (personas + actividades).
 * v2: la familia (`members`) es común a todos los días y cada día solo guarda
 *     sus actividades por id de persona. Los datos v1 se migran al cargar.
 */
export const SCHEMA_VERSION = 2;
export const STORAGE_KEY = 'family-day-planner:data';

export interface StorageData {
  schemaVersion: number;
  activePlanId: string;
  members: Member[];
  plans: DayPlan[];
}
