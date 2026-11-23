// ניתוח אזור: פונקציה טהורה אחת. באב-טיפוס מסננת את נתוני הדמה; בשרת תהיה נקודת קצה אחת (למשל POST /area/activities)
// עם שאילתה גיאוגרפית על טבלת האירועים. אותו קלט, אותה תוצאה (BR-09): אין תלות בשעון או באקראי.
import { polygonArea } from '../map/geodesy.js';
import { ACTIVITIES } from './activities.js';
import { bounds, pointInPolygon } from './geo.js';
import { MAX_AREA_KM2, MAX_POINTS } from './thresholds.js';

/**
 * @typedef {Object} AreaEvent
 * @property {string} id
 * @property {string} activity
 * @property {{id: string, name: string, imo: string, mmsi: string, flag: string|null}} vessel
 * @property {{id: string, name: string, imo: string, mmsi: string, flag: string|null}} [vessel2]  מפגש STS: אירוע אחד עם שני כלים (BR-03)
 * @property {number} start  ms
 * @property {number|null} [end]  ms; חסר = ממשיך
 * @property {number} lat  נקודת העיגון
 * @property {number} lon
 * @property {string} source
 * @property {number} asOf  ms, זמן עדכון המקור
 * @property {Object} extra  שדות ייחודיים לפעילות
 */

/**
 * כיסוי מקור: האם המקור מכסה את הפוליגון והטווח. cov = { source, bbox?: [w,s,e,n], since?: ms } או undefined (כיסוי מלא).
 * פוליגון שאחד מקודקודיו מחוץ ל-bbox, או טווח שמתחיל לפני since, אינו מכוסה: הספירה "לא נבדק", לא 0 (BR-05).
 */
export function isCovered(cov, polygon, range) {
  if (!cov) return true;
  if (cov.since != null && range.from < cov.since) return false;
  if (cov.bbox) {
    const [w, s, e, n] = cov.bbox;
    const [pw, ps, pe, pn] = bounds(polygon);
    return pw >= w && pe <= e && ps >= s && pn <= n;
  }
  return true;
}

/** שטח הפוליגון בקמ"ר */
export const areaKm2 = (polygon) => polygonArea(polygon) / 1e6;

/** מהחדש לישן, ובשוויון לפי מזהה (יציב) */
const byNewest = (a, b) => b.start - a.start || (a.id < b.id ? -1 : 1);

/**
 * מנתח אזור וטווח. polygon: מערך [lon, lat] פתוח (לפחות 3). range: { from, to } ב-ms.
 * אירוע נכלל אם נקודת העיגון בתוך הפוליגון או על הגבול (BR-01) וזמן ההתחלה בתוך הטווח (BR-02).
 * @param {number[][]} polygon
 * @param {{from: number, to: number}} range
 * @param {{events: AreaEvent[], coverage?: Record<string, {source: string, bbox?: number[], since?: number}>, maxAreaKm2?: number}} data
 * @returns {{tooLarge: boolean, areaKm2: number, maxAreaKm2: number, counts: Record<string, number|'not-covered'>, events: Record<string, AreaEvent[]>, coverage: Record<string, {source: string|null, covered: boolean}>}}
 */
export function analyzeArea(polygon, range, { events, coverage = {}, maxAreaKm2 = MAX_AREA_KM2 }) {
  const km2 = areaKm2(polygon);
  const out = { tooLarge: km2 > maxAreaKm2, areaKm2: km2, maxAreaKm2, counts: {}, events: {}, coverage: {} };
  if (out.tooLarge) return out;
  for (const a of ACTIVITIES) {
    const cov = coverage[a.id];
    const covered = isCovered(cov, polygon, range);
    out.coverage[a.id] = { source: cov?.source ?? null, covered };
    if (!covered) {
      out.counts[a.id] = 'not-covered';
      out.events[a.id] = [];
      continue;
    }
    const list = events
      .filter((e) => e.activity === a.id && e.start >= range.from && e.start <= range.to && pointInPolygon([e.lon, e.lat], polygon))
      .sort(byNewest);
    out.events[a.id] = list;
    out.counts[a.id] = list.length;
  }
  return out;
}

/**
 * סיכום כללי של תוצאת ניתוח: סך הפעילויות (אירועים בכל הפעילויות שנבדקו) וכלי שיט ייחודיים (כלי שמופיע בכמה אירועים נספר פעם אחת,
 * ובמפגש STS נספרים שני הכלים). פעילות "לא נבדק" לא נכללת, ו-skipped מונה אותן.
 */
export function summarizeResult(result) {
  const ids = new Set();
  let activities = 0;
  let skipped = 0;
  for (const a of ACTIVITIES) {
    if (result.counts[a.id] === 'not-covered') { skipped++; continue; }
    for (const e of result.events[a.id] ?? []) {
      activities++;
      ids.add(e.vessel.id);
      if (e.vessel2) ids.add(e.vessel2.id);
    }
  }
  return { activities, vessels: ids.size, skipped };
}

/** תקרת נקודות (BR-08): החדשים ביותר עד התקרה. list ממוין מהחדש לישן */
export function limitEvents(list, max = MAX_POINTS) {
  return { shown: list.slice(0, max), total: list.length, limited: list.length > max };
}

/** הפעילות שנבחרת כברירת מחדל: הראשונה בסדר שיש בה לפחות אירוע אחד, ואם אין, הראשונה */
export function defaultActivity(counts) {
  return ACTIVITIES.find((a) => typeof counts[a.id] === 'number' && counts[a.id] > 0)?.id ?? ACTIVITIES[0].id;
}

/** טווח ברירת מחדל: N ימים שהסתיימו ברגע נתון */
export const defaultRange = (now, days) => ({ from: now - days * 86400e3, to: now });

/** כלי האירוע לפי סדר אלפביתי של השם (דטרמיניסטי): מפגש STS הוא שני כלים שווים, ואין "ראשי" ו"שני" לפי סדר הנתונים */
export function orderVessels(e) {
  const list = e.vessel2 ? [e.vessel, e.vessel2] : [e.vessel];
  return list.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
}

/** משך האירוע במילישניות; בלי סיום = עד "עכשיו" */
export const eventDuration = (e, now) => (e.end != null ? e.end : now) - e.start;
