import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { circlePolygon, distance } from '../../map/geodesy';
import { demoTrack, trackStats } from '../../map/route';
import { resolveRange } from '../../map/range';
import { PORTS } from '../../data/ports';
import { addToolLayers, setToolData } from '../../map/layers';
import { DEFAULT_KNOTS, buildScene, isCircle, metrics, withCursor, within } from '../../map/scene';
import { travelHours, useUnit } from '../../map/units';
import useMarkers from '../../map/useMarkers';
import { DEFAULT_RADII, useVesselSet } from '../../state/vesselSet';
import { GeneralToolbar, VesselBar } from './Toolbars';
import { ArrivalPanel, GeneralPanel, ProximityPanel, RoutePanel } from './ToolPanel';

const MAX_SAVED = 5;
const MAX_CIRCLES = 3;
const DRAW = ['distance', 'radius', 'area', 'time', 'height', 'terrain'];
const LAYER_KEYS = ['prox', 'route', 'arrival'];
let seq = 0;
const uid = () => `m${++seq}`;

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
 * כלי מפה: כלים כלליים (מצב יחיד { family, id }, פאנל אחד בכל רגע) ושכבות כלי שיט על סט הכלים (מעגלי קרבה, מסלול,
 * הגעה) שאפשר להפעיל במקביל, ל"כלי בודד" או ל"כל הסט". הסט והשכבות שמורים ב-state ברמת האפליקציה.
 * רכיב אחי של המפה (לא בתוך קוד המפה): מקבל את מופע המפה דרך onMapReady.
 * children: כלי החיפוש, שיושב בשורת ה-overlay (חיפוש ב-start, הנחיה באמצע, מקום לזום ב-end).
 */
