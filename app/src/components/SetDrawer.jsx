import { Check } from 'lucide-react';
import Drawer from '../ui/Drawer';
import { Shape } from '../ui/Badges';
import { Ltr } from '../ui/Ltr';
import { SEVERITY_LABEL } from '../ui/severity';

/**
 * מגירת המידע במצב "כל הסט": רשימת הסט (שם, סוג, צורת חומרה). לחיצה על שורה ממקדת את המפה על הכלי
 * ומגדירה אותו פעיל, בלי לצאת מהמצב.
 */
export default function SetDrawer({ vessels, activeId, colors, onActivate, onClose }) {
  return (
    <Drawer side="start" label="הסט" title={<>הסט ({vessels.length})<div className="ui-drawer-sub">לחיצה על כלי ממקדת אותו במפה</div></>} onClose={onClose}>
      <ul className="set-list" aria-label="כלים בסט">
        {vessels.map((v) => (
          <li key={v.id}>
            <button type="button" className={`set-row${v.id === activeId ? ' on' : ''}`} aria-current={v.id === activeId || undefined} onClick={() => onActivate(v.id)}>
              <span className={`mt-swatch vi-${colors[v.id] ?? 0}`} aria-hidden="true" />
              <Shape risk={v.risk} />
              <span className="set-row-text">
                <Ltr className="cell-name">{v.name}</Ltr>
                <span className="set-row-sub">{v.type} · {SEVERITY_LABEL[v.risk] ?? ''}</span>
              </span>
              {v.id === activeId && <Check size={16} aria-label="פעיל" />}
            </button>
          </li>
        ))}
      </ul>
    </Drawer>
  );
}
