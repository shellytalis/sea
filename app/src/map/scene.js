// בניית "סצנה" מהמצב: פיצ'רים לשכבות, תוויות (chips) וידיות. פונקציות טהורות, בלי תלות במפה.
import { bearing, centroid, circleArea, circleCircumference, circlePolygon, destination, distance, greatCircle, pathLength, polygonArea, polygonPerimeter } from './geodesy';
import { formatArea, formatDistance, travelHours } from './units';
import { markStep } from './route';

export const KIND_LABEL = { distance: 'מרחק', radius: 'רדיוס חופשי', area: 'שטח', time: 'חישוב זמנים' };
export const DEFAULT_KNOTS = 10;
export const COMPARE_KNOTS = [8, 10, 12, 14];
export const DEFAULT_RADII_NM = [5, 10, 20];
// תוויות המעגלים בזוויות שונות (צפון, דרום-מזרח, דרום-מערב), כדי שמעגלים קטנים לא יערמו תוויות זו על זו
const PROX_CHIP = [
  { brg: 0, anchor: 'bottom', offset: [0, -4] },
  { brg: 120, anchor: 'top-left', offset: [4, 2] },
  { brg: 240, anchor: 'top-right', offset: [-4, 2] },
];

const feat = (geometry, props) => ({ type: 'Feature', properties: { t: 'draw', fill: false, dash: false, ...props }, geometry });

/** קו שמורכב מקשתות גדול-מעגל, כך שקו "ישר" מתעקל נכון ב-mercator */
export function lineThrough(points) {
  const out = [];
  for (let i = 1; i < points.length; i++) {
    const steps = Math.max(2, Math.min(64, Math.ceil(distance(points[i - 1], points[i]) / 50000)));
    const seg = greatCircle(points[i - 1], points[i], steps);
    out.push(...(i > 1 ? seg.slice(1) : seg));
  }
  return out;
}

/** גרסה "חיה" של טיוטה: מצרפת את מיקום העכבר (נקודה אחרונה, או רדיוס) */
export function withCursor(g, cursor) {
  if (!g || !cursor) return g;
  if (g.kind === 'radius') return g.center && g.radius == null ? { ...g, radius: distance(g.center, cursor) } : g;
  return { ...g, points: [...g.points, cursor] };
}

/** מדדים לפאנל */
export function metrics(g) {
  if (!g) return null;
  if (g.kind === 'distance' || g.kind === 'time') {
    const n = g.points.length;
    const total = pathLength(g.points);
    return { total, segments: Math.max(0, n - 1), bearing: n >= 2 ? bearing(g.points[n - 2], g.points[n - 1]) : null, points: n, knots: g.speed ?? DEFAULT_KNOTS, hours: travelHours(total, g.speed ?? DEFAULT_KNOTS) };
  }
  if (g.kind === 'area') {
    const n = g.points.length;
    return { area: n >= 3 ? polygonArea(g.points) : 0, perimeter: n >= 2 ? polygonPerimeter(g.points) : 0, points: n };
  }
  const r = g.radius ?? 0;
  return { center: g.center, radius: r, circumference: circleCircumference(r), area: circleArea(r) };
}

/** כלים בטווח מכלי נתון (מנתוני הדמה), ממוינים לפי מרחק */
export function inRange(vessel, radiusM, all) {
  return all
    .filter((o) => o.id !== vessel.id)
    .map((o) => ({ v: o, d: distance([vessel.lon, vessel.lat], [o.lon, o.lat]) }))
    .filter((x) => x.d <= radiusM)
    .sort((a, b) => a.d - b.d);
}

const dist = (m, unit) => { const f = formatDistance(m, unit); return `${f.value} ${f.unit}`; };

/**
 * items: מדידות שמורות; draft+cursor: טיוטה; edit: האובייקט שעורכים (ידיות); prox: {vessel, radii}
 * מחזיר { features, chips, handles }; handles: { key, lngLat, idx, id } (id = 'draft' או מזהה שמור)
 */
