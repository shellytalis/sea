/**
 * @typedef {Object} Company
 * @property {string} id            "c1".."cN"
 * @property {string} name
 * @property {string} type          אחד מ-COMPANY_TYPES
 * @property {string[]} roleList
 * @property {string} country
 * @property {string} city
 * @property {number} fleetSize
 * @property {string} updated       YYYY-MM-DD
 * @property {string[]} vesselIds   מזהי כלי שיט ב-VESSELS
 * @property {{vessel: string, role: string}[]} roles
 * @property {string|null} parent
 * @property {string[]} subsidiaries
 * @property {{source: string, updated: string}} stamp
 * @property {Signal[]} signals     אותות מודל (הצעה: סוגי האותות ותוכן ה-why הם דמה)
 */

/**
 * @typedef {Object} Signal
 * @property {'fleet'|'activity'|'links'|'identity'} kind
 * @property {import("../ui/severity").Severity} severity
 * @property {string[]} why         2-3 גורמים
 * @property {string} updated       YYYY-MM-DD
 * @property {string} modelVersion
 */

/** הצעה: סוגי האותות לפי BRAIN §5. מה המודלים מפיקים בפועל לא הוגדר. */
export const SIGNAL_KINDS = [
  { id: "fleet", label: "חריגות בצי", short: "צי" },
  { id: "activity", label: "שינוי בדפוס פעילות", short: "פעילות" },
  { id: "links", label: "קשרים חריגים בין חברות", short: "קשרים" },
  { id: "identity", label: "שינויי זהות בצי", short: "זהות" }
];

