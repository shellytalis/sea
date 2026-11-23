// "שרת" הדמה של ניתוח אזור: רצה אחת מחזירה ספירות ואירועים לכל שש הפעילויות. השהיה מדומה כדי שמצב הטעינה ייראה.
// באב-טיפוס מסנן את AREA_EVENTS; בשרת: POST /area/activities עם { polygon, from, to }.
import { AREA_EVENTS, COVERAGE } from '../data/areaEvents.js';
import { analyzeArea } from './query.js';
import { DEMO_MAX_POINTS, MAX_POINTS } from './thresholds.js';

/** דגל הדגמה מהכתובת: ?area=slow | error | cap */
export const areaFlag = () => (typeof location === 'undefined' ? null : new URLSearchParams(location.search).get('area'));

/** תקרת הנקודות בפועל: ?area=cap מוריד אותה ל-20 כדי להדגים את המצב */
export const pointCap = (flag = areaFlag()) => (flag === 'cap' ? DEMO_MAX_POINTS : MAX_POINTS);

const wait = (ms, signal) => new Promise((resolve, reject) => {
  const t = setTimeout(resolve, ms);
  signal?.addEventListener('abort', () => { clearTimeout(t); reject(new DOMException('בוטל', 'AbortError')); }, { once: true });
});

/**
 * @param {number[][]} polygon
 * @param {{from: number, to: number}} range
 * @param {{signal?: AbortSignal, flag?: string|null}} [opts]
 */
export async function fetchAreaActivities(polygon, range, { signal, flag = areaFlag() } = {}) {
  await wait(flag === 'slow' ? 3000 : 400 + Math.round(Math.random() * 500), signal);
  if (flag === 'error') throw new Error('area-failed');
  return analyzeArea(polygon, range, { events: AREA_EVENTS, coverage: COVERAGE });
}
