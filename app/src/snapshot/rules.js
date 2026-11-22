import { THRESHOLDS as T } from './thresholds.js';
import { dt, iso, joinHe, withinDays, withinMonths } from './dates.js';

/**
 * כללי תצפית הצהרתיים (הצעה, לא מהאפיון). כל כלל:
 *   { id, fact, mark, topic, severity, link, sources, when(facts, peers), text(facts, peers), detail(facts, peers) | null, evidence(facts) }
 * topic: identity | ownership | ports | utilization | events.  link: מזהה מקטע בדף הכלי.
 * sources: המקורות שהכלל נשען עליהם; אם אחד מהם לא "ok" הכלל לא מופעל (נתון חסר ≠ אין ממצא; המצב מוצג בנושא).
 * כל כלל מחשב את התוצאה פעם אחת ב-find, ו-when/text/detail נגזרים ממנה.
 *
 * שלב 4ג: כלל לא מציג רשימה משלו ולא משפט כפול. `fact` הוא מפתח המשפט בסיכום הנושא (summarize.js) שהכלל מסמן
 * בסמן הניטרלי (אחד או כמה מפתחות). `mark: false` = עובדה רגילה (גיל, נמל חוזר): הכלל נשאר בנתונים, בלי סמן.
 * `detail` (אופציונלי) הוא ניסוח משלים שמתווסף למשפט המסומן. `text` נשאר בנתונים ומשמש משפט חלופי
 * כשאין בנושא משפט סיכום עם המפתח.
 * אין שיפוט ("חשוד", "פלילי"): רק עובדה, מועד ובסיס השוואה.
 */
const ok = (f, ...ids) => ids.every((id) => f.sources[id].state === 'ok');
const current = (periods) => periods?.[periods.length - 1] ?? null;
const prevOf = (periods) => (periods && periods.length > 1 ? periods[periods.length - 2] : null);

export const ROLE_LABEL = { technical: 'מנהל טכני', ism: 'מנהל ISM', commercial: 'מנהל מסחרי', operator: 'מפעיל' };
const FIELD_LABEL = { name: 'שם הכלי', imo: 'מספר IMO', mmsi: 'מספר MMSI' };

/** @param {(f, p) => any} find @param {(r, f, p) => string} text */
const rule = ({ mark = true, ...cfg }, find, text, detail) => ({
  mark,
  ...cfg,
  find,
  when: (f, p) => find(f, p) != null,
  text: (f, p) => text(find(f, p), f, p),
  detail: detail ? (f, p) => detail(find(f, p), f, p) : null,
  evidence: (f) => cfg.sources.map((id) => ({ source: f.sources[id].label, asOf: f.sources[id].asOf })),
});

