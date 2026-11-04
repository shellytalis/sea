import { useState } from 'react';
import { SeverityBadge, Shape } from '../ui/Badges';
import { Ltr, Num } from '../ui/Ltr';
import Panel from '../ui/Panel';
import Popover from '../ui/Popover';
import { SEVERITY_LABEL, severityRank } from '../ui/severity';
import { SIGNAL_KINDS } from '../data/companies';

export const kindOf = (id) => SIGNAL_KINDS.find((k) => k.id === id);
const signalOf = (c, kind) => c.signals.find((s) => s.kind === kind);

/**
 * תא אות בטבלה: צורה בצבע החומרה + תווית 13/500 בטקסט ראשי; ✓ ב-tertiary כשאין אינדיקטורים;
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

/** שלוש עמודות האותות בטבלה (הצעה), ברוחב קבוע 120, תחת כותרת-על "אותות" */
export const SIGNAL_COLUMNS = [
  { id: 'sig-fleet', kind: 'fleet', label: 'חריגות צי' },
  { id: 'sig-activity', kind: 'activity', label: 'פעילות' },
  { id: 'sig-links', kind: 'links', label: 'קשרים' },
].map((c) => ({
  ...c,
  width: 120,
  group: 'אותות',
  groupTitle: 'תוצרי מודל',
  // לא הוערך נמוך מ'אין אינדיקטורים' במיון
  sort: (co) => { const sev = signalOf(co, c.kind)?.severity ?? 'unassessed'; return sev === 'unassessed' ? -1 : severityRank(sev); },
  render: (co) => <SignalCell signal={signalOf(co, c.kind)} />,
}));

/** מטא של הכותרת: תוצרי מודל · עודכן · גרסה */
export const signalsMeta = (signals) => (
  <>תוצרי מודל · עודכן <Num>{signals[0].updated}</Num> · גרסה <Num>{signals[0].modelVersion}</Num></>
);

/** כותרת קטנה לאותות במגירה */
export function SignalsHeading({ signals }) {
  return (
    <div className="signals-heading">
      <h2>אותות</h2>
      <span className="panel-sep" aria-hidden="true">·</span>
      <span className="signals-meta">{signalsMeta(signals)}</span>
    </div>
  );
}

/** "עוד N גורמים": כל הסיבות בפופאובר */
function MoreReasons({ reasons }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onClose={() => setOpen(false)} panelProps={{ role: 'dialog', 'aria-label': 'כל הגורמים' }}
      anchor={<button type="button" className="signal-more" aria-expanded={open} onClick={() => setOpen(!open)}>עוד <Ltr>{reasons.length - 1}</Ltr> גורמים</button>}>
      <ul className="plain-list bulleted">{reasons.map((r) => <li key={r}>{r}</li>)}</ul>
    </Popover>
  );
}

/** עמודת אות: שם, חומרה, הגורם הראשון, "עוד N". כל העמודה לחיצה (קישור על השם נמתח על פניה) */
function SignalColumn({ signal, href, onGo }) {
  const [first] = signal.why;
  return (
    <div className="signal-col">
      <a className="signal-name" href={href} onClick={(e) => { e.preventDefault(); onGo(); }}>{kindOf(signal.kind).label}</a>
      <div className="signal-sev">
        {signal.severity === 'none'
          ? <span className="ui-sev none signal-ok"><Shape risk="none" />אין אינדיקטורים</span>
          : <SeverityBadge severity={signal.severity} />}
      </div>
      <div className="signal-reason">{first}</div>
      {signal.why.length > 1 ? <MoreReasons reasons={signal.why} /> : <span />}
    </div>
  );
}

/**
 * Panel יחיד לאותות החברה (אין ציון מסכם). ארבע עמודות שוות; כשכולם "לא הוערך": שורה אחת.
 * target: לאיזה מקטע גוללים מכל אות.
 */
export function SignalsPanel({ signals, target, onGo }) {
  const allUnassessed = signals.every((s) => s.severity === 'unassessed');
  return (
    <Panel id="signals" title="אותות" meta={signalsMeta(signals)} flush={!allUnassessed}>
      {allUnassessed ? (
        <div className="signals-note"><SeverityBadge severity="unassessed" /><span className="sub">אין מספיק נתוני פעילות בחלון הניתוח</span></div>
      ) : (
        <div className="signals-grid">
          {signals.map((s) => <SignalColumn key={s.kind} signal={s} href={`#${target[s.kind]}`} onGo={() => onGo(target[s.kind])} />)}
        </div>
      )}
    </Panel>
  );
}

/** מגירת תצוגה מהירה: כל האות עם כל הסיבות (יש מקום) */
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