export function buildScene({ items, draft, cursor, edit, prox, route, arrival, unit }) {
  const features = [];
  const chips = [];
  const handles = [];
  const arrows = [];

  const addObj = (g, key) => {
    if (g.kind === 'distance' || g.kind === 'time') {
      const pts = g.points;
      if (pts.length >= 2) features.push(feat({ type: 'LineString', coordinates: lineThrough(pts) }, {}));
      for (let i = 1; i < pts.length; i++) {
        chips.push({ key: `${key}-s${i}`, lngLat: greatCircle(pts[i - 1], pts[i], 2)[1], text: dist(distance(pts[i - 1], pts[i]), unit), color: 'draw', anchor: 'bottom', offset: [0, -8] });
      }
      if (g.kind === 'time' && pts.length >= 1) {
        chips.push({ key: `${key}-o`, lngLat: pts[0], text: 'מוצא', color: 'draw', strong: true, anchor: 'top', offset: [0, 12] });
        if (pts.length >= 2) chips.push({ key: `${key}-d`, lngLat: pts[pts.length - 1], text: 'יעד', color: 'draw', strong: true, anchor: 'top', offset: [0, 12] });
      } else if (pts.length >= 3) chips.push({ key: `${key}-t`, lngLat: pts[pts.length - 1], text: dist(pathLength(pts), unit), color: 'draw', strong: true, anchor: 'top', offset: [0, 14] });
    } else if (g.kind === 'area') {
      const pts = g.points;
      if (pts.length >= 3) {
        features.push(feat({ type: 'Polygon', coordinates: [[...pts, pts[0]]] }, { fill: true }));
        const a = formatArea(polygonArea(pts), unit);
        chips.push({ key: `${key}-a`, lngLat: centroid(pts), text: `${a.value} ${a.unit}`, color: 'draw', strong: true, anchor: 'center', offset: [0, 0] });
      } else if (pts.length === 2) features.push(feat({ type: 'LineString', coordinates: pts }, {}));
    } else if (g.kind === 'radius' && g.radius > 0) {
      features.push(feat({ type: 'Polygon', coordinates: [circlePolygon(g.center, g.radius)] }, { fill: true }));
      chips.push({ key: `${key}-r`, lngLat: destination(g.center, 90, g.radius), text: dist(g.radius, unit), color: 'draw', anchor: 'left', offset: [10, 0] });
    }
  };

  for (const it of items) if (it.visible) addObj(it, it.id);
  const live = draft && withCursor(draft, cursor);
  if (live) addObj(live, 'draft');

  const target = edit?.g;
  if (target) {
    if (target.kind === 'radius') {
      if (target.center) handles.push({ key: 'hc', lngLat: target.center, idx: 'c', id: edit.id });
      if (target.radius > 0 && edit.id !== 'draft') handles.push({ key: 'he', lngLat: destination(target.center, 90, target.radius), idx: 'e', id: edit.id });
    } else {
      target.points.forEach((p, i) => handles.push({ key: `h${i}`, lngLat: p, idx: i, id: edit.id }));
    }
  }

  if (prox) {
    const c = [prox.vessel.lon, prox.vessel.lat];
    prox.radii.forEach((r, i) => {
      features.push(feat({ type: 'LineString', coordinates: circlePolygon(c, r) }, { t: 'vessel', dash: true }));
      const pos = PROX_CHIP[i % PROX_CHIP.length];
      chips.push({ key: `p${i}`, lngLat: destination(c, pos.brg, r), text: dist(r, unit), color: 'vessel', anchor: pos.anchor, offset: pos.offset });
    });
  }
  if (route) {
    const pts = route.track.map((p) => p.ll);
    features.push(feat({ type: 'LineString', coordinates: pts }, { t: 'vessel' }));
    const step = markStep(route.hours);
    for (let h = step; h <= route.hours + 1e-9; h += step) {
      if (route.marks === false) break;
      const i = Math.round(h / 0.25);
      if (route.track[i]) chips.push({ key: `rt${h}`, lngLat: route.track[i].ll, text: `-${h}h`, color: 'vessel', anchor: 'top', offset: [0, 6] });
      // חצי חץ כיוון באמצע כל קטע בין סימונים, מופנה בכיוון התנועה (מהישן לחדש)
      const mid = Math.round((h - step / 2) / 0.25);
      if (route.track[mid] && route.track[mid - 1]) arrows.push({ key: `ra${h}`, lngLat: route.track[mid].ll, rotation: bearing(route.track[mid].ll, route.track[mid - 1].ll) });
    }
  }

  if (arrival?.dest) {
    const from = [arrival.vessel.lon, arrival.vessel.lat];
    features.push(feat({ type: 'LineString', coordinates: lineThrough([from, arrival.dest]) }, { t: 'vessel' }));
    chips.push({ key: 'arr', lngLat: greatCircle(from, arrival.dest, 2)[1], text: dist(distance(from, arrival.dest), unit), color: 'vessel', anchor: 'bottom', offset: [0, -8] });
    if (arrival.editable) handles.push({ key: 'ha', lngLat: arrival.dest, idx: 'd', id: 'arrival' });
  }
  return { features, chips, handles, arrows };
}
