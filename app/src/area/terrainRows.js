// רשימת הנקודות המשותפת של "חקירת שטח" (שלב 5ג): מקור אמת יחיד לשני אופני הקלט (דקירה במפה והזנה ידנית).
// נקודה שנדקרה מופיעה ברשימה, ונקודה שהוקלדה מופיעה במפה. הניתוח רץ רק מ-`applied`, שנקבע בסגירה ("הצגה על המפה"),
// בעדכון ובסיום גרירת קודקוד, ולא תוך כדי הקלדה. פונקציות טהורות, בלי React (ה-reducer נבדק ישירות).
import { formatCoordinate, parseCoordinate } from './coords.js';
import { MAX_INPUT_POINTS } from './thresholds.js';

/** @typedef {{id: string, lat: string, lon: string, exact: {lat: number|null, lon: number|null}, touched: {lat: boolean, lon: boolean}}} Row */

const blankRow = (id) => ({ id, lat: '', lon: '', exact: { lat: null, lon: null }, touched: { lat: false, lon: false } });
const isBlank = (r) => !r.lat.trim() && !r.lon.trim();

/** נקודות מדויקות שנדקרו במפה נשמרות במלוא הדיוק; הטקסט המוצג הוא 3 ספרות. ערך שהוקלד מפוענח מהטקסט */
function parseAxis(row, axis) {
  const text = row[axis];
  const ex = row.exact[axis];
  if (ex != null && text === formatCoordinate(ex, axis)) return { ok: true, value: ex };
  return parseCoordinate(text, axis);
}

/** פענוח שורה: blank | נקודה תקינה | שדות עם שגיאה */
export function parseRow(row) {
  if (isBlank(row)) return { blank: true, point: null, lat: null, lon: null };
  const lat = parseAxis(row, 'lat');
  const lon = parseAxis(row, 'lon');
  return { blank: false, lat, lon, point: lat.ok && lon.ok ? [lon.value, lat.value] : null };
}

/** שורה ריקה אחת בסוף (אלא אם הגענו למקסימום) */
function withTrailingBlank(rows, nextId) {
  const filled = rows.filter((r) => !isBlank(r)).length;
  const last = rows[rows.length - 1];
  if (last && isBlank(last)) return rows;
  return filled >= MAX_INPUT_POINTS ? rows : [...rows, blankRow(nextId)];
}

export const initialTerrainState = () => ({ rows: [blankRow('r0')], seq: 1, closed: false, applied: null, rev: 0 });

/** נקודות תקינות לפי סדר הרשימה (אין מיון אוטומטי; הפוליגון נסגר בין האחרונה לראשונה) */
export const pointsOf = (state) => state.rows.map(parseRow).filter((r) => r.point).map((r) => r.point);
export const filledCount = (state) => state.rows.filter((r) => !isBlank(r)).length;
export const hasInvalid = (state) => state.rows.map(parseRow).some((r) => !r.blank && !r.point);

/** האם אפשר ללחוץ "הצגה על המפה": לפחות 3 נקודות תקינות ובלי שורות לא תקינות. reason: הסיבה בטקסט צמוד */
export function canShow(state) {
  const n = pointsOf(state).length;
  if (hasInvalid(state)) return { ok: false, reason: 'תקן את הנקודות המסומנות' };
  if (n < 3) return { ok: false, reason: `נדרשות עוד ${3 - n} נקודות` };
  return { ok: true, reason: '' };
}

/** קלט הניתוח: null עד שהפוליגון נסגר ("הצגה על המפה" או סגירה בדקירה) */
export const analysisInput = (state) => (state.closed && state.applied ? state.applied : null);

/**
 * @param {ReturnType<typeof initialTerrainState>} state
 * @param {{type: string, [k: string]: any}} a
 */
