import { useEffect, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Vessel } from '../data/vessels';
import { Shape } from '../ui/Badges';

type Theme = 'dark' | 'light';

// שכבת "עולם נקייה": מפה ללא שמות מדינות, בגרסה כהה ובהירה לפי ערכת הנושא
const STYLES: Record<Theme, string> = {
  dark: 'https://basemaps.cartocdn.com/gl/dark-matter-nolabels-gl-style/style.json',
  light: 'https://basemaps.cartocdn.com/gl/positron-nolabels-gl-style/style.json',
};
const PALETTE: Record<Theme, { land: string; water: string; border: string; halo: string }> = {
  dark: { land: '#13263f', water: '#0a1a30', border: '#3a5f90', halo: '#0b1220' },
  light: { land: '#eaf0f7', water: '#c5d9ee', border: '#9db3cf', halo: '#ffffff' },
};

const themeNow = (): Theme => (document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');
const cssVar = (n: string) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

/** סמל לכל רמת חיווי: עיגול / משולש / מעוין, כדי שהצבע לא יהיה הנושא היחיד */
function icon(kind: 'circle' | 'triangle' | 'diamond', fill: string, halo: string) {
  const c = document.createElement('canvas');
  c.width = c.height = 48;
  const g = c.getContext('2d')!;
  g.beginPath();
  if (kind === 'circle') g.arc(24, 24, 14, 0, Math.PI * 2);
  else if (kind === 'triangle') { g.moveTo(24, 6); g.lineTo(43, 40); g.lineTo(5, 40); g.closePath(); }
  else { g.moveTo(24, 4); g.lineTo(44, 24); g.lineTo(24, 44); g.lineTo(4, 24); g.closePath(); }
  g.lineWidth = 5; g.strokeStyle = halo; g.stroke();
  g.fillStyle = fill; g.fill();
  return g.getImageData(0, 0, 48, 48);
}

const toGeo = (vs: Vessel[]) => ({
  type: 'FeatureCollection' as const,
  features: vs.map(v => ({
    type: 'Feature' as const,
    properties: { id: v.id, risk: v.risk },
    geometry: { type: 'Point' as const, coordinates: [v.lon, v.lat] },
  })),
});

interface Props { vessels: Vessel[]; selectedId?: string; onSelect: (id: string) => void }

export default function MapView({ vessels, selectedId, onSelect }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const cb = useRef(onSelect);
  cb.current = onSelect;
  const live = useRef({ vessels, selectedId });
  live.current = { vessels, selectedId };

  const focusSelected = (m: maplibregl.Map, fly: boolean) => {
    const { vessels: vs, selectedId: id } = live.current;
    if (m.getLayer('sel-ring')) m.setFilter('sel-ring', ['==', ['get', 'id'], id ?? '']);
    const v = vs.find(x => x.id === id);
    if (v && fly) m.easeTo({ center: [v.lon, v.lat], zoom: Math.max(m.getZoom(), 6), duration: 600 });
  };

  useEffect(() => {
    const m = new maplibregl.Map({ container: el.current!, style: STYLES[themeNow()], center: [28, 34], zoom: 4.6, attributionControl: { compact: true } });
    map.current = m;
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-left');

    // נקרא בכל טעינת סגנון (גם בהחלפת ערכת נושא), כי setStyle מוחק שכבות מותאמות
    m.on('style.load', () => {
      const t = themeNow(), P = PALETTE[t];
      for (const l of m.getStyle().layers) {
        if (/^boundary_/.test(l.id) && l.type === 'line') m.setPaintProperty(l.id, 'line-color', P.border);
        else if (l.id === 'water') m.setPaintProperty(l.id, 'fill-color', P.water);
        else if (l.type === 'background') m.setPaintProperty(l.id, 'background-color', P.land);
        else if (/^(landcover|landuse|park_)/.test(l.id) && l.type === 'fill') m.setPaintProperty(l.id, 'fill-color', P.land);
      }
      const neutral = cssVar('--accent-text'), warn = cssVar('--risk-med'), danger = cssVar('--risk-high');
      const imgs: [string, 'circle' | 'triangle' | 'diamond', string][] = [['v-none', 'circle', neutral], ['v-warning', 'triangle', warn], ['v-danger', 'diamond', danger]];
      for (const [name, kind, color] of imgs) {
        if (m.hasImage(name)) m.removeImage(name);
        m.addImage(name, icon(kind, color, P.halo), { pixelRatio: 2 });
      }
      m.addSource('vessels', { type: 'geojson', data: toGeo(live.current.vessels) });
      m.addLayer({
        id: 'sel-ring', type: 'circle', source: 'vessels', filter: ['==', ['get', 'id'], ''],
        paint: { 'circle-radius': 15, 'circle-color': 'rgba(0,0,0,0)', 'circle-stroke-color': neutral, 'circle-stroke-width': 2 },
      });
      m.addLayer({
        id: 'vessels', type: 'symbol', source: 'vessels',
        layout: {
          'icon-image': ['match', ['get', 'risk'], 'danger', 'v-danger', 'warning', 'v-warning', 'v-none'],
          'icon-size': 0.75, 'icon-allow-overlap': true,
        },
      });
      focusSelected(m, false);
    });

    m.on('click', 'vessels', e => { const id = e.features?.[0]?.properties?.id; if (id) cb.current(id); });
    m.on('mouseenter', 'vessels', () => (m.getCanvas().style.cursor = 'pointer'));
    m.on('mouseleave', 'vessels', () => (m.getCanvas().style.cursor = ''));

    let current = themeNow();
    const mo = new MutationObserver(() => {
      const t = themeNow();
      if (t !== current) { current = t; m.setStyle(STYLES[t]); }
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    return () => { mo.disconnect(); m.remove(); };
  }, []);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const apply = () => focusSelected(m, true);
    if (m.isStyleLoaded()) apply(); else m.once('idle', apply);
  }, [selectedId, vessels]);

  return (
    <div className="map-wrap">
      <div ref={el} className="map-canvas" />
      <div className="map-legend" role="group" aria-label="מקרא">
        <div className="legend-row"><Shape risk="low" color="var(--accent-text)" />כלי שיט</div>
        <div className="legend-row"><Shape risk="med" />חיווי אזהרה</div>
        <div className="legend-row"><Shape risk="high" />חיווי פעולה מסוכנת</div>
      </div>
    </div>
  );
}
