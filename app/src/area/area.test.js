import test from 'node:test';
import assert from 'node:assert/strict';
import { ACTIVITIES } from './activities.js';
import { clusterEvents, zoomToSeparate } from './cluster.js';
import { analyzeArea, defaultActivity, defaultRange, isCovered, limitEvents, orderVessels } from './query.js';
import { DEFAULT_RANGE_DAYS, MAX_AREA_KM2, MAX_RANGE_DAYS } from './thresholds.js';
import { buildAreaCsv } from './csv.js';
import { AREA_EVENTS, COVERAGE, DEMO_AREAS, NOW as DEMO_NOW } from '../data/areaEvents.js';

const D = 86400e3;
const NOW = Date.UTC(2026, 10, 23, 12);
const RANGE = { from: NOW - 30 * D, to: NOW };
// ~1.1° x 1.1° ≈ 13,000 קמ"ר
const POLY = [[34, 32], [35, 32], [35, 33], [34, 33]];
const V = (id) => ({ id, name: id.toUpperCase(), imo: '9000001', mmsi: '000123456', flag: 'פנמה' });
let n = 0;
const ev = (activity, lon, lat, start, extra = {}) => ({ id: `e${++n}`, activity, vessel: V('v1'), start, end: null, lat, lon, source: 'מקור א', asOf: NOW, extra, ...(activity === 'sts' ? { vessel2: V('v2') } : {}) });
const run = (events, opts = {}, poly = POLY, range = RANGE) => analyzeArea(poly, range, { events, ...opts });

test('BR-01: בפנים, על הגבול ובחוץ', () => {
  const r = run([ev('anchorage', 34.5, 32.5, NOW - D), ev('anchorage', 35, 32.5, NOW - D), ev('anchorage', 34, 32, NOW - D), ev('anchorage', 35.01, 32.5, NOW - D), ev('anchorage', 34.5, 31.9, NOW - D)]);
  assert.equal(r.counts.anchorage, 3);
});

test('BR-01: הפסקת AIS שהתחילה בחוץ וחזרה בפנים לא נכללת; שהתחילה בפנים וחזרה בחוץ נכללת', () => {
  const outIn = ev('ais-gap', 33.5, 32.5, NOW - D, { resume: { lat: 32.5, lon: 34.5 } });
  const inOut = ev('ais-gap', 34.5, 32.5, NOW - D, { resume: { lat: 32.5, lon: 33.5 } });
  const r = run([outIn, inOut]);
  assert.deepEqual(r.events['ais-gap'].map((e) => e.id), [inOut.id]);
  assert.equal(r.counts['ais-gap'], 1);
});

test('BR-02: אירוע שהתחיל לפני הטווח ונמשך לתוכו לא נכלל; התחלה בגבול הטווח נכללת', () => {
  const before = ev('anchorage', 34.5, 32.5, RANGE.from - 1000);
  const onEdge = ev('anchorage', 34.5, 32.5, RANGE.from);
  const lastMoment = ev('anchorage', 34.5, 32.5, RANGE.to);
  const r = run([before, onEdge, lastMoment]);
  assert.deepEqual(r.events.anchorage.map((e) => e.id).sort(), [onEdge.id, lastMoment.id].sort());
});

test('BR-03: מפגש STS הוא אירוע אחד עם שני כלים ונספר פעם אחת', () => {
  const s = ev('sts', 34.5, 32.5, NOW - D);
  const r = run([s]);
  assert.equal(r.counts.sts, 1);
  assert.equal(r.events.sts.length, 1);
  assert.equal(r.events.sts[0].vessel2.id, 'v2');
});

test('BR-05: מקור שלא מכסה את השטח או הטווח נותן "לא נבדק", לא 0', () => {
  const coverage = { loitering: { source: 'מקור ג', bbox: [34, 32, 35, 33], since: NOW - 60 * D } };
  assert.equal(run([], { coverage }).counts.loitering, 0); // מכוסה ואין אירועים: 0
  const wide = [[33, 32], [35, 32], [35, 33], [33, 33]];
  assert.equal(run([ev('loitering', 34.5, 32.5, NOW - D)], { coverage }, wide).counts.loitering, 'not-covered');
  assert.equal(run([], { coverage }, POLY, { from: NOW - 90 * D, to: NOW }).counts.loitering, 'not-covered');
  assert.equal(run([], { coverage }).coverage.loitering.covered, true);
  assert.equal(isCovered(undefined, POLY, RANGE), true);
  // פעילות ללא הגדרת כיסוי: מכוסה תמיד
  assert.equal(run([], { coverage }).counts.sts, 0);
});

