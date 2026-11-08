import { Hexagon, Mountain, Navigation, Radius, Route, Ruler, ScanSearch, Target, Timer, X } from 'lucide-react';
import { Mono } from '../../ui/Ltr';
import { Ltr } from '../../ui/Ltr';

/** הכלים הכלליים: זמינים תמיד. soon = עדיין לא ממומש (שלבים הבאים) */
export const GENERAL_TOOLS = [
  { id: 'distance', label: 'מרחק', icon: Ruler },
  { id: 'radius', label: 'רדיוס חופשי', icon: Radius },
  { id: 'area', label: 'שטח', icon: Hexagon },
  { id: 'height', label: 'גובה', icon: Mountain },
  { id: 'terrain', label: 'חקירת שטח', icon: ScanSearch },
  { id: 'time', label: 'חישוב זמנים', icon: Timer },
];

/** כלי כלי השיט: רק כשכלי נבחר */
export const VESSEL_TOOLS = [
  { id: 'prox', label: 'מעגלי קרבה', icon: Target },
  { id: 'route', label: 'מסלול', icon: Route },
  { id: 'arrival', label: 'חישוב הגעה', icon: Navigation },
];

/** סרגל כלים כלליים, אנכי בקצה ה-end של המפה. תוויות גלויות, בלי tooltip. */
export function GeneralToolbar({ active, onPick, canClear, onClear }) {
  return (
    <nav className="mt-bar" aria-label="כלי מפה">
      {GENERAL_TOOLS.map((t) => {
        const on = active === t.id;
        const Icon = t.icon;
        return (
          <button key={t.id} type="button" className={`mt-tool${on ? ' active' : ''}`} aria-pressed={t.soon ? undefined : on}
            disabled={t.soon} onClick={() => onPick(t.id)}>
            <Icon size={20} aria-hidden="true" />
            <span className="mt-tool-label">{t.label}</span>
            {t.soon && <span className="mt-tool-soon">בקרוב</span>}
          </button>
        );
      })}
      {canClear && (
        <button type="button" className="mt-tool mt-clear" onClick={onClear}>
          <X size={20} aria-hidden="true" />
          <span className="mt-tool-label">נקה הכול</span>
        </button>
      )}
    </nav>
  );
}

/** סרגל כלי שיט: מופיע רק כשכלי נבחר; מעוגן בצד הנגדי למקרא */
export function VesselBar({ vessel, active, onPick, onClose }) {
  return (
    <section className="mt-vbar" aria-label={`כלים לכלי ${vessel.name}`}>
      <div className="mt-vctx">
        <Ltr className="mt-vname">{vessel.name}</Ltr>
        <span className="mt-vimo"><Mono>IMO {vessel.imo}</Mono></span>
      </div>
      <span className="mt-vsep" aria-hidden="true" />
      <div className="mt-vtools">
        {VESSEL_TOOLS.map((t) => {
          const Icon = t.icon;
          const on = active === t.id;
          return (
            <button key={t.id} type="button" className={`mt-vtool${on ? ' active' : ''}`} aria-pressed={t.soon ? undefined : on}
              disabled={t.soon} onClick={() => onPick(t.id)}>
              <Icon size={20} aria-hidden="true" />
              <span className="mt-vtool-text">
                <span>{t.label}</span>
                {t.soon && <span className="mt-tool-soon">בקרוב</span>}
              </span>
            </button>
          );
        })}
      </div>
      <button type="button" className="mt-vclose" aria-label="סגירה וביטול בחירת הכלי" onClick={onClose}>
        <X size={16} aria-hidden="true" />
      </button>
    </section>
  );
}
