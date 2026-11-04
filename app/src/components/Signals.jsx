import { useState } from 'react';
import { SeverityBadge, Shape } from '../ui/Badges';
import Button from '../ui/Button';
import { Ltr, Mono } from '../ui/Ltr';
import Popover from '../ui/Popover';
import { SEVERITY_LABEL, severityRank } from '../ui/severity';
import { SIGNAL_KINDS } from '../data/companies';

export const kindOf = (id) => SIGNAL_KINDS.find((k) => k.id === id);
const signalOf = (c, kind) => c.signals.find((s) => s.kind === kind);

/**
 * תא אות בטבלה: תג חומרה (צורה + מילה); ✓ חלש כשאין אינדיקטורים (רק חריגות בולטות);
 * "לא הוערך" כשחסר מידע.
 */
export function SignalCell({ signal }) {
  if (!signal) return <SeverityBadge severity="unassessed" />;
  if (signal.severity === 'none') {
    return (
      <span className="ui-sev none signal-ok">
        <Shape risk="none" /><span className="sr-only">{SEVERITY_LABEL.none}</span>
      </span>
    );
  }
  return <SeverityBadge severity={signal.severity} />;
}

/** שלוש עמודות האותות בטבלה (הצעה), תחת כותרת-על "אותות" שחלה על שלושתן */
export const SIGNAL_COLUMNS = [
  { id: 'sig-fleet', kind: 'fleet', label: 'חריגות צי', weight: 9 },
  { id: 'sig-activity', kind: 'activity', label: 'פעילות', weight: 8 },
  { id: 'sig-links', kind: 'links', label: 'קשרים', weight: 8 },
].map((c) => ({
  ...c,
  group: 'אותות',
  groupTitle: 'תוצרי מודל',
  // לא הוערך נמוך מ'אין אינדיקטורים' במיון
  sort: (co) => { const sev = signalOf(co, c.kind)?.severity ?? 'unassessed'; return sev === 'unassessed' ? -1 : severityRank(sev); },
  render: (co) => <SignalCell signal={signalOf(co, c.kind)} />,
}));

/** כותרת אחת לכל האותות: מקור (תוצרי מודל), זמן עדכון וגרסה. לא חוזרים בכל כרטיס. */
export function SignalsHeading({ signals }) {
  const { updated, modelVersion } = signals[0];
  return (
    <div className="signals-heading">
      <h2>אותות · תוצרי מודל</h2>
      <span className="signals-meta">עודכן <Mono>{updated}</Mono> · גרסה <Mono>{modelVersion}</Mono></span>
    </div>
  );
}

/** "+N": כל הסיבות בחלונית קטנה */
function MoreReasons({ reasons }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onClose={() => setOpen(false)} panelProps={{ role: 'dialog', 'aria-label': 'כל הסיבות' }}
      anchor={<Button variant="text" size="sm" className="signal-more" aria-expanded={open} aria-label={`עוד ${reasons.length - 1} סיבות`}
        onClick={() => setOpen(!open)}><Ltr>+{reasons.length - 1}</Ltr></Button>}>
      <ul className="plain-list bulleted">{reasons.map((r) => <li key={r}>{r}</li>)}</ul>
    </Popover>
  );
}

/**
 * כרטיס אות: שם (14/600), חומרה בשורה קבועה, וסיבה אחת בשורה אחת עם +N.
 * כל הכרטיס לחיץ (קישור על השם נמתח על פני הכרטיס) וגולל למקטע הרלוונטי.
 */
export function SignalCard({ signal, href, onGo }) {
  const name = kindOf(signal.kind).label;
  const [first, ...rest] = signal.why;
  return (
    <div className="signal-card">
      <a className="signal-name" href={href} title={name} onClick={(e) => { e.preventDefault(); onGo(); }}>{name}</a>
      <div className="signal-sev">
        {signal.severity === 'none'
          ? <span className="ui-sev none signal-ok"><Shape risk="none" /><span className="sr-only">{SEVERITY_LABEL.none}</span></span>
          : <SeverityBadge severity={signal.severity} />}
      </div>
      <div className="signal-reason">
        {first && <span className="signal-reason-text" title={first}>{first}</span>}
        {rest.length > 0 && <MoreReasons reasons={signal.why} />}
      </div>
    </div>
  );
}

/** מגירת תצוגה מהירה: כל האות עם כל הסיבות (יש מקום), בלי תגי מודל חוזרים */
export function SignalDetail({ signal }) {
  return (
    <div className="signal-detail">
      <div className="signal-detail-head">
        <strong>{kindOf(signal.kind).label}</strong>
        <SeverityBadge severity={signal.severity} />
      </div>
      {signal.why.length > 0 && (
        <ul className="plain-list bulleted signal-why" aria-label="למה">
          {signal.why.map((w) => <li key={w}>{w}</li>)}
        </ul>
      )}
    </div>
  );
}
