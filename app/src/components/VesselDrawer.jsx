import { useState } from 'react';
import { ExternalLink, ListPlus } from 'lucide-react';
import Drawer from '../ui/Drawer';
import Button from '../ui/Button';
import { Facts, Source } from '../ui/Entity';
import { Ltr, Mono, Num } from '../ui/Ltr';
import { VesselFlags } from './VesselFlags';
import AddToListDialog from './AddToListDialog';

export default function VesselDrawer({ v, onClose }) {
  const [adding, setAdding] = useState(false);
  return (
    <>
      <Drawer side="start" title={<><Ltr>{v.name}</Ltr><div className="ui-drawer-sub">{v.type} · {v.flag}</div></>} onClose={onClose} footer={
        <>
          <Button to={`/vessels/${v.id}`} variant="primary" icon={<ExternalLink size={16} aria-hidden="true" />}>פתח דף כלי</Button>
          <Button icon={<ListPlus size={16} aria-hidden="true" />} onClick={() => setAdding(true)}>הוסף לרשימה</Button>
        </>
      }>
        <div className="entity-badges"><VesselFlags v={v} /></div>
        <section className="ui-drawer-group">
          <h3>זיהוי <Source {...v.stamp} /></h3>
          <Facts layout="list" items={[
            ['IMO', <Mono>{v.imo}</Mono>],
            ['MMSI', <Mono>{v.mmsi}</Mono>],
            ['סימן קריאה', <Mono>{v.callSign}</Mono>],
          ]} />
        </section>
        <section className="ui-drawer-group">
          <h3>מיקום ותנועה <Source {...v.stamp} /></h3>
          <Facts layout="list" items={[
            ['מיקום', <Num>{`${v.lat.toFixed(3)}, ${v.lon.toFixed(3)}`}</Num>],
            ['מהירות', <Num>{`${v.speed} kn`}</Num>],
            ['כיוון', <Num>{`${v.course}°`}</Num>],
            ['יעד', <Ltr>{v.destination}</Ltr>],
            ['קליטה אחרונה', <Num>{v.lastReceived}</Num>],
          ]} />
        </section>
        {v.indicators.length > 0 && (
          <section className="ui-drawer-group">
            <h3>אינדיקטורי פעילות חריגה</h3>
            <ul className="plain-list bulleted">{v.indicators.map((i) => <li key={i.id}>{i.type}</li>)}</ul>
          </section>
        )}
      </Drawer>
      {adding && <AddToListDialog vessel={v} onClose={() => setAdding(false)} />}
    </>
  );
}