export function terrainReducer(state, a) {
  const nid = () => `r${state.seq}`;
  switch (a.type) {
    case 'addPoint': { // דקירה במפה: ll = [lon, lat]
      if (state.closed || filledCount(state) >= MAX_INPUT_POINTS) return state;
      const rows = state.rows.filter((r) => !isBlank(r));
      rows.push({ id: nid(), lat: formatCoordinate(a.ll[1], 'lat'), lon: formatCoordinate(a.ll[0], 'lon'), exact: { lat: a.ll[1], lon: a.ll[0] }, touched: { lat: true, lon: true } });
      return { ...state, rows: withTrailingBlank(rows, `r${state.seq + 1}`), seq: state.seq + 2 };
    }
    case 'setCell': { // הקלדה: הטקסט כמות שהוא, בלי המרה עד שעוזבים את השדה
      const rows = state.rows.map((r) => (r.id === a.id ? { ...r, [a.field]: a.text, exact: { ...r.exact, [a.field]: null } } : r));
      return { ...state, rows: withTrailingBlank(rows, `r${state.seq}`), seq: state.seq + 1 };
    }
    case 'blurCell': { // עזיבת שדה: ערך תקין מוצג בפורמט התצוגה; הודעת שגיאה (אם יש) מוצגת מכאן
      const rows = state.rows.map((r) => {
        if (r.id !== a.id) return r;
        const p = parseAxis(r, a.field);
        const touched = { ...r.touched, [a.field]: true };
        return p.ok ? { ...r, touched, [a.field]: formatCoordinate(p.value, a.field), exact: { ...r.exact, [a.field]: p.value } } : { ...r, touched };
      });
      return { ...state, rows };
    }
    case 'removeRow': {
      const rows = state.rows.filter((r) => r.id !== a.id);
      return { ...state, rows: withTrailingBlank(rows.length ? rows : [blankRow(`r${state.seq}`)], `r${state.seq + 1}`), seq: state.seq + 2 };
    }
    case 'undoLast': { // בטל נקודה אחרונה: האחרונה שאינה ריקה
      const filled = state.rows.filter((r) => !isBlank(r));
      if (!filled.length || state.closed) return state;
      const last = filled[filled.length - 1];
      const rows = state.rows.filter((r) => r.id !== last.id);
      return { ...state, rows: withTrailingBlank(rows.length ? rows : [blankRow(`r${state.seq}`)], `r${state.seq + 1}`), seq: state.seq + 2 };
    }
    case 'paste': { // הדבקה מוסיפה לרשימה הקיימת (לא מחליפה); points: [{lat, lon}]
      let rows = state.rows.filter((r) => !isBlank(r));
      let seq = state.seq;
      for (const p of a.points) {
        if (rows.length >= MAX_INPUT_POINTS) break;
        rows.push({ id: `r${seq++}`, lat: formatCoordinate(p.lat, 'lat'), lon: formatCoordinate(p.lon, 'lon'), exact: { lat: p.lat, lon: p.lon }, touched: { lat: true, lon: true } });
      }
      return { ...state, rows: withTrailingBlank(rows, `r${seq}`), seq: seq + 1 };
    }
    case 'movePoint': { // גרירת קודקוד במפה: index = מקום בין הנקודות התקינות, ll = [lon, lat]
      const parsed = state.rows.map(parseRow);
      let k = -1;
      const rows = state.rows.map((r, i) => {
        if (!parsed[i].point) return r;
        k += 1;
        return k === a.index ? { ...r, lat: formatCoordinate(a.ll[1], 'lat'), lon: formatCoordinate(a.ll[0], 'lon'), exact: { lat: a.ll[1], lon: a.ll[0] }, touched: { lat: true, lon: true } } : r;
      });
      return { ...state, rows };
    }
    case 'close': // "הצגה על המפה" / סגירה בדקירה: קובע את הפוליגון לניתוח
      if (!canShow(state).ok) return state;
      return { ...state, closed: true, applied: { id: state.applied?.id ?? `a${state.seq}`, points: pointsOf(state) }, rev: state.rev + 1, seq: state.seq + 1 };
    case 'update': // "עדכון" אחרי סגירה, וסיום גרירת קודקוד: הניתוח רץ מחדש מהנקודות הנוכחיות
      if (!state.closed || !canShow(state).ok) return state;
      return { ...state, applied: { id: state.applied.id, points: pointsOf(state) }, rev: state.rev + 1 };
    case 'revert': { // "חזרה לתוצאות" ממסך עריכת נקודות: עריכות שלא אושרו ב-"עדכון" נזרקות, והרשימה חוזרת לפוליגון שעליו רצה הניתוח
      if (!state.closed || !state.applied) return state;
      const rows = state.applied.points.map(([lon, lat], i) => ({ id: `r${state.seq + i}`, lat: formatCoordinate(lat, 'lat'), lon: formatCoordinate(lon, 'lon'), exact: { lat, lon }, touched: { lat: true, lon: true } }));
      return { ...state, rows: withTrailingBlank(rows, `r${state.seq + rows.length}`), seq: state.seq + rows.length + 1 };
    }
    case 'reset':
      return initialTerrainState();
    default:
      return state;
  }
}
