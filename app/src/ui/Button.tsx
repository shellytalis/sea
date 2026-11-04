import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'text';
  loading?: boolean;
  block?: boolean;
  icon?: ReactNode;
}

export default function Button({ variant = 'secondary', loading, block, icon, children, className = '', disabled, ...rest }: Props) {
  return (
    <button
      {...rest}
      type={rest.type ?? 'button'}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`ui-btn ${variant}${block ? ' block' : ''}${loading ? ' loading' : ''} ${className}`}
    >
      {loading ? <span className="ui-spinner" aria-hidden="true" /> : icon}
      {children}
    </button>
  );
}

export function LinkButton({ to, variant = 'secondary', block, icon, children }: { to: string; variant?: 'primary' | 'secondary' | 'text'; block?: boolean; icon?: ReactNode; children: ReactNode }) {
  return <Link to={to} className={`ui-btn ${variant}${block ? ' block' : ''}`}>{icon}{children}</Link>;
}
