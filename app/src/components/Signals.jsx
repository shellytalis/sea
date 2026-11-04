import { Cpu } from 'lucide-react';
import { ModelTag, SeverityBadge, Shape, Tooltip } from '../ui/Badges';
import { Mono } from '../ui/Ltr';
import { SEVERITY_LABEL, severityRank } from '../ui/severity';
import { SIGNAL_KINDS } from '../data/companies';

export const kindOf = (id) => SIGNAL_KINDS.find((k) => k.id === id);
const signalOf = (c, kind) => c.signals.find((s) => s.kind === kind);

/** אייקון מודל קטן אחד ליד כותרת הקבוצה "אותות", במקום תג בכל כותרת */
export function SignalsModelIcon() {
  return (
    <Tooltip text="תוצר מודל">
      <span className="ui-model-icon" aria-label="תוצר מודל"><Cpu size={14} aria-hidden="true" /></span>
    </Tooltip>
  );
}

/**
 * תא אות בטבלה: תג חומרה (צורה + מילה); ✓ כשאין אינדיקטורים; "לא הוערך" כשחסר מידע.
 */
export function SignalCell({ signal }) {
  if (!signal) return <SeverityBadge severity="unassessed" />;
  if (signal.severity === 'none') {
    return (
      <span className="ui-sev none">
        <Shape risk="none" /><span className="sr-only">{SEVERITY_LABEL.none}</span>
      </span>
    );
  }
  return <SeverityBadge severity={signal.severity} />;
}

/** הגדרות שלוש עמודות האותות (הצעה: ללא זהות, לפי הנחיית הטבלה) תחת כותרת-על "אותות" */
export const SIGNAL_COLUMNS = [
  { id: 'sig-fleet', kind: 'fleet', label: 'חריגות צי', weight: 9 },
  { id: 'sig-activity', kind: 'activity', label: 'פעילות', weight: 8 },
  { id: 'sig-links', kind: 'links', label: 'קשרים', weight: 8 },
].map((c) => ({
  ...c,
  group: 'אותות',
  groupExtra: <SignalsModelIcon />,
  // לא הוערך נמוך מ'אין אינדיקטורים' במיון
  sort: (co) => { const sev = signalOf(co, c.kind)?.severity ?? 'unassessed'; return sev === 'unassessed' ? -1 : severityRank(sev); },
  render: (co) => <SignalCell signal={signalOf(co, c.kind)} />,
}));

/** אות מלא: שם, חומרה, תג מודל, 2-3 גורמי "למה", זמן עדכון וגרסת מודל */
export function SignalDetail({ signal }) {
  const k = kindOf(signal.kind);
  return (
    <div className="signal-detail">
      <div className="signal-detail-head">
        <strong>{k.label}</strong>
        <SeverityBadge severity={signal.severity} />
        <ModelTag />
      </div>
      {signal.why.length > 0 && (
        <ul className="plain-list bulleted signal-why" aria-label="למה">
          {signal.why.map((w) => <li key={w}>{w}</li>)}
        </ul>
      )}
      <div className="signal-meta">
        עודכן <Mono>{signal.updated}</Mono> · גרסת מודל <Mono>{signal.modelVersion}</Mono>
      </div>
    </div>
  );
}
