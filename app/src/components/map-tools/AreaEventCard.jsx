import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import Button from '../../ui/Button';
import { Ltr, Mono, Num } from '../../ui/Ltr';
import { activityById } from '../../area/activities';
import { eventDuration, orderVessels } from '../../area/query';
import { distance } from '../../map/geodesy';
import { fmtFull } from '../../map/range';
import { formatDistance, formatDuration } from '../../map/units';
import ActivityDot from './ActivityDot';
import { coord } from './ToolPanel';

const UNKNOWN = 'לא ידוע';
const orUnknown = (v) => (v == null || v === '' ? UNKNOWN : v);

const VesselLink = ({ v }) => (
  <Link to={`/vessels/${v.id}`} target="_blank" rel="noopener" className="link"><Ltr className="cell-name">{v.name}</Ltr></Link>
);

/** שורת שדה בכרטיס: ערך חסר מוצג "לא ידוע", לא ריק ולא 0 */
function Row({ label, children }) {
  return (
    <div className="area-card-row">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function VesselRows({ v, title }) {
  return (
    <>
      <Row label={title}><VesselLink v={v} /></Row>
      <Row label="IMO">{v.imo ? <Mono>{v.imo}</Mono> : UNKNOWN}</Row>
      <Row label="MMSI">{v.mmsi ? <Mono>{v.mmsi}</Mono> : UNKNOWN}</Row>
      <Row label="דגל">{orUnknown(v.flag)}</Row>
    </>
  );
}

/**
 * כרטיס אירוע (FR-07): צף ליד הנקודה במפה. מיקום פיזי (left/top) כי הוא נגזר מפיקסלי המפה (map.project), לא מפריסת הדף.
 * נסגר ב-Esc (מטופל ב-MapTools), בלחיצה מחוץ לכרטיס ובכפתור X. הכלי נשאר פעיל.
 */
export default function AreaEventCard({ map, event: e, unit, now, onClose }) {
  const box = useRef(null);
  const [pos, setPos] = useState(null);
  const act = activityById(e.activity);

  useLayoutEffect(() => {
    if (!map) return undefined;
    const place = () => {
      const p = map.project([e.lon, e.lat]);
      const c = map.getContainer();
      const w = box.current?.offsetWidth ?? 320;
      const h = box.current?.offsetHeight ?? 320;
      const gap = 16;
      const edge = 8;
      // ליד הנקודה: לצד ימין שלה אם יש מקום, אחרת לשמאל; בגובה הנקודה, בתוך גבולות המפה
      let left = p.x + gap + w <= c.clientWidth - edge ? p.x + gap : p.x - gap - w;
      left = Math.max(edge, Math.min(left, c.clientWidth - w - edge));
      const top = Math.max(edge, Math.min(p.y - h / 3, c.clientHeight - h - edge));
      setPos({ left, top });
    };
    place();
    map.on('move', place);
    return () => { map.off('move', place); };
  }, [map, e.lon, e.lat, e.id]);

  useEffect(() => {
    const down = (ev) => {
      if (box.current?.contains(ev.target)) return;
      if (ev.target.closest?.('.map-event, .map-cluster, .area-row')) return; // בחירה של אירוע אחר מחליפה את הכרטיס
      onClose();
    };
    document.addEventListener('mousedown', down);
    return () => document.removeEventListener('mousedown', down);
  }, [onClose]);

  const ongoing = e.end == null;
  const instant = e.activity === 'identity';
  const dur = formatDuration(eventDuration(e, now) / 3600e3);
  const x = e.extra ?? {};
  const d = x.resume ? formatDistance(distance([e.lon, e.lat], [x.resume.lon, x.resume.lat]), unit) : null;
  return (
    <div ref={box} className="area-card" role="dialog" aria-label={`אירוע: ${act?.label}, ${e.vessel.name}`} style={pos ? { left: pos.left, top: pos.top } : { visibility: 'hidden' }}>
      <header className="area-card-head">
        <h3><ActivityDot id={e.activity} />{act?.label}</h3>
        <Button variant="icon" size="sm" aria-label="סגירת הכרטיס" onClick={onClose} icon={<X size={16} aria-hidden="true" />} />
      </header>
      <dl className="area-card-body">
        {orderVessels(e).map((v, i) => <VesselRows key={v.id} v={v} title={i ? 'הכלי השני' : 'כלי'} />)}
        {instant ? <Row label="זמן השינוי"><Num>{fmtFull(e.start)}</Num></Row> : (
          <>
            <Row label="התחלה"><Num>{fmtFull(e.start)}</Num></Row>
            <Row label="סיום">{ongoing ? 'ממשיך' : <Num>{fmtFull(e.end)}</Num>}</Row>
            <Row label="משך">{ongoing ? `${dur} עד עכשיו` : dur}</Row>
          </>
        )}
        <Row label="קואורדינטות"><Num>{coord([e.lon, e.lat])}</Num></Row>
        {e.activity === 'port-visit' && <Row label="נמל">{orUnknown(x.port?.name)}, {orUnknown(x.port?.country)}</Row>}
        {e.activity === 'ais-gap' && (
          <>
            <Row label="חזרה לשידור">{x.resume ? <Num>{coord([x.resume.lon, x.resume.lat])}</Num> : UNKNOWN}</Row>
            <Row label="מרחק בין הנקודות">{d ? <Num>{d.value} {d.unit}</Num> : UNKNOWN}</Row>
          </>
        )}
        {e.activity === 'loitering' && x.radiusNm != null && <Row label="רדיוס השיטוט"><Num>{x.radiusNm} NM</Num></Row>}
        {e.activity === 'identity' && (
          <>
            <Row label="השדה שהשתנה">{orUnknown(x.change?.field)}</Row>
            <Row label="לפני"><bdi>{orUnknown(x.change?.before)}</bdi></Row>
            <Row label="אחרי"><bdi>{orUnknown(x.change?.after)}</bdi></Row>
          </>
        )}
        <Row label="מקור">{e.source} · עודכן <Num>{fmtFull(e.asOf)}</Num></Row>
      </dl>
    </div>
  );
}
