// בניית "סצנה" מהמצב: פיצ'רים לשכבות, תוויות (chips) וידיות. פונקציות טהורות, בלי תלות במפה.
import { bearing, centroid, circleArea, circleCircumference, circlePolygon, destination, distance, greatCircle, pathLength, polygonArea, polygonPerimeter } from './geodesy';
import { formatArea, formatDistance, travelHours } from './units';
import { markLabel, markStep, trackStep } from './route';
import { profileSamples, profileStats } from './elevation';

export const KIND_LABEL = { distance: 'מרחק', radius: 'רדיוס חופשי', area: 'שטח', time: 'חישוב זמנים', height: 'גובה', terrain: 'חקירת שטח' };
/** כלים שמוגדרים במרכז ורדיוס (רדיוס חופשי בלבד; "חקירת שטח" משרטטת פוליגון, כמו "שטח") */
export const isCircle = (kind) => kind === 'radius';
/** כלים שמוגדרים בפוליגון: שטח וחקירת שטח */
export const isPolygon = (kind) => kind === 'area' || kind === 'terrain';
export const DEFAULT_KNOTS = 10;
export const COMPARE_KNOTS = [8, 10, 12, 14];
export const DEFAULT_RADII_NM = [5, 10, 20];

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
  if (isCircle(g.kind)) return g.center && g.radius == null ? { ...g, radius: distance(g.center, cursor) } : g;
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
  if (g.kind === 'height') {
    const samples = profileSamples(g.points, 64);
    return { total: pathLength(g.points), points: g.points.length, samples, stats: profileStats(samples) };
  }
  if (isPolygon(g.kind)) {
    const n = g.points.length;
    return { area: n >= 3 ? polygonArea(g.points) : 0, perimeter: n >= 2 ? polygonPerimeter(g.points) : 0, points: n };
  }
  const r = g.radius ?? 0;
  return { center: g.center, radius: r, circumference: circleCircumference(r), area: circleArea(r) };
}

