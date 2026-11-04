import { RiskBadge } from "../ui/Badges";
/** חיווי סיכון של הכלי + רשימות שבהן הוא נמצא (תמיד טקסט וצורה, לא צבע בלבד) */
export function VesselFlags({ v, withLists = true }) {
  return <>
      {v.risk === "danger" && <RiskBadge risk="high" label="פעולה מסוכנת" />}
      {v.risk === "warning" && <RiskBadge risk="med" label="חיווי אזהרה" />}
      {withLists && v.lists.map((l) => <span key={l} className="ui-chip static">ברשימה: {l}</span>)}
    </>;
}
