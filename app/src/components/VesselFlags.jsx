import { SeverityBadge } from '../ui/Badges';
import Chip from '../ui/Chip';
import { SEVERITY_LABEL } from '../ui/severity';

/** חיווי "אינדיקטור פעילות חריגה" של הכלי + רשימות שבהן הוא נמצא (תמיד טקסט וצורה, לא צבע בלבד) */
export function VesselFlags({ v, withLists = true }) {
  const flagged = v.risk !== 'none';
  return (
    <>
      {flagged && <SeverityBadge severity={v.risk} label={`אינדיקטור פעילות חריגה · ${SEVERITY_LABEL[v.risk]}`} />}
      {withLists && v.lists.map((l) => <Chip key={l}>ברשימה: {l}</Chip>)}
    </>
  );
}
