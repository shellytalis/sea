import { SeverityBadge } from '../ui/Badges';
import Chip from '../ui/Chip';
import { SEVERITY_LABEL } from '../ui/severity';

/** חיווי "אינדיקטור פעילות חריגה": החומרה הגבוהה ביותר + מספר האינדיקטורים; ורשימות שהכלי נמצא בהן */
export function VesselFlags({ v, withLists = true }) {
  const n = v.indicators.length;
  return (
    <>
      {n > 0 && <SeverityBadge severity={v.risk} label={`אינדיקטור פעילות חריגה · ${SEVERITY_LABEL[v.risk]} · ${n}`} />}
      {withLists && v.lists.map((l) => <Chip key={l}>ברשימה: {l}</Chip>)}
    </>
  );
}
