import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { circlePolygon, distance } from '../../map/geodesy';
import { addToolLayers, setToolData } from '../../map/layers';
import { DEFAULT_RADII_NM, buildScene, metrics, withCursor } from '../../map/scene';
import { NM, useUnit } from '../../map/units';
import useMarkers from '../../map/useMarkers';
import { GeneralToolbar, VesselBar } from './Toolbars';
import { GeneralPanel, ProximityPanel } from './ToolPanel';

const MAX_SAVED = 5;
const MAX_CIRCLES = 3;
const DRAW = ['distance', 'radius', 'area'];
let seq = 0;
const uid = () => `m${++seq}`;
const defaultProx = () => ({ on: true, visible: true, radii: DEFAULT_RADII_NM.map((n) => n * NM) });

/** נוסח הנחיה: [ארוך, קצר]; הקצר מוצג כשרוחב המפה קטן (container query) */
function hintFor(tool, draft, items) {
  if (!tool || tool.family !== 'general' || !DRAW.includes(tool.id)) return null;
  if (tool.id === 'radius') {
    if (draft) return ['לחיצה נוספת: קביעת הרדיוס (או הקלדה בלוח) · Esc: ביטול', 'לחיצה: רדיוס · Esc: ביטול'];
    if (items.filter((i) => i.kind === 'radius').length >= MAX_CIRCLES) return ['עד 3 מעגלים: מחק מעגל כדי להוסיף · Esc: סגירת הכלי', 'עד 3 מעגלים · Esc: סגירה'];
    return ['לחיצה על המפה: בחירת מרכז · גרירת ידית: עריכה · Esc: סגירת הכלי', 'לחיצה: מרכז · Esc: סגירה'];
  }
  if (draft) return ['לחיצה: הוספת נקודה · לחיצה כפולה או Enter: סיום · Backspace: מחיקת נקודה · Esc: ביטול', 'לחיצה: נקודה · Enter: סיום · Esc: ביטול'];
  if (items.length >= MAX_SAVED) return ['הגעת ל-5 מדידות: מחק אחת כדי להמשיך · Esc: סגירת הכלי', 'עד 5 מדידות · Esc: סגירה'];
  return ['לחיצה על המפה: תחילת מדידה · גרירת ידית: עריכה · Esc: סגירת הכלי', 'לחיצה: תחילת מדידה · Esc: סגירה'];
}

/**
 * כלי מפה: שתי משפחות, מצב יחיד { family, id, vesselId? } ופאנל אחד בכל רגע.
 * רכיב אחי של המפה (לא בתוך קוד המפה): מקבל את מופע המפה דרך onMapReady.
 * children: כלי החיפוש, שיושב בשורת ה-overlay (חיפוש ב-start, הנחיה באמצע, מקום לזום ב-end).
 */
