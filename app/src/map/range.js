// טווח תאריכים של מסלול: קיצורים, פתרון לגבולות מוחלטים, אימות ותווית. פונקציות טהורות.
export const HOUR = 3600e3;
export const DAY = 24 * HOUR;
export const MAX_RANGE = 30 * DAY;

/** קיצורים: 6/12/24/48 שעות, 7 ו-30 ימים */
export const PRESETS = [
  { hours: 6, label: '6 ש׳' },
  { hours: 12, label: '12 ש׳' },
  { hours: 24, label: '24 ש׳' },
  { hours: 48, label: '48 ש׳' },
  { hours: 168, label: '7 י׳' },
  { hours: 720, label: '30 י׳' },
];

export const DEFAULT_RANGE = { preset: 24 };

/** range = { preset: שעות אחורה מעכשיו } או { from, to } במילישניות */
export function resolveRange(range, now = Date.now()) {
  const to = range.preset ? now : range.to;
  const from = range.preset ? now - range.preset * HOUR : range.from;
  return { from, to, hours: (to - from) / HOUR };
}

/** מחזיר הודעת שגיאה, או null אם התקין: from<to, לא בעתיד, עד 30 יום */
export function validateRange(from, to, now = Date.now()) {
  if (!Number.isFinite(from) || !Number.isFinite(to)) return 'יש לבחור תאריך ושעה בשני הקצוות';
  if (from >= to) return 'תאריך ההתחלה חייב להיות לפני תאריך הסיום';
  if (to > now) return 'לא ניתן לבחור זמן עתידי';
  if (to - from > MAX_RANGE) return 'הטווח המרבי הוא 30 יום';
  return null;
}

const p2 = (n) => String(n).padStart(2, '0');
export const fmtDay = (ms) => { const d = new Date(ms); return `${p2(d.getDate())}.${p2(d.getMonth() + 1)}`; };
export const fmtDayYear = (ms) => `${fmtDay(ms)}.${new Date(ms).getFullYear()}`;
export const fmtTime = (ms) => { const d = new Date(ms); return `${p2(d.getHours())}:${p2(d.getMinutes())}`; };
export const fmtFull = (ms) => `${fmtDayYear(ms)} ${fmtTime(ms)}`;

/** "08.11 – 09.11.2026" (או יום אחד: "09.11.2026") */
export function rangeLabel(from, to) {
  return fmtDayYear(from) === fmtDayYear(to) ? fmtDayYear(to) : `${fmtDay(from)} – ${fmtDayYear(to)}`;
}

/** שם הטווח במילים: "24 שעות", "7 ימים", "36 שעות" */
export function spanLabel(hours) {
  if (hours >= 48 && Math.abs(hours / 24 - Math.round(hours / 24)) < 0.02) return `${Math.round(hours / 24)} ימים`;
  const h = Math.round(hours);
  return h === 1 ? '1 שעה' : `${h} שעות`;
}

/** תאריך (ms בחצות מקומי) ושעה "HH:mm" לערך ms */
export function combine(dayMs, hhmm) {
  const d = new Date(dayMs);
  const [h, m] = (hhmm || '00:00').split(':').map(Number);
  d.setHours(h || 0, m || 0, 0, 0);
  return d.getTime();
}
export const startOfDay = (ms) => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };

/** תאי חודש לתצוגת לוח, שבוע מתחיל ביום ראשון: מערך של null (ריפוד) ותאריכי חצות */
export function monthCells(year, month) {
  const first = new Date(year, month, 1);
  const lead = first.getDay(); // 0 = ראשון
  const days = new Date(year, month + 1, 0).getDate();
  const cells = Array(lead).fill(null);
  for (let d = 1; d <= days; d++) cells.push(new Date(year, month, d).getTime());
  while (cells.length % 7) cells.push(null);
  return cells;
}
