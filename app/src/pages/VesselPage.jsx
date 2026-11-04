import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ListPlus, Map, Upload } from "lucide-react";
import { VISITS_B, VISITS_C, getVessel } from "../data/vessels";
import { COMPANIES } from "../data/companies";
import { EntityHead, EntityPage, Facts, Section, StaticTable } from "../ui/Entity";
import Button, { LinkButton } from "../ui/Button";
import { EmptyState, ForbiddenState } from "../ui/States";
import { VesselFlags } from "../components/VesselFlags";
import AddToListDialog from "../components/AddToListDialog";
const visitCols = [
  {
    id: "port",
    label: "נמל",
    render: (r) => <bdi dir="ltr">{r.port}</bdi>
  },
  {
    id: "country",
    label: "מדינה",
    render: (r) => r.country
  },
  {
    id: "arrival",
    label: "הגעה",
    render: (r) => <span className="mono" dir="ltr">{r.arrival}</span>
  },
  {
    id: "departure",
    label: "יציאה",
    render: (r) => <span className="mono" dir="ltr">{r.departure}</span>
  }
];
/** שם חברה שקיים כישות במערכת הופך לקישור לפרופיל */
function CompanyRef({ name }) {
  const c = COMPANIES.find((x) => x.name === name);
  return c ? <Link to={`/companies/${c.id}`} className="link"><bdi dir="ltr">{name}</bdi></Link> : <bdi dir="ltr">{name}</bdi>;
}
export default function VesselPage() {
  const { id } = useParams();
  const v = getVessel(id);
  const [adding, setAdding] = useState(false);
  if (!v) {
    return <EmptyState title="הכלי לא נמצא">
        <span>בדוק את המזהה ונסה שוב.</span>
        <LinkButton to="/">חזרה למפה</LinkButton>
      </EmptyState>;
  }
  const src = v.stamp;
  const sections = [
    {
      id: "details",
      label: "פרטי הכלי"
    },
    {
      id: "position",
      label: "מיקום ותנועה"
    },
    ...v.riskNotes.length ? [{
      id: "risk",
      label: "חיוויי סיכון"
    }] : [],
    {
      id: "photos",
      label: "תמונות"
    },
    {
      id: "drawings",
      label: "שרטוטים"
    },
    {
      id: "activity",
      label: "פעילות"
    },
    {
      id: "files",
      label: "קבצים מצורפים"
    }
  ];
  return <>
      <EntityPage resetKey={v.id} sections={sections} header={<EntityHead title={<bdi dir="ltr">{v.name}</bdi>} meta={<>{v.type} · {v.flag} · <bdi dir="ltr" className="mono">IMO {v.imo}</bdi> · <bdi dir="ltr" className="mono">MMSI {v.mmsi}</bdi></>} badges={<VesselFlags v={v} />} actions={<>
              <LinkButton to={`/?v=${v.id}`} icon={<Map size={16} aria-hidden="true" />}>הצג על המפה</LinkButton>
              <Button variant="primary" icon={<ListPlus size={16} aria-hidden="true" />} onClick={() => setAdding(true)}>הוסף לרשימה</Button>
            </>} />}>
        <Section id="details" title="פרטי הכלי" source={src}>
          <Facts items={[
    ["סוג", v.type],
    ["דגל", v.flag],
    ["שנת בנייה", <span key="b" className="mono" dir="ltr">{v.built}</span>],
    ["DWT", <span key="d" className="mono" dir="ltr">{v.dwt.toLocaleString("en")} t</span>],
    ["אורך", <span key="l" className="mono" dir="ltr">{v.length} m</span>],
    ["סימן קריאה", <span key="c" className="mono" dir="ltr">{v.callSign}</span>],
    ["בעלים", <CompanyRef key="o" name={v.owner} />],
    ["מפעיל", <CompanyRef key="m" name={v.manager} />]
  ]} />
        </Section>

        <Section id="position" title="מיקום ותנועה" source={src}>
          <Facts items={[
    ["מיקום", <span key="p" className="mono" dir="ltr">{v.lat.toFixed(3)}, {v.lon.toFixed(3)}</span>],
    ["מהירות", <span key="s" className="mono" dir="ltr">{v.speed} kn</span>],
    ["כיוון", <span key="c" className="mono" dir="ltr">{v.course}°</span>],
    ["יעד", <bdi key="d" dir="ltr">{v.destination}</bdi>],
    ["קליטה אחרונה", <span key="r" className="mono" dir="ltr">{v.lastReceived}</span>]
  ]} />
        </Section>

        {v.riskNotes.length > 0 && <Section id="risk" title="חיוויי סיכון" source={src}>
            <ul className="plain-list bulleted">{v.riskNotes.map((n) => <li key={n}>{n}</li>)}</ul>
          </Section>}

        <Section id="photos" title="תמונות">
          <EmptyState title="אין תמונות זמינות לכלי זה" />
        </Section>

        <Section id="drawings" title="שרטוטים">
          <ForbiddenState title="אין הרשאה לצפייה בשרטוטים">נדרשת הרשאה ייעודית. פנה למנהל המערכת.</ForbiddenState>
        </Section>

        <Section id="activity" title="פעילות">
          <div className="entity-stack">
            <div>
              <h3 className="entity-sub">פעילות כללית · מקור א</h3>
              <EmptyState title="אין נתוני פעילות להצגה"><span>טבלת הפעילות הכללית תתחבר בשלב הבא.</span></EmptyState>
            </div>
            <div>
              <h3 className="entity-sub">ביקורים · מקור ב</h3>
              <StaticTable caption="ביקורים, מקור ב" columns={visitCols} rows={VISITS_B} rowKey={(r) => r.arrival} />
            </div>
            <div>
              <h3 className="entity-sub">ביקורים · מקור ג</h3>
              <StaticTable caption="ביקורים, מקור ג" columns={visitCols} rows={VISITS_C} rowKey={(r) => r.arrival} />
            </div>
          </div>
        </Section>

        <Section id="files" title="קבצים מצורפים">
          <EmptyState title="אין קבצים מצורפים">
            <span>סוגי קבצים, מגבלת גודל והרשאות העלאה טרם הוגדרו.</span>
            <Button disabled icon={<Upload size={16} aria-hidden="true" />}>העלה קובץ</Button>
          </EmptyState>
        </Section>
      </EntityPage>
      {adding && <AddToListDialog vessel={v} onClose={() => setAdding(false)} />}
    </>;
}
