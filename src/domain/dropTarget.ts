/**
 * Averigua sobre qué línea (persona) está el puntero, para poder arrastrar una
 * actividad de una persona a otra.
 *
 * El resolvedor de elementos se inyecta para poder probar la lógica sin DOM.
 */
export type ElementResolver = (x: number, y: number) => Element | null;

interface RowElement extends Element {
  dataset?: DOMStringMap;
}

export function findRowIdAtPoint(
  x: number,
  y: number,
  resolve: ElementResolver = (px, py) => document.elementFromPoint(px, py)
): string | null {
  const element = resolve(x, y) as RowElement | null;
  if (!element || typeof element.closest !== 'function') return null;

  const row = element.closest('[data-row-id]') as RowElement | null;
  const rowId = row?.dataset?.rowId;
  return rowId || null;
}