import { RULES } from './rules.js';
import { SOURCES } from './collect.js';
import { activityLine, ownershipLine, summarizeTopic, vesselLine } from './summarize.js';
import { showSeverity } from './thresholds.js';

const SEV_ORDER = ['critical', 'high', 'medium', 'low'];
const SEV_WORD = { critical: 'קריטי', high: 'גבוה', medium: 'בינוני', low: 'נמוך' };

/**
 * נושאי התמונה, בסדר קבוע. sources: המקורות שהנושא נשען עליהם.
 * מצב נושא: data (נבדק, יש נתונים) | unchecked (המקור לא נבדק) | no-data (אין נתונים במקור).
 * נושא שיש בו עובדות ואין בו משפט מסומן פשוט מציג את העובדות (בלי משפט "נבדק ולא נמצא").
 */
export const TOPICS = [
  { id: 'identity', label: 'זהות', sources: ['identity', 'spec'], link: 'identity' },
  { id: 'ownership', label: 'בעלות וניהול', sources: ['ownership'], link: 'ownership' },
  { id: 'ports', label: 'פעילות ונמלים', sources: ['portsB', 'portsC', 'ais'], link: 'activity' },
  { id: 'utilization', label: 'ניצולת', sources: ['ais'], link: 'activity' },
  { id: 'events', label: 'רשימות ואירועים', sources: ['lists'], link: 'risk' },
];

const count = (n, one, many) => `${n} ${n === 1 ? one : many}`;

/**
 * מסמן את המשפטים שכלל תצפית הופעל עליהם (בלי רשימה נפרדת, בלי משפט כפול). כמה כללים על אותה עובדה = משפט אחד עם סמן.
 * כלל שאין לו משפט בנושא מוסיף משפט חלופי מהטקסט שלו. משפטים מסומנים קודם (סדר יציב), אחר כך שאר העובדות.
 */
function markSentences(topicId, sentences, firing, facts, peers) {
  const out = sentences.map((x) => ({ ...x, marked: false, rules: [] }));
  for (const r of firing.filter((x) => x.mark)) {
    const keys = [].concat(r.fact);
    const hit = out.filter((x) => keys.includes(x.key));
    if (!hit.length) {
      out.push({ key: `rule:${r.id}`, text: r.text(facts, peers), evidence: r.evidence(facts), marked: true, rules: [r.id] });
      continue;
    }
    hit.forEach((x) => { x.marked = true; x.rules.push(r.id); });
    if (r.detail && !hit[0].text.includes(r.detail(facts, peers))) hit[0].text = `${hit[0].text} ${r.detail(facts, peers)}`;
  }
  return [...out.filter((x) => x.marked), ...out.filter((x) => !x.marked)].map((x, i) => ({ ...x, id: `snap-${topicId}-${i}` }));
}

/** מקורות הנושא: כל מקור פעם אחת (לשורת "מקורות" אחת בסוף הנושא) */
const uniqueEvidence = (sentences) => {
  const by = new Map();
  sentences.flatMap((x) => x.evidence).forEach((e) => { if (!by.has(e.source) || by.get(e.source).asOf < e.asOf) by.set(e.source, e); });
  return [...by.values()];
};
/** תאריך העדכון האחרון מבין המקורות */
export const latest = (list) => list.reduce((m, e) => (e.asOf > m ? e.asOf : m), '');

function topicOf(t, firing, facts, peers) {
  const states = t.sources.map((id) => facts.sources[id]);
  const unchecked = states.filter((s) => s.state === 'unchecked');
  const state = states.some((s) => s.state === 'ok') ? 'data' : unchecked.length ? 'unchecked' : 'no-data';
  const mine = firing.filter((r) => r.topic === t.id);
  const summary = state === 'data' ? markSentences(t.id, summarizeTopic(t.id, facts, peers), mine, facts, peers) : [];
  const markedCount = summary.filter((x) => x.marked).length;
  return {
    ...t, state, summary, markedCount, evidence: uniqueEvidence(summary),
    note: state === 'unchecked' ? `לא הוערך: ${unchecked.map((s) => s.label).join(', ')} לא נבדק.`
      : state === 'no-data' ? 'אין נתונים בנושא זה.'
        : unchecked.length ? `${unchecked.map((s) => s.label).join(', ')}: לא נבדק.` : null,
  };
}

/** "במבט אחד": עד 3 משפטי עובדה לפי הסדר: מה הכלי, בעלות, פעילות. נקודות התשומת לב: שורת תוויות (attentionLabels), לא משפט */
function overviewOf(facts) {
  const out = [];
  if (facts.sources.spec.state === 'ok') out.push(vesselLine(facts));
  const own = ownershipLine(facts);
  out.push(own ?? `בעלות וניהול: ${facts.sources.ownership.state === 'unchecked' ? 'לא נבדק' : 'אין נתונים במקור'}.`);
  const act = activityLine(facts);
  out.push(act ?? `קריאות נמל: ${['portsB', 'portsC'].some((id) => facts.sources[id].state === 'unchecked') ? 'לא נבדק' : 'אין נתונים במקור'}.`);
  return out;
}

