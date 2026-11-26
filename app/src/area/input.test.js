import test from 'node:test';
import assert from 'node:assert/strict';
import { formatCoordinate, parseCoordinate, parseCoordinateList } from './coords.js';
import { terrainHint } from './hints.js';
import { analysisInput, canShow, filledCount, initialTerrainState, parseRow, pointsOf, terrainReducer } from './terrainRows.js';

const ok = (text, axis, value) => {
  const r = parseCoordinate(text, axis);
  assert.equal(r.ok, true, `${text}: ${JSON.stringify(r)}`);
  assert.ok(Math.abs(r.value - value) < 1e-9, `${text} => ${r.value}, expected ${value}`);
};
const bad = (text, axis, re) => {
  const r = parseCoordinate(text, axis);
  assert.equal(r.ok, false, `${text} should fail`);
  if (re) assert.match(r.error, re);
};

test('parseCoordinate: מעלות עשרוניות, עם סימן ועם אות כיוון', () => {
  ok('35.512', 'lon', 35.512);
  ok('35.512 N', 'lat', 35.512);
  ok('-23.874', 'lat', -23.874);
  ok('23.874 W', 'lon', -23.874);
  ok('23.874S', 'lat', -23.874);
  ok('+12.5', 'lat', 12.5);
  ok('−23.874', 'lat', -23.874); // מינוס יוניקוד
  ok('N 35.5', 'lat', 35.5);
});

test('parseCoordinate: מעלות ודקות ומעלות דקות ושניות', () => {
  ok("34°42.6' N", 'lat', 34 + 42.6 / 60);
  ok('34 42.6 N', 'lat', 34 + 42.6 / 60);
  ok('34°42\'36" N', 'lat', 34 + 42 / 60 + 36 / 3600);
  ok('34 42 36 S', 'lat', -(34 + 42 / 60 + 36 / 3600));
  ok("-34°42.6'", 'lon', -(34 + 42.6 / 60));
  bad("34°61' N", 'lat', /פורמט/); // דקות מעל 59
  bad("34.5°42' N", 'lat', /פורמט/); // שבר רק בחלק האחרון
});

test('parseCoordinate: אות כיוון גוברת על סימן; אות מציר אחר נדחית', () => {
  ok('-23.874 N', 'lat', 23.874);
  ok('-23.874 E', 'lon', 23.874);
  ok('23.874 W', 'lon', -23.874);
  bad('23.874 E', 'lat', /פורמט/);
  bad('23.874 N', 'lon', /פורמט/);
});

test('parseCoordinate: פסיק עשרוני אירופי', () => {
  ok('35,512', 'lon', 35.512);
  ok('23,874 W', 'lon', -23.874);
});

test('parseCoordinate: ערכי גבול ושגיאות טווח', () => {
  ok('90', 'lat', 90);
  ok('-90', 'lat', -90);
  ok('180', 'lon', 180);
  ok('-180', 'lon', -180);
  ok('90 S', 'lat', -90);
  bad('90.001', 'lat', /בין 90- ל-90/);
  bad('-91', 'lat', /בין 90- ל-90/);
  bad('180.5', 'lon', /בין 180- ל-180/);
  bad('95 N', 'lat', /בין 90- ל-90/);
});

test('parseCoordinate: פורמטים לא מזוהים וריק', () => {
  for (const t of ['abc', '12.3.4', '1 2 3 4', '35.5 N S', '°', '--5', '35 ,5,5']) bad(t, 'lat', /לא זוהה פורמט/);
  const e = parseCoordinate('   ', 'lat');
  assert.equal(e.ok, false);
  assert.equal(e.empty, true);
});

test('formatCoordinate: 3 ספרות ואות כיוון; מעלות ודקות כהחלפת תצורה', () => {
  assert.equal(formatCoordinate(35.5123, 'lon'), '35.512° E');
  assert.equal(formatCoordinate(-23.874, 'lon'), '23.874° W');
  assert.equal(formatCoordinate(-12.5, 'lat'), '12.500° S');
  assert.equal(formatCoordinate(34.71, 'lat', 'degmin'), "34°42.600' N");
  // סבב: מה שמוצג מתפענח לאותו ערך
  assert.ok(Math.abs(parseCoordinate(formatCoordinate(35.512, 'lon'), 'lon').value - 35.512) < 1e-9);
});

test('parseCoordinateList: מפרידים (פסיק, נקודה-פסיק, רווח, טאב) ושורות שגויות עם מספר שורה', () => {
  const text = ['35.512, 23.874', '34.1; 33.2', '10.5\t20.5', "34°42.6' N 35°12.3' E", '35,512, 23,874', '', 'לא קואורדינטה', '91, 10', '12.5 30.5'].join('\n');
  const r = parseCoordinateList(text);
  assert.equal(r.points.length, 6);
  assert.deepEqual(r.errors.map((e) => e.line), [7, 8]);
  assert.match(r.errors[0].message, /פורמט/);
  assert.match(r.errors[1].message, /בין 90- ל-90/);
  assert.equal(r.truncated, false);
  assert.deepEqual(r.points[0], { lat: 35.512, lon: 23.874 });
});

