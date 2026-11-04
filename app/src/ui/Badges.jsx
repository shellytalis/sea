import { useId, useState } from 'react';
import { SEVERITY_LABEL } from './severity';

const COLOR = {
  low: 'var(--sev-low)', medium: 'var(--sev-medium)', high: 'var(--sev-high)',
  critical: 'var(--sev-critical)', unassessed: 'var(--sev-unassessed)', none: 'var(--sev-none)',
};

/** צורה שונה לכל רמה, כדי שהצבע לא יהיה הנושא היחיד של המשמעות */
export function Shape({ risk, color }) {
  const c = color ?? COLOR[risk];
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" className="ui-shape">
      {risk === 'low' && <circle cx="6" cy="6" r="5" fill={c} />}
      {risk === 'medium' && <path d="M6 1 11.2 10.5H.8Z" fill={c} />}
      {risk === 'high' && <path d="M6 .5 11.5 6 6 11.5.5 6Z" fill={c} />}
      {risk === 'critical' && <path d="M1.5 1.5h9v9h-9Z" fill={c} />}
      {risk === 'unassessed' && <circle cx="6" cy="6" r="4.2" fill="none" stroke={c} strokeWidth="1.6" strokeDasharray="2.2 1.6" />}
      {risk === 'none' && <path d="M2 6.4 4.8 9 10 3.2" fill="none" stroke={c} strokeWidth="1.8" />}
    </svg>
  );
}

/** חיווי חומרה: טקסט + צורה + צבע, תמיד יחד */
export function SeverityBadge({ severity, label, className = '' }) {
  return (
    <span className={`ui-sev ${severity} ${className}`.trim()}>
      <Shape risk={severity} />{label ?? SEVERITY_LABEL[severity]}
    </span>
  );
}

export function Tooltip({ text, children, focusable }) {
  const id = useId();
  const [on, setOn] = useState(false);
  return (
    <span className="ui-tip" tabIndex={focusable ? 0 : undefined} aria-describedby={on ? id : undefined}
      onMouseEnter={() => setOn(true)} onMouseLeave={() => setOn(false)}
      onFocus={() => setOn(true)} onBlur={() => setOn(false)}
      onKeyDown={(e) => { if (e.key === 'Escape') setOn(false); }}>
      {children}
      {on && <span role="tooltip" id={id} className="ui-tooltip">{text}</span>}
    </span>
  );
}

/** תג "מודל": ערך שמופק מניתוח ולא נתון גולמי */
export function ModelTag({ label = 'מודל' }) {
  return <Tooltip focusable text="תוצר מודל, לא נתון גולמי"><span className="ui-model">{label}</span></Tooltip>;
}
