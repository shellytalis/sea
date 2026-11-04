import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ListPlus, Map, Upload } from 'lucide-react';
import { getVesselApi } from '../data/api';
import { VISITS_B, VISITS_C, activityA } from '../data/vessels';
import { mergeHistory } from '../data/companies';
import { EntityHead, EntityPage, EntityStatus, Facts, FactGroup, Section, StaticTable, goSection } from '../ui/Entity';
import { SeverityBadge } from '../ui/Badges';
import Button from '../ui/Button';
import Chip from '../ui/Chip';
import { Ltr, Mono } from '../ui/Ltr';
import SpecNote from '../ui/SpecNote';
import { EmptyState } from '../ui/States';
import Tabs from '../ui/Tabs';
import useAsync from '../ui/useAsync';
import { VesselFlags } from '../components/VesselFlags';
import AddToListDialog from '../components/AddToListDialog';
import CompanyRef from '../components/CompanyRef';

const visitCols = [
  { id: 'port', label: 'נמל', render: (r) => <Ltr>{r.port}</Ltr> },
  { id: 'country', label: 'מדינה', render: (r) => r.country },
  { id: 'arrival', label: 'הגעה', render: (r) => <Mono>{r.arrival}</Mono> },
  { id: 'departure', label: 'יציאה', render: (r) => <Mono>{r.departure}</Mono> },
];
const activityCols = [
  { id: 'time', label: 'זמן', render: (r) => <Mono>{r.time}</Mono> },
  { id: 'activity', label: 'פעילות', render: (r) => r.activity },
  { id: 'place', label: 'מיקום', render: (r) => <Ltr>{r.place}</Ltr> },
  { id: 'details', label: 'פרטים', render: (r) => r.details },
];
const historyCols = [
  { id: 'date', label: 'תאריך', render: (r) => <Mono>{r.date}</Mono> },
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
  { id: 'identity', label: 'זהות והיסטוריית שינויים' },
  { id: 'ownership', label: 'בעלות וניהול' },
  { id: 'spec', label: 'מפרט טכני' },
  { id: 'photos', label: 'תמונות' },
  { id: 'files', label: 'קבצים והערות' },
];

