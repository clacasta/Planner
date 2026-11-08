// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PersonEditorModal } from '../PersonEditorModal';
import { ActivityEditorModal } from '../ActivityEditorModal';
import { Member, TimelineRow } from '../../domain/types';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const leo: Member = { id: 'leo', name: 'Leo', color: 'green', visible: true };

function renderPerson(member: Member | null, activityCount = 0) {
  const props = {
    member,
    defaultColor: 'orange' as const,
    activityCount,
    onSave: vi.fn(),
    onDelete: vi.fn(),
    onClose: vi.fn(),
  };
  render(<PersonEditorModal {...props} />);
  return props;
}

describe('PersonEditorModal', () => {
  it('es un diálogo accesible con el foco en el nombre', () => {
    renderPerson(leo);
    const dialog = screen.getByRole('dialog', { name: 'Editar a Leo' });
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(document.activeElement).toBe(screen.getByLabelText('Nombre'));
  });

  it('no deja guardar un nombre vacío', () => {
    const { onSave } = renderPerson(leo);
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: '   ' } });
    fireEvent.click(screen.getByText('Guardar cambios'));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText('El nombre no puede estar vacío.')).toBeTruthy();
  });

  it('guarda nombre y color', () => {
    const { onSave, onClose } = renderPerson(leo);
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: ' Leonardo ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Rojo' }));
    fireEvent.click(screen.getByText('Guardar cambios'));
    expect(onSave).toHaveBeenCalledWith({ name: 'Leonardo', color: 'red' });
    expect(onClose).toHaveBeenCalled();
  });

  it('al eliminar avisa de cuántas actividades se borran', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const { onDelete } = renderPerson(leo, 3);
    fireEvent.click(screen.getByText('Eliminar'));
    expect(confirm.mock.calls[0][0]).toContain('sus 3 actividad(es)');
    expect(onDelete).toHaveBeenCalled();
  });

  it('para una persona nueva propone el color siguiente y no ofrece eliminar', () => {
    renderPerson(null);
    expect(screen.getByRole('dialog', { name: 'Añadir persona' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Naranja' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.queryByText('Eliminar')).toBeNull();
  });

  it('un clic que empieza dentro y termina en el fondo no cierra', () => {
    const { onClose } = renderPerson(leo);
    const overlay = document.querySelector('.modal-overlay') as HTMLElement;
    fireEvent.pointerDown(screen.getByLabelText('Nombre'));
    fireEvent.click(overlay);
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.pointerDown(overlay);
    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('ActivityEditorModal', () => {
  const rows: TimelineRow[] = [{ ...leo, activities: [] }];
  const base = { id: 'a1', title: 'Nueva actividad', startMinutes: 600, endMinutes: 660, color: 'blue' as const };

  function renderEditor(isNew: boolean) {
    const props = {
      isOpen: true,
      activity: base,
      isNew,
      rows,
      currentRowId: 'leo',
      onMoveTo: vi.fn(),
      onDuplicateTo: vi.fn(),
      onSave: vi.fn(),
      onDelete: vi.fn(),
      onClose: vi.fn(),
    };
    render(<ActivityEditorModal {...props} />);
    return props;
  }

  it('una actividad nueva se crea con «Crear actividad» y no ofrece eliminar', () => {
    const { onSave } = renderEditor(true);
    expect(screen.getByRole('dialog', { name: 'Nueva actividad' })).toBeTruthy();
    expect(screen.queryByText('Eliminar')).toBeNull();
    fireEvent.click(screen.getByText('Crear actividad'));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ id: 'a1', startMinutes: 600 }));
  });

  it('valida que la hora de inicio sea anterior a la de fin', () => {
    const { onSave } = renderEditor(false);
    fireEvent.change(screen.getByLabelText('Hora final'), { target: { value: '09:00' } });
    fireEvent.click(screen.getByText('Guardar cambios'));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText('La hora de inicio debe ser anterior a la hora de fin.')).toBeTruthy();
  });
});
