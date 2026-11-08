import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { bearing, circlePolygon, distance } from '../../map/geodesy';
import { demoTrack, trackStats } from '../../map/route';
import { PORTS } from '../../data/ports';
import { addToolLayers, setToolData } from '../../map/layers';
import { DEFAULT_KNOTS, DEFAULT_RADII_NM, buildScene, isCircle, metrics, withCursor, within } from '../../map/scene';
import { NM, travelHours, useUnit } from '../../map/units';
import useMarkers from '../../map/useMarkers';
import { GeneralToolbar, VesselBar } from './Toolbars';
import { ArrivalPanel, GeneralPanel, ProximityPanel, RoutePanel } from './ToolPanel';

const MAX_SAVED = 5;
const MAX_CIRCLES = 3;
const DRAW = ['distance', 'radius', 'area', 'time', 'height', 'terrain'];
let seq = 0;
const uid = () => `m${++seq}`;
const defaultProx = () => ({ on: true, visible: true, radii: DEFAULT_RADII_NM.map((n) => n * NM) });
const defaultRoute = () => ({ on: true, visible: true, hours: 24, marks: true });
const defaultArrival = () => ({ on: true, dest: null, destName: '', speed: null });

/** נוסח הנחיה: [ארוך, קצר]; הקצר מוצג כשרוחב המפה קטן (container query) */
function hintFor(tool, draft, items) {
  if (tool?.family === 'vessel' && tool.id === 'arrival') return ['לחיצה על המפה: בחירת יעד (או חיפוש נמל בפאנל) · גרירת ידית: עריכה · Esc: סגירת הכלי', 'לחיצה: יעד · Esc: סגירה'];
  if (!tool || tool.family !== 'general' || !DRAW.includes(tool.id)) return null;
  if (isCircle(tool.id)) {
    if (draft) return ['לחיצה נוספת: קביעת הרדיוס (או הקלדה בלוח) · Esc: ביטול', 'לחיצה: רדיוס · Esc: ביטול'];
    if (tool.id === 'terrain') return ['לחיצה על המפה: מרכז אזור החקירה, ואז לחיצה לרדיוס · גרירת ידית: עריכה · Esc: סגירת הכלי', 'לחיצה: מרכז · Esc: סגירה'];
    if (items.filter((i) => i.kind === 'radius').length >= MAX_CIRCLES) return ['עד 3 מעגלים: מחק מעגל כדי להוסיף · Esc: סגירת הכלי', 'עד 3 מעגלים · Esc: סגירה'];
    return ['לחיצה על המפה: בחירת מרכז · גרירת ידית: עריכה · Esc: סגירת הכלי', 'לחיצה: מרכז · Esc: סגירה'];
  }
  if (draft) return ['לחיצה: הוספת נקודה · לחיצה כפולה או Enter: סיום · Backspace: מחיקת נקודה · Esc: ביטול', 'לחיצה: נקודה · Enter: סיום · Esc: ביטול'];
  if (items.length >= MAX_SAVED) return ['הגעת ל-5 מדידות: מחק אחת כדי להמשיך · Esc: סגירת הכלי', 'עד 5 מדידות · Esc: סגירה'];
  if (tool.id === 'height') return ['לחיצה על המפה: נקודה לקריאת גובה, ושתי נקודות ויותר לפרופיל · גרירת ידית: עריכה · Esc: סגירת הכלי', 'לחיצה: נקודה · Esc: סגירה'];
  if (tool.id === 'time') return ['לחיצה על המפה: בחירת מוצא, ואז ביניים ויעד · גרירת ידית: עריכה · Esc: סגירת הכלי', 'לחיצה: מוצא · Esc: סגירה'];
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
  const [route, setRoute] = useState({});
  const [arrival, setArrival] = useState({});
  const [timeSpeed, setTimeSpeed] = useState(DEFAULT_KNOTS);
  const [watch, setWatch] = useState({});
  const [hoverLL, setHoverLL] = useState(null);
  const [unit, setUnit] = useUnit();
  const st = useRef({});
  st.current = { tool, items, draft, selId, timeSpeed };

  const drawing = tool?.family === 'general' && DRAW.includes(tool.id);
  const arrivalTool = tool?.family === 'vessel' && tool.id === 'arrival';
  const picking = drawing || arrivalTool;
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
    if (!d || isCircle(d.kind)) return;
    if (d.points.length < (d.kind === 'area' ? 3 : 2)) return;
    commit({ kind: d.kind, points: d.points, ...(d.kind === 'time' ? { speed: st.current.timeSpeed } : {}) });
  }, [commit]);

  const pick = (kind, id) => {
    setDraft(null); setCursor(null); setSelId(null);
    if (kind === 'general') setTool((t) => (t?.family === 'general' && t.id === id ? null : { family: 'general', id }));
    else if (vessel) {
      const opening = !(tool?.family === 'vessel' && tool.id === id);
      setTool(opening ? { family: 'vessel', id, vesselId: vessel.id } : null);
      const ensure = (set, make) => set((p) => ({ ...p, [vessel.id]: p[vessel.id]?.on ? p[vessel.id] : { ...(p[vessel.id] ?? make()), on: true } }));
      if (id === 'prox') ensure(setProx, defaultProx);
      if (id === 'route') ensure(setRoute, defaultRoute);
      if (id === 'arrival') ensure(setArrival, defaultArrival);
      if (opening && map && (id === 'prox' || id === 'route')) {
        // התאמת התצוגה למעגל החיצוני או למסלול, עם מקום לפאנל בקצה ה-end
        const pts = id === 'prox'
          ? circlePolygon([vessel.lon, vessel.lat], Math.max(...(prox[vessel.id]?.radii ?? defaultProx().radii)), 24)
          : demoTrack(vessel, route[vessel.id]?.hours ?? 24).map((p) => p.ll);
        const lons = pts.map((p) => p[0]);
        const lats = pts.map((p) => p[1]);
        const pad = 0.05;
        map.fitBounds([[Math.min(...lons) - pad, Math.min(...lats) - pad], [Math.max(...lons) + pad, Math.max(...lats) + pad]], { padding: { top: 120, bottom: 120, left: 440, right: 60 }, maxZoom: 10, duration: 600 });
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
    if (vessel && tool?.family === 'vessel') {
      const ensure = (set, make) => set((p) => (p[vessel.id] ? p : { ...p, [vessel.id]: make() }));
      if (tool.id === 'prox') ensure(setProx, defaultProx);
      if (tool.id === 'route') ensure(setRoute, defaultRoute);
      if (tool.id === 'arrival') ensure(setArrival, defaultArrival);
    }
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
    const isArrival = () => { const t = st.current.tool; return t?.family === 'vessel' && t.id === 'arrival' && !!t.vesselId; };
    const onClick = (e) => {
      if (isArrival()) {
        const vid = st.current.tool.vesselId;
        setArrival((p) => ({ ...p, [vid]: { ...(p[vid] ?? defaultArrival()), on: true, dest: [e.lngLat.lng, e.lngLat.lat], destName: 'נקודה על המפה' } }));
        return;
      }
      if (!isDrawing()) return;
      const { tool: t, draft: d, items: list } = st.current;
      const ll = [e.lngLat.lng, e.lngLat.lat];
      if (isCircle(t.id)) {
        if (!d) {
          if (list.length >= MAX_SAVED || (t.id === 'radius' && list.filter((i) => i.kind === 'radius').length >= MAX_CIRCLES)) return;
          setSelId(null);
          setDraft({ kind: t.id, center: ll, radius: null });
          return;
        }
        const r = distance(d.center, ll);
        if (r >= 1) commit({ kind: d.kind, center: d.center, radius: r });
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
    const onDbl = () => { if (isDrawing() && !isCircle(st.current.tool.id)) finish(); };
    let raf = 0;
    const onMove = (e) => {
      if (isArrival()) { map.getCanvas().style.cursor = 'crosshair'; return; }
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
    if (blockRef) blockRef.current = picking;
    if (!map || !picking) return undefined;
    map.doubleClickZoom.disable();
    map.getCanvas().style.cursor = 'crosshair';
    return () => {
      if (blockRef) blockRef.current = false;
      try { map.doubleClickZoom.enable(); map.getCanvas().style.cursor = ''; } catch { /* המפה כבר הוסרה */ }
    };
  }, [map, picking, blockRef]);

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
      } else if (e.key === 'Backspace' && d && !isCircle(d.kind)) {
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
  const routeState = vessel ? route[vessel.id] : undefined;
  const arrState = vessel ? arrival[vessel.id] : undefined;
  const track = useMemo(() => (vessel && routeState?.on ? demoTrack(vessel, routeState.hours) : null), [vessel, routeState?.on, routeState?.hours]);
  const scene = useMemo(
    () => buildScene({
      items, draft, cursor, edit, unit,
      prox: proxState?.on && proxState.visible ? { vessel, radii: proxState.radii } : null,
      route: track && routeState.visible ? { track, hours: routeState.hours, marks: routeState.marks } : null,
      arrival: arrState?.on && arrState.dest ? { vessel, dest: arrState.dest, editable: arrivalTool } : null,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, draft, cursor, selId, tool, unit, proxState, track, routeState, arrState, vessel],
  );
  featuresRef.current = scene.features;
  useEffect(() => { if (map) setToolData(map, scene.features); }, [map, scene.features]);

  const moveHandle = useCallback((h, ll) => {
    const upd = (g) => {
      if (isCircle(g.kind)) return h.idx === 'c' ? { ...g, center: ll } : { ...g, radius: Math.max(1, distance(g.center, ll)) };
      const pts = g.points.slice();
      pts[h.idx] = ll;
      return { ...g, points: pts };
    };
    if (h.id === 'arrival') {
      const vid = st.current.tool?.vesselId;
      if (vid) setArrival((p) => ({ ...p, [vid]: { ...p[vid], dest: ll, destName: 'נקודה על המפה' } }));
      return;
    }
    if (h.id === 'draft') setDraft((d) => (d ? upd(d) : d));
    else setItems((l) => l.map((x) => (x.id === h.id ? upd(x) : x)));
  }, []);
  const rawLive = draft ? withCursor(draft, cursor) : selected;
  const live = rawLive && rawLive.kind === 'time' && rawLive.speed == null ? { ...rawLive, speed: timeSpeed } : rawLive;
  const m = metrics(live);
  const hits = live?.kind === 'terrain' && live.radius > 0 ? within(live.center, live.radius, vessels) : [];
  useMarkers(map, [
    ...scene.chips.map((c) => ({ key: `c-${c.key}`, lngLat: c.lngLat, text: c.text, anchor: c.anchor, offset: c.offset, className: `map-chip ${c.color}${c.strong ? ' strong' : ''}` })),
    ...scene.arrows.map((a) => ({ key: `a-${a.key}`, lngLat: a.lngLat, rotation: a.rotation, className: 'map-arrow' })),
    ...hits.map(({ v }) => ({ key: `ring-${v.id}`, lngLat: [v.lon, v.lat], className: 'map-ring' })),
    ...(hoverLL ? [{ key: 'hover', lngLat: hoverLL, className: 'map-ring small' }] : []),
    ...scene.handles.map((h) => ({ key: `h-${h.key}`, lngLat: h.lngLat, className: 'map-handle', draggable: true, onDrag: (ll) => moveHandle(h, ll), onDouble: h.id === 'draft' ? finish : undefined })),
  ]);

  // ===== פאנל =====
  const patchSel = (fn) => setItems((l) => l.map((x) => (x.id === selId ? fn(x) : x)));
  const closeTool = () => { setHoverLL(null); setTool(null); setDraft(null); setCursor(null); setSelId(null); };
  const hint = hintFor(tool, draft, items);

  let panel = null;
  if (drawing) {
    panel = (
      <GeneralPanel tool={tool.id} hits={hits} onPickVessel={onSelectVessel} onHover={setHoverLL} watch={watch}
        onAddToList={(list, ids) => setWatch((w) => ({ ...w, [list]: [...new Set([...(w[list] ?? []), ...ids])] }))} onSpeed={(k) => { if (selected) patchSel((x) => ({ ...x, speed: k })); else setTimeSpeed(k); }} live={!!live} m={m} unit={unit} setUnit={setUnit} items={items} selId={selId} max={MAX_SAVED}
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
        onRadius={(r) => { if (isCircle(draft?.kind) && draft.center) commit({ kind: draft.kind, center: draft.center, radius: r }); else if (selected) patchSel((x) => ({ ...x, radius: r })); }} />
    );
  } else if (tool?.family === 'vessel' && tool.id === 'prox' && vessel && proxState) {
    const setP = (patch) => setProx((p) => ({ ...p, [vessel.id]: { ...p[vessel.id], ...patch } }));
    panel = (
      <ProximityPanel vessel={vessel} vessels={vessels} radii={proxState.radii} visible={proxState.visible} unit={unit} setUnit={setUnit}
        onRadii={(radii) => setP({ radii })} onToggle={() => setP({ visible: !proxState.visible })}
        onClear={() => { setP({ on: false }); setTool(null); }} onClose={() => setTool(null)} onPickVessel={onSelectVessel} />
    );
  }

  if (!panel && tool?.family === 'vessel' && vessel && tool.id === 'route' && routeState && track) {
    const setR = (patch) => setRoute((p) => ({ ...p, [vessel.id]: { ...p[vessel.id], ...patch } }));
    panel = (
      <RoutePanel vessel={vessel} hours={routeState.hours} marks={routeState.marks} visible={routeState.visible} stats={trackStats(track, routeState.hours)}
        unit={unit} setUnit={setUnit} onHours={(hours) => setR({ hours })} onMarks={(marks) => setR({ marks })} onToggle={() => setR({ visible: !routeState.visible })}
        onClear={() => { setR({ on: false }); setTool(null); }} onClose={() => setTool(null)} />
    );
  }
  if (!panel && arrivalTool && vessel && arrState) {
    const setA = (patch) => setArrival((p) => ({ ...p, [vessel.id]: { ...p[vessel.id], ...patch } }));
    const fallback = arrState.speed == null && !(vessel.speed >= 1);
    const knots = arrState.speed ?? (vessel.speed >= 1 ? vessel.speed : DEFAULT_KNOTS);
    const from = [vessel.lon, vessel.lat];
    const dist = arrState.dest ? distance(from, arrState.dest) : 0;
    const ma = arrState.dest ? { distance: dist, bearing: bearing(from, arrState.dest), hours: travelHours(dist, knots) } : null;
    panel = (
      <ArrivalPanel vessel={vessel} dest={arrState.dest} destName={arrState.destName} knots={knots} usedFallback={fallback} metricsArr={ma}
        unit={unit} setUnit={setUnit} onSpeed={(k) => setA({ speed: k })}
        onPickPort={(pid) => {
          const p = PORTS.find((x) => x.id === pid);
          setA({ dest: [p.lon, p.lat], destName: p.name });
          if (map) map.fitBounds([[Math.min(from[0], p.lon), Math.min(from[1], p.lat)], [Math.max(from[0], p.lon), Math.max(from[1], p.lat)]], { padding: { top: 120, bottom: 120, left: 440, right: 60 }, maxZoom: 10, duration: 600 });
        }}
        onClear={() => setA({ dest: null, destName: '' })} onClose={() => setTool(null)} />
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
