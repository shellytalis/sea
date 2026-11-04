import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

/** מגירה צדדית לא חוסמת: Esc סוגר, הפוקוס עובר פנימה וחוזר לפותח */
export default function Drawer({ title, onClose, children, footer, side = 'end' }: {
  title: ReactNode; onClose: () => void; children: ReactNode; footer?: ReactNode; side?: 'start' | 'end';
}) {
  const ref = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>('button')?.focus();
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') closeRef.current(); };
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('keydown', key); opener?.focus?.(); };
  }, []);

  return (
    <aside className="ui-drawer" role="dialog" aria-label="תצוגה מהירה" data-side={side} ref={ref}>
      <header>
        <h2>{title}</h2>
        <button type="button" className="ui-icon-btn" onClick={onClose} aria-label="סגור"><X size={18} aria-hidden="true" /></button>
      </header>
      <div className="ui-drawer-body">{children}</div>
      {footer && <footer>{footer}</footer>}
    </aside>
  );
}
