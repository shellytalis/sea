import { useSearchParams } from "react-router-dom";
import MapView from "../components/MapView";
import VesselDrawer from "../components/VesselDrawer";
import { VESSELS, getVessel } from "../data/vessels";
export default function Home() {
  const [params, setParams] = useSearchParams();
  const selectedId = params.get("v") ?? undefined;
  const v = getVessel(selectedId);
  // העמודה הראשונה היא בצד ההתחלה (ימין ב-RTL): מגירה מימין, מפה משמאל
  return <div className="workspace" style={{ gridTemplateColumns: v ? "var(--drawer-w) minmax(0, 1fr)" : "minmax(0, 1fr)" }}>
      {v && <VesselDrawer v={v} onClose={() => setParams({})} />}
      <MapView vessels={VESSELS} selectedId={selectedId} onSelect={(id) => setParams({ v: id })} />
    </div>;
}