/** כלים בתוך עיגול (מרכז ורדיוס), ממוינים לפי מרחק מהמרכז */
export function within(center, radiusM, all) {
  return all
    .map((v) => ({ v, d: distance(center, [v.lon, v.lat]) }))
    .filter((x) => x.d <= radiusM)
    .sort((a, b) => a.d - b.d);
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
 * items: מדידות שמורות; draft+cursor: טיוטה; edit: האובייקט שעורכים (ידיות);
 * vessels: [{ vessel, vi, active, radii?, route?: { track, hours, marks }, arrival?: { dest, editable } }]
 * מחזיר { features, chips, handles }; handles: { key, lngLat, idx, id } (id = 'draft' או מזהה שמור)
 */
export function buildScene({ items, draft, cursor, edit, vessels, unit, mask = null }) {
  const features = [];
  const chips = [];
  const handles = [];
  const arrows = [];

  const addObj = (g, key) => {
    if (g.kind === 'distance' || g.kind === 'time' || g.kind === 'height') {
      const pts = g.points;
      if (pts.length >= 2) features.push(feat({ type: 'LineString', coordinates: lineThrough(pts) }, {}));
      for (let i = 1; i < pts.length; i++) {
        chips.push({ key: `${key}-s${i}`, lngLat: greatCircle(pts[i - 1], pts[i], 2)[1], text: dist(distance(pts[i - 1], pts[i]), unit), color: 'draw', anchor: 'bottom', offset: [0, -8] });
      }
      if (g.kind === 'time' && pts.length >= 1) {
        chips.push({ key: `${key}-o`, lngLat: pts[0], text: 'מוצא', color: 'draw', strong: true, anchor: 'top', offset: [0, 12] });
        if (pts.length >= 2) chips.push({ key: `${key}-d`, lngLat: pts[pts.length - 1], text: 'יעד', color: 'draw', strong: true, anchor: 'top', offset: [0, 12] });
      } else if (pts.length >= 3) chips.push({ key: `${key}-t`, lngLat: pts[pts.length - 1], text: dist(pathLength(pts), unit), color: 'draw', strong: true, anchor: 'top', offset: [0, 14] });
    } else if (isPolygon(g.kind)) {
      const pts = g.points;
      if (pts.length >= 3) {
        features.push(feat({ type: 'Polygon', coordinates: [[...pts, pts[0]]] }, { fill: true }));
        const a = formatArea(polygonArea(pts), unit);
        chips.push({ key: `${key}-a`, lngLat: centroid(pts), text: `${a.value} ${a.unit}`, color: 'draw', strong: true, anchor: 'center', offset: [0, 0] });
      } else if (pts.length === 2) features.push(feat({ type: 'LineString', coordinates: pts }, {}));
    } else if (isCircle(g.kind) && g.radius > 0) {
      features.push(feat({ type: 'Polygon', coordinates: [circlePolygon(g.center, g.radius)] }, { fill: true }));
      chips.push({ key: `${key}-r`, lngLat: destination(g.center, 90, g.radius), text: dist(g.radius, unit), color: 'draw', anchor: 'left', offset: [10, 0] });
    }
  };

  // מצב חקירת שטח: מסכה (פוליגון עם חור) על כל העולם, ובתוכה הפוליגון שנבחר. -540..540 כדי לכסות גם עותקי עולם חוזרים
  if (mask && mask.length >= 3) {
    features.push(feat({ type: 'Polygon', coordinates: [[[-540, -85], [540, -85], [540, 85], [-540, 85], [-540, -85]], [...mask, mask[0]]] }, { t: 'mask' }));
  }
  for (const it of items) if (it.visible) addObj(it, it.id);
  const live = draft && withCursor(draft, cursor);
  if (live) addObj(live, 'draft');

  const target = edit?.g;
  if (target) {
    if (isCircle(target.kind)) {
      if (target.center) handles.push({ key: 'hc', lngLat: target.center, idx: 'c', id: edit.id });
      if (target.radius > 0 && edit.id !== 'draft') handles.push({ key: 'he', lngLat: destination(target.center, 90, target.radius), idx: 'e', id: edit.id });
    } else {
      target.points.forEach((p, i) => handles.push({ key: `h${i}`, lngLat: p, idx: i, id: edit.id }));
    }
  }

  // כלי שיט בסט: לכל כלי צבע (vi), דפוס קו (pat) ואטימות (הפעיל 1, האחרים 0.7)
  for (const e of vessels ?? []) {
    const c = [e.vessel.lon, e.vessel.lat];
    const name = e.vessel.name;
    const base = { t: 'vessel', vi: e.vi, active: e.active };
    const chip = (key, lngLat, text, extra = {}) => chips.push({ key: `${e.vessel.id}-${key}`, lngLat, text, color: 'vessel', vi: e.vi, dim: !e.active, ...extra });
    if (e.radii) {
      e.radii.forEach((r) => features.push(feat({ type: 'LineString', coordinates: circlePolygon(c, r) }, { ...base, pat: 8 })));
      const outer = Math.max(...e.radii);
      chip('prox', destination(c, 0, outer), `${name} · ${dist(outer, unit)}`, { anchor: 'bottom', offset: [0, -4] });
    }
    if (e.route) {
      const { track, hours, marks } = e.route;
      features.push(feat({ type: 'LineString', coordinates: track.map((p) => p.ll) }, { ...base, pat: e.vi }));
      chip('rname', track[Math.floor(track.length / 2)].ll, name, { strong: true, anchor: 'bottom', offset: [0, -8] });
      if (marks) {
        const { step, unit: mu } = markStep(hours);
        const ts = trackStep(hours);
        for (let h = step; h <= hours + 1e-9; h += step) {
          const i = Math.round(h / ts);
          if (track[i]) chip(`rt${h}`, track[i].ll, markLabel(h, mu), { anchor: 'top', offset: [0, 6] });
          // חצי חץ כיוון באמצע כל קטע בין סימונים, מופנה בכיוון התנועה (מהישן לחדש)
          const mid = Math.round((h - step / 2) / ts);
          if (track[mid] && track[mid - 1]) arrows.push({ key: `${e.vessel.id}-ra${h}`, lngLat: track[mid].ll, rotation: bearing(track[mid].ll, track[mid - 1].ll), vi: e.vi, dim: !e.active });
        }
      }
    }
    if (e.arrival?.dest) {
      features.push(feat({ type: 'LineString', coordinates: lineThrough([c, e.arrival.dest]) }, { ...base, pat: e.vi }));
      chip('arr', greatCircle(c, e.arrival.dest, 2)[1], `${name} · ${dist(distance(c, e.arrival.dest), unit)}`, { anchor: 'bottom', offset: [0, -8] });
      if (e.arrival.editable && e.active) handles.push({ key: 'ha', lngLat: e.arrival.dest, idx: 'd', id: 'arrival' });
    }
  }
  return { features, chips, handles, arrows };
}