test('parseCoordinateList: הדבקה של 12 שורות מתוכן 2 שגויות', () => {
  const lines = Array.from({ length: 12 }, (_, i) => `${30 + i * 0.1}, ${20 + i * 0.1}`);
  lines[3] = 'xx, yy';
  lines[9] = '100, 10';
  const r = parseCoordinateList(lines.join('\n'));
  assert.equal(r.points.length, 10);
  assert.deepEqual(r.errors.map((e) => e.line), [4, 10]);
});

test('parseCoordinateList: מעל 50 נקודות מתקבלות 50 הראשונות', () => {
  const text = Array.from({ length: 63 }, (_, i) => `${i % 80}.5, ${i}.5`).join('\n');
  const r = parseCoordinateList(text);
  assert.equal(r.points.length, 50);
  assert.equal(r.total, 63);
  assert.equal(r.truncated, true);
});

// ===== רשימת נקודות משותפת =====
const R = (s, a) => terrainReducer(s, a);
const click = (s, lon, lat) => R(s, { type: 'addPoint', ll: [lon, lat] });
const type = (s, id, field, text) => R(s, { type: 'setCell', id, field, text });

test('רשימה משותפת: נקודה שנדקרה במפה מופיעה ברשימה', () => {
  let s = initialTerrainState();
  s = click(s, 34.5, 32.5);
  s = click(s, 35, 33);
  assert.equal(filledCount(s), 2);
  assert.deepEqual(pointsOf(s), [[34.5, 32.5], [35, 33]]);
  assert.equal(s.rows[0].lat, '32.500° N');
  assert.equal(s.rows[0].lon, '34.500° E');
  assert.equal(parseRow(s.rows[2]).blank, true); // שורה ריקה אחת בסוף
  assert.equal(s.rows.length, 3);
});

test('רשימה משותפת: נקודה שהוקלדה מופיעה במפה (כנקודה תקינה), ושגויה לא', () => {
  let s = initialTerrainState();
  const id = s.rows[0].id;
  s = type(s, id, 'lat', "34°42.6' N");
  assert.deepEqual(pointsOf(s), []); // חצי שורה: עדיין לא נקודה
  s = type(s, id, 'lon', '35,512');
  assert.equal(pointsOf(s).length, 1);
  assert.ok(Math.abs(pointsOf(s)[0][0] - 35.512) < 1e-9);
  assert.ok(Math.abs(pointsOf(s)[0][1] - (34 + 42.6 / 60)) < 1e-9);
  const id2 = s.rows[1].id; // נוספה שורה ריקה
  s = type(s, id2, 'lat', '95');
  s = type(s, id2, 'lon', '10');
  assert.equal(pointsOf(s).length, 1); // שגויה לא נכנסת לפוליגון
  assert.equal(parseRow(s.rows[1]).lat.ok, false);
});

test('רשימה משותפת: מעבר בין אופנים לא מוחק; נקודה מדויקת שנדקרה לא מאבדת דיוק; הקלדה מעל נקודה מנקה אותו', () => {
  let s = click(initialTerrainState(), 34.123456, 32.654321);
  assert.deepEqual(pointsOf(s), [[34.123456, 32.654321]]); // הטקסט 3 ספרות, הערך המדויק נשמר
  s = R(s, { type: 'blurCell', id: s.rows[0].id, field: 'lat' });
  assert.deepEqual(pointsOf(s), [[34.123456, 32.654321]]);
  s = type(s, s.rows[0].id, 'lat', '10');
  assert.deepEqual(pointsOf(s)[0][1], 10);
});

test('הצגה על המפה: מושבת עם פחות מ-3 נקודות תקינות ומצביע למה; ואין קלט לניתוח לפני הלחיצה', () => {
  let s = initialTerrainState();
  assert.equal(canShow(s).ok, false);
  assert.equal(canShow(s).reason, 'נדרשות עוד 3 נקודות');
  s = click(click(s, 34, 32), 35, 32);
  assert.equal(canShow(s).reason, 'נדרשות עוד 1 נקודות');
  assert.equal(analysisInput(s), null);
  s = click(s, 35, 33);
  assert.equal(canShow(s).ok, true);
  assert.equal(analysisInput(s), null, 'הניתוח לא רץ עד "הצגה על המפה"');
  // הקלדה אחרי 3 נקודות: עדיין בלי ניתוח
  s = type(s, s.rows[3].id, 'lat', '33');
  assert.equal(analysisInput(s), null);
  s = type(s, s.rows[3].id, 'lon', '34');
  assert.equal(analysisInput(s), null);
  s = R(s, { type: 'close' });
  assert.equal(s.closed, true);
  assert.equal(analysisInput(s).points.length, 4);
});

test('הצגה על המפה: שורה שגויה מושבתת עם "תקן את הנקודות המסומנות"', () => {
  let s = initialTerrainState();
  for (const [lon, lat] of [[34, 32], [35, 32], [35, 33]]) s = click(s, lon, lat);
  s = type(s, s.rows[3].id, 'lat', 'abc');
  assert.equal(canShow(s).ok, false);
  assert.equal(canShow(s).reason, 'תקן את הנקודות המסומנות');
  assert.equal(R(s, { type: 'close' }).closed, false);
});

