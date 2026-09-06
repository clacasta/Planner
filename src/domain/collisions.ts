import { Activity, LayoutActivity } from './types';

/**
 * Calcula la distribución en sub-carriles (lanes) para que las actividades solapadas
 * dentro de una fila se apilen verticalmente sin ocultarse.
 */
export function calculateLayoutActivities(activities: Activity[]): {
  layoutActivities: LayoutActivity[];
  maxLanes: number;
} {
  if (!activities || activities.length === 0) {
    return { layoutActivities: [], maxLanes: 1 };
  }

  // Ordenar por hora de inicio y luego por duración más larga
  const sorted = [...activities].sort((a, b) => {
    if (a.startMinutes !== b.startMinutes) {
      return a.startMinutes - b.startMinutes;
    }
    return (b.endMinutes - b.startMinutes) - (a.endMinutes - a.startMinutes);
  });

  // Estructura para almacenar el minuto final de la última actividad en cada carril
  const laneEndTimes: number[] = [];
  const assignedActivities: Array<{
    activity: Activity;
    laneIndex: number;
  }> = [];

  for (const act of sorted) {
    let placedLane = -1;

    // Buscar el primer carril disponible
    for (let i = 0; i < laneEndTimes.length; i++) {
      if (laneEndTimes[i] <= act.startMinutes) {
        placedLane = i;
        laneEndTimes[i] = act.endMinutes;
        break;
      }
    }

    // Si ningún carril estaba libre, abrir un nuevo carril
    if (placedLane === -1) {
      placedLane = laneEndTimes.length;
      laneEndTimes.push(act.endMinutes);
    }

    assignedActivities.push({
      activity: act,
      laneIndex: placedLane,
    });
  }

  const maxLanes = Math.max(1, laneEndTimes.length);

  // Calcular grupos de solapamiento conectados para saber cuántos carriles necesita cada grupo
  // En este primer cálculo para visualización limpia, asignamos totalLanes para la fila o por racimo
  const layoutActivities: LayoutActivity[] = assignedActivities.map((item) => ({
    ...item.activity,
    laneIndex: item.laneIndex,
    totalLanes: maxLanes,
  }));

  return {
    layoutActivities,
    maxLanes,
  };
}
