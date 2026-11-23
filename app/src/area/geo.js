// גאומטריה מישורית על [lon, lat] (מספיקה לשטחי הניתוח; חציית קו התאריך אינה נתמכת באב-טיפוס).
const EPS = 1e-12;

const cross = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
const within = (a, b, p) => p[0] >= Math.min(a[0], b[0]) - EPS && p[0] <= Math.max(a[0], b[0]) + EPS && p[1] >= Math.min(a[1], b[1]) - EPS && p[1] <= Math.max(a[1], b[1]) + EPS;
/** הנקודה p על הקטע ab (כולל הקצוות) */
const onSegment = (a, b, p) => Math.abs(cross(a, b, p)) <= EPS && within(a, b, p);

/** הקטעים ab ו-cd נחתכים או נוגעים (כולל חפיפה קווית) */
function segmentsMeet(a, b, c, d) {
  const d1 = cross(a, b, c);
  const d2 = cross(a, b, d);
  const d3 = cross(c, d, a);
  const d4 = cross(c, d, b);
  if (((d1 > EPS && d2 < -EPS) || (d1 < -EPS && d2 > EPS)) && ((d3 > EPS && d4 < -EPS) || (d3 < -EPS && d4 > EPS))) return true;
  return onSegment(a, b, c) || onSegment(a, b, d) || onSegment(c, d, a) || onSegment(c, d, b);
}

/**
 * הנקודה בתוך הפוליגון או על קו הגבול (BR-01). polygon: מערך [lon, lat] פתוח (בלי חזרה על הנקודה הראשונה).
 * @returns {boolean}
 */
export function pointInPolygon(point, polygon) {
  const n = polygon.length;
  if (n < 3) return false;
  for (let i = 0; i < n; i++) if (onSegment(polygon[i], polygon[(i + 1) % n], point)) return true;
  let inside = false;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    if ((yi > point[1]) !== (yj > point[1]) && point[0] < ((xj - xi) * (point[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** צלעות שאינן סמוכות חוצות או נוגעות זו בזו. צלעות סמוכות נבדקות רק לחפיפה קווית מלאה (קודקוד כפול אינו חיתוך) */
export function isSelfIntersecting(polygon) {
  const n = polygon.length;
  if (n < 4) return false;
  for (let i = 0; i < n; i++) {
    const a = polygon[i];
    const b = polygon[(i + 1) % n];
    for (let j = i + 1; j < n; j++) {
      if (j === i + 1 || (i === 0 && j === n - 1)) continue; // צלעות סמוכות
      if (segmentsMeet(a, b, polygon[j], polygon[(j + 1) % n])) return true;
    }
  }
  return false;
}

/** תיבת תוחמת [מערב, דרום, מזרח, צפון] */
export function bounds(points) {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}