test('BR-05: אירועים בפעילות שאינה מכוסה לא מוחזרים', () => {
  const coverage = { loitering: { source: 'מקור ג', bbox: [0, 0, 1, 1] } };
  const r = run([ev('loitering', 34.5, 32.5, NOW - D)], { coverage });
  assert.deepEqual(r.events.loitering, []);
});

test('BR-08: תקרת נקודות, החדשים ביותר, והמספר המלא נשמר', () => {
  const list = Array.from({ length: 30 }, (_, i) => ev('anchorage', 34.5, 32.5, NOW - (i + 1) * 3600e3));
  const r = run(list);
  assert.equal(r.counts.anchorage, 30);
  const lim = limitEvents(r.events.anchorage, 20);
  assert.equal(lim.shown.length, 20);
  assert.equal(lim.total, 30);
  assert.equal(lim.limited, true);
  assert.equal(lim.shown[0].start, NOW - 3600e3); // החדש ביותר ראשון
  assert.equal(lim.shown.at(-1).start, NOW - 20 * 3600e3);
  assert.equal(limitEvents(r.events.anchorage, 500).limited, false);
});

test('BR-08: מעל תקרת השטח הניתוח לא רץ', () => {
  const huge = [[10, 20], [40, 20], [40, 45], [10, 45]];
  const r = run([ev('anchorage', 20, 30, NOW - D)], {}, huge);
  assert.equal(r.tooLarge, true);
  assert.ok(r.areaKm2 > MAX_AREA_KM2);
  assert.deepEqual(r.counts, {});
  assert.equal(run([], { maxAreaKm2: 100 }).tooLarge, true); // התקרה ניתנת להזרקה
});

test('BR-09: אותו קלט, אותה תוצאה', () => {
  const events = [ev('anchorage', 34.5, 32.5, NOW - 2 * D), ev('sts', 34.2, 32.2, NOW - 3 * D), ev('anchorage', 34.6, 32.6, NOW - 2 * D)];
  assert.deepEqual(run(events), run([...events].reverse()));
  assert.deepEqual(run(events), run(events));
});

test('סדר הפעילויות קבוע, ומיון האירועים מהחדש לישן', () => {
  assert.deepEqual(ACTIVITIES.map((a) => a.id), ['sts', 'anchorage', 'port-visit', 'ais-gap', 'loitering', 'identity']);
  const a = ev('anchorage', 34.5, 32.5, NOW - 3 * D);
  const b = ev('anchorage', 34.5, 32.5, NOW - D);
  assert.deepEqual(run([a, b]).events.anchorage.map((e) => e.id), [b.id, a.id]);
});

test('ברירת מחדל: הפעילות הראשונה בסדר שיש בה אירוע; בלי אירועים, הראשונה', () => {
  assert.equal(defaultActivity({ sts: 0, anchorage: 0, 'port-visit': 4 }), 'port-visit');
  assert.equal(defaultActivity({ sts: 'not-covered', anchorage: 2 }), 'anchorage');
  assert.equal(defaultActivity({ sts: 0 }), 'sts');
});

test('קיבוץ: סכום הקבוצות שווה למספר האירועים, ופירוק בהתקרבות', () => {
  const events = Array.from({ length: 12 }, (_, i) => ({ id: `p${i}`, lon: 34.5 + i * 0.0005, lat: 32.5 }));
  const far = clusterEvents(events, 8);
  assert.equal(far.reduce((s, c) => s + c.events.length, 0), 12);
  assert.ok(far.length < 12);
  const near = clusterEvents(events, 13);
  assert.equal(near.length, 12);
  const z = zoomToSeparate(events[0], events, 8);
  assert.ok(z > 8 && z <= 13);
  assert.equal(clusterEvents(events, z).find((c) => c.events.some((e) => e.id === 'p0')).events.length, 1);
});

