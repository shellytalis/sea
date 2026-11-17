// שכבה אסינכרונית דקה מעל נתוני הדמה, כדי שהדפים יתנסו במצבי טעינה/שגיאה/אין הרשאה
// כמו מול שרת אמיתי. החלפה בקריאות אמיתיות לא תדרוש שינוי בדפים.
import { COMPANIES, getCompany, relationDataOf, searchCompanies } from './companies';
import { VESSELS, getVessel, searchVessels } from './vessels';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** @param {string} code 'forbidden' | 'failed' */
export const apiError = (code) => Object.assign(new Error(code), { code });

export async function searchCompaniesApi(q) {
  await wait(450);
  return searchCompanies(q);
}

/** @returns {Promise<import('./companies').Company|null>} */
export async function getCompanyApi(id) {
  await wait(250);
  return getCompany(id) ?? null;
}

/** קשרים בין חברות (תוצר מודל, נטען בנפרד מהחברה) @returns {Promise<ReturnType<typeof relationDataOf>>} */
export async function getRelationsApi(id) {
  await wait(350);
  return relationDataOf(id);
}

/** @returns {Promise<import('./vessels').Vessel|null>} */
export async function getVesselApi(id) {
  await wait(250);
  return getVessel(id) ?? null;
}

/** חיפוש גלובלי (סינכרוני, לשימוש ה-combobox): כלים לפי שם/IMO/MMSI וחברות לפי שם */
export function searchEntities(q, limit = 5) {
  const s = q.trim().toLowerCase();
  if (!s) return { vessels: [], companies: [] };
  return {
    vessels: searchVessels(q).slice(0, limit),
    companies: COMPANIES.filter((c) => c.name.toLowerCase().includes(s)).slice(0, limit),
  };
}

export { VESSELS };
