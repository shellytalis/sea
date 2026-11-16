import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { DEFAULT_RANGE } from '../map/range';

/**
 * סט כלי השיט: state ברמת האפליקציה, בזיכרון בלבד (לא ב-URL). נשמר בניווט בתוך האפליקציה, לא ברענון.
 * כולל: הכלים בסט (עד 10), הכלי הפעיל, מצב "כלי בודד / כל הסט", צבע לכל כלי, מצב השכבות לכל כלי
 * (נשמר גם אחרי הסרה מהסט), והגדרות משותפות: רדיוסי קרבה, טווח תאריכים, יעד הגעה.
 */
export const MAX_SET = 10;
export const COLOR_COUNT = 8;
const NM = 1852;
export const DEFAULT_RADII = [5, 10, 20].map((n) => n * NM);
export const EMPTY_LAYERS = { prox: false, route: false, arrival: false };

const initial = {
  ids: [],
  activeId: null,
  mode: 'single',
  colors: {},
  layers: {},
  radii: DEFAULT_RADII,
  range: DEFAULT_RANGE,
  marks: true,
  arrival: { dest: null, destName: '', speed: null },
};

const Ctx = createContext(null);

export function VesselSetProvider({ children }) {
  const [state, setState] = useState(initial);
  const ref = useRef(initial);
  const [toast, setToast] = useState(null);
  const timer = useRef(0);
  const commit = useCallback((fn) => { const next = fn(ref.current); ref.current = next; setState(next); return next; }, []);

  const showToast = useCallback((message, opts = {}) => {
    clearTimeout(timer.current);
    const id = Date.now();
    setToast({ id, message, action: opts.action });
    timer.current = setTimeout(() => setToast((t) => (t && t.id === id ? null : t)), opts.ms ?? 4000);
  }, []);
  const dismissToast = useCallback(() => { clearTimeout(timer.current); setToast(null); }, []);

  const api = useMemo(() => ({
    /** מוסיף לסט ומפעיל. { ok, reason? }. סט מלא: toast והכלי לא נוסף. כלי שכבר בסט הופך לפעיל. */
    add(id) {
      const s = ref.current;
      if (s.ids.includes(id)) { commit((x) => ({ ...x, activeId: id })); return { ok: true, already: true }; }
      if (s.ids.length >= MAX_SET) { showToast(`הסט מלא (${MAX_SET}). הסר כלי כדי להוסיף`); return { ok: false, reason: 'full' }; }
      commit((x) => {
        const used = new Set(x.ids.map((i) => x.colors[i]));
        let ci = x.colors[id];
        if (ci == null || used.has(ci)) { ci = [...Array(COLOR_COUNT).keys()].find((k) => !used.has(k)); if (ci == null) ci = x.ids.length % COLOR_COUNT; }
        return { ...x, ids: [...x.ids, id], activeId: id, colors: { ...x.colors, [id]: ci } };
      });
      return { ok: true };
    },
    activate(id) { commit((x) => (x.ids.includes(id) ? { ...x, activeId: id } : x)); },
    remove(id) {
      commit((x) => {
        const ids = x.ids.filter((i) => i !== id);
        return { ...x, ids, activeId: x.activeId === id ? (ids[ids.length - 1] ?? null) : x.activeId };
      });
    },
    /** מנקה את הסט; עם 2+ כלים מוצג toast עם "בטל" ל-5 שניות */
    clear() {
      const s = ref.current;
      const snap = { ids: s.ids, activeId: s.activeId };
      commit((x) => ({ ...x, ids: [], activeId: null }));
      if (snap.ids.length >= 2) {
        showToast(`הסט נוקה (${snap.ids.length} כלים)`, { ms: 5000, action: { label: 'בטל', onClick: () => { commit((x) => ({ ...x, ids: snap.ids, activeId: snap.activeId })); dismissToast(); } } });
      }
    },
    setMode(mode) { commit((x) => ({ ...x, mode })); },
    setLayer(ids, key, on) {
      commit((x) => {
        const layers = { ...x.layers };
        for (const id of ids) layers[id] = { ...EMPTY_LAYERS, ...layers[id], [key]: on };
        return { ...x, layers };
      });
    },
    setRadii(radii) { commit((x) => ({ ...x, radii })); },
    setRange(range) { commit((x) => ({ ...x, range })); },
    setMarks(marks) { commit((x) => ({ ...x, marks })); },
    setArrival(patch) { commit((x) => ({ ...x, arrival: { ...x.arrival, ...patch } })); },
    showToast,
  }), [commit, showToast, dismissToast]);

  const value = useMemo(() => ({ state, ...api }), [state, api]);
  return (
    <Ctx.Provider value={value}>
      {children}
      {toast && (
        <div className="toast" role="status" aria-live="polite">
          <span>{toast.message}</span>
          {toast.action && <button type="button" className="toast-action" onClick={toast.action.onClick}>{toast.action.label}</button>}
        </div>
      )}
    </Ctx.Provider>
  );
}

export function useVesselSet() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useVesselSet requires VesselSetProvider');
  return v;
}
