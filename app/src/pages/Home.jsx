import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import MapView from '../components/MapView';
import MapSearch from '../components/MapSearch';
import MapTools from '../components/map-tools/MapTools';
import VesselDrawer from '../components/VesselDrawer';
import SetDrawer from '../components/SetDrawer';
import { VESSELS, getVessel } from '../data/vessels';
import { useVesselSet } from '../state/vesselSet';
import { mapRisk } from '../ui/severity';

// המפה מוקפאת ומכירה רק none/warning/danger: ההמרה מהסולם האחיד נעשית כאן, לא בתוכה
const MAP_VESSELS = VESSELS.map((v) => ({ ...v, risk: mapRisk(v.risk) }));

export default function Home() {
  const [params, setParams] = useSearchParams();
  const vs = useVesselSet();
  const { ids, activeId, mode, colors } = vs.state;
  const urlId = params.get('v');
  const active = getVessel(activeId);
  const [map, setMap] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(() => !!activeId);
  // במהלך ציור בכלי כללי, לחיצה על סמל כלי שייכת לציור ולא לבחירה
  const blockSelect = useRef(false);

  // כניסה עם ?v= מוסיפה לסט. אם הסט מלא: toast, והכתובת חוזרת לכלי הפעיל
  useEffect(() => {
    if (!urlId || !getVessel(urlId)) return;
    const r = vs.add(urlId);
    if (r.ok) setDrawerOpen(true);
    else setParams(activeId ? { v: activeId } : {}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlId]);

  /** לחיצה על כלי במפה, בחירה בחיפוש או בשורה בפאנל: מוסיפה לסט (עד 10) והופכת לפעיל; כלי שכבר בסט הופך לפעיל */
  const select = (id) => {
    const r = vs.add(id);
    if (r.ok) { setDrawerOpen(true); setParams({ v: id }, { replace: true }); }
  };
  /** כלי שכבר בסט הופך לפעיל (dropdown הסט, מגירת הסט) */
  const activate = (id) => { vs.activate(id); setDrawerOpen(true); setParams({ v: id }, { replace: true }); };
  const closeDrawer = () => { setDrawerOpen(false); setParams({}, { replace: true }); };

  const showDrawer = drawerOpen && !!active;
  const setVessels = ids.map((id) => getVessel(id)).filter(Boolean);
  // העמודה הראשונה היא בצד ההתחלה (ימין ב-RTL): מגירה מימין, מפה משמאל.
  // החיפוש וכלי המפה הם רכיבים אחים מעל המפה, לא חלק מקוד המפה.
  return (
    <div className={`workspace${showDrawer ? ' with-drawer' : ''}`}>
      {showDrawer && (mode === 'all'
        ? <SetDrawer vessels={setVessels} activeId={activeId} colors={colors} onActivate={activate} onClose={closeDrawer} />
        : <VesselDrawer v={active} onClose={closeDrawer} />)}
      <div className="map-col">
        <MapView vessels={MAP_VESSELS} selectedId={activeId ?? undefined} onMapReady={setMap}
          onSelect={(id) => { if (!blockSelect.current) select(id); }} />
        <MapTools map={map} vessels={VESSELS} blockRef={blockSelect} onActivate={activate} onSelectVessel={select}>
          <MapSearch onPickVessel={select} />
        </MapTools>
      </div>
    </div>
  );
}
