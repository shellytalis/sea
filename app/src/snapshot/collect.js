import { getVessel } from '../data/vessels.js';
import { FIXTURES } from './fixtures.js';

/** תאריך הייחוס של הדמה (בשרת: התאריך הנוכחי) */
export const NOW = '2026-11-22';

/**
 * שבעת המקורות שמהם נבנית התמונה. state: 'ok' נבדק ויש נתונים | 'unchecked' המקור לא נבדק | 'nodata' אין נתונים במקור.
 * @typedef {'ok'|'unchecked'|'nodata'} SourceState
 */
export const SOURCES = [
  { id: 'identity', link: 'identity', label: 'זהות ושינויים', name: 'זהות ושינויים', updated: '2026-11-20' },
  { id: 'ownership', link: 'ownership', label: 'בעלות וניהול', name: 'בעלות וניהול', updated: '2026-11-18' },
  { id: 'portsB', link: 'activity', label: 'קריאות נמל', name: 'קריאות נמל', updated: '2026-11-21' },
  { id: 'portsC', link: 'activity', label: 'קריאות נמל (נוסף)', name: 'קריאות נמל', updated: '2026-11-19' },
  { id: 'ais', link: 'activity', label: 'פעילות ו-AIS', name: 'פעילות ו-AIS', updated: '2026-11-22' },
  { id: 'lists', link: 'risk', label: 'רשימות וסנקציות', name: 'רשימות וסנקציות', updated: '2026-11-22' },
  { id: 'spec', link: 'spec', label: 'מפרט טכני', name: 'מפרט טכני', updated: '2026-11-15' },
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
    label: s.label, name: s.name, asOf: s.updated,
    state: override[s.id] ?? (has[s.id] ? 'ok' : 'nodata'),
  }]));
  return {
    now: NOW,
    vessel: { id: v.id, name: v.name, type: v.type, flag: v.flag, built: v.built, dwt: v.dwt },
    sources,
    identity: { changes: fx?.identity?.changes ?? [] },
    ownership: fx?.ownership ?? null,
    ports: fx?.ports ?? null,
    ais: fx?.ais ?? null,
    lists: { matches: v.lists.map((list) => ({ list, since: '2025-03-01' })) },
  };
}