/** סדר קבוע של התוויות (לא לפי חומרה): רשימות, בעלות וניהול, זהות, פעילות, ניצולת */
const LABEL_ORDER = ['events', 'ownership', 'identity', 'ports', 'utilization'];

/** תוויות קצרות מהכללים שהופעלו, כל אחת מפנה למשפט המסומן שלה (`target` = מזהה המשפט). אותה תווית פעם אחת */
function labelsOf(firing, topics, facts, peers) {
  const out = [];
  const rules = firing.filter((r) => r.mark && r.label(facts, peers))
    .sort((a, b) => LABEL_ORDER.indexOf(a.topic) - LABEL_ORDER.indexOf(b.topic));
  for (const r of rules) {
    const label = r.label(facts, peers);
    const target = topics.find((t) => t.id === r.topic)?.summary.find((x) => x.rules.includes(r.id));
    if (target && !out.some((o) => o.label === label)) out.push({ label, topic: r.topic, target: target.id });
  }
  return out;
}
/**
 * מריץ את הכללים על העובדות ומחזיר את התמונה.
 * topics[].summary: רשימה אחת של משפטים, המסומנים (`marked`) ראשונים. findings: פלט הכללים עם severity, ממוין לפי חומרה,
 * נשמר בנתונים למדרגה ב׳ (ראו showSeverity ב-thresholds.js); לא מוצג.
 * @returns {{overview: string[], attentionLabels: {label: string, topic: string, target: string}[], attentionCount: number, topics: object[], findings: object[], coverage: object, generatedAt: string}}
 */
export function buildSnapshot(facts, peers, generatedAt = facts.now) {
  const bySeverity = (a, b) => SEV_ORDER.indexOf(a.severity) - SEV_ORDER.indexOf(b.severity);
  const firing = RULES.filter((r) => r.when(facts, peers));
  const findings = firing.map((r) => ({ id: r.id, severity: r.severity, topic: r.topic, text: r.text(facts, peers), evidence: r.evidence(facts), link: r.link, mark: r.mark }));
  const missing = SOURCES.filter((s) => facts.sources[s.id].state !== 'ok').map((s) => ({ label: s.label, state: facts.sources[s.id].state }));
  const coverage = { available: SOURCES.length - missing.length, total: SOURCES.length, missing };
  const topics = TOPICS.map((t) => topicOf(t, firing, facts, peers));
  const attentionCount = topics.reduce((n, t) => n + t.markedCount, 0);
  return {
    overview: overviewOf(facts),
    attentionLabels: labelsOf(firing, topics, facts, peers),
    attentionCount,
    topics,
    findings: findings.sort(bySeverity),
    coverage,
    generatedAt,
  };
}

/** טקסט רגיל להעתקה: אותו מבנה כמו המגירה; משפט מסומן נפתח ב-"▸" (בנוסף "לתשומת לב") */
export function snapshotToText(s, vesselName) {
  const src = (list) => `מקורות: ${list.map((e) => e.source).join(' · ')} · עודכן לאחרונה ${latest(list)}`;
  const sev = (x) => (showSeverity ? findingSeverity(s, x) : '');
  const lines = [`תמונת מצב: ${vesselName} (מבוסס כללים)`, '', 'במבט אחד:', ...s.overview.map((x) => `- ${x}`), ...(s.attentionLabels.length ? [`- לתשומת לב: ${s.attentionLabels.map((a) => a.label).join(' · ')}`] : []), ''];
  s.topics.forEach((t) => {
    lines.push(`${t.label}${t.markedCount ? ` (${t.markedCount} לתשומת לב)` : ''}:`);
    t.summary.forEach((x) => lines.push(x.marked ? `▸ ${sev(x)}${x.text} (לתשומת לב)` : `- ${x.text}`));
    if (t.note) lines.push(`- ${t.note}`);
    if (t.evidence.length) lines.push(`  ${src(t.evidence)}`);
    lines.push('');
  });
  lines.push(`כיסוי: נתונים מ-${s.coverage.available} מתוך ${s.coverage.total} מקורות${s.coverage.missing.length ? ` (חסר: ${s.coverage.missing.map((m) => m.label).join(', ')})` : ''}`, `הופק: ${s.generatedAt}`);
  return lines.join('\n');
}

/** מדרגה ב׳ (showSeverity): חומרת הכלל הראשון שסימן את המשפט */
function findingSeverity(s, sentence) {
  const f = s.findings.find((x) => sentence.rules.includes(x.id));
  return f ? `[${SEV_WORD[f.severity]}] ` : '';
}
