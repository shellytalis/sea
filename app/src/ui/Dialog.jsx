import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import Button from './Button';

/**
 * דיאלוג מודאלי: Esc סוגר, Tab לא בורח החוצה, והפוקוס חוזר לפותח.
 * footer: הפעולה המאשרת ראשונה (מימין ב-RTL) והביטול אחריה (משמאל).
 */
export default function Dialog({ title, onClose, children, footer }) {
  const id = useId();
  const box = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const opener = document.activeElement;
    const focusables = () => [...box.current?.querySelectorAll('button:not(:disabled), input:not(:disabled), select, [href], [tabindex="0"]') ?? []];
    (box.current?.querySelector('input:not(:disabled)') ?? focusables()[0])?.focus();
    const key = (e) => {
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
    <div className="ui-scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="ui-dialog" role="dialog" aria-modal="true" aria-labelledby={id} ref={box}>
        <header>
          <h2 id={id}>{title}</h2>
          <Button variant="icon" onClick={onClose} aria-label="סגור"><X size={16} aria-hidden="true" /></Button>
        </header>
        <div className="ui-dialog-body">{children}</div>
        {footer && <footer>{footer}</footer>}
      </div>
    </div>
  );
}
