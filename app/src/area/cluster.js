// קיבוץ נקודות קרובות לסמל עם מספר (FR-06). קיבוץ חמדני לפי מרחק פיקסלים בזום נתון, פונקציה טהורה ודטרמיניסטית.
// כל נקודה שמחוץ לקבוצה רחוקה מהזרע של כל קבוצה לפחות minPx, כך שסמלים לא יושבים זה על זה.
import { CLUSTER_CELL_PX, CLUSTER_MAX_ZOOM } from './thresholds.js';

const rad = (d) => (d * Math.PI) / 180;
/** מיקום פיקסלי בעולם mercator בזום נתון (אריח 512px, כמו MapLibre) */
export function worldPx(zoom, lon, lat) {
  const s = 512 * 2 ** zoom;
  const y = 0.5 - Math.log(Math.tan(Math.PI / 4 + rad(Math.max(-85, Math.min(85, lat))) / 2)) / (2 * Math.PI);
  return [((lon + 180) / 360) * s, y * s];
}

/**
 * @param {{id: string, lon: number, lat: number}[]} events
 * @returns {{id: string, events: object[], lon: number, lat: number}[]}  סכום הגדלים = events.length
 */
export function clusterEvents(events, zoom, minPx = CLUSTER_CELL_PX, maxZoom = CLUSTER_MAX_ZOOM) {
  if (zoom >= maxZoom) return events.map((e) => ({ id: e.id, events: [e], lon: e.lon, lat: e.lat }));
  const pts = [...events].sort((a, b) => (a.id < b.id ? -1 : 1)).map((e) => ({ e, p: worldPx(zoom, e.lon, e.lat) }));
  const used = new Set();
  const out = [];
  for (const seed of pts) {
    if (used.has(seed.e.id)) continue;
    used.add(seed.e.id);
    const members = [seed.e];
    for (const o of pts) {
      if (used.has(o.e.id)) continue;
      if (Math.hypot(o.p[0] - seed.p[0], o.p[1] - seed.p[1]) <= minPx) { used.add(o.e.id); members.push(o.e); }
    }
    out.push({
      id: members.length === 1 ? seed.e.id : `cl-${seed.e.id}-${members.length}`,
      events: members,
      lon: members.reduce((s, e) => s + e.lon, 0) / members.length,
      lat: members.reduce((s, e) => s + e.lat, 0) / members.length,
    });
  }
  return out;
}

/** הזום הנמוך ביותר (מ-from ומעלה) שבו האירוע לא בתוך קבוצה */
export function zoomToSeparate(event, events, from, minPx = CLUSTER_CELL_PX, maxZoom = CLUSTER_MAX_ZOOM) {
  for (let z = Math.ceil(from); z < maxZoom; z++) {
    const c = clusterEvents(events, z, minPx, maxZoom).find((x) => x.events.some((e) => e.id === event.id));
    if (c && c.events.length === 1) return z;
  }
  return maxZoom;
}