export const RULES = [
  rule({ id: 'owner-changed', fact: 'registered', topic: 'ownership', severity: 'medium', link: 'ownership', sources: ['ownership'] },
    (f) => {
      if (!ok(f, 'ownership')) return null;
      const cur = current(f.ownership?.registered);
      return cur && prevOf(f.ownership.registered) && withinMonths(cur.from, f.now, T.ownerChangeMonths) ? cur : null;
    },
    (cur) => `הבעלים הרשום הוחלף בתאריך ${dt(cur.from)} (${cur.company ? iso(cur.company) : 'לא ידוע'}${cur.country ? `, ${cur.country}` : ''}${cur.fleet ? `, ${cur.fleet} כלים` : ''}).`),

  rule({ id: 'beneficial-unknown-period', fact: 'beneficial', topic: 'ownership', severity: 'medium', link: 'ownership', sources: ['ownership'] },
    (f) => (ok(f, 'ownership') ? (f.ownership?.beneficial ?? []).find((p) => p.company === null) ?? null : null),
    (p) => `הבעלים המוטב לא היה ידוע ${p.to ? `בין ${dt(p.from)} ל־${dt(p.to)}` : `מתאריך ${dt(p.from)} ועד היום`}.`),

  rule({ id: 'beneficial-became-registered', fact: 'beneficial', topic: 'ownership', severity: 'high', link: 'ownership', sources: ['ownership'] },
    (f) => {
      if (!ok(f, 'ownership')) return null;
      const reg = current(f.ownership?.registered), ben = current(f.ownership?.beneficial);
      const wasUnknown = (f.ownership?.beneficial ?? []).some((p) => p.company === null && p.to);
      return reg && ben && prevOf(f.ownership.registered) && reg.company && reg.company === ben.company && wasUnknown ? { company: reg.company, from: reg.from } : null;
    },
    (r) => `הבעלים המוטב (${iso(r.company)}) הוא גם הבעלים הרשום מתאריך ${dt(r.from)}, אחרי תקופה שבה הבעלים המוטב לא היה ידוע.`),

  rule({ id: 'manager-unknown', fact: 'management', topic: 'ownership', severity: 'medium', link: 'ownership', sources: ['ownership'] },
    (f) => {
      if (!ok(f, 'ownership')) return null;
      const roles = ['technical', 'ism'].filter((r) => f.ownership?.[r] && current(f.ownership[r])?.company === null);
      return roles.length ? roles : null;
    },
    (roles) => `${joinHe(roles.map((r) => ROLE_LABEL[r]))} ${roles.length > 1 ? 'אינם ידועים' : 'אינו ידוע'} במקור הבעלות והניהול.`),

  rule({ id: 'management-churn', fact: 'management', topic: 'ownership', severity: 'medium', link: 'ownership', sources: ['ownership'] },
    (f) => {
      if (!ok(f, 'ownership')) return null;
      const changed = Object.keys(ROLE_LABEL).map((r) => ({ r, cur: current(f.ownership?.[r]) }))
        .filter(({ r, cur }) => cur && prevOf(f.ownership[r]) && withinMonths(cur.from, f.now, T.mgmtWindowMonths));
      if (changed.length < T.mgmtRolesChanged) return null;
      return { roles: changed.map((c) => ROLE_LABEL[c.r]), last: changed.map((c) => c.cur.from).sort().pop() };
    },
    (r) => `${r.roles.length} תפקידי ניהול השתנו ב-${T.mgmtWindowMonths} החודשים האחרונים (${r.roles.join(', ')}), האחרון בתאריך ${dt(r.last)}.`,
    (r) => `${r.roles.length} תפקידי ניהול השתנו ב-${T.mgmtWindowMonths} החודשים האחרונים (${joinHe(r.roles)}).`),

  rule({ id: 'flag-changes', fact: 'identity-changes', topic: 'identity', severity: 'high', link: 'history', sources: ['identity'] },
    (f) => {
      if (!ok(f, 'identity')) return null;
      const ch = f.identity.changes.filter((c) => c.field === 'flag' && withinMonths(c.date, f.now, T.flagWindowMonths)).sort((a, b) => b.date.localeCompare(a.date));
      return ch.length >= T.flagChanges ? ch : null;
    },
    (ch) => `הדגל הוחלף ${ch.length} פעמים ב-${T.flagWindowMonths} החודשים האחרונים, האחרונה בתאריך ${dt(ch[0].date)} (שונה מ-${iso(ch[0].from)} ל-${iso(ch[0].to)}).`,
    (ch) => `הדגל הוחלף ${ch.length} פעמים ב-${T.flagWindowMonths} החודשים האחרונים.`),

  rule({ id: 'identity-changed', fact: 'identity-changes', topic: 'identity', severity: 'medium', link: 'history', sources: ['identity'] },
    (f) => {
      if (!ok(f, 'identity')) return null;
      const ch = f.identity.changes.filter((c) => FIELD_LABEL[c.field] && withinMonths(c.date, f.now, T.identityWindowMonths)).sort((a, b) => b.date.localeCompare(a.date));
      return ch[0] ?? null;
    },
    (c) => `${FIELD_LABEL[c.field]} שונה מ-${iso(c.from)} ל-${iso(c.to)} בתאריך ${dt(c.date)}.`),

  rule({ id: 'ais-gap', fact: 'ais-gap', topic: 'ports', severity: 'medium', link: 'activity', sources: ['ais'] },
    (f) => {
      if (!ok(f, 'ais')) return null;
      const g = (f.ais?.gaps ?? []).filter((x) => x.hours > T.aisGapHours && withinDays(x.start, f.now, T.aisWindowDays)).sort((a, b) => b.hours - a.hours);
      return g[0] ?? null;
    },
    (g) => `הפסקת AIS של ${g.hours} שעות החל מתאריך ${dt(g.start)}, מעל סף ${T.aisGapHours} שעות (${T.aisWindowDays} הימים האחרונים).`),

  rule({ id: 'port-days-high', fact: ['port-days', 'sail-days'], topic: 'utilization', severity: 'medium', link: 'activity', sources: ['ais'] },
    (f, p) => {
      if (!ok(f, 'ais') || !f.ais || !p || p.n < T.minPeerGroup) return null;
      return f.ais.daysInPort > T.portDaysFactor * p.daysInPort && f.ais.sailingDays < T.sailDaysFactor * p.sailingDays ? f.ais : null;
    },
    (a, f, p) => `${a.daysInPort} ימים בנמל לעומת חציון ${p.daysInPort} של ${p.n} כלים דומים (${iso(p.group)}); ${a.sailingDays} ימי הפלגה לעומת חציון ${p.sailingDays}. חלון: ${a.windowDays} ימים.`),

  // עובדה רגילה, לא סימון
  rule({ id: 'same-port', fact: 'calls', mark: false, topic: 'ports', severity: 'low', link: 'activity', sources: ['portsB'] },
    (f) => {
      if (!ok(f, 'portsB')) return null;
      const last = (f.ports?.calls ?? []).slice(0, T.samePortCalls);
      return last.length === T.samePortCalls && last.every((c) => c.port === last[0].port) ? last[0].port : null;
    },
    (port) => `${T.samePortCalls} הקריאות האחרונות היו כולן ב-${iso(port)}.`),

  rule({ id: 'list-match', fact: 'lists', topic: 'events', severity: 'critical', link: 'risk', sources: ['lists'] },
    (f) => (ok(f, 'lists') && f.lists.matches.length ? f.lists.matches : null),
    (m) => `התאמה לרשימת מעקב: ${m.map((x) => `${x.list} (מאז ${dt(x.since)})`).join(', ')}.`),

  // עובדה רגילה, לא סימון (הגיל מופיע ב"במבט אחד")
  rule({ id: 'old-vessel', fact: 'age', mark: false, topic: 'identity', severity: 'low', link: 'identity', sources: ['spec'] },
    (f) => {
      if (!ok(f, 'spec')) return null;
      const age = Number(f.now.slice(0, 4)) - f.vessel.built;
      return age >= T.oldAgeYears ? age : null;
    },
    (age, f) => `הכלי בן ${age} שנים (נבנה ב-${f.vessel.built}).`),
];
