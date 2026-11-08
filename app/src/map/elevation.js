import { bearing, destination, distance, pathLength } from './geodesy.js';

/**
 * גובה/עומק בנתוני דמה: שדה חלק ודטרמיניסטי (סכום גלי סינוס), במטרים.
 * חיובי = גובה מעל פני הים, שלילי = עומק. אין קשר לטופוגרפיה אמיתית; במערכת אמיתית יידרש מקור DEM/בתימטריה.
 */
export function elevationAt(lon, lat) {
  const h = 900 * Math.sin(lon * 1.3) * Math.cos(lat * 1.1) + 420 * Math.sin(lon * 3.1 + lat * 2.3) + 260 * Math.cos(lon * 5.7 - lat * 4.1) - 120;
  return Math.round(h);
}

/**
 * פרופיל לאורך קו (נקודות [lng, lat]): n+1 דגימות במרווחים שווים לאורך הקו כולו.
 * מחזיר [{ d: מרחק מצטבר במטרים, ll, h }].
 */
export function profileSamples(points, n = 64) {
  if (points.length === 0) return [];
  if (points.length === 1) return [{ d: 0, ll: points[0], h: elevationAt(points[0][0], points[0][1]) }];
  const total = pathLength(points);
  const cum = [0];
  for (let i = 1; i < points.length; i++) cum.push(cum[i - 1] + distance(points[i - 1], points[i]));
  const out = [];
  let seg = 1;
  for (let i = 0; i <= n; i++) {
    const d = (i / n) * total;
    while (seg < points.length - 1 && cum[seg] < d) seg++;
    const a = points[seg - 1];
    const b = points[seg];
    const into = Math.max(0, Math.min(d - cum[seg - 1], cum[seg] - cum[seg - 1]));
    const ll = into === 0 ? a : into >= cum[seg] - cum[seg - 1] ? b : destination(a, bearing(a, b), into);
    out.push({ d, ll, h: elevationAt(ll[0], ll[1]) });
  }
  return out;
}

export function profileStats(samples) {
  if (!samples.length) return null;
  let min = samples[0];
  let max = samples[0];
  let ascent = 0;
  for (let i = 0; i < samples.length; i++) {
    if (samples[i].h < min.h) min = samples[i];
    if (samples[i].h > max.h) max = samples[i];
    if (i && samples[i].h > samples[i - 1].h) ascent += samples[i].h - samples[i - 1].h;
  }
  return { min, max, ascent, length: samples[samples.length - 1].d };
}
