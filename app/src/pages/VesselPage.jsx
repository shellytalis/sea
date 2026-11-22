import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ListPlus, Map, ScanSearch, Upload } from 'lucide-react';
import { getVesselApi } from '../data/api';
import { VISITS_B, VISITS_C, activityA } from '../data/vessels';
import { mergeHistory } from '../data/companies';
import { EntityHead, EntityPage, EntityStatus, Facts, FactGroup, Section, StaticTable, goSection } from '../ui/Entity';
import { SeverityBadge } from '../ui/Badges';
import Button from '../ui/Button';
import Chip from '../ui/Chip';
import { Ltr, Mono, Num } from '../ui/Ltr';
import SpecNote from '../ui/SpecNote';
import { EmptyState } from '../ui/States';
import Tabs from '../ui/Tabs';
import useAsync from '../ui/useAsync';
import { VesselFlags } from '../components/VesselFlags';
import AddToListDialog from '../components/AddToListDialog';
import SnapshotDrawer from '../components/SnapshotDrawer';
import CompanyRef from '../components/CompanyRef';

const visitCols = [
  { id: 'port', label: 'נמל', render: (r) => <Ltr>{r.port}</Ltr> },
  { id: 'country', label: 'מדינה', render: (r) => r.country },
  { id: 'arrival', label: 'הגעה', render: (r) => <Num>{r.arrival}</Num> },
  { id: 'departure', label: 'יציאה', render: (r) => <Num>{r.departure}</Num> },
];
const activityCols = [
  { id: 'time', label: 'זמן', render: (r) => <Num>{r.time}</Num> },
  { id: 'activity', label: 'פעילות', render: (r) => r.activity },
  { id: 'place', label: 'מיקום', render: (r) => <Ltr>{r.place}</Ltr> },
  { id: 'details', label: 'פרטים', render: (r) => r.details },
];
const historyCols = [
  { id: 'date', label: 'תאריך', render: (r) => <Num>{r.date}</Num> },
  { id: 'field', label: 'שדה', render: (r) => r.field },
  { id: 'from', label: 'ערך קודם', render: (r) => <Ltr>{r.from}</Ltr> },
  { id: 'to', label: 'ערך חדש', render: (r) => <Ltr>{r.to}</Ltr> },
  { id: 'src', label: 'מקור', render: (r) => r.source },
];

/** שרטוטים: המקטע ופריט הניווט שלו מוסתרים כשאין הרשאה (מצב "אין הרשאה" מודגם ב-/design) */
const SECTIONS = [
  { id: 'overview', label: 'סקירה' },
  { id: 'risk', label: 'סיכון ואינדיקטורים' },
  { id: 'activity', label: 'פעילות' },
  { id: 'position', label: 'מיקום ותנועה' },
  { id: 'identity', label: 'זהות' },
  { id: 'history', label: 'היסטוריית שינויים' },
  { id: 'ownership', label: 'בעלות וניהול' },
  { id: 'spec', label: 'מפרט טכני' },
  { id: 'photos', label: 'תמונות' },
  { id: 'files', label: 'קבצים והערות' },
];

