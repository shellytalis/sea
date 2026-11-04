import { useEffect, useRef } from 'react';

/**
 * Popover בסיסי: עוגן + חלונית. נסגר בלחיצה מחוץ ובמקש Esc.
 * fit: החלונית ברוחב העוגן (combobox); אחרת ברוחב התוכן.
 * panelProps: role / id / aria-* לחלונית.
 */
export default function Popover({ open, onClose, anchor, children, fit, className = '', panelProps }) {
  const ref = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    const down = (e) => { if (!ref.current?.contains(e.target)) closeRef.current(); };
    const key = (e) => { if (e.key === 'Escape') closeRef.current(); };
    document.addEventListener('mousedown', down);
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('mousedown', down);
      document.removeEventListener('keydown', key);
    };
  }, [open]);
  return (
    <div className={`ui-pop-wrap${fit ? ' fit' : ''}`} ref={ref}>
      {anchor}
      {open && <div {...panelProps} className={`ui-pop ${className}`.trim()}>{children}</div>}
    </div>
  );
}