export const COMPANY_TYPES = [
  "בעלים רשום",
  "מפעיל",
  "מנהל טכני",
  "מנהל מסחרי",
  "סוכן"
];
const ROWS = [
  [
    "Fjord Marine AS",
    "בעלים רשום",
    "נורווגיה",
    "Bergen",
    14,
    "low",
    12,
    0,
    ["בעלים רשום"],
    "2026-10-20"
  ],
  [
    "Aegean Bulk Ltd",
    "בעלים רשום",
    "יוון",
    "Piraeus",
    27,
    "medium",
    54,
    2,
    ["בעלים רשום", "מפעיל"],
    "2026-10-18"
  ],
  [
    "Lotus Shipping Co",
    "מפעיל",
    "הונג קונג",
    "Hong Kong",
    52,
    "low",
    21,
    0,
    ["מפעיל", "מנהל מסחרי"],
    "2026-10-25"
  ],
  [
    "Falcon Maritime",
    "מנהל טכני",
    "איחוד האמירויות",
    "Dubai",
    6,
    "high",
    86,
    5,
    ["מנהל טכני"],
    "2026-10-30"
  ],
  [
    "Marmara Tankers",
    "בעלים רשום",
    "טורקיה",
    "Istanbul",
    19,
    "low",
    18,
    0,
    ["בעלים רשום"],
    "2026-10-12"
  ],
  [
    "Atlas Gas Transport",
    "מפעיל",
    "איי בהאמס",
    "Nassau",
    9,
    "low",
    27,
    1,
    ["מפעיל"],
    "2026-10-22"
  ],
  [
    "Hellas Ship Mgmt",
    "מנהל טכני",
    "יוון",
    "Athens",
    41,
    "medium",
    47,
    1,
    ["מנהל טכני", "מנהל מסחרי"],
    "2026-10-27"
  ],
  [
    "Nordic Ship Mgmt",
    "מנהל טכני",
    "נורווגיה",
    "Oslo",
    33,
    "low",
    9,
    0,
    ["מנהל טכני"],
    "2026-10-15"
  ],
  [
    "Bosphorus Mgmt",
    "מנהל טכני",
    "טורקיה",
    "Izmir",
    12,
    "low",
    24,
    0,
    ["מנהל טכני"],
    "2026-09-29"
  ],
  [
    "Pearl River Tankers",
    "בעלים רשום",
    "סין",
    "Shanghai",
    88,
    "medium",
    58,
    3,
    ["בעלים רשום", "מפעיל"],
    "2026-11-01"
  ],
  [
    "Sunda Strait Lines",
    "מפעיל",
    "סינגפור",
    "Singapore",
    64,
    "low",
    16,
    0,
    ["מפעיל"],
    "2026-10-28"
  ],
  [
    "Cape Meridian Bulk",
    "בעלים רשום",
    "דרום אפריקה",
    "Cape Town",
    8,
    "unassessed",
    null,
    null,
    ["בעלים רשום"],
    "2026-08-14"
  ],
  [
    "Gulf Horizon Shipping",
    "מפעיל",
    "איחוד האמירויות",
    "Abu Dhabi",
    23,
    "high",
    78,
    4,
    ["מפעיל", "בעלים רשום"],
    "2026-10-31"
  ],
  [
    "Levant Coastal Agency",
    "סוכן",
    "ישראל",
    "Haifa",
    4,
    "low",
    6,
    0,
    ["סוכן"],
    "2026-10-05"
  ],
  [
    "Cyprian Chartering",
    "מנהל מסחרי",
    "קפריסין",
    "Limassol",
    17,
    "medium",
    43,
    2,
    ["מנהל מסחרי"],
    "2026-10-24"
  ],
  [
    "Baltic Crown Maritime",
    "בעלים רשום",
    "פולין",
    "Gdynia",
    11,
    "low",
    14,
    0,
    ["בעלים רשום"],
    "2026-09-18"
  ],
  [
    "Iberia Marine Services",
    "סוכן",
    "ספרד",
    "Valencia",
    7,
    "unassessed",
    null,
    null,
    ["סוכן"],
    "2026-07-30"
  ],
  [
    "Red Sea Logistics",
    "מפעיל",
    "מצרים",
    "Alexandria",
    15,
    "medium",
    51,
    1,
    ["מפעיל"],
    "2026-10-26"
  ],
  [
    "Pacific Anchor Holdings",
    "בעלים רשום",
    "יפן",
    "Yokohama",
    46,
    "low",
    8,
    0,
    ["בעלים רשום"],
    "2026-10-10"
  ],
  [
    "Adriatic Star Ltd",
    "מנהל מסחרי",
    "איטליה",
    "Trieste",
    21,
    "low",
    19,
    0,
    ["מנהל מסחרי", "סוכן"],
    "2026-10-02"
  ],
  [
    "Meridian Tanker Pool",
    "מנהל מסחרי",
    "בריטניה",
    "London",
    37,
    "medium",
    49,
    2,
    ["מנהל מסחרי"],
    "2026-10-29"
  ],
  [
    "Caspian Freight Co",
    "מפעיל",
    "אזרבייג׳ן",
    "Baku",
    10,
    "high",
    81,
    3,
    ["מפעיל"],
    "2026-10-23"
  ],
  [
    "Oceanus Fleet Mgmt",
    "מנהל טכני",
    "הונג קונג",
    "Hong Kong",
    72,
    "low",
    22,
    0,
    ["מנהל טכני", "מפעיל"],
    "2026-11-02"
  ],
  [
    "Maple Harbour Shipping",
    "בעלים רשום",
    "קנדה",
    "Vancouver",
    13,
    "unassessed",
    null,
    null,
    ["בעלים רשום"],
    "2026-06-21"
  ]
];
/** פרטים מורחבים שקיימים כבר לשש החברות הראשונות (דף הפרופיל) */
const EXTRA = {
  0: {
    address: "Strandkaien 12, 5013 Bergen",
    founded: 1994,
    subsidiaries: ["Fjord Tankers Pte"],
    website: "fjordmarine.example",
    phone: "+47 55 00 00 00",
    vesselIds: ["v1"],
    roles: [{
      vessel: "v1",
      role: "בעלים רשום"
    }]
  },
  1: {
    address: "45 Akti Miaouli, Piraeus",
    founded: 2001,
    parent: "Hellas Holdings",
    website: "aegeanbulk.example",
    phone: "+30 210 000 0000",
    vesselIds: ["v2"],
    roles: [{
      vessel: "v2",
      role: "בעלים רשום"
    }]
  },
  2: {
    address: "88 Queensway, Admiralty",
    founded: 2008,
    subsidiaries: ["Lotus Ship Mgmt", "Lotus Logistics"],
    website: "lotusshipping.example",
    phone: "+852 2000 0000",
    vesselIds: ["v3"],
    roles: [{
      vessel: "v3",
      role: "מפעיל"
    }]
  },
  3: {
    address: "JLT Cluster D, Dubai",
    founded: 2012,
    vesselIds: ["v4"],
    roles: [{
      vessel: "v4",
      role: "מנהל טכני"
    }]
  },
  4: {
    address: "Kadıköy, Istanbul",
    founded: 1989,
    subsidiaries: ["Bosphorus Mgmt"],
    website: "marmaratankers.example",
    phone: "+90 216 000 0000",
    vesselIds: ["v5"],
    roles: [{
      vessel: "v5",
      role: "בעלים רשום"
    }]
  },
  5: {
    address: "Bay Street, Nassau",
    founded: 2010,
    parent: "Atlas Group",
    subsidiaries: ["Atlas Ship Mgmt"],
    website: "atlasgas.example",
    phone: "+1 242 000 0000",
    vesselIds: ["v6"],
    roles: [{
      vessel: "v6",
      role: "מפעיל"
    }]
  }
};
const WHY = {
  fleet: {
    low: ["סטייה קלה ממספר הכלים הצפוי בסוג", "כלי אחד ללא קליטת AIS ממושכת"],
    medium: ["שני כלים עם הפסקות שידור חוזרות", "גידול בצי מעל הממוצע בסוג"],
    high: ["ריכוז הפסקות שידור בכמה כלים במקביל", "כלים שהוחלפו בהם שם ודגל בתוך חצי שנה", "פער בין הצי המדווח לצי הנצפה"],
    critical: ["הפסקות שידור בכל הצי באותו אזור", "מפגשי ship-to-ship חוזרים", "כלים ברשימת מעקב"]
  },
  activity: {
    low: ["שינוי קל בתדירות ביקורים בנמלים"],
    medium: ["מעבר לנמלי יעד חדשים", "הארכת זמני שהייה בנמל"],
    high: ["שינוי חד באזור הפעילות", "מסלולים חדשים דרך אזורי סיכון"],
    critical: ["שינוי חד באזור הפעילות", "שיטוט חשוד בים הפתוח", "ביקורים בנמלים ברשימת מעקב"]
  },
  links: {
    low: ["בעלות משותפת עם חברה אחת נוספת"],
    medium: ["כתובת רישום משותפת למספר חברות", "מנהל משותף עם חברה שהוקמה לאחרונה"],
    high: ["שרשרת בעלות דרך שלוש מדינות", "קשר לחברה בעלת אינדיקטורים קודמים"],
    critical: ["קשר ישיר לחברה ברשימת מעקב", "בעלות מוטב לא מזוהה"]
  },
  identity: {
    low: ["שינוי שם אחד בצי בשנה האחרונה"],
    medium: ["שינוי דגל של כלי אחד", "החלפת מנהל טכני"],
    high: ["שינויי שם ודגל בכמה כלים", "החלפת בעלים רשום"],
    critical: ["שינויי זהות סדרתיים בצי", "החלפת בעלים ודגל בתוך חודשיים"]
  }
};
const PATTERN = {
  low: ["none", "none", "none", "none"],
  medium: ["medium", "low", "none", "low"],
  high: ["high", "high", "medium", "low"],
  unassessed: ["unassessed", "unassessed", "unassessed", "unassessed"]
};
/** אותות דמה לפי דפוס, לא מחושבים מנתונים אמיתיים @returns {Signal[]} */
const makeSignals = (pattern, i, updated) => SIGNAL_KINDS.map((k, n) => {
  let severity = PATTERN[pattern][n];
  if (pattern === "low" && n === 0 && i % 3 === 0) severity = "low";
  if (pattern === "high" && n === 0 && i % 2 === 0) severity = "critical";
  const why = severity === "unassessed" ? ["אין מספיק נתוני פעילות בחלון הניתוח"] : severity === "none" ? [] : WHY[k.id][severity];
  return { kind: k.id, severity, why, updated, modelVersion: "0.3" };
});

