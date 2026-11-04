import { Link } from "react-router-dom";
export default function Button({ variant = "secondary", loading, block, icon, children, className = "", disabled, ...rest }) {
  return <button {...rest} type={rest.type ?? "button"} disabled={disabled || loading} aria-busy={loading || undefined} className={`ui-btn ${variant}${block ? " block" : ""}${loading ? " loading" : ""} ${className}`}>
      {loading ? <span className="ui-spinner" aria-hidden="true" /> : icon}
      {children}
    </button>;
}
export function LinkButton({ to, variant = "secondary", block, icon, children }) {
  return <Link to={to} className={`ui-btn ${variant}${block ? " block" : ""}`}>{icon}{children}</Link>;
}
