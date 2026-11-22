import { RULES } from './rules.js';
import { SOURCES } from './collect.js';
import { activityLine, ownershipLine, summarizeTopic, vesselLine } from './summarize.js';
import { showSeverity } from './thresholds.js';

const SEV_ORDER = ['critical', 'high', 'medium', 'low'];
const SEV_WORD = { critical: 'קריטי', high: 'גבוה', medium: 'בינוני', low: 'נמוך' };

/**
 * נושאי התמונה, בסדר קבוע. sources: המקורות שהנושא נשען עליהם.
 * מצב נושא: data (נבדק, יש נתונים) | unchecked (המקור לא נבדק) | no-data (אין נתונים במקור).
 * "נבדק ולא נמצאו נקודות לתשומת לב" = data בלי attention.
 */
export const TOPICS = [
  { id: 'identity', label: 'זהות', sources: ['identity', 'spec'], link: 'identity' },
  { id: 'ownership', label: 'בעלות וניהול', sources: ['ownership'], link: 'ownership' },
  { id: 'ports', label: 'פעילות ונמלים', sources: ['portsB', 'portsC'], link: 'activity' },
  { id: 'utilization', label: 'ניצולת', sources: ['ais'], link: 'activity' },
  { id: 'events', label: 'רשימות ואירועים', sources: ['ais', 'lists'], link: 'risk' },
];

const count = (n, one, many) => `${n} ${n === 1 ? one : many}`;

function topicOf(t, attention, facts, peers) {
  const states = t.sources.map((id) => facts.sources[id]);
  const unchecked = states.filter((s) => s.state === 'unchecked');
  const state = states.some((s) => s.state === 'ok') ? 'data' : unchecked.length ? 'unchecked' : 'no-data';
  const summary = state === 'data' ? summarizeTopic(t.id, facts, peers) : [];
  return {
    ...t, state, summary, attention: attention.filter((a) => a.topic === t.id),
    note: state === 'unchecked' ? `לא הוערך: ${unchecked.map((s) => s.label).join(', ')} לא נבדק.`
      : state === 'no-data' ? 'אין נתונים בנושא זה.'
        : unchecked.length ? `${unchecked.map((s) => s.label).join(', ')}: לא נבדק.` : null,
  };
}

/** "במבט אחד": 3–5 משפטי עובדה לפי הסדר: מה הכלי, בעלות, פעילות, ובסוף נקודות לתשומת לב */
function overviewOf(facts, attentionCount, coverage) {
  const out = [];
  if (facts.sources.spec.state === 'ok') out.push(vesselLine(facts));
  const own = ownershipLine(facts);
  out.push(own ?? `בעלות וניהול: ${facts.sources.ownership.state === 'unchecked' ? 'לא נבדק' : 'אין נתונים במקור'}.`);
  const act = activityLine(facts);
  out.push(act ?? `קריאות נמל: ${['portsB', 'portsC'].some((id) => facts.sources[id].state === 'unchecked') ? 'לא נבדק' : 'אין נתונים במקור'}.`);
  out.push(attentionCount
    ? `יש ${count(attentionCount, 'נקודה', 'נקודות')} לתשומת לב.`
    : coverage.missing.length ? `לא נמצאו נקודות לתשומת לב במקורות שנבדקו (${coverage.available} מתוך ${coverage.total}).` : 'לא נמצאו נקודות לתשומת לב.');
  return out;
}

/**
 * מריץ את הכללים על העובדות ומחזיר את התמונה.
 * attention: פלט כללי התצפית, בסדר הכללים (לא ממוין לפי חומרה). findings: אותן נקודות עם severity, ממוינות לפי חומרה,
 * נשמרות בנתונים למדרגה ב׳ (ראו showSeverity ב-thresholds.js).
 * @returns {{overview: string[], attentionCount: number, topics: object[], findings: object[], coverage: object, generatedAt: string}}
 */
export function buildSnapshot(facts, peers, generatedAt = facts.now) {
  const bySeverity = (a, b) => SEV_ORDER.indexOf(a.severity) - SEV_ORDER.indexOf(b.severity);
  const attention = RULES.filter((r) => r.when(facts, peers)).map((r) => ({
    id: r.id, severity: r.severity, topic: r.topic, text: r.text(facts, peers), evidence: r.evidence(facts), link: r.link,
  }));
  if (showSeverity) attention.sort(bySeverity);
  const missing = SOURCES.filter((s) => facts.sources[s.id].state !== 'ok').map((s) => ({ label: s.label, state: facts.sources[s.id].state }));
  const coverage = { available: SOURCES.length - missing.length, total: SOURCES.length, missing };
  return {
    overview: overviewOf(facts, attention.length, coverage),
    attentionCount: attention.length,
    topics: TOPICS.map((t) => topicOf(t, attention, facts, peers)),
    findings: [...attention].sort(bySeverity),
    coverage,
    generatedAt,
  };
}

/** טקסט רגיל להעתקה: אותו מבנה כמו המגירה (במבט אחד, נושאים עם נקודות לתשומת לב, כיסוי) */
export function snapshotToText(s, vesselName) {
  const lines = [`תמונת מצב: ${vesselName} (מבוסס כללים)`, '', 'במבט אחד:', ...s.overview.map((x) => `- ${x}`), ''];
  s.topics.forEach((t) => {
    lines.push(`${t.label}${t.attention.length ? ` (${t.attention.length} לתשומת לב)` : ''}:`);
    t.summary.forEach((x) => lines.push(`- ${x.text} (${x.evidence.map((e) => `${e.source}, עודכן ${e.asOf}`).join('; ')})`));
    if (t.note) lines.push(`- ${t.note}`);
    t.attention.forEach((a) => lines.push(`  * לתשומת לב: ${showSeverity ? `[${SEV_WORD[a.severity]}] ` : ''}${a.text} (${a.evidence.map((e) => `${e.source}, עודכן ${e.asOf}`).join('; ')})`));
    lines.push('');
  });
  lines.push(`כיסוי: נתונים מ-${s.coverage.available} מתוך ${s.coverage.total} מקורות${s.coverage.missing.length ? ` (חסר: ${s.coverage.missing.map((m) => m.label).join(', ')})` : ''}`, `הופק: ${s.generatedAt}`);
  return lines.join('\n');
}
