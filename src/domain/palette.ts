import { FlexokiColorKey } from './types';

/**
 * Paleta Flexoki (modo claro) en hexadecimal, para lo que no puede leer las
 * variables CSS (la exportación PNG dibuja en un canvas).
 *
 * Es la MISMA paleta que `styles/flexoki.css`: un test compara ambos archivos
 * para que no se desincronicen.
 */
export const ACCENT_HEX: Record<FlexokiColorKey, { text: string; bg: string; border: string }> = {
  red: { text: '#AF3029', bg: '#FBECEB', border: '#E89E9B' },
  orange: { text: '#BC5215', bg: '#FCF0E8', border: '#F0B38F' },
  yellow: { text: '#AD8301', bg: '#FAF5E1', border: '#E9D27B' },
  green: { text: '#66800B', bg: '#F2F6E3', border: '#BFD384' },
  cyan: { text: '#24837B', bg: '#E6F5F3', border: '#91D3CD' },
  blue: { text: '#205EA6', bg: '#EBF2FA', border: '#95BEE8' },
  purple: { text: '#5E409D', bg: '#F2EEFB', border: '#BAA6E8' },
  magenta: { text: '#A02F6F', bg: '#FAECF4', border: '#E69DCD' },
};

/** Neutros de Flexoki usados por la exportación (nombres como en flexoki.css). */
export const NEUTRAL_HEX = {
  paper: '#FFFCF0',
  base50: '#F2EFDF',
  base150: '#DAD8CE',
  base600: '#6F6E69',
  base700: '#575653',
  black: '#100F0F',
  white: '#FFFFFF',
  rowAlt: '#FAF8F0',
} as const;