/** שיוך כלים לחברות שלא הוגדרו ב-EXTRA (דמה): [מזהה כלי, תפקיד] */
const FLEET_OF = {
  c13: [["v7", "מפעיל"], ["v8", "מפעיל"], ["v9", "בעלים רשום"], ["v10", "מפעיל"], ["v11", "בעלים רשום"]],
  c5: [["v5", "בעלים רשום"], ["v12", "בעלים רשום"]]
};
const withFleet = (c) => FLEET_OF[c.id]
  ? { ...c, vesselIds: FLEET_OF[c.id].map(([v]) => v), roles: FLEET_OF[c.id].map(([vessel, role]) => ({ vessel, role })) }
  : c;

/** @type {Company[]} */
export const COMPANIES = ROWS.map(([name, type, country, city, fleetSize, pattern, , , roleList, updated], i) => ({
  id: `c${i + 1}`,
  name,
  type,
  roleList,
  country,
  city,
  fleetSize,
  updated,
  signals: makeSignals(pattern, i, updated),
  address: city,
  founded: 1990 + i * 7 % 30,
  dnb: String(3e7 + i * 1357913).padStart(9, "0"),
  vesselIds: [],
  parent: null,
  subsidiaries: [],
  website: "—",
  phone: "—",
  roles: [],
  stamp: {
    source: "מקור א",
    updated
  },
  ...EXTRA[i]
})).map(withFleet);
export const FLEET_MAX = 100;
export const COMPANY_COUNTRIES = [...new Set(COMPANIES.map((c) => c.country))].sort((a, b) => a.localeCompare(b, "he"));
export const citiesOf = (country) => [...new Set(COMPANIES.filter((c) => c.country === country).map((c) => c.city))].sort();
export const EMPTY_QUERY = {
  name: "",
  country: "",
  city: "",
  types: [],
  fleet: [null, null]
};
export const hasParams = (q) => !!(q.name.trim() || q.country || q.city || q.types.length || q.fleet[0] !== null || q.fleet[1] !== null);
export function searchCompanies(q) {
  const n = q.name.trim().toLowerCase();
  return COMPANIES.filter((c) => (!n || c.name.toLowerCase().includes(n)) && (!q.country || c.country === q.country) && (!q.city || c.city === q.city) && (!q.types.length || q.types.includes(c.type)) && c.fleetSize >= (q.fleet[0] ?? 0) && c.fleetSize <= (q.fleet[1] ?? Infinity));
}
export const getCompany = (id) => COMPANIES.find((c) => c.id === id);

