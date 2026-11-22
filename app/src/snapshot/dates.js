/** עזרי תאריכים לכללים. תאריכים כמחרוזות YYYY-MM-DD. */
const parse = (s) => { const [y, m, d] = s.slice(0, 10).split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); };

/** 2026-04-16 → 16.4.2026 */
export const fmtDate = (s) => { const [y, m, d] = s.slice(0, 10).split('-').map(Number); return `${d}.${m}.${y}`; };

/** האם התאריך בתוך N החודשים שמסתיימים ב-now */
export function withinMonths(date, now, months) {
  const from = parse(now);
  from.setUTCMonth(from.getUTCMonth() - months);
  const d = parse(date);
  return d >= from && d <= parse(now);
}

export function withinDays(date, now, days) {
  return parse(now).getTime() - parse(date).getTime() <= days * 86400000 && parse(date) <= parse(now);
}

/** בידוד כיווני לשם לטיני בתוך משפט עברי (FSI...PDI), כדי שלא יתהפך */
export const iso = (s) => `\u2068${s}\u2069`;

/** תאריך לתצוגה בתוך משפט עברי: d.m.yyyy עטוף בבידוד כיווני */
export const dt = (s) => iso(fmtDate(s));

/** "א, ב ו-ג" (חיבור ברשימה בעברית) */
export const joinHe = (xs) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} ו${xs[xs.length - 1]}` : xs[0] ?? '');