// שכבות ציור של כלי המפה: מקור GeoJSON אחד. ציור כללי (מילוי + קו מלא) ושכבות כלי שיט לפי דפוס קו.
// נוספות מחדש בכל style.load (setStyle בהחלפת ערכת נושא מוחק שכבות מותאמות), מתחת לסמלי הכלים.
export const SRC = 'mt-geo';
export const EMPTY = { type: 'FeatureCollection', features: [] };
const cssVar = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

/**
 * דפוסי קו (ביחידות רוחב קו 2px): 0-7 לכלי שיט לפי אינדקס הצבע (מסלול והגעה), 8 למעגלי קרבה.
 * null = קו מלא. דפוס שונה לכל כלי, כך שהצבע אינו הנושא היחיד.
 */
export const PATTERNS = [null, [3, 2], [1, 2], [4, 1, 1, 1], [6, 2], [1, 1], [2, 2, 6, 2], [5, 1, 1, 1, 1, 1], [2, 2]];

export function addToolLayers(map) {
  if (map.getSource(SRC)) return;
  const draw = cssVar('--map-draw');
  const halo = cssVar('--map-halo');
  const vesselColor = ['match', ['get', 'vi'], ...Array.from({ length: 8 }, (_, i) => [i, cssVar(`--map-vessel-${i + 1}`)]).flat(), cssVar('--map-vessel-1')];
  const opacity = ['case', ['==', ['get', 'active'], true], 1, 0.7];
  const before = map.getLayer('sel-ring') ? 'sel-ring' : undefined;
  map.addSource(SRC, { type: 'geojson', data: EMPTY });
  // מצב חקירת שטח: מסכה כהה מחוץ לפוליגון (הבסיס נשאר מתחתיה); מתחת לכל קו וסמן שלנו
  map.addLayer({ id: 'mt-mask', type: 'fill', source: SRC, filter: ['==', ['get', 't'], 'mask'], paint: { 'fill-color': cssVar('--map-mask') } }, before);
  map.addLayer({ id: 'mt-fill', type: 'fill', source: SRC, filter: ['==', ['get', 'fill'], true], paint: { 'fill-color': draw, 'fill-opacity': 0.12 } }, before);
  const isDraw = ['==', ['get', 't'], 'draw'];
  // הילה כהה 3px סביב קו 2px: רוחב 5 (1.5px מכל צד)
  map.addLayer({ id: 'mt-halo', type: 'line', source: SRC, filter: isDraw, layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': halo, 'line-width': 5 } }, before);
  map.addLayer({ id: 'mt-line', type: 'line', source: SRC, filter: isDraw, layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': draw, 'line-width': 2 } }, before);
  PATTERNS.forEach((dash, p) => {
    const filter = ['all', ['==', ['get', 't'], 'vessel'], ['==', ['get', 'pat'], p]];
    const layout = dash ? {} : { 'line-join': 'round', 'line-cap': 'round' };
    // דפוס ההילה מכויל לדפוס הקו: רוחב 5 מול 2, ולכן יחידות כפול 0.4 (אותו אורך בפיקסלים)
    map.addLayer({ id: `mt-v${p}-halo`, type: 'line', source: SRC, filter, layout, paint: { 'line-color': halo, 'line-width': 5, 'line-opacity': opacity, ...(dash ? { 'line-dasharray': dash.map((d) => d * 0.4) } : {}) } }, before);
    map.addLayer({ id: `mt-v${p}-line`, type: 'line', source: SRC, filter, layout, paint: { 'line-color': vesselColor, 'line-width': 2, 'line-opacity': opacity, ...(dash ? { 'line-dasharray': dash } : {}) } }, before);
  });
}

export function setToolData(map, features) {
  map.getSource(SRC)?.setData({ type: 'FeatureCollection', features });
}