test('CSV: BOM, שתי שורות כותרת, MMSI עם אפסים מובילים, כל האירועים (גם מעל התקרה)', () => {
  const list = Array.from({ length: 30 }, (_, i) => ev('anchorage', 34.5, 32.5, NOW - (i + 1) * 3600e3));
  const csv = buildAreaCsv({ polygon: POLY, range: RANGE, activity: 'anchorage', events: list, now: NOW });
  const lines = csv.split('\r\n');
  assert.equal(csv.charCodeAt(0), 0xfeff);
  assert.match(lines[0], /קודקודי הפוליגון/);
  assert.match(lines[1], /טווח/);
  assert.equal(lines[2].split(',').length, 13);
  assert.equal(lines.length, 3 + 30);
  assert.match(lines[3], /="000123456"/); // אפסים מובילים נשמרים
  assert.match(lines[3], /ממשיך/); // אירוע בלי סיום
});

test('נתוני דמה: אזור צפוף, דליל ו"לא נבדק", אירוע שהתחיל לפני הטווח, והפסקת AIS שחוצה את הגבול', () => {
  const run90 = (poly, days) => analyzeArea(poly, { from: DEMO_NOW - days * D, to: DEMO_NOW }, { events: AREA_EVENTS, coverage: COVERAGE });
  const dense = run90(DEMO_AREAS.dense.polygon, 30);
  assert.equal(dense.counts.sts, 3);
  assert.ok(dense.counts.anchorage > 20); // מספיק להדגמת ?area=cap
  assert.equal(dense.counts['ais-gap'], 9); // 8 + אחת שחוצה בפנים->בחוץ, בלי זו שהתחילה בחוץ
  assert.equal(run90(DEMO_AREAS.dense.polygon, 90).counts.anchorage, dense.counts.anchorage + 1); // העגינה שהתחילה לפני 40 יום
  const sparse = run90(DEMO_AREAS.sparse.polygon, 30);
  assert.ok(Object.values(sparse.counts).filter((x) => typeof x === 'number').reduce((s, x) => s + x, 0) <= 3);
  assert.equal(run90(DEMO_AREAS.uncovered.polygon, 30).counts.loitering, 'not-covered');
  assert.equal(run90(DEMO_AREAS.dense.polygon, 90).counts.loitering, 'not-covered'); // הטווח חורג מכיסוי המקור
  assert.equal(run90(DEMO_AREAS.huge.polygon, 30).tooLarge, true);
  assert.ok(AREA_EVENTS.some((e) => e.end == null && e.activity === 'anchorage'));
  assert.ok(AREA_EVENTS.some((e) => e.vessel.flag === null));
});

test('טווח ברירת המחדל הוא 30 יום שהסתיימו ברגע הסגירה (לא 90)', () => {
  assert.equal(DEFAULT_RANGE_DAYS, 30);
  assert.equal(MAX_RANGE_DAYS, 90);
  const r = defaultRange(NOW, DEFAULT_RANGE_DAYS);
  assert.equal(r.to, NOW);
  assert.equal(NOW - r.from, 30 * D);
});

test('מפגש STS: שני הכלים לפי סדר אלפביתי, בלי תלות בסדר הנתונים', () => {
  const a = ev('sts', 34.5, 32.5, NOW - D);
  const swapped = { ...a, vessel: a.vessel2, vessel2: a.vessel };
  assert.deepEqual(orderVessels(a).map((v) => v.name), ['V1', 'V2']);
  assert.deepEqual(orderVessels(swapped).map((v) => v.name), ['V1', 'V2']);
  assert.equal(orderVessels(ev('anchorage', 34.5, 32.5, NOW - D)).length, 1);
  // ייצוא: עמודות "שם" ו"כלי שני" לפי אותו סדר
  const row = buildAreaCsv({ polygon: POLY, range: RANGE, activity: 'sts', events: [swapped], now: NOW }).split('\r\n')[3].split(',');
  assert.equal(row[1], '"V1"');
  assert.equal(row[5], '"V2"');
});