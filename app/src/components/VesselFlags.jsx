import { SeverityBadge } from '../ui/Badges';
import Chip from '../ui/Chip';
import { SEVERITY_LABEL } from '../ui/severity';

/**
 * חיווי "אינדיקטור פעילות חריגה": החומרה הגבוהה ביותר + מספר האינדיקטורים.
 * בלי אינדיקטורים: "אין אינדיקטורים" (נבדק ונקי) או "לא הוערך" (חסר מידע).
 * ואחריו הרשימות שהכלי נמצא בהן.
 */
export function VesselFlags({ v, withLists = true }) {
  const n = v.indicators.length;
  return (
    <>
      {n > 0
        ? <SeverityBadge severity={v.risk} label={`אינדיקטור פעילות חריגה · ${SEVERITY_LABEL[v.risk]} · ${n}`} />
        : <SeverityBadge severity={v.risk} />}
      {withLists && v.lists.map((l) => <Chip key={l}>ברשימה: {l}</Chip>)}
    </>
  );
}
