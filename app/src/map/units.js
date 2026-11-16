import { useCallback, useState } from 'react';

// יחידות מרחק: מייל ימי (ברירת מחדל), ק"מ, מטר, רגל. קשר = מייל ימי לשעה (לשלבים הבאים).
export const NM = 1852;
export const UNITS = {
  nm: { label: 'מייל ימי', short: 'NM', m: NM, area: 'NM²', decimals: 2 },
  km: { label: 'ק"מ', short: 'ק"מ', m: 1000, area: 'קמ"ר', decimals: 2 },
  m: { label: 'מטר', short: 'מ׳', m: 1, area: 'מ"ר', decimals: 0 },
  ft: { label: 'רגל', short: 'ft', m: 0.3048, area: 'ft²', decimals: 0 },
};
export const KNOT_MS = NM / 3600;

export const toUnit = (meters, unit) => meters / UNITS[unit].m;
export const fromUnit = (value, unit) => value * UNITS[unit].m;
export const areaToUnit = (m2, unit) => m2 / UNITS[unit].m ** 2;

/** מספר באנגלית (tabular), עם הפרדת אלפים ומספר ספרות לפי היחידה */
export const fmt = (n, decimals = 2) => n.toLocaleString('en', { minimumFractionDigits: 0, maximumFractionDigits: decimals });
export const formatDistance = (m, unit) => ({ value: fmt(toUnit(m, unit), UNITS[unit].decimals), unit: UNITS[unit].short });
export const formatArea = (m2, unit) => ({ value: fmt(areaToUnit(m2, unit), UNITS[unit].decimals), unit: UNITS[unit].area });
export const formatBearing = (d) => `${Math.round(d)}°`;

/** שעות הפלגה במרחק נתון (מטרים) ובמהירות נתונה (קשר = מייל ימי לשעה) */
export const travelHours = (m, knots) => (knots > 0 ? m / (knots * NM) : Infinity);

/** משך בעברית בלי אפסים מיותרים: "1 יום, 14 שעות", "5 שעות, 12 דקות", "40 דקות" */
export function formatDuration(hours) {
  if (!Number.isFinite(hours)) return '—';
  const t = Math.round(hours * 60);
  const d = Math.floor(t / 1440);
  const h = Math.floor((t % 1440) / 60);
  const m = t % 60;
  const part = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  const parts = d ? [part(d, 'יום', 'ימים'), h && part(h, 'שעה', 'שעות')] : [h && part(h, 'שעה', 'שעות'), m && part(m, 'דקה', 'דקות')];
  const out = parts.filter(Boolean);
  return out.length ? out.join(', ') : '0 דקות';
}

/** שעת הגעה: dd.mm.yyyy HH:mm (שעון מקומי) */
export function formatEta(ms) {
  if (!Number.isFinite(ms)) return '—';
  const d = new Date(ms);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** שעת הגעה קצרה לטבלאות: dd.mm HH:mm */
export function formatEtaShort(ms) {
  if (!Number.isFinite(ms)) return '—';
  const d = new Date(ms);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}.${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

const KEY = 'sea-map-unit';
const read = () => {
  try {
    const v = localStorage.getItem(KEY);
    return v in UNITS ? v : 'nm';
  } catch {
    return 'nm';
  }
};

/** בורר יחידות, נשמר ב-localStorage */
export function useUnit() {
  const [unit, set] = useState(read);
  const setUnit = useCallback((u) => {
    set(u);
    try {
      localStorage.setItem(KEY, u);
    } catch {
      /* אין localStorage */
    }
  }, []);
  return [unit, setUnit];
}
