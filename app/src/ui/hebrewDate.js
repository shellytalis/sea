// תאריך עברי בלי ספרייה: Intl נותן יום ושנה במספרים (28 בחשוון 5787), וההמרה לאותיות (גימטריה) כאן.
const LETTERS = [[400, 'ת'], [300, 'ש'], [200, 'ר'], [100, 'ק'], [90, 'צ'], [80, 'פ'], [70, 'ע'], [60, 'ס'], [50, 'נ'], [40, 'מ'], [30, 'ל'], [20, 'כ'], [10, 'י'], [9, 'ט'], [8, 'ח'], [7, 'ז'], [6, 'ו'], [5, 'ה'], [4, 'ד'], [3, 'ג'], [2, 'ב'], [1, 'א']];

/** מספר 1-999 באותיות, עם גרש/גרשיים: 28 ← כ״ח, 5 ← ה׳, 15 ← ט״ו, 787 ← תשפ״ז */
export function gematria(n) {
  let rest = n;
  let s = '';
  if (rest === 15) s = 'טו';
  else if (rest === 16) s = 'טז';
  else for (const [v, l] of LETTERS) while (rest >= v) { s += l; rest -= v; }
  return s.length === 1 ? `${s}׳` : `${s.slice(0, -1)}״${s.slice(-1)}`;
}

const fmt = new Intl.DateTimeFormat('he-IL-u-ca-hebrew', { timeZone: 'Asia/Jerusalem', day: 'numeric', month: 'long', year: 'numeric' });

/** "כ״ח בחשוון ה׳תשפ״ז" */
export function hebrewDate(date = new Date()) {
  const p = Object.fromEntries(fmt.formatToParts(date).map((x) => [x.type, x.value]));
  const year = Number(p.year);
  const text = `${gematria(Number(p.day))} ב${p.month} ${gematria(Math.floor(year / 1000))}${gematria(year % 1000)}`;
  // גרשיים וגרש עבריים במקום ASCII (גם בשמות חודשים כמו "אדר ב'")
  return text.replace(/"/g, '״').replace(/'/g, '׳');
}
