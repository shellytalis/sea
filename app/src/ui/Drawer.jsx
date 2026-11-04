import { useEffect, useRef } from "react";
import { X } from "lucide-react";
/** מגירה צדדית לא חוסמת: Esc סוגר, הפוקוס עובר פנימה וחוזר לפותח */
export default function Drawer({ title, onClose, children, footer, side = "end" }) {
  const ref = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const opener = document.activeElement;
    ref.current?.querySelector("button")?.focus();
    const key = (e) => {
      if (e.key === "Escape") closeRef.current();
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      opener?.focus?.();
    };
  }, []);
  return <aside className="ui-drawer" role="dialog" aria-label="תצוגה מהירה" data-side={side} ref={ref}>
      <header>
        <h2>{title}</h2>
        <button type="button" className="ui-icon-btn" onClick={onClose} aria-label="סגור"><X size={18} aria-hidden="true" /></button>
      </header>
      <div className="ui-drawer-body">{children}</div>
      {footer && <footer>{footer}</footer>}
    </aside>;
}
