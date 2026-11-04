import { useCallback, useState } from 'react';

type Theme = 'dark' | 'light';
type Density = 'comfortable' | 'compact';

const read = (key: string) => { try { return localStorage.getItem(key); } catch { return null; } };
const write = (key: string, v: string) => { try { localStorage.setItem(key, v); } catch { /* מצב פרטי */ } };

export function useTheme() {
  const [theme, set] = useState<Theme>(() => (document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'));
  const setTheme = useCallback((t: Theme) => {
    document.documentElement.dataset.theme = t;
    write('sea-theme', t);
    set(t);
  }, []);
  return { theme, setTheme, toggle: () => setTheme(theme === 'dark' ? 'light' : 'dark') };
}

export function useDensity() {
  const [density, set] = useState<Density>(() => (document.documentElement.dataset.density === 'compact' ? 'compact' : 'comfortable'));
  const setDensity = useCallback((d: Density) => {
    if (d === 'compact') document.documentElement.dataset.density = 'compact';
    else delete document.documentElement.dataset.density;
    write('sea-density', d);
    set(d);
  }, []);
  return { density, setDensity };
}

export const readStore = read;
