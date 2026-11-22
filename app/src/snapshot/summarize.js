import { THRESHOLDS as T } from './thresholds.js';
import { dt, iso, joinHe, withinDays } from './dates.js';

/**
 * סיכום עובדתי לכל נושא (שלבים 4ב, 4ג): רשימה אחת של משפטים מתבניות בעברית, דטרמיניסטי, בלי מודל.
 * מצב נוכחי קודם, אחר כך שינויים עם תאריכים. כל משפט: { key, text, evidence }.
 * `key` הוא המפתח שכלל תצפית (rules.js, `fact`) מסמן; compose.js מחליט איזה משפט נושא את הסמן הניטרלי.
 * summarizeTopic(topicId, facts, peers) → משפטים (מערך ריק כשאין מקור שנבדק).
 */
const ok = (f, ...ids) => ids.some((id) => f.sources[id].state === 'ok');
const ev = (f, ...ids) => ids.filter((id) => f.sources[id].state === 'ok').map((id) => ({ source: f.sources[id].label, asOf: f.sources[id].asOf }));
const current = (ps) => ps?.[ps.length - 1] ?? null;
const prevOf = (ps) => (ps && ps.length > 1 ? ps[ps.length - 2] : null);
const s = (key, text, evidence) => ({ key, text, evidence });
const age = (f) => Number(f.now.slice(0, 4)) - f.vessel.built;
const FIELD = { name: 'שם הכלי', imo: 'מספר IMO', mmsi: 'מספר MMSI', flag: 'הדגל' };
const ROLES = [['technical', 'מנהל טכני'], ['ism', 'מנהל ISM'], ['commercial', 'מנהל מסחרי'], ['operator', 'מפעיל']];
const company = (p) => (p?.company ? iso(p.company) : null);
/** "רשימת מעקב ב" → "רשימת מעקב ב׳" */
const listName = (n) => n.replace(/ ([א-ת])$/, ' $1׳');

/** "במבט אחד", משפט (א): מה הכלי */
export function vesselLine(f) {
  const v = f.vessel;
  return `${iso(v.type)}, בן ${age(f)} שנים (נבנה ב-${v.built}), דגל ${v.flag}, ${iso(`${Math.round(v.dwt / 1000)}K DWT`)}.`;
}

/** "במבט אחד", משפט (ב): בעלות וניהול נוכחיים ומאז מתי; null כשאין נתון */
export function ownershipLine(f) {
  if (!ok(f, 'ownership') || !f.ownership?.registered) return null;
  const reg = current(f.ownership.registered);
  const mgr = current(f.ownership.technical);
  return `הבעלים הרשום: ${company(reg) ?? 'לא ידוע'} מתאריך ${dt(reg.from)}${mgr?.company ? `; מנהל טכני: ${company(mgr)}` : ''}.`;
}

/** "במבט אחד", משפט (ג): פעילות אחרונה ונמלים; null כשאין נתון */
export function activityLine(f) {
  if (!ok(f, 'portsB', 'portsC') || !f.ports?.calls?.length) return null;
  const c = f.ports.calls[0];
  return `הקריאה האחרונה בנמל ${iso(c.port)} בתאריך ${dt(c.arrival)}.`;
}

/** תפקידי ניהול: תפקידים באותה חברה מאוחדים למשפט אחד ("מנהל טכני, מנהל ISM ומפעיל: X"); תפקידים שונים נפרדים */
export function managementSentence(o) {
  const groups = new Map();
  ROLES.filter(([k]) => o[k]).forEach(([k, label]) => {
    const name = current(o[k])?.company ? iso(current(o[k]).company) : 'לא ידוע';
    groups.set(name, [...(groups.get(name) ?? []), label]);
  });
  if (!groups.size) return null;
  return [...groups].map(([name, labels]) => `${joinHe(labels)}: ${name}`).join('; ') + '.';
}

