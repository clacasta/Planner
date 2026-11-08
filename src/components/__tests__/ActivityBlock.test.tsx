// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ActivityBlock } from '../ActivityBlock';
import { LayoutActivity } from '../../domain/types';

afterEach(cleanup);

const activity: LayoutActivity = {
  id: 'a1',
  title: 'Natación',
  startMinutes: 1050,
  endMinutes: 1140,
  color: 'cyan',
  laneIndex: 0,
};

function setup(overrides: Partial<LayoutActivity> = {}) {
  const handlers = {
    onSelect: vi.fn(),
    onMove: vi.fn(),
    onResize: vi.fn(),
    onMoveToRow: vi.fn(),
    onDelete: vi.fn(),
  };
  render(
    <ActivityBlock
      activity={{ ...activity, ...overrides }}
      sourceRowId="leo"
      pixelsPerHour={80}
      adjacentRowIds={{ up: 'pilar', down: null }}
      {...handlers}
    />
  );
  const block = screen.getByRole('button', { name: /^Natación, de / });
  return { block, ...handlers };
}

describe('ActivityBlock con teclado', () => {
  it('es enfocable y describe la actividad', () => {
    const { block } = setup();
    expect(block.tabIndex).toBe(0);
    expect(block.getAttribute('aria-label')).toBe('Natación, de 17:30 a 19:00');
    expect(block.getAttribute('aria-describedby')).toBe('activity-keyboard-help');
  });

  it('Enter y Espacio abren el editor', () => {
    const { block, onSelect } = setup();
    fireEvent.keyDown(block, { key: 'Enter' });
    fireEvent.keyDown(block, { key: ' ' });
    expect(onSelect).toHaveBeenCalledTimes(2);
  });

  it('las flechas mueven 15 minutos conservando la duración', () => {
    const { block, onMove } = setup();
    fireEvent.keyDown(block, { key: 'ArrowRight' });
    fireEvent.keyDown(block, { key: 'ArrowLeft' });
    expect(onMove.mock.calls).toEqual([
      ['a1', 1065],
      ['a1', 1035],
    ]);
  });

  it('no se sale del día', () => {
    const { block, onMove } = setup({ startMinutes: 1380, endMinutes: 1440 });
    fireEvent.keyDown(block, { key: 'ArrowRight' });
    expect(onMove).not.toHaveBeenCalled();
  });

  it('Mayús+flechas cambian la hora final respetando el mínimo de 15 min', () => {
    const { block, onResize } = setup({ startMinutes: 600, endMinutes: 615 });
    fireEvent.keyDown(block, { key: 'ArrowRight', shiftKey: true });
    fireEvent.keyDown(block, { key: 'ArrowLeft', shiftKey: true });
    expect(onResize.mock.calls).toEqual([['a1', 600, 630]]);
  });

  it('Alt+↑ la pasa a la persona de arriba; sin persona abajo, Alt+↓ no hace nada', () => {
    const { block, onMoveToRow } = setup();
    fireEvent.keyDown(block, { key: 'ArrowUp', altKey: true });
    fireEvent.keyDown(block, { key: 'ArrowDown', altKey: true });
    fireEvent.keyDown(block, { key: 'ArrowUp' }); // sin Alt: nada
    expect(onMoveToRow.mock.calls).toEqual([['a1', 'pilar', 1050]]);
  });

  it('Supr la elimina', () => {
    const { block, onDelete } = setup();
    fireEvent.keyDown(block, { key: 'Delete' });
    expect(onDelete).toHaveBeenCalledWith('a1');
  });
});
