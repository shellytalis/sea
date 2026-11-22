import { getVessel } from '../data/vessels.js';
import { FIXTURES } from './fixtures.js';

/** תאריך הייחוס של הדמה (בשרת: התאריך הנוכחי) */
export const NOW = '2026-11-22';

/**
 * שבעת המקורות שמהם נבנית התמונה. state: 'ok' נבדק ויש נתונים | 'unchecked' המקור לא נבדק | 'nodata' אין נתונים במקור.
 * @typedef {'ok'|'unchecked'|'nodata'} SourceState
 */
export const SOURCES = [
  { id: 'identity', label: 'זהות ושינויים (מקור ב)', updated: '2026-11-20' },
  { id: 'ownership', label: 'בעלות וניהול (מקור ב)', updated: '2026-11-18' },
  { id: 'portsB', label: 'קריאות נמל (מקור ב)', updated: '2026-11-21' },
  { id: 'portsC', label: 'קריאות נמל (מקור ג)', updated: '2026-11-19' },
  { id: 'ais', label: 'פעילות ו-AIS (מקור א)', updated: '2026-11-22' },
  { id: 'lists', label: 'רשימות וסנקציות', updated: '2026-11-22' },
  { id: 'spec', label: 'מפרט טכני (מקור א)', updated: '2026-11-15' },
];

/**
 * אוסף את כל העובדות על כלי אחד לאובייקט אחד. כל מקור נושא `state`, `label`, `asOf`.
 * בשרת האמיתי: שאילתות במקביל, ונקודת קצה אחת `GET /vessels/:id/snapshot`.
 * @returns {object|null} null כשהכלי לא נמצא
 */
export function collectFacts(vesselId) {
  const v = getVessel(vesselId);
  if (!v) return null;
  const fx = FIXTURES[vesselId];
  const override = fx?.sources ?? {};
  const has = {
    identity: true, spec: true, lists: true,
    ownership: !!fx?.ownership, portsB: !!fx?.ports, portsC: !!fx?.ports, ais: !!fx?.ais,
  };
  const sources = Object.fromEntries(SOURCES.map((s) => [s.id, {
    label: s.label, asOf: s.updated,
    state: override[s.id] ?? (has[s.id] ? 'ok' : 'nodata'),
  }]));
  return {
    now: NOW,
    vessel: { id: v.id, name: v.name, type: v.type, built: v.built, dwt: v.dwt },
    sources,
    identity: { changes: fx?.identity?.changes ?? [] },
    ownership: fx?.ownership ?? null,
    ports: fx?.ports ?? null,
    ais: fx?.ais ?? null,
    lists: { matches: v.lists.map((list) => ({ list, since: '2025-03-01' })) },
  };
}
