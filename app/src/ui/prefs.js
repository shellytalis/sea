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
export const readStore = read;

/** "הערות מפרט": הערות פיתוח בממשק (הצעה, טעון אפיון). מוסתרות כברירת מחדל; המתג ב-/design */
export function useSpecNotes() {
  const [on, set] = useState(() => document.documentElement.dataset.specNotes === 'on');
  const setOn = useCallback((v) => {
    if (v) document.documentElement.dataset.specNotes = 'on';
    else delete document.documentElement.dataset.specNotes;
    write('sea-spec-notes', v ? 'on' : 'off');
    set(v);
  }, []);
  return { on, setOn };
}
