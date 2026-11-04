import { Link } from 'react-router-dom';

/**
 * כפתור יחיד לכל המערכת.
 * variant: primary | secondary | text | icon | nav | seg | th
 * to: מרנדר Link; as: רכיב אחר (למשל NavLink); size="sm" לגובה 32px.
 */
export default function Button({
  variant = 'secondary', size, loading, block, icon, active, to, as, children, className = '', disabled, ...rest
}) {
  const cls = ['ui-btn', variant, size === 'sm' && 'sm', block && 'block', loading && 'loading', active && 'active', className]
    .filter(Boolean).join(' ');
  const body = <>{loading ? <span className="ui-spinner" aria-hidden="true" /> : icon}{children}</>;
  if (to || as) {
    const Comp = as ?? Link;
    return <Comp {...rest} to={to} className={cls}>{body}</Comp>;
  }
  return (
    <button {...rest} type={rest.type ?? 'button'} disabled={disabled || loading} aria-busy={loading || undefined}
      aria-pressed={variant === 'seg' ? !!active : rest['aria-pressed']} className={cls}>
      {body}
    </button>
  );
}
