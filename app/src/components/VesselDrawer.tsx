import { useState } from 'react';
import { ExternalLink, ListPlus } from 'lucide-react';
import type { Vessel } from '../data/vessels';
import Drawer from '../ui/Drawer';
import Button, { LinkButton } from '../ui/Button';
import { Source } from '../ui/Entity';
import { VesselFlags } from './VesselFlags';
import AddToListDialog from './AddToListDialog';

const num = (v: React.ReactNode) => <span className="mono" dir="ltr">{v}</span>;

export default function VesselDrawer({ v, onClose }: { v: Vessel; onClose: () => void }) {
  const [adding, setAdding] = useState(false);
  return (
    <>
      <Drawer
        side="start"
        title={<><bdi dir="ltr">{v.name}</bdi><div className="ui-drawer-sub">{v.type} · {v.flag}</div></>}
        onClose={onClose}
        footer={<>
          <LinkButton to={`/vessels/${v.id}`} variant="primary" icon={<ExternalLink size={16} aria-hidden="true" />}>פתח דף כלי</LinkButton>
          <Button icon={<ListPlus size={16} aria-hidden="true" />} onClick={() => setAdding(true)}>הוסף לרשימה</Button>
        </>}
      >
        <div className="entity-badges"><VesselFlags v={v} /></div>
        <section className="ui-drawer-group">
          <h3>זיהוי <Source {...v.stamp} /></h3>
          <dl className="ui-facts">
            <dt>IMO</dt><dd>{num(v.imo)}</dd>
            <dt>MMSI</dt><dd>{num(v.mmsi)}</dd>
            <dt>סימן קריאה</dt><dd>{num(v.callSign)}</dd>
          </dl>
        </section>
        <section className="ui-drawer-group">
          <h3>מיקום ותנועה <Source {...v.stamp} /></h3>
          <dl className="ui-facts">
            <dt>מיקום</dt><dd>{num(`${v.lat.toFixed(3)}, ${v.lon.toFixed(3)}`)}</dd>
            <dt>מהירות</dt><dd>{num(`${v.speed} kn`)}</dd>
            <dt>כיוון</dt><dd>{num(`${v.course}°`)}</dd>
            <dt>יעד</dt><dd><bdi dir="ltr">{v.destination}</bdi></dd>
            <dt>קליטה אחרונה</dt><dd>{num(v.lastReceived)}</dd>
          </dl>
        </section>
        {v.riskNotes.length > 0 && (
          <section className="ui-drawer-group">
            <h3>חיוויי סיכון</h3>
            <ul className="plain-list bulleted">{v.riskNotes.map(n => <li key={n}>{n}</li>)}</ul>
          </section>
        )}
      </Drawer>
      {adding && <AddToListDialog vessel={v} onClose={() => setAdding(false)} />}
    </>
  );
}
