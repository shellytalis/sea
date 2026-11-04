// ⚠ נתוני דמה זמניים: כל החברות, הציונים והחריגות בדויים ויוחלפו ב-API.
import type { SourceStamp } from './vessels';
import type { Risk } from '../ui/Badges';

export const COMPANY_TYPES = ['בעלים רשום', 'מפעיל', 'מנהל טכני', 'מנהל מסחרי', 'סוכן'] as const;
export type CompanyType = (typeof COMPANY_TYPES)[number];

export interface Company {
  id: string;
  name: string;
  type: CompanyType;
  roleList: string[];
  country: string;
  city: string;
  address: string;
  founded: number;
  fleetSize: number;
  risk: Risk;
  riskScore: number | null; // ציון מודל, 0–100
  anomalies: number | null; // חריגות פעילות (מודל); null = לא נבדק
  updated: string;
  dnb: string;
  vesselIds: string[];
  parent: string | null;
  subsidiaries: string[];
  website: string;
  phone: string;
  roles: { vessel: string; role: string }[];
  stamp: SourceStamp;
}

type Row = [name: string, type: CompanyType, country: string, city: string, fleet: number, risk: Risk, score: number | null, anomalies: number | null, roleList: string[], updated: string];

const ROWS: Row[] = [
  ['Fjord Marine AS', 'בעלים רשום', 'נורווגיה', 'Bergen', 14, 'low', 12, 0, ['בעלים רשום'], '2026-10-20'],
  ['Aegean Bulk Ltd', 'בעלים רשום', 'יוון', 'Piraeus', 27, 'med', 54, 2, ['בעלים רשום', 'מפעיל'], '2026-10-18'],
  ['Lotus Shipping Co', 'מפעיל', 'הונג קונג', 'Hong Kong', 52, 'low', 21, 0, ['מפעיל', 'מנהל מסחרי'], '2026-10-25'],
  ['Falcon Maritime', 'מנהל טכני', 'איחוד האמירויות', 'Dubai', 6, 'high', 86, 5, ['מנהל טכני'], '2026-10-30'],
  ['Marmara Tankers', 'בעלים רשום', 'טורקיה', 'Istanbul', 19, 'low', 18, 0, ['בעלים רשום'], '2026-10-12'],
  ['Atlas Gas Transport', 'מפעיל', 'איי בהאמס', 'Nassau', 9, 'low', 27, 1, ['מפעיל'], '2026-10-22'],
  ['Hellas Ship Mgmt', 'מנהל טכני', 'יוון', 'Athens', 41, 'med', 47, 1, ['מנהל טכני', 'מנהל מסחרי'], '2026-10-27'],
  ['Nordic Ship Mgmt', 'מנהל טכני', 'נורווגיה', 'Oslo', 33, 'low', 9, 0, ['מנהל טכני'], '2026-10-15'],
  ['Bosphorus Mgmt', 'מנהל טכני', 'טורקיה', 'Izmir', 12, 'low', 24, 0, ['מנהל טכני'], '2026-09-29'],
  ['Pearl River Tankers', 'בעלים רשום', 'סין', 'Shanghai', 88, 'med', 58, 3, ['בעלים רשום', 'מפעיל'], '2026-11-01'],
  ['Sunda Strait Lines', 'מפעיל', 'סינגפור', 'Singapore', 64, 'low', 16, 0, ['מפעיל'], '2026-10-28'],
  ['Cape Meridian Bulk', 'בעלים רשום', 'דרום אפריקה', 'Cape Town', 8, 'unchecked', null, null, ['בעלים רשום'], '2026-08-14'],
  ['Gulf Horizon Shipping', 'מפעיל', 'איחוד האמירויות', 'Abu Dhabi', 23, 'high', 78, 4, ['מפעיל', 'בעלים רשום'], '2026-10-31'],
  ['Levant Coastal Agency', 'סוכן', 'ישראל', 'Haifa', 4, 'low', 6, 0, ['סוכן'], '2026-10-05'],
  ['Cyprian Chartering', 'מנהל מסחרי', 'קפריסין', 'Limassol', 17, 'med', 43, 2, ['מנהל מסחרי'], '2026-10-24'],
  ['Baltic Crown Maritime', 'בעלים רשום', 'פולין', 'Gdynia', 11, 'low', 14, 0, ['בעלים רשום'], '2026-09-18'],
  ['Iberia Marine Services', 'סוכן', 'ספרד', 'Valencia', 7, 'unchecked', null, null, ['סוכן'], '2026-07-30'],
  ['Red Sea Logistics', 'מפעיל', 'מצרים', 'Alexandria', 15, 'med', 51, 1, ['מפעיל'], '2026-10-26'],
  ['Pacific Anchor Holdings', 'בעלים רשום', 'יפן', 'Yokohama', 46, 'low', 8, 0, ['בעלים רשום'], '2026-10-10'],
  ['Adriatic Star Ltd', 'מנהל מסחרי', 'איטליה', 'Trieste', 21, 'low', 19, 0, ['מנהל מסחרי', 'סוכן'], '2026-10-02'],
  ['Meridian Tanker Pool', 'מנהל מסחרי', 'בריטניה', 'London', 37, 'med', 49, 2, ['מנהל מסחרי'], '2026-10-29'],
  ['Caspian Freight Co', 'מפעיל', 'אזרבייג׳ן', 'Baku', 10, 'high', 81, 3, ['מפעיל'], '2026-10-23'],
  ['Oceanus Fleet Mgmt', 'מנהל טכני', 'הונג קונג', 'Hong Kong', 72, 'low', 22, 0, ['מנהל טכני', 'מפעיל'], '2026-11-02'],
  ['Maple Harbour Shipping', 'בעלים רשום', 'קנדה', 'Vancouver', 13, 'unchecked', null, null, ['בעלים רשום'], '2026-06-21'],
];

