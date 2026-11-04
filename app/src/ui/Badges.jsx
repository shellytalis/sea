import { useId, useState } from "react";
import { X } from "lucide-react";
export const RISK_LABEL = {
  low: "נמוך",
  med: "בינוני",
  high: "גבוה",
  unchecked: "לא נבדק"
};
export const RISKS = [
  "high",
  "med",
  "low",
  "unchecked"
];
/** צורה שונה לכל רמה, כדי שהצבע לא יהיה הנושא היחיד של המשמעות */
export function Shape({ risk, color }) {
  const c = color ?? {
    low: "var(--risk-low)",
    med: "var(--risk-med)",
    high: "var(--risk-high)",
    unchecked: "var(--text-tertiary)"
  }[risk];
  return <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
      {risk === "low" && <circle cx="6" cy="6" r="5" fill={c} />}
      {risk === "med" && <path d="M6 1 11.2 10.5H.8Z" fill={c} />}
      {risk === "high" && <path d="M6 .5 11.5 6 6 11.5.5 6Z" fill={c} />}
      {risk === "unchecked" && <circle cx="6" cy="6" r="4.2" fill="none" stroke={c} strokeWidth="1.6" />}
    </svg>;
}
export function RiskBadge({ risk, label }) {
  return <span className={`ui-risk ${risk}`}><Shape risk={risk} />{label ?? RISK_LABEL[risk]}</span>;
}
export function Tooltip({ text, children, focusable }) {
  const id = useId();
  const [on, setOn] = useState(false);
  return <span className="ui-tip" tabIndex={focusable ? 0 : undefined} aria-describedby={on ? id : undefined} onMouseEnter={() => setOn(true)} onMouseLeave={() => setOn(false)} onFocus={() => setOn(true)} onBlur={() => setOn(false)} onKeyDown={(e) => {
    if (e.key === "Escape") setOn(false);
  }}>
      {children}
      {on && <span role="tooltip" id={id} className="ui-tooltip">{text}</span>}
    </span>;
}
export function ModelTag() {
  return <Tooltip focusable text="ערך שמופק מניתוח ולא נתון גולמי"><span className="ui-model">מודל</span></Tooltip>;
}
export function Chip({ label, onRemove }) {
  return <span className="ui-chip">
      {label}
      {onRemove && <button type="button" onClick={onRemove} aria-label="הסר מסנן"><X size={12} aria-hidden="true" /></button>}
    </span>;
}
