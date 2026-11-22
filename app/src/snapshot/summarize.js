import { THRESHOLDS as T } from './thresholds.js';
import { fmtDate, iso, withinDays } from './dates.js';

/**
 * סיכום עובדתי לכל נושא (שלב 4ב): 1–3 משפטים מתבניות בעברית, דטרמיניסטי, בלי מודל.
 * מצב נוכחי קודם, אחר כך שינויים מהותיים עם תאריכים. כל משפט נשען על עובדה שאפשר לאתר.
 * summarizeTopic(topicId, facts, peers) → [{ text, evidence }] (מערך ריק כשאין מקור שנבדק).
 */
const ok = (f, ...ids) => ids.some((id) => f.sources[id].state === 'ok');
const ev = (f, ...ids) => ids.filter((id) => f.sources[id].state === 'ok').map((id) => ({ source: f.sources[id].label, asOf: f.sources[id].asOf }));
const current = (ps) => ps?.[ps.length - 1] ?? null;
const prevOf = (ps) => (ps && ps.length > 1 ? ps[ps.length - 2] : null);
const line = (text, evidence) => ({ text, evidence });
const age = (f) => Number(f.now.slice(0, 4)) - f.vessel.built;
const FIELD = { name: 'שם הכלי', imo: 'IMO', mmsi: 'MMSI', flag: 'הדגל' };
const company = (p) => (p?.company ? iso(p.company) : null);

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
  return `הבעלים הרשום: ${company(reg) ?? 'לא ידוע'} מ-${fmtDate(reg.from)}${mgr?.company ? `; מנהל טכני: ${company(mgr)}` : ''}.`;
}

/** "במבט אחד", משפט (ג): פעילות אחרונה ונמלים; null כשאין נתון */
export function activityLine(f) {
  if (!ok(f, 'portsB', 'portsC') || !f.ports?.calls?.length) return null;
  const c = f.ports.calls[0];
  return `הקריאה האחרונה בנמל ${iso(c.port)} ב-${fmtDate(c.arrival)}.`;
}

const SUMMARIZERS = {
  // הפרטים הסטטיים (סוג, גיל, דגל) מופיעים ב"במבט אחד"; כאן שם נוכחי והיקף השינויים, כדי לא לחזור על המשפטים
  identity: (f) => {
    if (!ok(f, 'identity')) return ok(f, 'spec') ? [line(vesselLine(f), ev(f, 'spec'))] : [];
    const ch = [...f.identity.changes].sort((a, b) => b.date.localeCompare(a.date));
    return [
      line(`שם הכלי: ${iso(f.vessel.name)}.`, ev(f, 'identity')),
      line(ch.length ? `נרשמו ${ch.length} שינויים בשם, בדגל או במזהים; האחרון ב-${fmtDate(ch[0].date)} (${FIELD[ch[0].field] ?? ch[0].field}).` : 'לא נרשמו שינויי שם, דגל או מזהים.', ev(f, 'identity')),
    ];
  },
  ownership: (f) => {
    if (!ok(f, 'ownership') || !f.ownership) return [];
    const o = f.ownership, reg = current(o.registered), ben = current(o.beneficial);
    const out = [];
    const prev = prevOf(o.registered);
    out.push(line(`הבעלים הרשום הוא ${company(reg) ?? 'לא ידוע'}${reg.country ? ` (${reg.country}${reg.fleet ? `, ${reg.fleet} כלים` : ''})` : ''} מ-${fmtDate(reg.from)}${prev ? `; קודם: ${company(prev) ?? 'לא ידוע'}` : ''}.`, ev(f, 'ownership')));
    const unknown = (o.beneficial ?? []).find((p) => p.company === null);
    const benText = !ben ? null : ben.company === null
      ? `הבעלים המוטב אינו ידוע מ-${fmtDate(ben.from)}`
      : `הבעלים המוטב הוא ${company(ben)}${unknown && unknown.to ? `; לא היה ידוע בין ${fmtDate(unknown.from)} ל-${fmtDate(unknown.to)}` : ''}`;
    if (benText) out.push(line(`${benText}.`, ev(f, 'ownership')));
    const roles = [['מנהל טכני', 'technical'], ['מנהל ISM', 'ism'], ['מנהל מסחרי', 'commercial'], ['מפעיל', 'operator']]
      .map(([label, k]) => [label, o[k] ? current(o[k]) : undefined]).filter(([, p]) => p !== undefined);
    if (roles.length) out.push(line(roles.map(([label, p]) => `${label}: ${p?.company ? company(p) : 'לא ידוע'}`).join(', ') + '.', ev(f, 'ownership')));
    return out;
  },

  ports: (f) => {
    if (!ok(f, 'portsB', 'portsC') || !f.ports?.calls?.length) return ok(f, 'portsB', 'portsC') ? [line('אין קריאות נמל רשומות.', ev(f, 'portsB', 'portsC'))] : [];
    const calls = f.ports.calls, ports = new Set(calls.map((c) => c.port));
    return [
      line(`הקריאה האחרונה בנמל ${iso(calls[0].port)}: הגעה ב-${fmtDate(calls[0].arrival)}${calls[0].departure ? `, יציאה ב-${fmtDate(calls[0].departure)}` : ''}.`, ev(f, 'portsB', 'portsC')),
      line(`${calls.length} קריאות אחרונות ב-${ports.size} ${ports.size === 1 ? 'נמל' : 'נמלים'}.`, ev(f, 'portsB', 'portsC')),
    ];
  },

  utilization: (f, p) => {
    if (!ok(f, 'ais') || !f.ais) return [];
    const a = f.ais;
    if (!p) return [line(`${a.daysInPort} ימים בנמל ו-${a.sailingDays} ימי הפלגה ב-${a.windowDays} הימים האחרונים. אין כלים דומים להשוואה.`, ev(f, 'ais'))];
    return [
      line(`${a.daysInPort} ימים בנמל לעומת חציון ${p.daysInPort} של ${p.n} כלים דומים (${iso(p.group)}).`, ev(f, 'ais')),
      line(`${a.sailingDays} ימי הפלגה לעומת חציון ${p.sailingDays}. חלון: ${a.windowDays} ימים.`, ev(f, 'ais')),
    ];
  },

  events: (f) => {
    const out = [];
    if (ok(f, 'lists')) {
      const m = f.lists.matches;
      out.push(line(m.length ? `מופיע ב: ${m.map((x) => `${x.list} (מאז ${fmtDate(x.since)})`).join(', ')}.` : 'אינו מופיע ברשימות מעקב או סנקציות.', ev(f, 'lists')));
    }
    if (ok(f, 'ais') && f.ais) {
      const g = (f.ais.gaps ?? []).filter((x) => withinDays(x.start, f.now, T.aisWindowDays)).sort((a, b) => b.hours - a.hours)[0];
      out.push(line(g ? `הפסקת ה-AIS הארוכה ב-${T.aisWindowDays} הימים האחרונים: ${g.hours} שעות, החל מ-${fmtDate(g.start)}.` : `לא היו הפסקות AIS ב-${T.aisWindowDays} הימים האחרונים.`, ev(f, 'ais')));
    }
    return out;
  },
};

export const summarizeTopic = (topicId, facts, peers) => SUMMARIZERS[topicId](facts, peers);
