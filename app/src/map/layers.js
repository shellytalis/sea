// שכבות ציור של כלי המפה: מקור GeoJSON אחד וארבע שכבות (מילוי, הילה+קו מלא, הילה+קו מקווקו).
// נוספות מחדש בכל style.load (setStyle בהחלפת ערכת נושא מוחק שכבות מותאמות), מתחת לסמלי הכלים.
export const SRC = 'mt-geo';
export const EMPTY = { type: 'FeatureCollection', features: [] };
const cssVar = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

export function addToolLayers(map) {
  if (map.getSource(SRC)) return;
  const draw = cssVar('--map-draw');
  const vessel = cssVar('--map-vessel');
  const halo = cssVar('--map-halo');
  const color = ['match', ['get', 't'], 'vessel', vessel, draw];
  const solid = ['==', ['get', 'dash'], false];
  const dashed = ['==', ['get', 'dash'], true];
  const before = map.getLayer('sel-ring') ? 'sel-ring' : undefined;
  map.addSource(SRC, { type: 'geojson', data: EMPTY });
  map.addLayer({ id: 'mt-fill', type: 'fill', source: SRC, filter: ['==', ['get', 'fill'], true], paint: { 'fill-color': color, 'fill-opacity': 0.12 } }, before);
  // הילה כהה 3px סביב קו 2px: רוחב 5 (1.5px מכל צד)
  map.addLayer({ id: 'mt-halo', type: 'line', source: SRC, filter: solid, layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': halo, 'line-width': 5 } }, before);
  map.addLayer({ id: 'mt-line', type: 'line', source: SRC, filter: solid, layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': color, 'line-width': 2 } }, before);
  // מקווקו: דפוס ההילה מכויל לדפוס הקו (יחידות ביחס לרוחב: 4px לכל קטע בשניהם)
  map.addLayer({ id: 'mt-halo-dash', type: 'line', source: SRC, filter: dashed, paint: { 'line-color': halo, 'line-width': 5, 'line-dasharray': [0.8, 0.8] } }, before);
  map.addLayer({ id: 'mt-line-dash', type: 'line', source: SRC, filter: dashed, paint: { 'line-color': color, 'line-width': 2, 'line-dasharray': [2, 2] } }, before);
}

export function setToolData(map, features) {
  map.getSource(SRC)?.setData({ type: 'FeatureCollection', features });
}
