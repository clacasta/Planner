import { useCallback, useEffect, useState } from 'react';

export type ThemePreference = 'auto' | 'light' | 'dark';

const THEME_KEY = 'family-day-planner:theme';
const ORDER: ThemePreference[] = ['auto', 'light', 'dark'];

function readPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    return stored === 'light' || stored === 'dark' ? stored : 'auto';
  } catch {
    return 'auto';
  }
}

function apply(preference: ThemePreference) {
  const root = document.documentElement;
  if (preference === 'auto') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', preference);
}

/**
 * Tema claro/oscuro. «auto» sigue al sistema (`prefers-color-scheme`); «light»
 * y «dark» lo fijan. Al imprimir se fuerza siempre el claro (papel blanco).
 */
export function useTheme() {
  const [preference, setPreference] = useState<ThemePreference>(readPreference);

  useEffect(() => {
    apply(preference);
    try {
      if (preference === 'auto') localStorage.removeItem(THEME_KEY);
      else localStorage.setItem(THEME_KEY, preference);
    } catch {
      // Sin almacenamiento: el tema dura lo que la pestaña.
    }
  }, [preference]);

  useEffect(() => {
    const before = () => document.documentElement.setAttribute('data-theme', 'light');
    const after = () => apply(readPreference());
    window.addEventListener('beforeprint', before);
    window.addEventListener('afterprint', after);
    return () => {
      window.removeEventListener('beforeprint', before);
      window.removeEventListener('afterprint', after);
    };
  }, []);

  const cycleTheme = useCallback(() => {
    setPreference((current) => ORDER[(ORDER.indexOf(current) + 1) % ORDER.length]);
  }, []);

  return { preference, cycleTheme };
}
