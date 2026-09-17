import { describe, expect, it } from 'vitest';
import { createId } from '../id';

describe('createId', () => {
  it('prefija el identificador', () => {
    expect(createId('act')).toMatch(/^act-/);
    expect(createId('row')).toMatch(/^row-/);
  });

  it('no repite ids aunque se generen en el mismo milisegundo', () => {
    const ids = new Set(Array.from({ length: 500 }, () => createId('act')));
    expect(ids.size).toBe(500);
  });
});
