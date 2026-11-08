import { useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import MapView from '../components/MapView';
import MapSearch from '../components/MapSearch';
import MapTools from '../components/map-tools/MapTools';
import VesselDrawer from '../components/VesselDrawer';
import { VESSELS, getVessel } from '../data/vessels';
import { mapRisk } from '../ui/severity';

// המפה מוקפאת ומכירה רק none/warning/danger: ההמרה מהסולם האחיד נעשית כאן, לא בתוכה
const MAP_VESSELS = VESSELS.map((v) => ({ ...v, risk: mapRisk(v.risk) }));

export default function Home() {
  const [params, setParams] = useSearchParams();
  const selectedId = params.get('v') ?? undefined;
  const v = getVessel(selectedId);
  const [map, setMap] = useState(null);
  // במהלך ציור בכלי כללי, לחיצה על סמל כלי שייכת לציור ולא לבחירה
  const blockSelect = useRef(false);
  const select = (id) => setParams({ v: id });
  // העמודה הראשונה היא בצד ההתחלה (ימין ב-RTL): מגירה מימין, מפה משמאל.
  // החיפוש וכלי המפה הם רכיבים אחים מעל המפה, לא חלק מקוד המפה.
  return (
    <div className={`workspace${v ? ' with-drawer' : ''}`}>
      {v && <VesselDrawer v={v} onClose={() => setParams({})} />}
      <div className="map-col">
        <MapView vessels={MAP_VESSELS} selectedId={selectedId} onMapReady={setMap}
          onSelect={(id) => { if (!blockSelect.current) select(id); }} />
        <MapTools map={map} vessel={v} vessels={VESSELS} blockRef={blockSelect} onSelectVessel={select} onClearVessel={() => setParams({})}>
          <MapSearch onPickVessel={select} />
        </MapTools>
      </div>
    </div>
  );
}
