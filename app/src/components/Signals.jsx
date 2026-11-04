import { Cpu } from 'lucide-react';
import { ModelTag, SeverityBadge, Shape, Tooltip } from '../ui/Badges';
import { SEVERITY_LABEL, maxSeverity, severityRank } from '../ui/severity';
import { SIGNAL_KINDS } from '../data/companies';

const kindOf = (id) => SIGNAL_KINDS.find((k) => k.id === id);

/** אייקון מודל קטן אחד ליד כותרת "אותות", במקום תג בכל כותרת */
export function SignalsModelIcon() {
  return (
    <Tooltip text="תוצר מודל">
      <span className="ui-model-icon" aria-label="תוצר מודל"><Cpu size={14} aria-hidden="true" /></span>
    </Tooltip>
  );
}

/** חומרה מובילה של החברה (לשימוש במיון בלבד; אין ציון מסכם לחברה) */
export const topSignalRank = (c) => severityRank(maxSeverity(c.signals.map((s) => s.severity)));

/**
 * חיווי קטן לפי סוג בתא הטבלה (צי / פעילות / קשרים). מציג רק אותות עם חומרה;
 * כשלא הוערך אף אות: "לא הוערך"; כשכולם נקיים: "אין אינדיקטורים".
 */
export function SignalPills({ signals, kinds = ['fleet', 'activity', 'links'] }) {
  const own = signals.filter((s) => kinds.includes(s.kind));
  if (own.every((s) => s.severity === 'unassessed')) return <SeverityBadge severity="unassessed" />;
  const flagged = own.filter((s) => severityRank(s.severity) > 0);
  if (flagged.length === 0) return <SeverityBadge severity="none" />;
  return (
    <span className="signals">
      {flagged.map((s) => (
        <span key={s.kind} className={`signal-pill ui-sev ${s.severity}`}
          title={`${kindOf(s.kind).label}: ${SEVERITY_LABEL[s.severity]}`}>
          <Shape risk={s.severity} />
          <span className="sr-only">{kindOf(s.kind).label}: </span>
          {kindOf(s.kind).short}
          <span className="signal-sev">{SEVERITY_LABEL[s.severity]}</span>
        </span>
      ))}
    </span>
  );
}

/** שורות אותות קצרות (מגירת תצוגה מהירה) */
export function SignalRows({ signals }) {
  return (
    <ul className="signal-rows">
      {signals.map((s) => (
        <li key={s.kind}>
          <span>{kindOf(s.kind).label}</span>
          <SeverityBadge severity={s.severity} />
        </li>
      ))}
    </ul>
  );
}

export { ModelTag };
