import { destination, pathLength } from './geodesy.js';
import { NM } from './units.js';

export const ROUTE_WINDOWS = [6, 12, 24, 48];
/** מרווח סימוני זמן (שעות) לפי חלון הזמן, כדי שלא יהיו יותר מ-6 סימונים */
export const markStep = (hours) => (hours <= 6 ? 1 : hours <= 12 ? 2 : hours <= 24 ? 4 : 8);

/**
 * מסלול דמה: אין נתוני מסלול בנתוני הדמה, ולכן הולכים אחורה מהמיקום האחרון לפי מהירות וכיוון,
 * עם סטייה צידית עדינה ודטרמיניסטית לפי מזהה הכלי. מחזיר נקודות כל 15 דקות: { h: שעות אחורה, ll }.
 */
export function demoTrack(v, hours) {
  const speed = Math.max(v.speed ?? 0, 0);
  const seed = [...v.id].reduce((s, c) => s + c.charCodeAt(0), 0);
  const step = 0.25;
  const pts = [{ h: 0, ll: [v.lon, v.lat] }];
  let cur = pts[0].ll;
  for (let i = 1; i <= hours / step; i++) {
    const h = i * step;
    cur = destination(cur, ((v.course ?? 0) + 180 + Math.sin(h / 5 + seed) * 6 + 360) % 360, speed * step * NM);
    pts.push({ h, ll: cur });
  }
  return pts;
}

export const trackStats = (track, hours) => {
  const d = pathLength(track.map((p) => p.ll));
  return { distance: d, avgKnots: d / NM / hours };
};
