import { Link, useLocation, useParams } from 'react-router-dom';
import { ArrowRight, Map } from 'lucide-react';
import { getCompanyApi } from '../data/api';
import { getVessel } from '../data/vessels';
import { historyOf } from '../data/companies';
import { EntityHead, EntityPage, EntityStatus, FactGroup, Section, StaticTable } from '../ui/Entity';
import { SeverityBadge } from '../ui/Badges';
import Button from '../ui/Button';
import Chip from '../ui/Chip';
import { Ltr, Mono } from '../ui/Ltr';
import { EmptyState } from '../ui/States';
import useAsync from '../ui/useAsync';
import { SignalDetail } from '../components/Signals';
import RelationsView from '../components/RelationsView';
import CompanyRef from '../components/CompanyRef';
import { VesselFlags } from '../components/VesselFlags';

const SECTIONS = [
  { id: 'overview', label: 'סקירה' },
  { id: 'fleet', label: 'צי' },
  { id: 'relations', label: 'קשרים בין חברות' },
  { id: 'registration', label: 'פרטי רישום ובעלות' },
  { id: 'history', label: 'היסטוריית שינויים' },
  { id: 'notes', label: 'הערות וקבצים' },
];

export default function CompanyPage() {
  const { id } = useParams();
  const backTo = `/companies${useLocation().state?.back ?? ''}`;
  const { status, data: c, reload } = useAsync(() => getCompanyApi(id), [id]);

  if (status === 'done' && !c) {
    return (
      <div className="entity-status">
        <EmptyState title="החברה לא נמצאה"><Button to="/companies">חזרה לחיפוש חברות</Button></EmptyState>
      </div>
    );
  }
  if (status !== 'done') return <EntityStatus status={status} onRetry={reload} />;

  const back = <Link to={backTo} className="entity-back"><ArrowRight size={14} aria-hidden="true" />חזרה לחיפוש חברות</Link>;
  const fleet = c.vesselIds.map(getVessel).filter(Boolean);
  const src = c.stamp;
  const columns = [
    { id: 'name', label: 'שם', render: (v) => <Link to={`/vessels/${v.id}`} className="link cell-name"><Ltr>{v.name}</Ltr></Link> },
    { id: 'imo', label: 'IMO', render: (v) => <Mono>{v.imo}</Mono> },
    { id: 'type', label: 'סוג', render: (v) => v.type },
    { id: 'role', label: 'תפקיד החברה', render: (v) => c.roles.find((r) => r.vessel === v.id)?.role ?? '—' },
    { id: 'flags', label: 'אינדיקטורים', render: (v) => (v.indicators.length === 0 ? <SeverityBadge severity="none" /> : <VesselFlags v={v} withLists={false} />) },
  ];
  const historyCols = [
    { id: 'date', label: 'תאריך', render: (r) => <Mono>{r.date}</Mono> },
    { id: 'field', label: 'שדה', render: (r) => r.field },
    { id: 'from', label: 'ערך קודם', render: (r) => <Ltr>{r.from}</Ltr> },
    { id: 'to', label: 'ערך חדש', render: (r) => <Ltr>{r.to}</Ltr> },
    { id: 'src', label: 'מקור', render: (r) => r.source },
  ];

  return (
    <EntityPage resetKey={c.id} sections={SECTIONS}
      header={
        <EntityHead back={back} title={<Ltr>{c.name}</Ltr>}
          meta={<>{c.type} · {c.country}, <Ltr>{c.city}</Ltr> · גודל צי <Mono>{c.fleetSize}</Mono></>}
          badges={c.roleList.map((r) => <Chip key={r}>{r}</Chip>)}
          actions={fleet.length > 0
            ? <Button to={`/?v=${fleet[0].id}`} icon={<Map size={16} aria-hidden="true" />}>הצג על המפה</Button>
            : <Button disabled icon={<Map size={16} aria-hidden="true" />}>הצג על המפה</Button>} />
      }
      summary={
        <section aria-label="אותות" className="signals-strip">
          {c.signals.map((s) => <div key={s.kind} className="signal-card"><SignalDetail signal={s} /></div>)}
        </section>
      }>
      <Section id="overview" title="סקירה" source={src}>
        <FactGroup title="זיהוי" items={[
          ['סוג חברה', c.type], ['תפקידים', c.roleList.join(', ')],
          ['מדינה', c.country], ['עיר', <Ltr key="c">{c.city}</Ltr>],
          ['גודל צי', <Mono key="f">{c.fleetSize}</Mono>], ['עדכון אחרון', <Mono key="u">{c.updated}</Mono>],
        ]} />
      </Section>

      <Section id="fleet" title="צי" source={src}>
        {fleet.length === 0 ? (
          <EmptyState compact title="אין כלים משויכים במערכת">
            <span>לחברה מוגדרים <Ltr>{c.fleetSize}</Ltr> כלים, אך אף אחד מהם עדיין לא קיים כישות במערכת.</span>
          </EmptyState>
        ) : (
          <>
            <p className="entity-note">מוצגים {fleet.length} מתוך <Ltr>{c.fleetSize}</Ltr> כלים הזמינים במערכת.</p>
            <StaticTable caption="כלי השיט של החברה" columns={columns} rows={fleet} rowKey={(v) => v.id} />
          </>
        )}
      </Section>

      <Section id="relations" title="קשרים בין חברות" source={src}>
        <p className="entity-note"><span className="proposal-tag">הצעה</span> סוגי הקשרים ונתוני הדמה טעונים אפיון (אפיון §4.5).</p>
        <RelationsView companyId={c.id} />
      </Section>

      <Section id="registration" title="פרטי רישום ובעלות" source={src}>
        <FactGroup title="רישום" items={[
          ['כתובת', <Ltr key="a">{c.address}</Ltr>], ['שנת הקמה', <Mono key="y">{c.founded}</Mono>],
          ['מספר D&B', <Mono key="d">{c.dnb}</Mono>], ['אתר', <Ltr key="w">{c.website}</Ltr>], ['טלפון', <Ltr key="p">{c.phone}</Ltr>],
        ]} />
        <FactGroup title="בעלות" items={[
          ['חברת אם', c.parent ? <CompanyRef name={c.parent} /> : 'אין'],
          ['חברות בנות', c.subsidiaries.length
            ? <ul className="plain-list">{c.subsidiaries.map((n) => <li key={n}><CompanyRef name={n} /></li>)}</ul> : 'אין'],
        ]} />
      </Section>

      <Section id="history" title="היסטוריית שינויים" source={src}>
        <StaticTable caption="היסטוריית שינויים" rowKey={(r) => r.date + r.field} columns={historyCols} rows={historyOf(c)} />
      </Section>

      <Section id="notes" title="הערות וקבצים">
        <EmptyState compact title="אין הערות או קבצים לחברה זו"><span>סוגי קבצים והרשאות העלאה טרם הוגדרו.</span></EmptyState>
      </Section>
    </EntityPage>
  );
}