/**
 * קשרים בין חברות (הצעה: סוגי הקשר ונתוני הדמה. האפיון §4.5 קובע שהקשרים טעונים אפיון).
 * @typedef {Object} Relation
 * @property {string} id
 * @property {string} from  מזהה חברה
 * @property {string} to    מזהה חברה
 * @property {'ownership'|'management'|'sharedVessels'|'sharedAddress'} type
 * @property {boolean} unusual
 * @property {string} note
 */
export const RELATION_TYPES = {
  ownership: "בעלות",
  management: "ניהול",
  sharedVessels: "כלים משותפים",
  sharedAddress: "כתובת/מנהלים משותפים"
};

/** @type {Relation[]} */
export const RELATIONS = [
  { id: "r1", from: "c1", to: "c8", type: "management", unusual: false, note: "ניהול טכני של הצי כולו" },
  { id: "r2", from: "c2", to: "c7", type: "management", unusual: false, note: "ניהול טכני" },
  { id: "r3", from: "c10", to: "c3", type: "ownership", unusual: false, note: "החזקה של 35% במניות" },
  { id: "r4", from: "c3", to: "c23", type: "management", unusual: false, note: "ניהול טכני לחלק מהצי" },
  { id: "r5", from: "c4", to: "c13", type: "sharedVessels", unusual: true, note: "שני כלים עברו בין החברות בתוך חצי שנה" },
  { id: "r6", from: "c13", to: "c22", type: "sharedAddress", unusual: true, note: "כתובת רישום ושני מנהלים משותפים" },
  { id: "r7", from: "c18", to: "c13", type: "sharedAddress", unusual: true, note: "מנהל משותף שמונה בחודשים האחרונים" },
  { id: "r8", from: "c5", to: "c9", type: "management", unusual: false, note: "ניהול טכני" },
  { id: "r9", from: "c15", to: "c21", type: "sharedVessels", unusual: false, note: "השכרה משותפת של כלי אחד" },
  { id: "r10", from: "c21", to: "c4", type: "sharedVessels", unusual: true, note: "כלי שהועבר בין החברות ללא שינוי בעלות" },
  { id: "r11", from: "c11", to: "c3", type: "sharedVessels", unusual: false, note: "שיתוף פעולה בקו קבוע" },
  { id: "r12", from: "c19", to: "c10", type: "ownership", unusual: false, note: "חברה אם" }
];

/** @param {string} id @returns {Relation[]} */
export const relationsOf = (id) => RELATIONS.filter((r) => r.from === id || r.to === id);

/**
 * איחוד היסטוריית שינויים: שינויים רצופים באותו שדה הופכים לשורה אחת (ערך קודם ← ערך חדש),
 * ושינוי שלא שינה דבר (קודם = חדש) נשמט.
 * @param {{date: string, field: string, from: string, to: string, source: string}[]} rows
 */
export function mergeHistory(rows) {
  const byField = new Map();
  for (const r of [...rows].sort((a, b) => a.date.localeCompare(b.date))) {
    const prev = byField.get(r.field);
    byField.set(r.field, prev ? { ...r, from: prev.from, source: prev.source === r.source ? r.source : `${prev.source}, ${r.source}` } : r);
  }
  return [...byField.values()].filter((r) => r.from !== r.to).sort((a, b) => b.date.localeCompare(a.date));
}

/** היסטוריית שינויים (דמה, קבועה לפי החברה) */
export const historyOf = (c) => mergeHistory([
  { date: c.updated, field: "גודל צי", from: String(Math.max(0, c.fleetSize - 1)), to: String(c.fleetSize), source: "מקור א" },
  { date: "2026-03-14", field: "כתובת רישום", from: `Port Rd 12, ${c.city}`, to: c.address, source: "מקור ב" },
  ...(c.parent ? [{ date: "2025-09-02", field: "חברת אם", from: "—", to: c.parent, source: "מקור ב" }] : [])
]);
