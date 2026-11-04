// מצב חיפוש החברות ב-URL: מסננים, מיון, עימוד, עמודות גלויות והחברה הנבחרת.
import { EMPTY_QUERY, FLEET_MAX, hasParams } from './companies';

/** @param {URLSearchParams} p */
export function parseQuery(p) {
  const num = (k, d) => { const n = parseInt(p.get(k) ?? '', 10); return Number.isFinite(n) ? n : d; };
  return {
    name: p.get('name') ?? '',
    country: p.get('country') ?? '',
    city: p.get('city') ?? '',
    types: p.get('types') ? p.get('types').split('|') : [],
    fleet: [Math.max(0, num('fmin', 0)), Math.min(FLEET_MAX, num('fmax', FLEET_MAX))],
  };
}

/** @returns {Record<string,string>} רק פרמטרים לא-ברירת-מחדל */
export function queryToParams(q) {
  const out = {};
  if (q.name.trim()) out.name = q.name.trim();
  if (q.country) out.country = q.country;
  if (q.city) out.city = q.city;
  if (q.types.length) out.types = q.types.join('|');
  if (q.fleet[0] > 0) out.fmin = String(q.fleet[0]);
  if (q.fleet[1] < FLEET_MAX) out.fmax = String(q.fleet[1]);
  return out;
}

export function parseView(p) {
  const [id, dir] = (p.get('sort') ?? '').split('.');
  return {
    sort: id && (dir === 'asc' || dir === 'desc') ? { id, dir } : null,
    page: Math.max(0, (parseInt(p.get('page') ?? '1', 10) || 1) - 1),
    size: [10, 25, 50].includes(+p.get('size')) ? +p.get('size') : 10,
    hidden: p.get('hide') ? p.get('hide').split(',') : [],
    selected: p.get('sel') ?? null,
  };
}

export { EMPTY_QUERY, hasParams };
