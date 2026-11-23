// נתוני דמה לניתוח אזור (ראו app/src/area/). כל התאריכים יחסיים לרגע טעינת המודול, כדי שהדמה לא תתיישן.
// בנוי לבדיקת מצבים, לא לריאליזם: אזור צפוף (מול חיפה), אזור דליל (מערבית לפאפוס), ואזור שבו מקור אחד לא מכסה (מפרץ סואץ).
// הכלים נלקחים מ-VESSELS ו-EXTRA_VESSELS הקיימים; הפוליגונים המומלצים לשרטוט מופיעים ב-DEMO_AREAS.
import { EXTRA_VESSELS, VESSELS } from './vessels.js';

export const NOW = Date.now();
const H = 3600e3;
const D = 24 * H;

/** מקורות הדמה ושדה הכיסוי שלהם. שיטוט (מקור ג) מכסה רק את מזרח הים התיכון ורק 60 הימים האחרונים */
export const SOURCE_OF = { sts: 'מקור א', anchorage: 'מקור א', 'port-visit': 'מקור ב', 'ais-gap': 'מקור א', loitering: 'מקור ג', identity: 'מקור ב' };
export const COVERAGE = {
  loitering: { source: 'מקור ג', bbox: [28, 31, 37, 38], since: NOW - 60 * D },
};

/** אזורים להדגמה: קודקודים [lon, lat] של פוליגון מומלץ לשרטוט (ראו הדוח). */
export const DEMO_AREAS = {
  dense: { label: 'צפוף, מול חיפה', polygon: [[34.4, 32.55], [35.05, 32.55], [35.05, 33.1], [34.4, 33.1]] },
  sparse: { label: 'דליל, מערבית לפאפוס (קפריסין)', polygon: [[31.4, 34.4], [32.2, 34.4], [32.2, 35.0], [31.4, 35.0]] },
  uncovered: { label: 'שיטוט "לא נבדק", מפרץ סואץ', polygon: [[33.7, 27.4], [34.7, 27.4], [34.7, 28.0], [33.7, 28.0]] },
  huge: { label: 'מעל תקרת השטח, כל מזרח הים התיכון', polygon: [[22, 30], [37, 30], [37, 38], [22, 38]] },
};

// מחולל פסאודו-אקראי דטרמיניסטי
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const POOL = [...VESSELS, ...EXTRA_VESSELS];
const ref = (v) => ({ id: v.id, name: v.name, imo: v.imo, mmsi: v.mmsi, flag: v.flag ?? null });
const pick = (i) => ref(POOL[((i % POOL.length) + POOL.length) % POOL.length]);

const events = [];
let seq = 0;
/** daysAgo: התחלה; durH: משך בשעות (null = ממשיך) */
function add(activity, i, daysAgo, durH, lat, lon, { extra = {}, vessel, vessel2 } = {}) {
  const start = NOW - daysAgo * D;
  const e = {
    id: `ae-${activity}-${++seq}`,
    activity,
    vessel: vessel ?? pick(i),
    start,
    end: activity === 'identity' ? start : durH == null ? null : start + durH * H, // שינוי זהות הוא רגעי
    lat,
    lon,
    source: SOURCE_OF[activity],
    asOf: NOW - ((i % 5) + 1) * H,
    extra,
  };
  if (vessel2 !== undefined || activity === 'sts') e.vessel2 = vessel2 ?? pick(i + 7);
  events.push(e);
}

const R = rng(20261123);
const between = (lo, hi) => lo + R() * (hi - lo);
const r4 = (n) => Math.round(n * 1e4) / 1e4;