export default function MapTools({ map, vessel, vessels, onSelectVessel, onClearVessel, blockRef, children }) {
  const [tool, setTool] = useState(null);
  const [items, setItems] = useState([]);
  const [draft, setDraft] = useState(null);
  const [cursor, setCursor] = useState(null);
  const [selId, setSelId] = useState(null);
  const [prox, setProx] = useState({});
  const [unit, setUnit] = useUnit();
  const st = useRef({});
  st.current = { tool, items, draft, selId };

  const drawing = tool?.family === 'general' && DRAW.includes(tool.id);
  const selected = drawing ? items.find((i) => i.id === selId && i.kind === tool.id) : undefined;

  const commit = useCallback((g) => {
    const id = uid();
    setItems((l) => [...l, { ...g, id, visible: true }]);
    setDraft(null);
    setCursor(null);
    setSelId(id);
  }, []);
  const finish = useCallback(() => {
    const d = st.current.draft;
    if (!d || d.kind === 'radius') return;
    if (d.points.length < (d.kind === 'area' ? 3 : 2)) return;
    commit({ kind: d.kind, points: d.points });
  }, [commit]);

  const pick = (kind, id) => {
    setDraft(null); setCursor(null); setSelId(null);
    if (kind === 'general') setTool((t) => (t?.family === 'general' && t.id === id ? null : { family: 'general', id }));
    else if (vessel) {
      setProx((p) => ({ ...p, [vessel.id]: p[vessel.id]?.on ? p[vessel.id] : { ...(p[vessel.id] ?? defaultProx()), on: true } }));
      const opening = !(tool?.family === 'vessel' && tool.id === id);
      setTool(opening ? { family: 'vessel', id, vesselId: vessel.id } : null);
      if (opening && map) {
        // ההתמצאות: מתאימים את התצוגה למעגל החיצוני, ומשאירים מקום לפאנל בקצה ה-end
        const radii = (prox[vessel.id]?.radii ?? defaultProx().radii);
        const ring = circlePolygon([vessel.lon, vessel.lat], Math.max(...radii), 24);
        const lons = ring.map((p) => p[0]);
        const lats = ring.map((p) => p[1]);
        map.fitBounds([[Math.min(...lons), Math.min(...lats)], [Math.max(...lons), Math.max(...lats)]], { padding: { top: 120, bottom: 120, left: 440, right: 60 }, maxZoom: 10, duration: 600 });
      }
    }
  };

  // מחזור חיי הכלי הנבחר: ביטול בחירה סוגר את כלי הכלי; בחירת כלי אחר מזיזה את הכלי אליו
  useEffect(() => {
    setTool((t) => {
      if (!t || t.family !== 'vessel') return t;
      if (!vessel) return null;
      return t.vesselId === vessel.id ? t : { ...t, vesselId: vessel.id };
    });
    if (vessel) setProx((p) => (p[vessel.id] || tool?.family !== 'vessel' ? p : { ...p, [vessel.id]: defaultProx() }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vessel?.id]);

  // שכבות GeoJSON: נוספות בכל style.load, מתחת לסמלי הכלים
  const featuresRef = useRef([]);
  useEffect(() => {
    if (!map) return undefined;
    const add = () => { addToolLayers(map); setToolData(map, featuresRef.current); };
    map.on('style.load', add);
    try { if (map.getStyle()?.layers?.length) add(); } catch { /* הסגנון עוד לא נטען */ }
    return () => { map.off('style.load', add); };
  }, [map]);

  // אירועי מפה: נרשמים פעם אחת; קוראים את המצב העדכני מ-st
  useEffect(() => {
    if (!map) return undefined;
    const isDrawing = () => { const t = st.current.tool; return t?.family === 'general' && DRAW.includes(t.id); };
    const onClick = (e) => {
      if (!isDrawing()) return;
      const { tool: t, draft: d, items: list } = st.current;
      const ll = [e.lngLat.lng, e.lngLat.lat];
      if (t.id === 'radius') {
        if (!d) {
          if (list.length >= MAX_SAVED || list.filter((i) => i.kind === 'radius').length >= MAX_CIRCLES) return;
          setSelId(null);
          setDraft({ kind: 'radius', center: ll, radius: null });
          return;
        }
        const r = distance(d.center, ll);
        if (r >= 1) commit({ kind: 'radius', center: d.center, radius: r });
        return;
      }
      if (!d) {
        if (list.length >= MAX_SAVED) return;
        setSelId(null);
        setDraft({ kind: t.id, points: [ll] });
        return;
      }
      const a = map.project(d.points[d.points.length - 1]);
      if (Math.hypot(a.x - e.point.x, a.y - e.point.y) < 4) return; // הלחיצה השנייה של לחיצה כפולה
      setDraft({ ...d, points: [...d.points, ll] });
    };
    const onDbl = () => { if (isDrawing() && st.current.tool.id !== 'radius') finish(); };
    let raf = 0;
    const onMove = (e) => {
      if (!isDrawing()) return;
      map.getCanvas().style.cursor = 'crosshair'; // MapView מאפס סמן ביציאה מסמל כלי
      if (!st.current.draft) return;
      const ll = [e.lngLat.lng, e.lngLat.lat];
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setCursor(ll));
    };
    map.on('click', onClick);
    map.on('dblclick', onDbl);
    map.on('mousemove', onMove);
    return () => { cancelAnimationFrame(raf); map.off('click', onClick); map.off('dblclick', onDbl); map.off('mousemove', onMove); };
  }, [map, commit, finish]);

  // סמן crosshair, ללא זום בלחיצה כפולה, וחסימת בחירת כלי מסמל במהלך ציור
  useEffect(() => {
    if (blockRef) blockRef.current = drawing;
    if (!map || !drawing) return undefined;
    map.doubleClickZoom.disable();
    map.getCanvas().style.cursor = 'crosshair';
    return () => {
      if (blockRef) blockRef.current = false;
      try { map.doubleClickZoom.enable(); map.getCanvas().style.cursor = ''; } catch { /* המפה כבר הוסרה */ }
    };
  }, [map, drawing, blockRef]);

  // מקלדת: Esc מבטל טיוטה או סוגר כלי (ב-capture, לפני Drawer), Enter מסיים, Backspace מוחק נקודה
  useEffect(() => {
    const onKey = (e) => {
      const { tool: t, draft: d } = st.current;
      if (!t) return;
      const tag = e.target?.tagName ?? '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
        // שדה בפאנל הכלי: Esc משחרר את הפוקוס (ולא סוגר את המגירה); שאר השדות (חיפוש) מטפלים בעצמם
        if (e.key === 'Escape' && e.target.closest('.mt-panel')) { e.preventDefault(); e.stopImmediatePropagation(); e.target.blur(); }
        return;
      }
      if (e.key === 'Escape') {
        if (document.querySelector('[role=listbox]')) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        if (d) { setDraft(null); setCursor(null); } else { setTool(null); setSelId(null); }
      } else if (e.key === 'Enter' && d && tag !== 'BUTTON' && tag !== 'A') {
        e.preventDefault();
        finish();
      } else if (e.key === 'Backspace' && d && d.kind !== 'radius') {
        e.preventDefault();
        setDraft((x) => (x.points.length <= 1 ? null : { ...x, points: x.points.slice(0, -1) }));
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [finish]);

  // סצנה: פיצ'רים, תוויות וידיות
  const edit = draft ? { id: 'draft', g: draft } : selected && selected.visible ? { id: selected.id, g: selected } : null;
  const proxState = vessel ? prox[vessel.id] : undefined;
  const scene = useMemo(
    () => buildScene({ items, draft, cursor, edit, unit, prox: proxState?.on && proxState.visible ? { vessel, radii: proxState.radii } : null }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, draft, cursor, selId, tool, unit, proxState, vessel],
  );
  featuresRef.current = scene.features;
  useEffect(() => { if (map) setToolData(map, scene.features); }, [map, scene.features]);

  const moveHandle = useCallback((h, ll) => {
    const upd = (g) => {
      if (g.kind === 'radius') return h.idx === 'c' ? { ...g, center: ll } : { ...g, radius: Math.max(1, distance(g.center, ll)) };
      const pts = g.points.slice();
      pts[h.idx] = ll;
      return { ...g, points: pts };
    };
    if (h.id === 'draft') setDraft((d) => (d ? upd(d) : d));
    else setItems((l) => l.map((x) => (x.id === h.id ? upd(x) : x)));
  }, []);
  useMarkers(map, [
    ...scene.chips.map((c) => ({ key: `c-${c.key}`, lngLat: c.lngLat, text: c.text, anchor: c.anchor, offset: c.offset, className: `map-chip ${c.color}${c.strong ? ' strong' : ''}` })),
    ...scene.handles.map((h) => ({ key: `h-${h.key}`, lngLat: h.lngLat, className: 'map-handle', draggable: true, onDrag: (ll) => moveHandle(h, ll), onDouble: h.id === 'draft' ? finish : undefined })),
  ]);

  // ===== פאנל =====
  const live = draft ? withCursor(draft, cursor) : selected;
  const m = metrics(live);
  const patchSel = (fn) => setItems((l) => l.map((x) => (x.id === selId ? fn(x) : x)));
  const closeTool = () => { setTool(null); setDraft(null); setCursor(null); setSelId(null); };
  const hint = hintFor(tool, draft, items);

  let panel = null;
  if (drawing) {
    panel = (
      <GeneralPanel tool={tool.id} live={!!live} m={m} unit={unit} setUnit={setUnit} items={items} selId={selId} max={MAX_SAVED}
        onSelect={(id) => {
          const it = items.find((x) => x.id === id);
          setDraft(null); setCursor(null); setSelId(id);
          setItems((l) => l.map((x) => (x.id === id ? { ...x, visible: true } : x)));
          setTool({ family: 'general', id: it.kind });
        }}
        onToggle={(id) => setItems((l) => l.map((x) => (x.id === id ? { ...x, visible: !x.visible } : x)))}
        onDelete={(id) => { setItems((l) => l.filter((x) => x.id !== id)); if (selId === id) setSelId(null); }}
        onClose={closeTool}
        onClearCurrent={() => { if (draft) { setDraft(null); setCursor(null); } else if (selId) { setItems((l) => l.filter((x) => x.id !== selId)); setSelId(null); } }}
        onRadius={(r) => { if (draft?.kind === 'radius' && draft.center) commit({ kind: 'radius', center: draft.center, radius: r }); else if (selected) patchSel((x) => ({ ...x, radius: r })); }} />
    );
  } else if (tool?.family === 'vessel' && vessel && proxState) {
    const setP = (patch) => setProx((p) => ({ ...p, [vessel.id]: { ...p[vessel.id], ...patch } }));
    panel = (
      <ProximityPanel vessel={vessel} vessels={vessels} radii={proxState.radii} visible={proxState.visible} unit={unit} setUnit={setUnit}
        onRadii={(radii) => setP({ radii })} onToggle={() => setP({ visible: !proxState.visible })}
        onClear={() => { setP({ on: false }); setTool(null); }} onClose={() => setTool(null)} onPickVessel={onSelectVessel} />
    );
  }

  return (
    <>
      <div className="mt-row">
        {children}
        {hint && (
          <div className="mt-hint" role="status">
            <span className="mt-hint-long">{hint[0]}</span>
            <span className="mt-hint-short">{hint[1]}</span>
          </div>
        )}
      </div>
      <div className={`mt-stack${vessel ? ' with-vbar' : ''}`}>
        {panel}
        <GeneralToolbar active={tool?.family === 'general' ? tool.id : null} onPick={(id) => pick('general', id)}
          canClear={items.length > 0 || !!draft} onClear={() => { setItems([]); setDraft(null); setCursor(null); setSelId(null); }} />
      </div>
      {vessel && <VesselBar vessel={vessel} active={tool?.family === 'vessel' ? tool.id : null} onPick={(id) => pick('vessel', id)} onClose={onClearVessel} />}
    </>
  );
}