test('עדכון אחרי סגירה: עריכה מזיזה את הנקודות אבל הניתוח (applied) משתנה רק ב"עדכון"', () => {
  let s = initialTerrainState();
  for (const [lon, lat] of [[34, 32], [35, 32], [35, 33]]) s = click(s, lon, lat);
  s = R(s, { type: 'close' });
  const rev = s.rev;
  s = type(s, s.rows[0].id, 'lat', '31');
  assert.deepEqual(pointsOf(s)[0], [34, 31]);
  assert.deepEqual(analysisInput(s).points[0], [34, 32]);
  s = R(s, { type: 'update' });
  assert.deepEqual(analysisInput(s).points[0], [34, 31]);
  assert.equal(s.rev, rev + 1);
  assert.equal(click(s, 1, 1), s); // אחרי סגירה לא מוסיפים נקודות בדקירה
});

test('גרירת קודקוד מעדכנת את השורה, והדבקה מוסיפה בלי למחוק; מעל 50 נקודות נחתך', () => {
  let s = initialTerrainState();
  for (const [lon, lat] of [[34, 32], [35, 32], [35, 33]]) s = click(s, lon, lat);
  s = R(s, { type: 'movePoint', index: 1, ll: [36, 31] });
  assert.deepEqual(pointsOf(s)[1], [36, 31]);
  s = R(s, { type: 'paste', points: [{ lat: 10, lon: 10 }, { lat: 11, lon: 11 }] });
  assert.equal(pointsOf(s).length, 5);
  assert.deepEqual(pointsOf(s)[0], [34, 32]);
  s = R(s, { type: 'paste', points: Array.from({ length: 80 }, (_, i) => ({ lat: i % 80, lon: i })) });
  assert.equal(filledCount(s), 50);
});

test('בטל נקודה אחרונה ומחיקת שורה', () => {
  let s = initialTerrainState();
  for (const [lon, lat] of [[34, 32], [35, 32], [35, 33]]) s = click(s, lon, lat);
  s = R(s, { type: 'undoLast' });
  assert.equal(pointsOf(s).length, 2);
  s = R(s, { type: 'removeRow', id: s.rows[0].id });
  assert.deepEqual(pointsOf(s), [[35, 32]]);
  assert.equal(R(R(s, { type: 'undoLast' }), { type: 'undoLast' }).rows.length, 1); // נשארת שורה ריקה אחת
});

test('חזרה לתוצאות: עריכות שלא אושרו נזרקות והרשימה חוזרת לפוליגון שעליו רצה הניתוח', () => {
  let s = initialTerrainState();
  for (const [lon, lat] of [[34, 32], [35, 32], [35, 33]]) s = click(s, lon, lat);
  s = R(s, { type: 'close' });
  s = type(s, s.rows[0].id, 'lat', '10');
  s = R(s, { type: 'removeRow', id: s.rows[1].id });
  assert.equal(pointsOf(s).length, 2);
  s = R(s, { type: 'revert' });
  assert.equal(new Set(s.rows.map((r) => r.id)).size, s.rows.length, 'מזהי שורות ייחודיים אחרי חזרה');
  const after = type(s, s.rows[0].id, 'lat', '10');
  assert.deepEqual(pointsOf(after).slice(1), [[35, 32], [35, 33]], 'הקלדה בשורה אחת לא משנה אחרות');
  assert.deepEqual(pointsOf(s), [[34, 32], [35, 32], [35, 33]]);
  assert.equal(s.closed, true);
  assert.deepEqual(analysisInput(s).points[0], [34, 32]);
  assert.equal(R(initialTerrainState(), { type: 'revert' }).closed, false); // בלי סגירה אין מה להחזיר
});

test('הנחיה בשורה הצפה: לפי מספר הנקודות, עם Backspace מ-1 ומעלה; בפוליגון סגור "גרירת פינה"', () => {
  assert.equal(terrainHint(0, false)[0], 'לחץ על המפה בפינה הראשונה של האזור');
  assert.doesNotMatch(terrainHint(0, false)[0], /Backspace/);
  for (const n of [1, 2]) assert.match(terrainHint(n, false)[0], /^המשך ללחוץ על פינות האזור לפי הסדר\. נדרשות לפחות 3 נקודות · Backspace: ביטול נקודה$/);
  for (const n of [3, 4, 10]) assert.match(terrainHint(n, false)[0], /^כדי לסיים, לחץ שוב על הנקודה הראשונה או לחץ פעמיים על הנקודה האחרונה · Backspace: ביטול נקודה$/);
  assert.equal(terrainHint(5, true)[0], 'גרירת פינה: עריכה · Esc: סגירת הכלי');
  // המשפט הארוך ביותר קצר מספיק לשורה אחת (פחות מ-100 תווים)
  assert.ok(Math.max(...[0, 1, 3].map((n) => terrainHint(n, false)[0].length)) < 100);
});