// ===== אזור צפוף: מול חיפה (34.40-35.05E, 32.55-33.10N) =====
// מפגשי STS: שלושה בתוך האזור (שניים קרובים מאוד, כדי לראות קיבוץ) ואחד רחוק
add('sts', 1, 2.5, 5, 32.95, 34.65);
add('sts', 2, 4.1, 6, 32.96, 34.67);
add('sts', 3, 11, 8, 32.7, 34.55);
add('sts', 4, 6, 5, 31.6, 33.4);
// עגינה והמתנה: 30 אירועים במפרץ, ארוכים וקצרים
for (let k = 0; k < 30; k++) add('anchorage', 10 + k, between(0.3, 27), between(4, 70), r4(between(32.86, 33.02)), r4(between(34.72, 34.98)));
add('anchorage', 41, 3, null, 32.9, 34.85); // ממשיך, בלי סיום
add('anchorage', 42, 40, null, 32.93, 34.8); // התחיל לפני הטווח (30 יום) ונמשך לתוכו: לא נכלל בברירת המחדל (BR-02), נכלל בטווח 90 יום
// ביקורי נמל (חיפה): מיקום הכלי בהגעה
for (let k = 0; k < 18; k++) {
  const opts = { extra: { port: { name: 'Haifa', country: k === 2 ? null : 'ישראל' } } }; // מדינה חסרה בביקור אחד
  if (k === 4) opts.vessel = { ...pick(60 + k), flag: null }; // דגל חסר באחד
  add('port-visit', 60 + k, between(0.5, 29), between(6, 48), r4(between(32.79, 32.86)), r4(between(34.9, 35.0)), opts);
}
// הפסקות AIS: המיקום האחרון לפני ההפסקה הוא נקודת העיגון; extra.resume = מיקום החזרה לשידור
for (let k = 0; k < 8; k++) {
  const lat = r4(between(32.6, 33.05));
  const lon = r4(between(34.45, 34.9));
  add('ais-gap', 90 + k, between(1, 27), between(3, 20), lat, lon, { extra: { resume: { lat: r4(lat + between(-0.25, 0.25)), lon: r4(lon + between(-0.3, 0.3)) } } });
}
add('ais-gap', 98, 5, 9, 32.9, 34.45, { extra: { resume: { lat: 32.9, lon: 34.25 } } }); // התחילה בפנים וחזרה בחוץ: נכללת
add('ais-gap', 99, 6, 9, 32.9, 34.3, { extra: { resume: { lat: 32.9, lon: 34.55 } } }); // התחילה בחוץ וחזרה בפנים: לא נכללת (BR-01)
// שיטוט
for (let k = 0; k < 6; k++) add('loitering', 110 + k, between(1, 26), between(5, 30), r4(between(32.6, 33.0)), r4(between(34.5, 34.8)), { extra: { radiusNm: Math.round(between(2, 9)) } });
// שינוי זהות
add('identity', 120, 12, null, 32.8, 34.9, { extra: { change: { field: 'שם הכלי', before: 'SEA HAWK', after: 'SEA FALCON' } } });
add('identity', 121, 20, null, 32.72, 34.6, { extra: { change: { field: 'דגל', before: 'פנמה', after: 'ליבריה' } } });
add('identity', 122, 8, null, 32.97, 34.78, { extra: { change: { field: 'מנהל טכני', before: 'Hawk Ship Mgmt', after: null } } }); // ערך "אחרי" חסר

// ===== אזור דליל: מערבית לפאפוס (31.4-32.2E, 34.4-35.0N) =====
add('sts', 130, 4, 7, 34.7, 31.8);
add('ais-gap', 131, 9, 12, 34.55, 31.6, { extra: { resume: { lat: 34.75, lon: 31.9 } } });
add('identity', 132, 15, null, 34.9, 31.9, { extra: { change: { field: 'שם הכלי', before: 'BLUE STAR', after: 'BLUE WAVE' } } });

// ===== אזור "לא נבדק": מפרץ סואץ (33.7-34.7E, 27.4-28.0N). שיטוט (מקור ג) אינו מכסה אותו =====
for (let k = 0; k < 5; k++) add('anchorage', 140 + k, between(1, 25), between(6, 40), r4(between(27.45, 27.95)), r4(between(33.75, 34.65)));
add('port-visit', 150, 3, 20, 27.9, 34.1, { extra: { port: { name: 'Suez', country: 'מצרים' } } });
add('port-visit', 151, 14, 30, 27.85, 34.2, { extra: { port: { name: 'Suez', country: 'מצרים' } } });
add('sts', 152, 7, 6, 27.6, 34.3);
add('ais-gap', 153, 2, 11, 27.7, 34.0, { extra: { resume: { lat: 27.9, lon: 34.4 } } });
add('ais-gap', 154, 10, 5, 27.5, 34.5, { extra: { resume: { lat: 27.55, lon: 34.6 } } });
add('identity', 155, 18, null, 27.8, 34.2, { extra: { change: { field: 'דגל', before: 'מלטה', after: 'קפריסין' } } });

// ===== רקע: אירועים פזורים במזרח הים התיכון, מחוץ לשלושת אזורי ההדגמה, כדי שאזור גדול יראה מספרים =====
const inBox = (lat, lon, [w, s, e, n]) => lon >= w && lon <= e && lat >= s && lat <= n;
const boxes = [[34.4, 32.55, 35.05, 33.1], [31.4, 34.4, 32.2, 35.0], [33.7, 27.4, 34.7, 28.0]];
const FILL = ['sts', 'anchorage', 'port-visit', 'ais-gap', 'loitering', 'identity'];
for (let k = 0; k < 60; k++) {
  const lat = r4(between(31.2, 37.5));
  const lon = r4(between(23, 36.5));
  if (boxes.some((b) => inBox(lat, lon, b))) continue;
  const act = FILL[k % FILL.length];
  const extra = act === 'port-visit' ? { port: { name: 'Limassol', country: 'קפריסין' } }
    : act === 'ais-gap' ? { resume: { lat: r4(lat + 0.1), lon: r4(lon + 0.12) } }
      : act === 'identity' ? { change: { field: 'שם הכלי', before: 'ORIENT PEARL', after: 'ORIENT GLORY' } }
        : act === 'loitering' ? { radiusNm: 4 } : {};
  add(act, 200 + k, between(0.5, 55), act === 'identity' ? null : between(3, 40), lat, lon, { extra });
}

/** כל אירועי הדמה (לא ממוינים) */
export const AREA_EVENTS = events;
