// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { useStorageSync } from '../useStorageSync';
import { StorageData, STORAGE_KEY, SCHEMA_VERSION } from '../schema';

afterEach(cleanup);
beforeEach(() => localStorage.clear());

const data = (activePlanId: string, title = 'Trabajo'): StorageData => ({
  schemaVersion: SCHEMA_VERSION,
  activePlanId,
  members: [{ id: 'm1', name: 'Carlos', color: 'blue', visible: true }],
  plans: [
    { id: 'lunes', name: 'Lunes', activities: { m1: [{ id: 'a1', title, startMinutes: 480, endMinutes: 540, color: 'blue' }] } },
    { id: 'martes', name: 'Martes', activities: {} },
  ],
});

function emitFromOtherTab(value: StorageData) {
  act(() => {
    window.dispatchEvent(
      new StorageEvent('storage', { key: STORAGE_KEY, newValue: JSON.stringify(value) })
    );
  });
}

describe('useStorageSync', () => {
  it('guarda cada cambio en localStorage', () => {
    const { rerender } = renderHook((props) => useStorageSync(props), {
      initialProps: { storage: data('lunes'), onExternalChange: vi.fn(), onSaveError: vi.fn() },
    });
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).activePlanId).toBe('lunes');

    rerender({ storage: data('martes'), onExternalChange: vi.fn(), onSaveError: vi.fn() });
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).activePlanId).toBe('martes');
  });

  it('carga los cambios de otra pestaña conservando el día que se estaba viendo', () => {
    const onExternalChange = vi.fn();
    renderHook(() => useStorageSync({ storage: data('lunes'), onExternalChange, onSaveError: vi.fn() }));

    emitFromOtherTab(data('martes', 'Trabajo (cambiado)'));

    expect(onExternalChange).toHaveBeenCalledTimes(1);
    const next = onExternalChange.mock.calls[0][0] as StorageData;
    expect(next.activePlanId).toBe('lunes');
    expect(next.plans[0].activities.m1[0].title).toBe('Trabajo (cambiado)');
  });

  it('ignora un simple cambio de día en otra pestaña', () => {
    const onExternalChange = vi.fn();
    renderHook(() => useStorageSync({ storage: data('lunes'), onExternalChange, onSaveError: vi.fn() }));

    emitFromOtherTab(data('martes'));
    expect(onExternalChange).not.toHaveBeenCalled();
  });

  it('avisa una sola vez si no se puede guardar', () => {
    const onSaveError = vi.fn();
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const { rerender } = renderHook((props) => useStorageSync(props), {
      initialProps: { storage: data('lunes'), onExternalChange: vi.fn(), onSaveError },
    });
    rerender({ storage: data('martes'), onExternalChange: vi.fn(), onSaveError });

    expect(onSaveError).toHaveBeenCalledTimes(1);
    setItem.mockRestore();
    errorLog.mockRestore();
  });
});
