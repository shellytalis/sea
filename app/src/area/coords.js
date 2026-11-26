// פענוח והצגה של קואורדינטות בהזנה ידנית (שלב 5ג). פונקציות טהורות. הפורמט מזוהה לבד, בלי בורר.
// מתקבל: מעלות עשרוניות (35.512, 35.512 N, -23.874, 23.874 W), מעלות ודקות (34°42.6' N, 34 42.6 N),
// מעלות דקות ושניות (34°42'36" N). אות כיוון (N/S/E/W) גוברת על סימן. פסיק עשרוני אירופי (35,512) מתקבל.
import { COORD_DISPLAY, MAX_INPUT_POINTS } from './thresholds.js';

const LIMIT = { lat: 90, lon: 180 };
const LETTERS = { lat: 'NS', lon: 'EW' };
const FORMAT_ERROR = "לא זוהה פורמט. דוגמה: 34°42.6' N";
export const RANGE_ERROR = { lat: 'קו רוחב חייב להיות בין 90- ל-90.', lon: 'קו אורך חייב להיות בין 180- ל-180.' };

const PART = String.raw`\d+(?:\.\d+)?`;
// עד שלושה חלקים (מעלות, דקות, שניות) מופרדים ב-° ' " או רווח; סימון יחידה סופי אופציונלי
const FORM = new RegExp(`^(${PART})(?:\\s*[°'′"″\\s]\\s*(${PART}))?(?:\\s*[°'′"″\\s]\\s*(${PART}))?\\s*[°'′"″]?$`);

/**
 * @param {string} text
 * @param {'lat'|'lon'} axis
 * @returns {{ok: true, value: number} | {ok: false, error: string, empty?: boolean}}
 */
export function parseCoordinate(text, axis) {
  let s = String(text ?? '').trim();
  if (!s) return { ok: false, error: FORMAT_ERROR, empty: true };
  s = s.replace(/[−–]/g, '-').replace(/,/g, '.');
  // אות כיוון בתחילת הערך או בסופו (אחת בלבד)
  let letter = null;
  const m = s.match(/^([A-Za-z])\s*(.*)$/) ?? null;
  if (m) { letter = m[1].toUpperCase(); s = m[2]; } else {
    const e = s.match(/^(.*?)\s*([A-Za-z])$/);
    if (e) { letter = e[2].toUpperCase(); s = e[1]; }
  }
  if (letter && !LETTERS[axis].includes(letter)) return { ok: false, error: FORMAT_ERROR };
  let sign = 1;
  const sg = s.match(/^([+-])\s*(.*)$/);
  if (sg) { sign = sg[1] === '-' ? -1 : 1; s = sg[2]; }
  const f = FORM.exec(s.trim());
  if (!f) return { ok: false, error: FORMAT_ERROR };
  const parts = [f[1], f[2], f[3]].filter((x) => x != null).map(Number);
  // שבר עשרוני רק בחלק האחרון (34°42.6' תקין; 34.5°42' לא)
  const raw = [f[1], f[2], f[3]].filter((x) => x != null);
  if (raw.slice(0, -1).some((x) => x.includes('.'))) return { ok: false, error: FORMAT_ERROR };
  if (parts.length > 1 && parts.slice(1).some((x) => x >= 60)) return { ok: false, error: FORMAT_ERROR };
  const abs = parts[0] + (parts[1] ?? 0) / 60 + (parts[2] ?? 0) / 3600;
  // אות כיוון גוברת על סימן: S ו-W שליליים, N ו-E חיוביים
  const value = (letter ? (letter === 'S' || letter === 'W' ? -1 : 1) : sign) * abs;
  if (Math.abs(value) > LIMIT[axis] + 1e-12) return { ok: false, error: RANGE_ERROR[axis] };
  return { ok: true, value };
}

/** הצגה אחרי עזיבת השדה: ברירת מחדל מעלות עשרוניות עם 3 ספרות ("35.512° N"); COORD_DISPLAY='degmin' = מעלות ודקות */
export function formatCoordinate(value, axis, mode = COORD_DISPLAY) {
  const letter = axis === 'lat' ? (value < 0 ? 'S' : 'N') : (value < 0 ? 'W' : 'E');
  const a = Math.abs(value);
  if (mode === 'degmin') {
    let d = Math.floor(a);
    let min = Math.round((a - d) * 60 * 1000) / 1000;
    if (min >= 60) { d += 1; min = 0; }
    return `${d}°${min.toFixed(3)}' ${letter}`;
  }
  return `${a.toFixed(3)}° ${letter}`;
}

/** מפריד בין קו הרוחב לקו האורך בשורה אחת: ; או טאב, פסיק (עם רווח אחריו, או יחיד), או רווח (אחרי אות כיוון, או בין שני ערכים בלבד) */
function splitLine(line) {
  const t = line.trim();
  if (/[;\t]/.test(t)) return t.split(/\s*[;\t]\s*/);
  if (t.includes(',')) {
    const spaced = t.split(/,\s+/);
    if (spaced.length === 2) return spaced;
    const one = t.split(',');
    if (one.length === 2) return one;
    return [t];
  }
  const dir = t.match(/^(.*?[NSns])\s+(.*)$/);
  if (dir) return [dir[1], dir[2]];
  const ws = t.split(/\s+/);
  return ws.length === 2 ? ws : [t];
}

/**
 * הדבקת רשימה: שורה לכל נקודה, "קו רוחב, קו אורך". שורות ריקות מדולגות. שורות לא מזוהות מדווחות עם מספר שורה (1-based, כולל ריקות).
 * @returns {{points: {lat: number, lon: number}[], errors: {line: number, text: string, message: string}[], total: number, truncated: boolean}}
 *   total = מספר השורות התקינות; points = עד max הראשונות
 */
export function parseCoordinateList(text, max = MAX_INPUT_POINTS) {
  const valid = [];
  const errors = [];
  String(text ?? '').split(/\r?\n/).forEach((raw, i) => {
    if (!raw.trim()) return;
    const parts = splitLine(raw);
    const lat = parts.length === 2 ? parseCoordinate(parts[0], 'lat') : null;
    const lon = parts.length === 2 ? parseCoordinate(parts[1], 'lon') : null;
    if (lat?.ok && lon?.ok) { valid.push({ lat: lat.value, lon: lon.value }); return; }
    const bad = !lat ? { error: FORMAT_ERROR } : !lat.ok ? lat : lon;
    errors.push({ line: i + 1, text: raw, message: bad.error });
  });
  return { points: valid.slice(0, max), errors, total: valid.length, truncated: valid.length > max };
}
