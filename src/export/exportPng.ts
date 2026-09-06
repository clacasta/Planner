import { DayPlan, FlexokiColorKey } from '../domain/types';
import { calculateLayoutActivities } from '../domain/collisions';
import { formatTime } from '../domain/time';

const FLEXOKI_HEX_COLORS: Record<FlexokiColorKey, { bg: string; border: string; text: string }> = {
  red: { bg: '#FBECEB', border: '#E89E9B', text: '#AF3029' },
  orange: { bg: '#FCF0E8', border: '#F0B38F', text: '#BC5215' },
  yellow: { bg: '#FAF5E1', border: '#E9D27B', text: '#AD8301' },
  green: { bg: '#F2F6E3', border: '#BFD384', text: '#66800B' },
  cyan: { bg: '#E6F5F3', border: '#91D3CD', text: '#24837B' },
  blue: { bg: '#EBF2FA', border: '#95BEE8', text: '#205EA6' },
  purple: { bg: '#F2EEFB', border: '#BAA6E8', text: '#5E409D' },
  magenta: { bg: '#FAECF4', border: '#E69DCD', text: '#A02F6F' },
};

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  if (w < 2 * r) r = w / 2;
  if (h < 2 * r) r = h / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * Genera y descarga una imagen PNG en alta definición del planificador diario.
 */
