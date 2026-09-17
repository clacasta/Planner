import { describe, expect, it, vi } from 'vitest';
import { findRowIdAtPoint } from '../dropTarget';

function fakeElement(rowId: string | null, closestResult: boolean = true): Element {
  const row = rowId ? ({ dataset: { rowId } } as unknown as Element) : null;
  return {
    closest: vi.fn(() => (closestResult ? row : null)),
  } as unknown as Element;
}

describe('findRowIdAtPoint', () => {
  it('devuelve el id de la línea bajo el puntero', () => {
    expect(findRowIdAtPoint(10, 20, () => fakeElement('row-leo'))).toBe('row-leo');
  });

  it('devuelve null si no hay línea en ese punto', () => {
    expect(findRowIdAtPoint(10, 20, () => fakeElement('row-leo', false))).toBeNull();
    expect(findRowIdAtPoint(10, 20, () => null)).toBeNull();
  });

  it('devuelve null si el elemento no soporta closest', () => {
    const bare = { dataset: { rowId: 'row-1' } } as unknown as Element;
    expect(findRowIdAtPoint(10, 20, () => bare)).toBeNull();
  });

  it('devuelve null si la línea no tiene identificador', () => {
    expect(findRowIdAtPoint(10, 20, () => fakeElement(''))).toBeNull();
  });

  it('propaga las coordenadas al resolvedor', () => {
    const resolver = vi.fn(() => fakeElement('row-x'));
    findRowIdAtPoint(123, 456, resolver);
    expect(resolver).toHaveBeenCalledWith(123, 456);
  });
});