export default function VesselPage() {
  const { id } = useParams();
  const { status, data: v, reload } = useAsync(() => getVesselApi(id), [id]);
  const [adding, setAdding] = useState(false);
  const [snapshot, setSnapshot] = useState(false);

  if (status === 'done' && !v) {
    return (
      <div className="entity-status">
        <EmptyState title="הכלי לא נמצא"><span>בדוק את המזהה ונסה שוב.</span><Button to="/">חזרה למפה</Button></EmptyState>
      </div>
    );
  }
  if (status !== 'done') return <EntityStatus status={status} onRetry={reload} />;

  const src = v.stamp;
  const n = v.indicators.length;
  const indicatorCols = [
    { id: 'type', label: 'סוג', render: (i) => <strong>{i.type}</strong> },
    { id: 'sev', label: 'חומרה', render: (i) => <SeverityBadge severity={i.severity} /> },
    { id: 'time', label: 'זמן', render: (i) => <Num>{i.time}</Num> },
    { id: 'place', label: 'מיקום', render: (i) => <Link to={`/?v=${v.id}`} className="link"><Num>{i.lat.toFixed(2)}, {i.lon.toFixed(2)}</Num> · הצג על המפה</Link> },
    { id: 'src', label: 'מקור', render: (i) => i.source },
    { id: 'evidence', label: 'ראיות', render: (i) => <span className="wrap">{i.evidence}</span> },
  ];

  return (
    <>
      <EntityPage resetKey={v.id} sections={SECTIONS}
        header={
          <EntityHead title={<Ltr>{v.name}</Ltr>}
            meta={<>{v.type} · {v.flag} · <Mono>IMO {v.imo}</Mono> · <Mono>MMSI {v.mmsi}</Mono></>}
            badges={<VesselFlags v={v} />}
            compactBadge={<VesselFlags v={v} withLists={false} />}
            actions={
              <>
                <Button icon={<ScanSearch size={16} aria-hidden="true" />} aria-expanded={snapshot} onClick={() => setSnapshot(true)}>תמונת מצב</Button>
                <Button to={`/?v=${v.id}`} icon={<Map size={16} aria-hidden="true" />}>הצג על המפה</Button>
                <Button variant="primary" icon={<ListPlus size={16} aria-hidden="true" />} onClick={() => setAdding(true)}>הוסף לרשימה</Button>
              </>
            } />
        }
        summary={n > 0 && (
          <section className="indicator-strip" aria-label="אינדיקטורים">
            <span><Num>{n}</Num> {n === 1 ? 'אינדיקטור' : 'אינדיקטורים'}:</span>
            {v.indicators.map((i) => <Chip key={i.id}>{i.type}</Chip>)}
            <a href="#risk" className="link" onClick={(e) => { e.preventDefault(); goSection('risk'); }}>עבור לסיכון ואינדיקטורים</a>
          </section>
        )}>
        <Section id="overview" title="סקירה" source={src}>
          <Facts items={[
            ['שנת בנייה', <Num key="b">{v.built}</Num>],
            ['מיקום', <Num key="p">{v.lat.toFixed(3)}, {v.lon.toFixed(3)}</Num>],
            ['קליטה אחרונה', <Num key="r">{v.lastReceived}</Num>],
          ]} />
        </Section>

        <Section id="risk" title="סיכון ואינדיקטורים" source={src} flush>
          {n === 0 ? (
            <EmptyState title={v.risk === 'unassessed' ? 'לא הוערך' : 'אין אינדיקטורים'}>
              <span>{v.risk === 'unassessed' ? 'אין מספיק נתונים להערכת הכלי.' : 'הכלי נבדק ולא זוהו אינדיקטורי פעילות חריגה.'}</span>
            </EmptyState>
          ) : (
            <StaticTable caption="אינדיקטורי פעילות חריגה" columns={indicatorCols} rows={v.indicators} rowKey={(i) => i.id} />
          )}
        </Section>

        <Section id="activity" title="פעילות" flush>
          <Tabs label="מקורות פעילות" tabs={[
            { id: 'a', label: 'מקור א', content: <StaticTable caption="פעילות כללית, מקור א" columns={activityCols} rows={activityA(v)} rowKey={(r) => r.time} /> },
            { id: 'b', label: 'מקור ב', content: <StaticTable caption="ביקורים, מקור ב" columns={visitCols} rows={VISITS_B} rowKey={(r) => r.arrival} /> },
            { id: 'c', label: 'מקור ג', content: <StaticTable caption="ביקורים, מקור ג" columns={visitCols} rows={VISITS_C} rowKey={(r) => r.arrival} /> },
          ]} />
        </Section>

        <Section id="position" title="מיקום ותנועה" source={src}>
          <Facts items={[
            ['מיקום', <Num key="p">{v.lat.toFixed(3)}, {v.lon.toFixed(3)}</Num>],
            ['מהירות', <Num key="s">{v.speed} kn</Num>], ['כיוון', <Num key="c">{v.course}°</Num>],
            ['יעד', <Ltr key="d">{v.destination}</Ltr>], ['קליטה אחרונה', <Num key="r">{v.lastReceived}</Num>],
            ['מיקום קודם', <Num key="pp">{v.prevLat.toFixed(3)}, {v.prevLon.toFixed(3)}</Num>],
          ]} />
        </Section>

        <Section id="identity" title="זהות" source={src}>
          <Facts items={[
            ['שם', <Ltr key="n">{v.name}</Ltr>], ['IMO', <Mono key="i">{v.imo}</Mono>], ['MMSI', <Mono key="m">{v.mmsi}</Mono>], ['סימן קריאה', <Mono key="c">{v.callSign}</Mono>],
            ['דגל', v.flag], ['סוג', v.type], ['תת-סוג', v.subType], ['שנת בנייה', <Num key="b">{v.built}</Num>],
          ]} />
        </Section>

        <Section id="history" title="היסטוריית שינויים" source={src} flush>
          {v.history.length === 0
            ? <EmptyState title="לא נרשמו שינויים"><span>מוצגים רק שינויים שנרשמו בפרטי הישות.</span></EmptyState>
            : <StaticTable caption="היסטוריית שינויי זהות" rowKey={(r) => r.date + r.field} columns={historyCols} rows={mergeHistory(v.history)} />}
        </Section>

        <Section id="ownership" title="בעלות וניהול" source={src}>
          <FactGroup title="בעלות" items={[
            ['בעלים רשום', <CompanyRef key="o" name={v.owner} />], ['מוטב', <CompanyRef key="bo" name={v.beneficialOwner} />],
          ]} />
          <FactGroup title="ניהול" items={[
            ['מפעיל', <CompanyRef key="op" name={v.operator} />], ['מנהל טכני', <CompanyRef key="t" name={v.technicalManager} />],
            ['מנהל מסחרי', <CompanyRef key="cm" name={v.commercialManager} />],
          ]} />
        </Section>

        <Section id="spec" title="מפרט טכני" source={src}>
          <FactGroup title="מידות ומשקל" items={[
            ['אורך', <Num key="l">{v.length} m</Num>], ['רוחב', <Num key="w">{v.beam} m</Num>],
            ['שוקע מרבי', <Num key="d">{v.draft} m</Num>], ['DWT', <Num key="dw">{v.dwt.toLocaleString('en')} t</Num>],
          ]} />
          <FactGroup title="סיווג וציוד" items={[
            ['חברת סיווג', v.classSociety], ['P&I', v.pandi], ['משדר AIS', v.aisTransmitter],
          ]} />
        </Section>

        <Section id="photos" title="תמונות" flush>
          <EmptyState title="אין תמונות זמינות לכלי זה" />
        </Section>

        <Section id="files" title="קבצים והערות" flush>
          <EmptyState title="אין קבצים או הערות">
            <SpecNote>סוגי קבצים, מגבלת גודל והרשאות העלאה טרם הוגדרו.</SpecNote>
            <Button disabled icon={<Upload size={16} aria-hidden="true" />}>העלה קובץ</Button>
          </EmptyState>
        </Section>
      </EntityPage>
      {adding && <AddToListDialog vessel={v} onClose={() => setAdding(false)} />}
      {snapshot && <SnapshotDrawer vessel={v} onClose={() => setSnapshot(false)} />}
    </>
  );
}