export function exportPlanAsPNG(plan: DayPlan, pixelsPerHour: number = 70): void {
  const visibleRows = plan.rows.filter((r) => r.visible);
  if (visibleRows.length === 0) return;

  const scale = 2; // Retina 2x
  const rowHeaderWidth = 160;
  const trackWidth = 24 * pixelsPerHour;
  const canvasWidth = rowHeaderWidth + trackWidth + 40;

  // Calcular alturas de filas
  const baseLaneHeight = 36;
  const rowHeights: number[] = visibleRows.map((row) => {
    const { maxLanes } = calculateLayoutActivities(row.activities);
    return Math.max(54, maxLanes * (baseLaneHeight + 4) + 12);
  });

  const headerHeight = 70;
  const timelineHeaderHeight = 32;
  const rowsTotalHeight = rowHeights.reduce((acc, h) => acc + h, 0);

  // Recopilar notas
  const notesWithContext: Array<{ person: string; title: string; time: string; comment: string }> = [];
  visibleRows.forEach((r) => {
    r.activities.forEach((a) => {
      if (a.comment && a.comment.trim()) {
        notesWithContext.push({
          person: r.name,
          title: a.title,
          time: `${formatTime(a.startMinutes)} - ${formatTime(a.endMinutes)}`,
          comment: a.comment.trim(),
        });
      }
    });
  });

  const notesHeight = notesWithContext.length > 0 ? 40 + Math.ceil(notesWithContext.length / 2) * 24 : 0;
  const canvasHeight = headerHeight + timelineHeaderHeight + rowsTotalHeight + notesHeight + 30;

  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth * scale;
  canvas.height = canvasHeight * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.scale(scale, scale);

  // Fondo general
  ctx.fillStyle = '#FFFCF0'; // Flexoki Paper
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // 1. Cabecera (Título y fecha)
  ctx.fillStyle = '#100F0F';
  ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(plan.name, 20, 36);

  if (plan.date) {
    ctx.fillStyle = '#6F6E69';
    ctx.font = '500 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(plan.date, 20, 56);
  }

  // 2. Regla horaria de 24 horas
  const startY = headerHeight;
  ctx.fillStyle = '#F2EFDF';
  ctx.fillRect(20, startY, rowHeaderWidth + trackWidth, timelineHeaderHeight);
  ctx.strokeStyle = '#DAD8CE';
  ctx.lineWidth = 1;
  ctx.strokeRect(20, startY, rowHeaderWidth + trackWidth, timelineHeaderHeight);

  ctx.fillStyle = '#6F6E69';
  ctx.font = '600 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('Persona / Línea', 32, startY + 20);

  for (let hour = 0; hour < 24; hour++) {
    const x = 20 + rowHeaderWidth + hour * pixelsPerHour;
    ctx.strokeStyle = '#DAD8CE';
    ctx.beginPath();
    ctx.moveTo(x, startY);
    ctx.lineTo(x, startY + timelineHeaderHeight + rowsTotalHeight);
    ctx.stroke();

    ctx.fillStyle = '#575653';
    ctx.fillText(`${hour.toString().padStart(2, '0')}:00`, x + 4, startY + 20);
  }

  // 3. Filas y bloques
  let currentY = startY + timelineHeaderHeight;

  visibleRows.forEach((row, rowIndex) => {
    const currentHeight = rowHeights[rowIndex];
    const { layoutActivities } = calculateLayoutActivities(row.activities);

    // Fondo fila
    ctx.fillStyle = rowIndex % 2 === 0 ? '#FFFFFF' : '#FAF8F0';
    ctx.fillRect(20, currentY, rowHeaderWidth + trackWidth, currentHeight);

    ctx.strokeStyle = '#DAD8CE';
    ctx.strokeRect(20, currentY, rowHeaderWidth + trackWidth, currentHeight);

    // Nombre de la persona y dot de color
    const rowColor = FLEXOKI_HEX_COLORS[row.color] || FLEXOKI_HEX_COLORS.blue;
    ctx.fillStyle = rowColor.text;
    ctx.beginPath();
    ctx.arc(32, currentY + currentHeight / 2, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#100F0F';
    ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(row.name, 44, currentY + currentHeight / 2 + 4);

    // Renderizar actividades
    layoutActivities.forEach((act) => {
      const actLeft = 20 + rowHeaderWidth + (act.startMinutes / 60) * pixelsPerHour;
      const actWidth = Math.max(12, ((act.endMinutes - act.startMinutes) / 60) * pixelsPerHour);
      const actTop = currentY + act.laneIndex * (baseLaneHeight + 4) + 6;
      const actHeight = baseLaneHeight;

      const actColors = FLEXOKI_HEX_COLORS[act.color] || FLEXOKI_HEX_COLORS.blue;

      // Caja de la actividad
      ctx.fillStyle = actColors.bg;
      roundRect(ctx, actLeft, actTop, actWidth, actHeight, 4);
      ctx.fill();
      ctx.strokeStyle = actColors.border;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Texto de título y horas si cabe
      if (actWidth > 18) {
        ctx.save();
        ctx.beginPath();
        roundRect(ctx, actLeft, actTop, actWidth, actHeight, 4);
        ctx.clip();

        ctx.fillStyle = actColors.text;
        ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText(act.title, actLeft + 6, actTop + 15);

        if (actWidth > 55) {
          ctx.font = '500 8.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          ctx.fillStyle = '#6F6E69';
          ctx.fillText(`${formatTime(act.startMinutes)} - ${formatTime(act.endMinutes)}`, actLeft + 6, actTop + 27);
        }

        ctx.restore();
      }
    });

    currentY += currentHeight;
  });

  // 4. Sección de notas al pie
  if (notesWithContext.length > 0) {
    currentY += 15;
    ctx.fillStyle = '#100F0F';
    ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('Notas y comentarios', 20, currentY);

    currentY += 15;
    ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

    notesWithContext.forEach((note, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const noteX = 20 + col * (canvasWidth / 2);
      const noteY = currentY + row * 20;

      ctx.fillStyle = '#205EA6';
      ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(`• [${note.person}] ${note.title} (${note.time}): `, noteX, noteY);

      const prefixWidth = ctx.measureText(`• [${note.person}] ${note.title} (${note.time}): `).width;
      ctx.fillStyle = '#575653';
      ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(note.comment, noteX + prefixWidth, noteY);
    });
  }

  // Descargar archivo PNG
  const sanitizedName = plan.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'plan';

  const link = document.createElement('a');
  link.download = `${sanitizedName}-24h.png`;
  link.href = canvas.toDataURL('image/png');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
