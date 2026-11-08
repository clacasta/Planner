import { FlexokiColorKey } from '../domain/types';

/** Paleta Flexoki para los selectores de color (actividades y personas). */
export const COLOR_OPTIONS: { key: FlexokiColorKey; label: string; bg: string; border: string }[] = [
  { key: 'blue', label: 'Azul', bg: 'var(--fx-blue-light)', border: 'var(--fx-blue)' },
  { key: 'purple', label: 'Morado', bg: 'var(--fx-purple-light)', border: 'var(--fx-purple)' },
  { key: 'green', label: 'Verde', bg: 'var(--fx-green-light)', border: 'var(--fx-green)' },
  { key: 'yellow', label: 'Amarillo', bg: 'var(--fx-yellow-light)', border: 'var(--fx-yellow)' },
  { key: 'orange', label: 'Naranja', bg: 'var(--fx-orange-light)', border: 'var(--fx-orange)' },
  { key: 'red', label: 'Rojo', bg: 'var(--fx-red-light)', border: 'var(--fx-red)' },
  { key: 'cyan', label: 'Cian', bg: 'var(--fx-cyan-light)', border: 'var(--fx-cyan)' },
  { key: 'magenta', label: 'Magenta', bg: 'var(--fx-magenta-light)', border: 'var(--fx-magenta)' },
];
