import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import Button from './Button';

/**
 * מגירה צדדית: Esc סוגר, הפוקוס עובר פנימה וחוזר לפותח.
 * overlay: שכבה מעל התוכן (לא דוחפת ולא מקטינה אותו).
 */
export default function Drawer({ title, onClose, children, footer, side = 'end', overlay, label = 'תצוגה מהירה', className = '' }) {
  const ref = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const opener = document.activeElement;
    ref.current?.focus();
    const key = (e) => { if (e.key === 'Escape') closeRef.current(); };
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('keydown', key); opener?.focus?.(); };
  }, []);
  return (
    <aside className={`ui-drawer${overlay ? ' overlay' : ''} ${className}`.trim()} role="dialog" aria-label={label} data-side={side} ref={ref} tabIndex={-1}>
      <header>
        <h2>{title}</h2>
        <Button variant="icon" onClick={onClose} aria-label="סגור"><X size={16} aria-hidden="true" /></Button>
      </header>
      <div className="ui-drawer-body">{children}</div>
      {footer && <footer>{footer}</footer>}
    </aside>
  );
}
