import { RULES } from './rules.js';
import { SOURCES } from './collect.js';

const SEV_ORDER = ['critical', 'high', 'medium', 'low'];
const SEV_WORD = { critical: 'קריטי', high: 'גבוה', medium: 'בינוני', low: 'נמוך' };

/**
 * נושאי התמונה. sources: המקורות שהנושא נשען עליהם.
 * מצב נושא: has-data (יש ממצאים) | no-findings (נבדק ולא נמצאו ממצאים) | unchecked (המקור לא נבדק) | no-data (אין נתונים במקור).
 */
export const TOPICS = [
  { id: 'identity', label: 'זהות', sources: ['identity', 'spec'], link: 'identity' },
  { id: 'ownership', label: 'בעלות וניהול', sources: ['ownership'], link: 'ownership' },
  { id: 'ports', label: 'קריאות נמל', sources: ['portsB', 'portsC'], link: 'activity' },
  { id: 'utilization', label: 'ניצולת', sources: ['ais'], link: 'activity' },
  { id: 'events', label: 'אירועים ורשימות', sources: ['ais', 'lists'], link: 'risk' },
];

const count = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const joinWords = (xs) => xs.join(', ');

function sevSummary(findings) {
  return SEV_ORDER.map((s) => [s, findings.filter((f) => f.severity === s).length]).filter(([, n]) => n > 0)
    .map(([s, n]) => `${n} ${SEV_WORD[s]}`).join(', ');
}

function topicOf(t, findings, facts) {
  const mine = findings.filter((f) => f.topic === t.id);
  const states = t.sources.map((id) => facts.sources[id]);
  const okSources = states.filter((s) => s.state === 'ok');
  const unchecked = states.filter((s) => s.state === 'unchecked');
  if (mine.length) {
    return { ...t, state: 'has-data', text: `${count(mine.length, 'ממצא', 'ממצאים')}: ${sevSummary(mine)}.`, findingIds: mine.map((f) => f.id) };
  }
  if (okSources.length) {
    const note = unchecked.length ? ` ${joinWords(unchecked.map((s) => s.label))}: לא נבדק.` : '';
    return { ...t, state: 'no-findings', text: `נבדק ולא נמצאו ממצאים.${note}`, findingIds: [] };
  }
  if (unchecked.length) {
    return { ...t, state: 'unchecked', text: `לא הוערך: ${joinWords(unchecked.map((s) => s.label))} לא נבדק.`, findingIds: [] };
  }
  return { ...t, state: 'no-data', text: 'אין נתונים בנושא זה.', findingIds: [] };
}

function conclusionOf(findings, coverage) {
  if (findings.length) {
    return { severity: findings[0].severity, text: `${count(findings.length, 'ממצא', 'ממצאים')}: ${sevSummary(findings)}` };
  }
  if (coverage.available === 0) return { severity: 'unassessed', text: 'לא הוערך: אין נתונים זמינים על הכלי' };
  if (coverage.missing.length) return { severity: 'none', text: `אין אינדיקטורים במקורות שנבדקו (${coverage.available} מתוך ${coverage.total})`, partial: true };
  return { severity: 'none', text: 'אין אינדיקטורים' };
}

/**
 * מריץ את הכללים על העובדות ומחזיר את התמונה.
 * @returns {{conclusion:{severity:string,text:string}, findings:object[], topics:object[], coverage:{available:number,total:number,missing:string[]}, generatedAt:string}}
 */
export function buildSnapshot(facts, peers, generatedAt = facts.now) {
  const findings = RULES.filter((r) => r.when(facts, peers)).map((r) => ({
    id: r.id, severity: r.severity, topic: r.topic, text: r.text(facts, peers), evidence: r.evidence(facts), link: r.link,
  })).sort((a, b) => SEV_ORDER.indexOf(a.severity) - SEV_ORDER.indexOf(b.severity)
    || TOPICS.findIndex((t) => t.id === a.topic) - TOPICS.findIndex((t) => t.id === b.topic));
  const missing = SOURCES.filter((s) => facts.sources[s.id].state !== 'ok').map((s) => ({ label: s.label, state: facts.sources[s.id].state }));
  const coverage = { available: SOURCES.length - missing.length, total: SOURCES.length, missing };
  return {
    conclusion: conclusionOf(findings, coverage),
    findings,
    topics: TOPICS.map((t) => topicOf(t, findings, facts)),
    coverage,
    generatedAt,
  };
}

/** טקסט רגיל להעתקה */
export function snapshotToText(s, vesselName) {
  const lines = [`תמונת מצב: ${vesselName} (מבוסס כללים)`, s.conclusion.text, ''];
  if (s.findings.length) {
    lines.push('ממצאים:');
    s.findings.forEach((f) => lines.push(`- [${SEV_WORD[f.severity]}] ${f.text} (${f.evidence.map((e) => `${e.source}, עודכן ${e.asOf}`).join('; ')})`));
    lines.push('');
  }
  lines.push('סיכום לפי נושא:');
  s.topics.forEach((t) => lines.push(`- ${t.label}: ${t.text}`));
  lines.push('', `כיסוי: נתונים מ-${s.coverage.available} מתוך ${s.coverage.total} מקורות${s.coverage.missing.length ? ` (חסר: ${s.coverage.missing.map((m) => m.label).join(', ')})` : ''}`, `הופק: ${s.generatedAt}`);
  return lines.join('\n');
}
