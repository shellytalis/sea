// ייצוא CSV של אירועי הפעילות הנבחרת (FR-09): כולל את כל האירועים, גם מעל תקרת הנקודות.
import { fmtFull } from '../map/range.js';
import { activityById } from './activities.js';
import { orderVessels } from './query.js';

const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
/** MMSI כטקסט עם אפסים מובילים: ="000123456" (Excel לא מחסיר אפסים) */
export const textCell = (v) => `="${String(v ?? '').replace(/"/g, '""')}"`;

const UNKNOWN = 'לא ידוע';
export const CSV_COLUMNS = ['פעילות', 'שם', 'IMO', 'MMSI', 'דגל', 'כלי שני', 'התחלה', 'סיום', 'משך (שעות)', 'קו רוחב', 'קו אורך', 'מקור', 'זמן עדכון'];

/**
 * @param {{polygon: number[][], range: {from: number, to: number}, activity: string, events: object[], now?: number}} p
 * @returns {string} UTF-8 עם BOM. שתי שורות בראש: קודקודי הפוליגון והטווח
 */
export function buildAreaCsv({ polygon, range, activity, events, now = Date.now() }) {
  const label = activityById(activity)?.label ?? activity;
  const head = [
    [`קודקודי הפוליגון (קו רוחב, קו אורך): ${polygon.map((p) => `${p[1].toFixed(4)} ${p[0].toFixed(4)}`).join('; ')}`],
    [`טווח: ${fmtFull(range.from)} עד ${fmtFull(range.to)}`],
  ];
  const rows = events.map((e) => {
    const hours = ((e.end ?? now) - e.start) / 3600e3;
    const [v1, v2] = orderVessels(e); // סדר אלפביתי, כמו בטבלה ובכרטיס
    return [
      label, v1.name, v1.imo, textCell(v1.mmsi), v1.flag ?? UNKNOWN, v2?.name ?? '',
      fmtFull(e.start), e.end == null ? 'ממשיך' : fmtFull(e.end), hours.toFixed(1), e.lat, e.lon, e.source, fmtFull(e.asOf),
    ];
  });
  const cell = (v) => (typeof v === 'string' && v.startsWith('="') ? v : q(v));
  return '\uFEFF' + [...head, CSV_COLUMNS, ...rows].map((r) => r.map(cell).join(',')).join('\r\n');
}

/** מוריד קובץ בדפדפן */
export function downloadCsv(text, name) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