export default function VesselPage() {
  const { id } = useParams();
  const { status, data: v, reload } = useAsync(() => getVesselApi(id), [id]);
  const [adding, setAdding] = useState(false);

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
    { id: 'time', label: 'זמן', render: (i) => <Mono>{i.time}</Mono> },
    { id: 'place', label: 'מיקום', render: (i) => <Link to={`/?v=${v.id}`} className="link"><Mono>{i.lat.toFixed(2)}, {i.lon.toFixed(2)}</Mono> · הצג על המפה</Link> },
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
                <Button to={`/?v=${v.id}`} icon={<Map size={16} aria-hidden="true" />}>הצג על המפה</Button>
                <Button variant="primary" icon={<ListPlus size={16} aria-hidden="true" />} onClick={() => setAdding(true)}>הוסף לרשימה</Button>
              </>
            } />
        }
        summary={n > 0 && (
          <section className="indicator-strip" aria-label="אינדיקטורים">
            <span><Mono>{n}</Mono> {n === 1 ? 'אינדיקטור' : 'אינדיקטורים'}:</span>
            {v.indicators.map((i) => <Chip key={i.id}>{i.type}</Chip>)}
            <a href="#risk" className="link" onClick={(e) => { e.preventDefault(); goSection('risk'); }}>עבור לסיכון ואינדיקטורים</a>
          </section>
        )}>
        <Section id="overview" title="סקירה" source={src}>
          <Facts items={[
            ['שנת בנייה', <Mono key="b">{v.built}</Mono>],
            ['מיקום', <Mono key="p">{v.lat.toFixed(3)}, {v.lon.toFixed(3)}</Mono>],
            ['קליטה אחרונה', <Mono key="r">{v.lastReceived}</Mono>],
          ]} />
        </Section>

        <Section id="risk" title="סיכון ואינדיקטורים" source={src}>
          {n === 0 ? (
            <EmptyState compact title={v.risk === 'unassessed' ? 'לא הוערך' : 'אין אינדיקטורים'}>
              <span>{v.risk === 'unassessed' ? 'אין מספיק נתונים להערכת הכלי.' : 'הכלי נבדק ולא זוהו אינדיקטורי פעילות חריגה.'}</span>
            </EmptyState>
          ) : (
            <StaticTable caption="אינדיקטורי פעילות חריגה" columns={indicatorCols} rows={v.indicators} rowKey={(i) => i.id} />
          )}
        </Section>

        <Section id="activity" title="פעילות">
          <Tabs label="מקורות פעילות" tabs={[
            { id: 'a', label: 'מקור א', content: <StaticTable caption="פעילות כללית, מקור א" columns={activityCols} rows={activityA(v)} rowKey={(r) => r.time} /> },
            { id: 'b', label: 'מקור ב', content: <StaticTable caption="ביקורים, מקור ב" columns={visitCols} rows={VISITS_B} rowKey={(r) => r.arrival} /> },
            { id: 'c', label: 'מקור ג', content: <StaticTable caption="ביקורים, מקור ג" columns={visitCols} rows={VISITS_C} rowKey={(r) => r.arrival} /> },
          ]} />
        </Section>

        <Section id="position" title="מיקום ותנועה" source={src}>
          <Facts items={[
            ['מיקום', <Mono key="p">{v.lat.toFixed(3)}, {v.lon.toFixed(3)}</Mono>],
            ['מהירות', <Mono key="s">{v.speed} kn</Mono>], ['כיוון', <Mono key="c">{v.course}°</Mono>],
            ['יעד', <Ltr key="d">{v.destination}</Ltr>], ['קליטה אחרונה', <Mono key="r">{v.lastReceived}</Mono>],
            ['מיקום קודם', <Mono key="pp">{v.prevLat.toFixed(3)}, {v.prevLon.toFixed(3)}</Mono>],
          ]} />
        </Section>

        <Section id="identity" title="זהות והיסטוריית שינויים" source={src}>
          <FactGroup title="זהות" items={[
            ['שם', <Ltr key="n">{v.name}</Ltr>], ['IMO', <Mono key="i">{v.imo}</Mono>], ['MMSI', <Mono key="m">{v.mmsi}</Mono>],
            ['דגל', v.flag], ['סימן קריאה', <Mono key="c">{v.callSign}</Mono>],
            ['סוג', v.type], ['תת-סוג', v.subType], ['שנת בנייה', <Mono key="b">{v.built}</Mono>],
          ]} />
          <div className="fact-group">
            <h3 className="entity-sub">היסטוריית שינויים</h3>
            {v.history.length === 0
              ? <EmptyState compact title="לא נרשמו שינויים"><span>מוצגים רק שינויים שנרשמו בפרטי הישות.</span></EmptyState>
              : <StaticTable caption="היסטוריית שינויי זהות" rowKey={(r) => r.date + r.field} columns={historyCols} rows={mergeHistory(v.history)} />}
          </div>
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
            ['אורך', <Mono key="l">{v.length} m</Mono>], ['רוחב', <Mono key="w">{v.beam} m</Mono>],
            ['שוקע מרבי', <Mono key="d">{v.draft} m</Mono>], ['DWT', <Mono key="dw">{v.dwt.toLocaleString('en')} t</Mono>],
          ]} />
          <FactGroup title="סיווג וציוד" items={[
            ['חברת סיווג', v.classSociety], ['P&I', v.pandi], ['משדר AIS', v.aisTransmitter],
          ]} />
        </Section>

        <Section id="photos" title="תמונות">
          <EmptyState compact title="אין תמונות זמינות לכלי זה" />
        </Section>

        <Section id="files" title="קבצים והערות">
          <EmptyState compact title="אין קבצים או הערות">
            <SpecNote>סוגי קבצים, מגבלת גודל והרשאות העלאה טרם הוגדרו.</SpecNote>
            <Button disabled icon={<Upload size={16} aria-hidden="true" />}>העלה קובץ</Button>
          </EmptyState>
        </Section>
      </EntityPage>
      {adding && <AddToListDialog vessel={v} onClose={() => setAdding(false)} />}
    </>
  );
}