export default function MapTools({ map, vessels, onActivate, onSelectVessel, blockRef, children }) {
  const vs = useVesselSet();
  const { ids, activeId, mode, layers, radii, range, marks, arrival: arr, colors } = vs.state;
  const [tool, setTool] = useState(null);
  const [items, setItems] = useState([]);
  const [draft, setDraft] = useState(null);
  const [cursor, setCursor] = useState(null);
  const [selId, setSelId] = useState(null);
  const [timeSpeed, setTimeSpeed] = useState(DEFAULT_KNOTS);
  const [watch, setWatch] = useState({});
  const [hoverLL, setHoverLL] = useState(null);
  const [unit, setUnit] = useUnit();

  const setVessels = useMemo(() => ids.map((id) => vessels.find((v) => v.id === id)).filter(Boolean), [ids, vessels]);
  const active = setVessels.find((v) => v.id === activeId) ?? null;
  const targets = mode === 'all' ? setVessels : active ? [active] : [];
  const targetIds = targets.map((v) => v.id);
  const rr = useMemo(() => resolveRange(range), [range]);

  const st = useRef({});
  st.current = { tool, items, draft, selId, timeSpeed, targetIds };

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

  const pickGeneral = (id) => {
    setDraft(null); setCursor(null); setSelId(null);
    setTool((t) => (t?.family === 'general' && t.id === id ? null : { family: 'general', id }));
  };

  /** התאמת התצוגה לשכבה שהופעלה, עם מקום לפאנל בקצה ה-end */
  const fit = (pts) => {
    if (!map || !pts.length) return;
    const lons = pts.map((p) => p[0]);
    const lats = pts.map((p) => p[1]);
    const pad = 0.05;
    map.fitBounds([[Math.min(...lons) - pad, Math.min(...lats) - pad], [Math.max(...lons) + pad, Math.max(...lats) + pad]], { padding: { top: 120, bottom: 160, left: 440, right: 60 }, maxZoom: 10, duration: 600 });
  };

  /**
   * לחיצה על שכבה בסרגל: אם אינה פעילה לכל היעדים, מפעילה ופותחת את הפאנל; אם פעילה והפאנל פתוח, מכבה (לחיצה חוזרת);
   * אם פעילה והפאנל סגור, פותחת את הפאנל. היעדים: הפעיל ב"כלי בודד", כל הסט ב"כל הסט".
   */
  const toggleLayer = (key) => {
    setDraft(null); setCursor(null); setSelId(null);
    if (!targets.length) return;
    const allOn = targets.every((v) => layers[v.id]?.[key]);
    const open = tool?.family === 'vessel' && tool.id === key;
    if (allOn && open) { vs.setLayer(targetIds, key, false); setTool(null); return; }
    setTool({ family: 'vessel', id: key });
    if (!allOn) {
      vs.setLayer(targetIds, key, true);
      if (key === 'prox') fit(targets.flatMap((v) => circlePolygon([v.lon, v.lat], Math.max(...radii), 24)));
      if (key === 'route') fit(targets.flatMap((v) => demoTrack(v, rr.hours).map((p) => p.ll)));
    }
  };
  const setEye = (key) => {
    const anyOn = targets.some((v) => layers[v.id]?.[key]);
    vs.setLayer(targetIds, key, !anyOn);
  };

  // סט ריק: אין כלי שיט, ולכן גם פאנל כלי שיט נסגר
  useEffect(() => { if (!setVessels.length) setTool((t) => (t?.family === 'vessel' ? null : t)); }, [setVessels.length]);

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
    const isArrival = () => { const t = st.current.tool; return t?.family === 'vessel' && t.id === 'arrival'; };
    const onClick = (e) => {
      if (isArrival()) {
        vs.setArrival({ dest: [e.lngLat.lng, e.lngLat.lat], destName: 'נקודה על המפה' });
        vs.setLayer(st.current.targetIds, 'arrival', true);
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
  }, [map, commit, finish, vs]);

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
        if (document.querySelector('[role=listbox], [role=dialog].mt-vpop')) return;
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
  const tracks = useMemo(
    () => Object.fromEntries(setVessels.filter((v) => layers[v.id]?.route).map((v) => [v.id, demoTrack(v, rr.hours)])),
    [setVessels, layers, rr.hours],
  );
  const scene = useMemo(
    () => buildScene({
      items, draft, cursor, edit, unit,
      vessels: setVessels.map((v) => ({
        vessel: v,
        vi: colors[v.id] ?? 0,
        active: v.id === activeId,
        radii: layers[v.id]?.prox ? radii : null,
        route: tracks[v.id] ? { track: tracks[v.id], hours: rr.hours, marks } : null,
        arrival: layers[v.id]?.arrival && arr.dest ? { dest: arr.dest, editable: arrivalTool } : null,
      })),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, draft, cursor, selId, tool, unit, setVessels, layers, radii, tracks, rr.hours, marks, arr.dest, arrivalTool, activeId, colors],
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
    if (h.id === 'arrival') { vs.setArrival({ dest: ll, destName: 'נקודה על המפה' }); return; }
    if (h.id === 'draft') setDraft((d) => (d ? upd(d) : d));
    else setItems((l) => l.map((x) => (x.id === h.id ? upd(x) : x)));
  }, [vs]);
  const rawLive = draft ? withCursor(draft, cursor) : selected;
  const live = rawLive && rawLive.kind === 'time' && rawLive.speed == null ? { ...rawLive, speed: timeSpeed } : rawLive;
  const m = metrics(live);
  const hits = live?.kind === 'terrain' && live.radius > 0 ? within(live.center, live.radius, vessels) : [];
  useMarkers(map, [
    ...scene.chips.map((c) => ({ key: `c-${c.key}`, lngLat: c.lngLat, text: c.text, anchor: c.anchor, offset: c.offset, className: `map-chip ${c.color}${c.vi != null ? ` vi-${c.vi}` : ''}${c.strong ? ' strong' : ''}${c.dim ? ' dim' : ''}` })),
    ...scene.arrows.map((a) => ({ key: `a-${a.key}`, lngLat: a.lngLat, rotation: a.rotation, className: `map-arrow vi-${a.vi}${a.dim ? ' dim' : ''}` })),
    ...setVessels.map((v) => ({ key: `set-${v.id}`, lngLat: [v.lon, v.lat], className: `map-ring set vi-${colors[v.id] ?? 0}${v.id === activeId ? '' : ' dim'}` })),
    ...hits.map(({ v }) => ({ key: `ring-${v.id}`, lngLat: [v.lon, v.lat], className: 'map-ring' })),
    ...(hoverLL ? [{ key: 'hover', lngLat: hoverLL, className: 'map-ring small' }] : []),
    ...scene.handles.map((h) => ({ key: `h-${h.key}`, lngLat: h.lngLat, className: 'map-handle', draggable: true, onDrag: (ll) => moveHandle(h, ll), onDouble: h.id === 'draft' ? finish : undefined })),
  ]);

  // ===== פאנל =====
  const patchSel = (fn) => setItems((l) => l.map((x) => (x.id === selId ? fn(x) : x)));
  const closeTool = () => { setHoverLL(null); setTool(null); setDraft(null); setCursor(null); setSelId(null); };
  const hint = hintFor(tool, draft, items);
  const meta = mode === 'all' ? <>כל הסט (<span className="num">{setVessels.length}</span>)</> : active ? <bdi dir="ltr">{active.name}</bdi> : null;
  const anyOn = (key) => targets.some((v) => layers[v.id]?.[key]);

  let panel = null;
  if (drawing) {
    panel = (
      <GeneralPanel tool={tool.id} hits={hits} onPickVessel={onSelectVessel} onHover={setHoverLL} watch={watch}
        onAddToList={(list, vids) => setWatch((w) => ({ ...w, [list]: [...new Set([...(w[list] ?? []), ...vids])] }))} onSpeed={(k) => { if (selected) patchSel((x) => ({ ...x, speed: k })); else setTimeSpeed(k); }} live={!!live} m={m} unit={unit} setUnit={setUnit} items={items} selId={selId} max={MAX_SAVED}
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
  } else if (tool?.family === 'vessel' && targets.length) {
    const close = () => setTool(null);
    if (tool.id === 'prox') {
      panel = (
        <ProximityPanel meta={meta} targets={targets} colors={colors} all={vessels} radii={radii} anyOn={anyOn('prox')} unit={unit} setUnit={setUnit}
          onRadii={vs.setRadii} onToggle={() => setEye('prox')} onClose={close}
          onClear={() => { vs.setRadii(DEFAULT_RADII); vs.setLayer(targetIds, 'prox', false); close(); }} onPickVessel={onSelectVessel} />
      );
    } else if (tool.id === 'route') {
      const statsList = targets.map((v) => trackStats(tracks[v.id] ?? demoTrack(v, rr.hours), rr.hours));
      panel = (
        <RoutePanel meta={meta} targets={targets} colors={colors} info={rr} marks={marks} anyOn={anyOn('route')} statsList={statsList} unit={unit} setUnit={setUnit}
          onMarks={vs.setMarks} onToggle={() => setEye('route')} onClose={close} onClear={() => { vs.setLayer(targetIds, 'route', false); close(); }} />
      );
    } else if (tool.id === 'arrival') {
      const rows = targets.map((v) => {
        const from = [v.lon, v.lat];
        const d = arr.dest ? distance(from, arr.dest) : 0;
        const slow = !(v.speed >= 1);
        const knots = arr.speed ?? (slow ? DEFAULT_KNOTS : v.speed);
        return { vessel: v, distance: d, knots, fallback: arr.speed == null && slow, hours: travelHours(d, knots) };
      });
      panel = (
        <ArrivalPanel meta={meta} colors={colors} dest={arr.dest} destName={arr.destName} uniform={arr.speed} anyOn={anyOn('arrival')} rows={rows} multi={mode === 'all'}
          unit={unit} setUnit={setUnit} onUniform={(k) => vs.setArrival({ speed: k })}
          onPickPort={(pid) => {
            const p = PORTS.find((x) => x.id === pid);
            vs.setArrival({ dest: [p.lon, p.lat], destName: p.name });
            vs.setLayer(targetIds, 'arrival', true);
            fit([[p.lon, p.lat], ...targets.map((v) => [v.lon, v.lat])]);
          }}
          onToggle={() => setEye('arrival')} onClear={() => { vs.setArrival({ dest: null, destName: '', speed: null }); vs.setLayer(targetIds, 'arrival', false); close(); }} onClose={close} />
      );
    }
  }

  const toolStates = Object.fromEntries(LAYER_KEYS.map((k) => {
    const n = targets.filter((v) => layers[v.id]?.[k]).length;
    return [k, n === 0 ? 'off' : n === targets.length ? 'on' : 'part'];
  }));
  const hasSet = setVessels.length > 0;

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
      <div className={`mt-stack${hasSet ? ' with-vbar' : ''}`}>
        {panel}
        <GeneralToolbar active={tool?.family === 'general' ? tool.id : null} onPick={pickGeneral}
          canClear={items.length > 0 || !!draft} onClear={() => { setItems([]); setDraft(null); setCursor(null); setSelId(null); }} />
      </div>
      {hasSet && (
        <VesselBar vessels={setVessels} activeId={activeId} colors={colors} mode={mode} onMode={vs.setMode}
          onActivate={onActivate} onRemove={vs.remove} onClear={vs.clear}
          range={{ from: rr.from, to: rr.to, preset: range.preset }} onRange={vs.setRange}
          toolStates={toolStates} openTool={tool?.family === 'vessel' ? tool.id : null} onTool={toggleLayer} />
      )}
    </>
  );
}