const SUMMARIZERS = {
  // סוג, גיל ודגל מופיעים ב"במבט אחד"; כאן שינויי הזהות בלבד
  identity: (f) => {
    if (!ok(f, 'identity')) return ok(f, 'spec') ? [s('age', vesselLine(f), ev(f, 'spec'))] : [];
    const ch = [...f.identity.changes].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);
    if (!ch.length) return [s('identity-changes', 'לא נרשמו שינויי שם, דגל או מזהים.', ev(f, 'identity'))];
    return ch.map((c) => s('identity-changes', `${FIELD[c.field] ?? c.field} שונה מ-${iso(c.from)} ל-${iso(c.to)} בתאריך ${dt(c.date)}.`, ev(f, 'identity')));
  },

  ownership: (f) => {
    if (!ok(f, 'ownership') || !f.ownership) return [];
    const o = f.ownership, reg = current(o.registered), ben = current(o.beneficial), E = ev(f, 'ownership');
    const out = [];
    const prev = prevOf(o.registered);
    out.push(s('registered', `הבעלים הרשום הוא ${company(reg) ?? 'לא ידוע'}${reg.country ? ` (${reg.country}${reg.fleet ? `, ${reg.fleet} כלים` : ''})` : ''} מתאריך ${dt(reg.from)}${prev ? `; קודם: ${company(prev) ?? 'לא ידוע'}` : ''}.`, E));
    if (ben) {
      const unknown = (o.beneficial ?? []).find((p) => p.company === null);
      const also = ben.company && ben.company === reg.company ? ' (גם הבעלים הרשום)' : '';
      out.push(s('beneficial', ben.company === null
        ? `הבעלים המוטב אינו ידוע מתאריך ${dt(ben.from)}.`
        : `הבעלים המוטב הוא ${company(ben)}${also}${unknown && unknown.to ? `; לא היה ידוע בין ${dt(unknown.from)} ל־${dt(unknown.to)}` : ''}.`, E));
    }
    const mg = managementSentence(o);
    if (mg) out.push(s('management', mg, E));
    return out;
  },

  // פעילות ונמלים: קריאות נמל והפסקות AIS
  ports: (f) => {
    const out = [];
    if (ok(f, 'portsB', 'portsC')) {
      const calls = f.ports?.calls ?? [];
      if (!calls.length) out.push(s('lastcall', 'אין קריאות נמל רשומות.', ev(f, 'portsB', 'portsC')));
      else {
        const ports = new Set(calls.map((c) => c.port));
        out.push(s('lastcall', `הקריאה האחרונה בנמל ${iso(calls[0].port)}: הגעה בתאריך ${dt(calls[0].arrival)}${calls[0].departure ? `, יציאה בתאריך ${dt(calls[0].departure)}` : ''}.`, ev(f, 'portsB', 'portsC')));
        out.push(s('calls', `${calls.length} קריאות אחרונות ב-${ports.size} ${ports.size === 1 ? 'נמל' : 'נמלים'}.`, ev(f, 'portsB', 'portsC')));
      }
    }
    if (ok(f, 'ais') && f.ais) {
      const g = (f.ais.gaps ?? []).filter((x) => withinDays(x.start, f.now, T.aisWindowDays)).sort((a, b) => b.hours - a.hours)[0];
      out.push(s('ais-gap', g ? `הפסקת ה-AIS הארוכה ב-${T.aisWindowDays} הימים האחרונים: ${g.hours} שעות, החל מתאריך ${dt(g.start)}.` : `לא היו הפסקות AIS ב-${T.aisWindowDays} הימים האחרונים.`, ev(f, 'ais')));
    }
    return out;
  },

  utilization: (f, p) => {
    if (!ok(f, 'ais') || !f.ais) return [];
    const a = f.ais, E = ev(f, 'ais');
    if (!p || p.n < T.minPeerGroup) {
      return [s('port-days', `${a.daysInPort} ימים בנמל ו-${a.sailingDays} ימי הפלגה בחלון של ${a.windowDays} ימים; אין בסיס השוואה לכלים דומים${p ? ` (קבוצה של ${p.n} כלים בלבד)` : ''}.`, E)];
    }
    const basis = `חציון של כלים דומים ${p.daysInPort} (קבוצה של ${p.n} כלים), בחלון של ${a.windowDays} ימים`;
    return [
      s('port-days', `${a.daysInPort} ימים בנמל, ${basis}.`, E),
      s('sail-days', `${a.sailingDays} ימי הפלגה, חציון של כלים דומים ${p.sailingDays} (קבוצה של ${p.n} כלים), בחלון של ${a.windowDays} ימים.`, E),
    ];
  },

  events: (f) => {
    if (!ok(f, 'lists')) return [];
    const m = f.lists.matches;
    if (!m.length) return [s('lists', 'אינו מופיע ברשימות מעקב או סנקציות.', ev(f, 'lists'))];
    return m.map((x) => s('lists', `מופיע ב${listName(x.list)} מאז ${dt(x.since)}.`, ev(f, 'lists')));
  },
};

export const summarizeTopic = (topicId, facts, peers) => SUMMARIZERS[topicId](facts, peers);