/** פרטים מורחבים שקיימים כבר לשש החברות הראשונות (דף הפרופיל) */
const EXTRA: Record<number, Partial<Company>> = {
  0: { address: 'Strandkaien 12, 5013 Bergen', founded: 1994, subsidiaries: ['Fjord Tankers Pte'], website: 'fjordmarine.example', phone: '+47 55 00 00 00', vesselIds: ['v1'], roles: [{ vessel: 'v1', role: 'בעלים רשום' }] },
  1: { address: '45 Akti Miaouli, Piraeus', founded: 2001, parent: 'Hellas Holdings', website: 'aegeanbulk.example', phone: '+30 210 000 0000', vesselIds: ['v2'], roles: [{ vessel: 'v2', role: 'בעלים רשום' }] },
  2: { address: '88 Queensway, Admiralty', founded: 2008, subsidiaries: ['Lotus Ship Mgmt', 'Lotus Logistics'], website: 'lotusshipping.example', phone: '+852 2000 0000', vesselIds: ['v3'], roles: [{ vessel: 'v3', role: 'מפעיל' }] },
  3: { address: 'JLT Cluster D, Dubai', founded: 2012, vesselIds: ['v4'], roles: [{ vessel: 'v4', role: 'מנהל טכני' }] },
  4: { address: 'Kadıköy, Istanbul', founded: 1989, subsidiaries: ['Bosphorus Mgmt'], website: 'marmaratankers.example', phone: '+90 216 000 0000', vesselIds: ['v5'], roles: [{ vessel: 'v5', role: 'בעלים רשום' }] },
  5: { address: 'Bay Street, Nassau', founded: 2010, parent: 'Atlas Group', subsidiaries: ['Atlas Ship Mgmt'], website: 'atlasgas.example', phone: '+1 242 000 0000', vesselIds: ['v6'], roles: [{ vessel: 'v6', role: 'מפעיל' }] },
};

export const COMPANIES: Company[] = ROWS.map(([name, type, country, city, fleetSize, risk, riskScore, anomalies, roleList, updated], i) => ({
  id: `c${i + 1}`, name, type, roleList, country, city, fleetSize, risk, riskScore, anomalies, updated,
  address: city, founded: 1990 + ((i * 7) % 30), dnb: String(30000000 + i * 1357913).padStart(9, '0'),
  vesselIds: [], parent: null, subsidiaries: [], website: '—', phone: '—', roles: [],
  stamp: { source: 'מקור א', updated },
  ...EXTRA[i],
}));

export const FLEET_MAX = 100;
export const COMPANY_COUNTRIES = [...new Set(COMPANIES.map(c => c.country))].sort((a, b) => a.localeCompare(b, 'he'));
export const citiesOf = (country: string) => [...new Set(COMPANIES.filter(c => c.country === country).map(c => c.city))].sort();

export interface CompanyQuery {
  name: string; country: string; city: string; types: CompanyType[]; fleet: [number, number]; risks: Risk[];
}
export const EMPTY_QUERY: CompanyQuery = { name: '', country: '', city: '', types: [], fleet: [0, FLEET_MAX], risks: [] };

export const hasParams = (q: CompanyQuery) =>
  !!(q.name.trim() || q.country || q.city || q.types.length || q.risks.length || q.fleet[0] > 0 || q.fleet[1] < FLEET_MAX);

export function searchCompanies(q: CompanyQuery): Company[] {
  const n = q.name.trim().toLowerCase();
  return COMPANIES.filter(c =>
    (!n || c.name.toLowerCase().includes(n)) &&
    (!q.country || c.country === q.country) &&
    (!q.city || c.city === q.city) &&
    (!q.types.length || q.types.includes(c.type)) &&
    c.fleetSize >= q.fleet[0] && c.fleetSize <= q.fleet[1] &&
    (!q.risks.length || q.risks.includes(c.risk)));
}
export const getCompany = (id?: string | null) => COMPANIES.find(c => c.id === id);
