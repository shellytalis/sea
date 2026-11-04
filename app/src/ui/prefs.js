import { useCallback, useState } from "react";
const read = (key) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const write = (key, v) => {
  try {
    localStorage.setItem(key, v);
  } catch {}
};
export function useTheme() {
  const [theme, set] = useState(() => document.documentElement.dataset.theme === "light" ? "light" : "dark");
  const setTheme = useCallback((t) => {
    document.documentElement.dataset.theme = t;
    write("sea-theme", t);
    set(t);
  }, []);
  return {
    theme,
    setTheme,
    toggle: () => setTheme(theme === "dark" ? "light" : "dark")
  };
}
export function useDensity() {
  const [density, set] = useState(() => document.documentElement.dataset.density === "compact" ? "compact" : "comfortable");
  const setDensity = useCallback((d) => {
    if (d === "compact") document.documentElement.dataset.density = "compact";
    else delete document.documentElement.dataset.density;
    write("sea-density", d);
    set(d);
  }, []);
  return {
    density,
    setDensity
  };
}
export const readStore = read;
