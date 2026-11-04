import { useSearchParams } from 'react-router-dom';
import MapView from '../components/MapView';
import VesselDrawer from '../components/VesselDrawer';
import { VESSELS, getVessel } from '../data/vessels';
import { mapRisk } from '../ui/severity';

// המפה מוקפאת ומכירה רק none/warning/danger: ההמרה מהסולם האחיד נעשית כאן, לא בתוכה
const MAP_VESSELS = VESSELS.map((v) => ({ ...v, risk: mapRisk(v.risk) }));

export default function Home() {
  const [params, setParams] = useSearchParams();
  const selectedId = params.get('v') ?? undefined;
  const v = getVessel(selectedId);
  // העמודה הראשונה היא בצד ההתחלה (ימין ב-RTL): מגירה מימין, מפה משמאל
  return (
    <div className={`workspace${v ? ' with-drawer' : ''}`}>
      {v && <VesselDrawer v={v} onClose={() => setParams({})} />}
      <MapView vessels={MAP_VESSELS} selectedId={selectedId} onSelect={(id) => setParams({ v: id })} />
    </div>
  );
}
