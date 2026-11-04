import { Link, useLocation, useParams } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { getCompany } from "../data/companies";
import { getVessel } from "../data/vessels";
import { EntityHead, EntityPage, Facts, Metrics, Section, StaticTable } from "../ui/Entity";
import { ModelTag, SeverityBadge } from "../ui/Badges";
import { Ltr, Mono } from "../ui/Ltr";
import Chip from "../ui/Chip";

import { EmptyState } from "../ui/States";
import Button from "../ui/Button";
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
  const backTo = `/companies${useLocation().state?.back ?? ""}`;
  const c = getCompany(id);
  if (!c) {
    return <EmptyState title="החברה לא נמצאה">
        <Button to="/companies">חזרה לחיפוש חברות</Button>
      </EmptyState>;
  }
  const src = c.stamp;
  const fleet = c.vesselIds.map(getVessel).filter((v) => !!v);
  const columns = [
    {
      id: "name",
      label: "שם",
      render: (v) => <Link to={`/vessels/${v.id}`} className="link cell-name"><Ltr>{v.name}</Ltr></Link>
    },
    {
      id: "imo",
      label: "IMO",
      render: (v) => <Mono>{v.imo}</Mono>
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
  return <EntityPage resetKey={c.id} sections={SECTIONS} header={<EntityHead back={<Link to={backTo} className="entity-back"><ArrowRight size={14} aria-hidden="true" />חזרה לחיפוש חברות</Link>} title={<Ltr>{c.name}</Ltr>} meta={<>{c.type} · {c.country}, <Ltr>{c.city}</Ltr></>} badges={<>{c.roleList.map((r) => <Chip key={r}>{r}</Chip>)}</>} />}>
      <Section id="overview" title="סקירה" source={src}>
        <Metrics items={[
    ["גודל צי", <Mono key="f">{c.fleetSize}</Mono>],
    ["שנת הקמה", <Mono key="y">{c.founded}</Mono>]
  ]} />
        <Facts items={[
    ["סוג חברה", c.type],
    ["תפקידים", c.roleList.join(", ")],
    ["מספר D&B", <Mono key="d">{c.dnb}</Mono>],
    ["חברת אם", c.parent ?? "אין"]
  ]} />
      </Section>

      <Section id="fleet" title="צי" source={src}>
        {fleet.length === 0 ? <EmptyState title="אין כלים משויכים במערכת">
            <span>לחברה מוגדרים <Ltr>{c.fleetSize}</Ltr> כלים, אך אף אחד מהם עדיין לא קיים כישות במערכת.</span>
          </EmptyState> : <>
            <p className="entity-note">מוצגים {fleet.length} מתוך <Ltr>{c.fleetSize}</Ltr> כלים הזמינים במערכת.</p>
            <StaticTable caption="כלי השיט של החברה" columns={columns} rows={fleet} rowKey={(v) => v.id} />
          </>}
      </Section>

      <Section id="structure" title="מבנה ארגוני" source={src}>
        <Facts items={[["חברת אם", c.parent ?? "אין"], ["חברות בנות", c.subsidiaries.length ? <ul key="s" className="plain-list">{c.subsidiaries.map((s) => <li key={s}><Ltr>{s}</Ltr></li>)}</ul> : "אין"]]} />
      </Section>

      <Section id="contact" title="פרטי קשר" source={src}>
        <Facts items={[
    ["כתובת", <Ltr key="a">{c.address}</Ltr>],
    ["אתר", <Ltr key="w">{c.website}</Ltr>],
    ["טלפון", <Ltr key="p">{c.phone}</Ltr>]
  ]} />
      </Section>
    </EntityPage>;
}
