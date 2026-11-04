import { Link, useParams } from 'react-router-dom';
import { Map } from 'lucide-react';
import { getCompanyApi } from '../data/api';
import { getVessel } from '../data/vessels';
import { historyOf } from '../data/companies';
import { EntityHead, EntityPage, EntityStatus, FactGroup, Section, StaticTable, goSection } from '../ui/Entity';
import { Tooltip } from '../ui/Badges';
import Button from '../ui/Button';
import Chip from '../ui/Chip';
import { Ltr, Mono, Num } from '../ui/Ltr';
import SpecNote from '../ui/SpecNote';
import { EmptyState } from '../ui/States';
import useAsync from '../ui/useAsync';
import { SignalsPanel } from '../components/Signals';
import RelationsView from '../components/RelationsView';
import CompanyRef from '../components/CompanyRef';
import { VesselFlags } from '../components/VesselFlags';

/** כל עמודת אות גוללת למקטע הרלוונטי. הצעה: פעילות וזהות מפנות ל"צי", כי אין להן מקטע משלהן */
const SIGNAL_TARGET = { fleet: 'fleet', activity: 'fleet', identity: 'fleet', links: 'relations' };

const SECTIONS = [
  { id: 'fleet', label: 'צי' },
  { id: 'relations', label: 'קשרים בין חברות' },
  { id: 'registration', label: 'פרטי רישום ובעלות' },
  { id: 'history', label: 'היסטוריית שינויים' },
  { id: 'notes', label: 'הערות וקבצים' },
];

const historyCols = [
  { id: 'date', label: 'תאריך', render: (r) => <Num className="sec">{r.date}</Num> },
  { id: 'field', label: 'שדה', render: (r) => r.field },
  { id: 'from', label: 'ערך קודם', render: (r) => <Ltr>{r.from}</Ltr> },
  { id: 'to', label: 'ערך חדש', render: (r) => <Ltr>{r.to}</Ltr> },
  { id: 'src', label: 'מקור', render: (r) => r.source },
];

export default function CompanyPage() {
  const { id } = useParams();
  const { status, data: c, reload } = useAsync(() => getCompanyApi(id), [id]);

  if (status === 'done' && !c) {
    return (
      <div className="entity-status">
        <EmptyState title="החברה לא נמצאה"><Button to="/companies">חזרה לחיפוש חברות</Button></EmptyState>
      </div>
    );
  }
  if (status !== 'done') return <EntityStatus status={status} onRetry={reload} />;

  const fleet = c.vesselIds.map(getVessel).filter(Boolean);
  const src = c.stamp;
  const columns = [
    { id: 'name', label: 'שם', weight: 30, render: (v) => <Link to={`/vessels/${v.id}`} className="cell-link"><Ltr>{v.name}</Ltr></Link> },
    { id: 'imo', label: 'IMO', weight: 14, render: (v) => <Mono>{v.imo}</Mono> },
    { id: 'type', label: 'סוג', weight: 20, render: (v) => v.type },
    { id: 'role', label: 'תפקיד החברה', weight: 16, render: (v) => c.roles.find((r) => r.vessel === v.id)?.role ?? '—' },
    { id: 'flags', label: 'אינדיקטורים', weight: 20, render: (v) => <VesselFlags v={v} withLists={false} compact /> },
    {
      id: 'map', label: '', srLabel: 'הצג על המפה', width: 48, align: 'end',
      render: (v) => (
        <Tooltip text="הצג על המפה">
          <Button to={`/?v=${v.id}`} variant="icon" size="sm" aria-label={`הצג את ${v.name} על המפה`} icon={<Map size={16} aria-hidden="true" />} />
        </Tooltip>
      ),
    },
  ];

  return (
    <EntityPage resetKey={c.id} sections={SECTIONS}
      header={
        <EntityHead title={<Ltr>{c.name}</Ltr>}
          meta={<>{c.type} · {c.country}, <Ltr>{c.city}</Ltr> · גודל צי <Num>{c.fleetSize}</Num> · עדכון אחרון <Num>{c.updated}</Num></>}
          badges={c.roleList.map((r) => <Chip key={r} tag>{r}</Chip>)} />
      }
      summary={<SignalsPanel signals={c.signals} target={SIGNAL_TARGET} onGo={goSection} />}>
      <Section id="fleet" title="צי" source={src} flush
        meta={fleet.length > 0 ? <>מוצגים <Num>{fleet.length}</Num> מתוך <Num>{c.fleetSize}</Num> כלים הזמינים במערכת</> : null}>
        {fleet.length === 0 ? (
          <EmptyState title="אין כלים משויכים במערכת">
            <span>לחברה מוגדרים <Num>{c.fleetSize}</Num> כלים, אך אף אחד מהם עדיין לא קיים כישות במערכת.</span>
          </EmptyState>
        ) : (
          <StaticTable caption="כלי השיט של החברה" columns={columns} rows={fleet} rowKey={(v) => v.id} />
        )}
      </Section>

      <Section id="relations" title="קשרים בין חברות" source={src} flush actions={<SpecNote tag>הצעה</SpecNote>}>
        <RelationsView companyId={c.id} />
      </Section>

      <Section id="registration" title="פרטי רישום ובעלות" source={src}>
        <FactGroup title="רישום" items={[
          ['כתובת', <Ltr key="a">{c.address}</Ltr>], ['שנת הקמה', <Num key="y">{c.founded}</Num>],
          ['מספר D&B', <Mono key="d">{c.dnb}</Mono>], ['אתר', c.website === '—' ? '' : <Ltr key="w">{c.website}</Ltr>], ['טלפון', c.phone === '—' ? '' : <Ltr key="p">{c.phone}</Ltr>],
        ]} />
        <FactGroup title="בעלות" items={[
          ['חברת אם', c.parent ? <CompanyRef name={c.parent} /> : 'אין'],
          ['חברות בנות', c.subsidiaries.length
            ? <ul className="plain-list">{c.subsidiaries.map((n) => <li key={n}><CompanyRef name={n} /></li>)}</ul> : 'אין'],
        ]} />
      </Section>

      <Section id="history" title="היסטוריית שינויים" source={src} flush>
        <StaticTable caption="היסטוריית שינויים" rowKey={(r) => r.date + r.field} columns={historyCols} rows={historyOf(c)} />
      </Section>

      <Section id="notes" title="הערות וקבצים" flush>
        <EmptyState title="אין הערות או קבצים לחברה זו"><SpecNote>סוגי קבצים והרשאות העלאה טרם הוגדרו.</SpecNote></EmptyState>
      </Section>
    </EntityPage>
  );
}
