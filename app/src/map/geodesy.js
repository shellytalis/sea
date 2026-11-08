// גאודזיה על כדור (רדיוס ממוצע), בלי תלות חיצונית. קואורדינטות כ-[lng, lat] במעלות.
// כל המרחקים במטרים, כל השטחים במ"ר, כיוונים במעלות (0 = צפון, עם כיוון השעון).
export const EARTH_R = 6371008.8;
const rad = (d) => (d * Math.PI) / 180;
const deg = (r) => (r * 180) / Math.PI;
const norm360 = (d) => ((d % 360) + 360) % 360;
const normLng = (d) => ((((d + 180) % 360) + 360) % 360) - 180;

/** מרחק גדול-מעגל (haversine) */
export function distance(a, b) {
  const p1 = rad(a[1]);
  const p2 = rad(b[1]);
  const h = Math.sin((p2 - p1) / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(rad(b[0] - a[0]) / 2) ** 2;
  return 2 * EARTH_R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** כיוון התחלתי מ-a ל-b */
export function bearing(a, b) {
  const p1 = rad(a[1]);
  const p2 = rad(b[1]);
  const dl = rad(b[0] - a[0]);
  const y = Math.sin(dl) * Math.cos(p2);
  const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
  return norm360(deg(Math.atan2(y, x)));
}

/** נקודת יעד: מנקודה, בכיוון ובמרחק נתונים */
export function destination(origin, bearingDeg, distM) {
  const d = distM / EARTH_R;
  const t = rad(bearingDeg);
  const l1 = rad(origin[0]);
  const p1 = rad(origin[1]);
  const p2 = Math.asin(Math.sin(p1) * Math.cos(d) + Math.cos(p1) * Math.sin(d) * Math.cos(t));
  const l2 = l1 + Math.atan2(Math.sin(t) * Math.sin(d) * Math.cos(p1), Math.cos(d) - Math.sin(p1) * Math.sin(p2));
  return [normLng(deg(l2)), deg(p2)];
}

/** נקודות לאורך קשת גדול-מעגל בין a ל-b (כולל הקצוות), כדי שקו ייראה נכון ב-mercator */
export function greatCircle(a, b, steps = 32) {
  const d = distance(a, b) / EARTH_R;
  if (d < 1e-9) return [a, b];
  const p1 = rad(a[1]);
  const p2 = rad(b[1]);
  const l1 = rad(a[0]);
  const l2 = rad(b[0]);
  const out = [];
  for (let i = 0; i <= steps; i++) {
    const f = i / steps;
    const A = Math.sin((1 - f) * d) / Math.sin(d);
    const B = Math.sin(f * d) / Math.sin(d);
    const x = A * Math.cos(p1) * Math.cos(l1) + B * Math.cos(p2) * Math.cos(l2);
    const y = A * Math.cos(p1) * Math.sin(l1) + B * Math.cos(p2) * Math.sin(l2);
    const z = A * Math.sin(p1) + B * Math.sin(p2);
    out.push([deg(Math.atan2(y, x)), deg(Math.atan2(z, Math.sqrt(x * x + y * y)))]);
  }
  return out;
}

/** אורך מסלול (סכום קטעים) */
export const pathLength = (pts) => pts.slice(1).reduce((s, p, i) => s + distance(pts[i], p), 0);

/** שטח מצולע על כדור (Chamberlain-Duquette), מ"ר; מצולע פתוח נסגר אוטומטית */
export function polygonArea(pts) {
  if (pts.length < 3) return 0;
  let sum = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % pts.length];
    sum += rad(q[0] - p[0]) * (2 + Math.sin(rad(p[1])) + Math.sin(rad(q[1])));
  }
  return Math.abs((sum * EARTH_R * EARTH_R) / 2);
}

/** היקף מצולע (סגור) */
export const polygonPerimeter = (pts) => (pts.length < 2 ? 0 : pathLength([...pts, pts[0]]));

/** מצולע של מעגל: steps נקודות במרחק קבוע מהמרכז (סגור, הנקודה הראשונה חוזרת בסוף) */
export function circlePolygon(center, radiusM, steps = 128) {
  const ring = [];
  for (let i = 0; i < steps; i++) ring.push(destination(center, (360 * i) / steps, radiusM));
  ring.push(ring[0]);
  return ring;
}

/** מרכז פשוט (ממוצע הנקודות) לתווית שטח */
export const centroid = (pts) => [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length];

export const circleCircumference = (r) => 2 * Math.PI * r;
export const circleArea = (r) => Math.PI * r * r;
