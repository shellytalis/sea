import { destination, pathLength } from './geodesy.js';
import { NM } from './units.js';

export { PRESETS as ROUTE_PRESETS } from './range.js';

/** צעד הדגימה של מסלול הדמה (שעות): 15 דקות עד 48 שעות, שעה מעבר לכך */
export const trackStep = (hours) => (hours <= 48 ? 0.25 : 1);

/**
 * סימוני זמן על הקו, ביחס לסוף הטווח: עד 24 שעות בשעות (עד 6 סימונים), מעל 24 שעות בימים
 * (יום אחד עד 7 ימים, יומיים עד 14, 5 ימים מעל; עד 7 סימונים). מחזיר { step: שעות, unit: 'h' | 'd' }.
 */
export function markStep(hours) {
  if (hours <= 6) return { step: 1, unit: 'h' };
  if (hours <= 12) return { step: 2, unit: 'h' };
  if (hours <= 24) return { step: 4, unit: 'h' };
  if (hours <= 168) return { step: 24, unit: 'd' };
  if (hours <= 336) return { step: 48, unit: 'd' };
  return { step: 120, unit: 'd' };
}

/** תווית סימון: "−4 ש׳" או "−2 י׳" */
export const markLabel = (h, unit) => `−${unit === 'd' ? h / 24 : h} ${unit === 'd' ? 'י׳' : 'ש׳'}`;

/**
 * מסלול דמה: אין נתוני מסלול בנתוני הדמה, ולכן הולכים אחורה מהמיקום האחרון לפי מהירות וכיוון,
 * עם סטייה צידית עדינה ודטרמיניסטית לפי מזהה הכלי. מחזיר נקודות: { h: שעות אחורה, ll }.
 */
export function demoTrack(v, hours) {
  const speed = Math.max(v.speed ?? 0, 0);
  const seed = [...v.id].reduce((s, c) => s + c.charCodeAt(0), 0);
  const step = trackStep(hours);
  const pts = [{ h: 0, ll: [v.lon, v.lat] }];
  let cur = pts[0].ll;
  for (let i = 1; i <= Math.round(hours / step); i++) {
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
