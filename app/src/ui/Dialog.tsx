import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

/** דיאלוג מודאלי: Esc סוגר, Tab לא בורח החוצה, והפוקוס חוזר לפותח */
export default function Dialog({ title, onClose, children, footer }: {
  title: string; onClose: () => void; children: ReactNode; footer?: ReactNode;
}) {
  const id = useId();
  const box = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const focusables = () => [...(box.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select, [href], [tabindex="0"]') ?? [])];
    (box.current?.querySelector<HTMLElement>('input:not(:disabled)') ?? focusables()[0])?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { closeRef.current(); return; }
      if (e.key !== 'Tab') return;
      const f = focusables();
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('keydown', key); opener?.focus?.(); };
  }, []);

  return (
    <div className="ui-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="ui-dialog" role="dialog" aria-modal="true" aria-labelledby={id} ref={box}>
        <header>
          <h2 id={id}>{title}</h2>
          <button type="button" className="ui-icon-btn" onClick={onClose} aria-label="סגור"><X size={18} aria-hidden="true" /></button>
        </header>
        <div className="ui-dialog-body">{children}</div>
        {footer && <footer>{footer}</footer>}
      </div>
    </div>
  );
}
