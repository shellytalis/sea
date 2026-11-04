import { SeverityBadge } from '../ui/Badges';
import Chip from '../ui/Chip';
import { SEVERITY_LABEL } from '../ui/severity';

/**
 * חיווי "אינדיקטור פעילות חריגה": החומרה הגבוהה ביותר + מספר האינדיקטורים.
 * בלי אינדיקטורים: "אין אינדיקטורים" (נבדק ונקי) או "לא הוערך" (חסר מידע).
 * compact: "גבוה · 2" (לטבלאות). ואחריו הרשימות שהכלי נמצא בהן.
 */
export function VesselFlags({ v, withLists = true, compact }) {
  const n = v.indicators.length;
  const label = n === 0 ? undefined : compact ? `${SEVERITY_LABEL[v.risk]} · ${n}` : `אינדיקטור פעילות חריגה · ${SEVERITY_LABEL[v.risk]} · ${n}`;
  return (
    <>
      <SeverityBadge severity={v.risk} label={label} />
      {withLists && v.lists.map((l) => <Chip key={l}>ברשימה: {l}</Chip>)}
    </>
  );
}
