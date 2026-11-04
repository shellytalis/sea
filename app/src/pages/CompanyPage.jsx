import { Link, useParams } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { getCompany } from "../data/companies";
import { getVessel } from "../data/vessels";
import { EntityHead, EntityPage, Facts, Metrics, Section, StaticTable } from "../ui/Entity";
import { ModelTag, RiskBadge } from "../ui/Badges";
import { EmptyState } from "../ui/States";
import { LinkButton } from "../ui/Button";
import { VesselFlags } from "../components/VesselFlags";
const SECTIONS = [
  {
    id: "overview",
    label: "סקירה"
  },
  {
    id: "fleet",
    label: "צי"
  },
  {
    id: "structure",
    label: "מבנה ארגוני"
  },
  {
    id: "contact",
    label: "פרטי קשר"
  }
];
export default function CompanyPage() {
  const { id } = useParams();
  const c = getCompany(id);
  if (!c) {
    return <EmptyState title="החברה לא נמצאה">
        <LinkButton to="/companies">חזרה לחיפוש חברות</LinkButton>
      </EmptyState>;
  }
  const src = c.stamp;
  const fleet = c.vesselIds.map(getVessel).filter((v) => !!v);
  const columns = [
    {
      id: "name",
      label: "שם",
      render: (v) => <Link to={`/vessels/${v.id}`} className="link cell-name"><bdi dir="ltr">{v.name}</bdi></Link>
    },
    {
      id: "imo",
      label: "IMO",
      render: (v) => <span className="mono" dir="ltr">{v.imo}</span>
    },
    {
      id: "type",
      label: "סוג",
      render: (v) => v.type
    },
    {
      id: "role",
      label: "תפקיד החברה",
      render: (v) => c.roles.find((r) => r.vessel === v.id)?.role ?? "—"
    },
    {
      id: "flags",
      label: "חיווי",
      render: (v) => v.risk === "none" ? <span className="ui-hint">ללא חיווי</span> : <VesselFlags v={v} withLists={false} />
    }
  ];
  return <EntityPage resetKey={c.id} sections={SECTIONS} header={<EntityHead back={<Link to="/companies" className="entity-back"><ArrowRight size={14} aria-hidden="true" />חזרה לחיפוש חברות</Link>} title={<bdi dir="ltr">{c.name}</bdi>} meta={<>{c.type} · {c.country}, <bdi dir="ltr">{c.city}</bdi></>} badges={<><RiskBadge risk={c.risk} />{c.roleList.map((r) => <span key={r} className="ui-chip static">{r}</span>)}</>} />}>
      <Section id="overview" title="סקירה" source={src}>
        <Metrics items={[
    ["רמת סיכון", <span key="r" className="metric-risk"><RiskBadge risk={c.risk} />{c.riskScore !== null && <span className="mono" dir="ltr">{c.riskScore}</span>}<ModelTag /></span>],
    ["חריגות פעילות", c.anomalies === null ? <span className="ui-hint">לא נבדק</span> : <span className="mono" dir="ltr">{c.anomalies}</span>],
    ["גודל צי", <span key="f" className="mono" dir="ltr">{c.fleetSize}</span>],
    ["שנת הקמה", <span key="y" className="mono" dir="ltr">{c.founded}</span>]
  ]} />
        <Facts items={[
    ["סוג חברה", c.type],
    ["תפקידים", c.roleList.join(", ")],
    ["מספר D&B", <span key="d" className="mono" dir="ltr">{c.dnb}</span>],
    ["חברת אם", c.parent ?? "אין"]
  ]} />
      </Section>

      <Section id="fleet" title="צי" source={src}>
        {fleet.length === 0 ? <EmptyState title="אין כלים משויכים במערכת">
            <span>לחברה מוגדרים <bdi dir="ltr">{c.fleetSize}</bdi> כלים, אך אף אחד מהם עדיין לא קיים כישות במערכת.</span>
          </EmptyState> : <>
            <p className="entity-note">מוצגים {fleet.length} מתוך <bdi dir="ltr">{c.fleetSize}</bdi> כלים הזמינים במערכת.</p>
            <StaticTable caption="כלי השיט של החברה" columns={columns} rows={fleet} rowKey={(v) => v.id} />
          </>}
      </Section>

      <Section id="structure" title="מבנה ארגוני" source={src}>
        <Facts items={[["חברת אם", c.parent ?? "אין"], ["חברות בנות", c.subsidiaries.length ? <ul key="s" className="plain-list">{c.subsidiaries.map((s) => <li key={s}><bdi dir="ltr">{s}</bdi></li>)}</ul> : "אין"]]} />
      </Section>

      <Section id="contact" title="פרטי קשר" source={src}>
        <Facts items={[
    ["כתובת", <bdi key="a" dir="ltr">{c.address}</bdi>],
    ["אתר", <bdi key="w" dir="ltr">{c.website}</bdi>],
    ["טלפון", <bdi key="p" dir="ltr">{c.phone}</bdi>]
  ]} />
      </Section>
    </EntityPage>;
}
