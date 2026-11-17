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
 * @property {ModelOutputs} modelOutputs  תוצרי מודל (שלב א׳). הצעה: כל הערכים והגורמים הם נתוני דמה
 */

/**
 * תוצרי המודלים של שלב א׳ (קבוצות שליטה ופרופיל חברה). חוזה פלט אחיד: ערך, מצב הערכה, רמת ביטחון,
 * גורמים, זמן חישוב וגרסה. הראיות ברמת הקשר נמצאות ב-`relationDataOf`.
 * @typedef {Object} ModelOutputs
 * @property {ControlGroup} controlGroup
 * @property {CompanyProfile} profile
 */

/**
 * קבוצת שליטה: אילו חברות פועלות בפועל כגוף אחד.
 * state: 'assessed' = הוערך ונמצאה קבוצה · 'none' = נבדק ולא נמצאו קשרים (שונה מ"לא הוערך") · 'unassessed' = חסר מידע.
 * @typedef {Object} ControlGroup
 * @property {'assessed'|'unassessed'|'none'} state
 * @property {number} [companies]    מספר החברות בקבוצה, כולל החברה עצמה
 * @property {number} [vessels]      מספר הכלים בקבוצה
 * @property {number} [undeclared]   מספר הקשרים החזקים שאינם מוצהרים ברישום
 * @property {'high'|'medium'|'low'} [confidence]
 * @property {string[]} reasons      הגורם הראשון מוצג בתא הסיכום; בלא הוערך: הסיבה
 * @property {string} [anchor]       דמה: חברה אחרת באותה קבוצה שאליה שמורים נתוני הקשרים
 * @property {string} updated        YYYY-MM-DD
 * @property {string} modelVersion
 */

/**
 * פרופיל חברה: מה החברה בפועל (שונה מהסוג שרשום במאגר). mismatch: אי-התאמה בין הפרופיל לרישום, או null.
 * @typedef {Object} CompanyProfile
 * @property {'assessed'|'unassessed'} state
 * @property {string|null} value     אחד מ-PROFILE_VALUES
 * @property {'high'|'medium'|'low'|null} confidence
 * @property {string[]} reasons
 * @property {string|null} mismatch
 */

/** ערכי פרופיל החברה (שלב א׳) */
export const PROFILE_VALUES = [
  "חברת כלי בודד",
  "בעל צי",
  "מפעיל",
  "מנהל צד שלישי",
  "מנהל פנימי",
  "חברת אחזקות",
  "ללא פעילות נראית"
];

/** גרסת המודלים ותאריך החישוב של נתוני הדמה */
export const MODEL_VERSION = "0.1";
export const MODEL_UPDATED = "2026-11-16";

export const CONFIDENCE_LABEL = { high: "ביטחון גבוה", medium: "ביטחון בינוני", low: "ביטחון נמוך" };

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
    ["בעלים רשום"],
    "2026-10-20"
  ],
  [
    "Aegean Bulk Ltd",
    "בעלים רשום",
    "יוון",
    "Piraeus",
    27,
    ["בעלים רשום", "מפעיל"],
    "2026-10-18"
  ],
  [
    "Lotus Shipping Co",
    "מפעיל",
    "הונג קונג",
    "Hong Kong",
    52,
    ["מפעיל", "מנהל מסחרי"],
    "2026-10-25"
  ],
  [
    "Falcon Maritime",
    "מנהל טכני",
    "איחוד האמירויות",
    "Dubai",
    6,
    ["מנהל טכני"],
    "2026-10-30"
  ],
  [
    "Marmara Tankers",
    "בעלים רשום",
    "טורקיה",
    "Istanbul",
    19,
    ["בעלים רשום"],
    "2026-10-12"
  ],
  [
    "Atlas Gas Transport",
    "מפעיל",
    "איי בהאמס",
    "Nassau",
    9,
    ["מפעיל"],
    "2026-10-22"
  ],
  [
    "Hellas Ship Mgmt",
    "מנהל טכני",
    "יוון",
    "Athens",
    41,
    ["מנהל טכני", "מנהל מסחרי"],
    "2026-10-27"
  ],
  [
    "Nordic Ship Mgmt",
    "מנהל טכני",
    "נורווגיה",
    "Oslo",
    33,
    ["מנהל טכני"],
    "2026-10-15"
  ],
  [
    "Bosphorus Mgmt",
    "מנהל טכני",
    "טורקיה",
    "Izmir",
    12,
    ["מנהל טכני"],
    "2026-09-29"
  ],
  [
    "Pearl River Tankers",
    "בעלים רשום",
    "סין",
    "Shanghai",
    88,
    ["בעלים רשום", "מפעיל"],
    "2026-11-01"
  ],
  [
    "Sunda Strait Lines",
    "מפעיל",
    "סינגפור",
    "Singapore",
    64,
    ["מפעיל"],
    "2026-10-28"
  ],
  [
    "Cape Meridian Bulk",
    "בעלים רשום",
    "דרום אפריקה",
    "Cape Town",
    8,
    ["בעלים רשום"],
    "2026-08-14"
  ],
  [
    "Gulf Horizon Shipping",
    "מפעיל",
    "איחוד האמירויות",
    "Abu Dhabi",
    23,
    ["מפעיל", "בעלים רשום"],
    "2026-10-31"
  ],
  [
    "Levant Coastal Agency",
    "סוכן",
    "ישראל",
    "Haifa",
    4,
    ["סוכן"],
    "2026-10-05"
  ],
  [
    "Cyprian Chartering",
    "מנהל מסחרי",
    "קפריסין",
    "Limassol",
    17,
    ["מנהל מסחרי"],
    "2026-10-24"
  ],
  [
    "Baltic Crown Maritime",
    "בעלים רשום",
    "פולין",
    "Gdynia",
    11,
    ["בעלים רשום"],
    "2026-09-18"
  ],
  [
    "Iberia Marine Services",
    "סוכן",
    "ספרד",
    "Valencia",
    7,
    ["סוכן"],
    "2026-07-30"
  ],
  [
    "Red Sea Logistics",
    "מפעיל",
    "מצרים",
    "Alexandria",
    15,
    ["מפעיל"],
    "2026-10-26"
  ],
  [
    "Pacific Anchor Holdings",
    "בעלים רשום",
    "יפן",
    "Yokohama",
    46,
    ["בעלים רשום"],
    "2026-10-10"
  ],
  [
    "Adriatic Star Ltd",
    "מנהל מסחרי",
    "איטליה",
    "Trieste",
    21,
    ["מנהל מסחרי", "סוכן"],
    "2026-10-02"
  ],
  [
    "Meridian Tanker Pool",
    "מנהל מסחרי",
    "בריטניה",
    "London",
    37,
    ["מנהל מסחרי"],
    "2026-10-29"
  ],
  [
    "Caspian Freight Co",
    "מפעיל",
    "אזרבייג׳ן",
    "Baku",
    10,
    ["מפעיל"],
    "2026-10-23"
  ],
  [
    "Oceanus Fleet Mgmt",
    "מנהל טכני",
    "הונג קונג",
    "Hong Kong",
    72,
    ["מנהל טכני", "מפעיל"],
    "2026-11-02"
  ],
  [
    "Maple Harbour Shipping",
    "בעלים רשום",
    "קנדה",
    "Vancouver",
    13,
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
/*
 * תוצרי מודל (דמה). אין כאן חישוב: כל הערכים נכתבו ידנית כדי להדגים ארבעה מקרים בדף החברה:
 * קבוצה גדולה (c13), קבוצה קטנה (c5, c9), נבדק ולא נמצאו קשרים (c1 ורוב החברות) ולא הוערך (c12, c17; ב-c24 רק הקבוצה).
 */
const STAMP = { updated: MODEL_UPDATED, modelVersion: MODEL_VERSION };
const PROFILE_BY_TYPE = {
  "בעלים רשום": "בעל צי",
  "מפעיל": "מפעיל",
  "מנהל טכני": "מנהל צד שלישי",
  "מנהל מסחרי": "מנהל צד שלישי",
  "סוכן": "ללא פעילות נראית"
};
const NO_GROUP = { state: "none", reasons: ["נבדקו בעלות, ניהול, כתובת ובעלי תפקידים: לא נמצאו קשרים עם חברות אחרות"], ...STAMP };
const NO_DATA = (what) => ({ state: "unassessed", reasons: [`אין מספיק נתוני ${what} בחלון הניתוח`], ...STAMP });
const UNASSESSED_PROFILE = { state: "unassessed", value: null, confidence: null, reasons: ["אין מספיק נתונים על כלי החברה ועל תפקידיה"], mismatch: null };

/** @type {Record<string, ModelOutputs>} */
const MODEL_OVERRIDES = {
  // קבוצה גדולה
  c13: {
    controlGroup: {
      state: "assessed", companies: 55, vessels: 140, undeclared: 6, confidence: "high",
      reasons: [
        "6 קשרים חזקים שאינם מוצהרים ברישום; 18 חברות כלי בודד עם אותו מוטב",
        "שני כלים עברו בין חברות בקבוצה בחצי השנה האחרונה",
        "המנהל הטכני של 21 מתוך 23 הכלים הוא חברה בקבוצה",
        "הכתובת המשותפת ל-312 חברות נוספות לא נספרה כראיה"
      ],
      ...STAMP
    },
    profile: {
      state: "assessed", value: "בעל צי", confidence: "medium",
      reasons: [
        "בעלים רשום או מוטב של 19 מתוך 23 הכלים; מפעילה בפועל 4 בלבד",
        "ניהול הכלים נעשה דרך חברות בקבוצה ולא ישירות",
        "הבעלות על חלק מהכלים עוברת דרך 18 חברות כלי בודד"
      ],
      mismatch: "אי-התאמה לרישום: רשומה כמפעיל"
    }
  },
  // חברה שנמצאת באותה קבוצה: הנתונים נשמרים אצל c13
  c4: {
    controlGroup: {
      state: "assessed", anchor: "c13", companies: 55, vessels: 140, undeclared: 6, confidence: "high",
      reasons: ["מנהלת טכנית של 21 מתוך 23 הכלים של Gulf Horizon Shipping, ברישום", "6 קשרים חזקים בקבוצה אינם מוצהרים ברישום"],
      ...STAMP
    },
    profile: { state: "assessed", value: "מנהל פנימי", confidence: "high", reasons: ["כמעט כל הכלים שהיא מנהלת שייכים לחברות באותה קבוצה", "אין לה כלים של בעלים שאינם בקבוצה"], mismatch: null }
  },
  // קבוצה קטנה
  c5: {
    controlGroup: {
      state: "assessed", companies: 4, vessels: 31, undeclared: 1, confidence: "medium",
      reasons: ["חברת אחזקות אחת באותו מוטב ובאותה כתובת אינה מוצהרת ברישום", "ניהול טכני של הצי כולו דרך Bosphorus Mgmt"],
      ...STAMP
    },
    profile: { state: "assessed", value: "בעל צי", confidence: "high", reasons: ["בעלים רשום של 18 מתוך 19 הכלים", "הניהול הטכני נעשה בידי חברה בקבוצה"], mismatch: null }
  },
  c9: {
    controlGroup: {
      state: "assessed", anchor: "c5", companies: 4, vessels: 31, undeclared: 1, confidence: "medium",
      reasons: ["חברה בקבוצה של Marmara Tankers: ניהול טכני של הצי כולו", "חברת אחזקות אחת בקבוצה אינה מוצהרת ברישום"],
      ...STAMP
    },
    profile: { state: "assessed", value: "מנהל פנימי", confidence: "medium", reasons: ["כל הכלים שהיא מנהלת שייכים לחברה אחת באותה קבוצה"], mismatch: null }
  },
  // נבדק ולא נמצאו קשרים
  c1: {
    controlGroup: NO_GROUP,
    profile: { state: "assessed", value: "בעל צי", confidence: "high", reasons: ["בעלים רשום ומפעיל של כל 14 הכלים", "אין ניהול על ידי חברה אחרת"], mismatch: null }
  },
  // לא הוערך
  c12: { controlGroup: NO_DATA("בעלות וניהול"), profile: UNASSESSED_PROFILE },
  c17: { controlGroup: NO_DATA("בעלות וניהול"), profile: UNASSESSED_PROFILE },
  // הדגמת מצב חלקי (הצעה): הקבוצה לא הוערכה והפרופיל כן
  c24: {
    controlGroup: NO_DATA("בעלות וניהול"),
    profile: { state: "assessed", value: "בעל צי", confidence: "low", reasons: ["רוב הכלים מקושרים אליה כבעלים רשום", "מעט כלים נצפו, והביטחון נמוך"], mismatch: null }
  }
};

/** @returns {ModelOutputs} */
const modelOutputsFor = (id, type, fleetSize) => MODEL_OVERRIDES[id] ?? {
  controlGroup: NO_GROUP,
  profile: {
    state: "assessed", value: PROFILE_BY_TYPE[type], confidence: "medium", mismatch: null,
    reasons: [`רוב הכלים מקושרים אליה בתפקיד ${type}`, `צי של ${fleetSize} כלים, בלי ניהול משותף עם חברות אחרות`]
  }
};


/** שיוך כלים לחברות שלא הוגדרו ב-EXTRA (דמה): [מזהה כלי, תפקיד] */
const FLEET_OF = {
  c13: [["v7", "מפעיל"], ["v8", "מפעיל"], ["v9", "בעלים רשום"], ["v10", "מפעיל"], ["v11", "בעלים רשום"]],
  c5: [["v5", "בעלים רשום"], ["v12", "בעלים רשום"]]
};
const withFleet = (c) => FLEET_OF[c.id]
  ? { ...c, vesselIds: FLEET_OF[c.id].map(([v]) => v), roles: FLEET_OF[c.id].map(([vessel, role]) => ({ vessel, role })) }
  : c;

/** @type {Company[]} */
export const COMPANIES = ROWS.map(([name, type, country, city, fleetSize, roleList, updated], i) => ({
  id: `c${i + 1}`,
  name,
  type,
  roleList,
  country,
  city,
  fleetSize,
  updated,
  modelOutputs: modelOutputsFor(`c${i + 1}`, type, fleetSize),
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
 * קשרים בין חברות (שלב א׳, תוצר מודל; הצעה: כל הנתונים דמה, והאפיון §4.5 קובע שהקשרים טעונים אפיון).
 *
 * סוגי ראיה: קשר מוצהר, כתובת משותפת, בעל תפקיד משותף, כלי משותף, ניהול בלעדי, מעבר כלים, מוטב משותף.
 * @typedef {'declared'|'address'|'officer'|'vessel'|'exclusive'|'transfer'|'beneficiary'} EvidenceType
 */
export const EVIDENCE_TYPES = {
  declared: "קשר מוצהר",
  address: "כתובת משותפת",
  officer: "בעל תפקיד משותף",
  vessel: "כלי משותף",
  exclusive: "ניהול בלעדי",
  transfer: "מעבר כלים",
  beneficiary: "מוטב משותף"
};

/** חוזק קשר: rank לצורך מיון; bars = מספר הפסים בחיווי */
export const STRENGTHS = {
  strong: { label: "חזק", rank: 3 },
  medium: { label: "בינוני", rank: 2 },
  weak: { label: "חלש", rank: 1 }
};

/**
 * ראיה אחת לקשר. prevalence: כמה חברות במאגר חולקות את אותה ראיה (ראיה נפוצה מאוד היא חלשה כראיה).
 * @typedef {Object} Evidence
 * @property {EvidenceType} type
 * @property {string} text
 * @property {number} prevalence
 */

/**
 * קשר בין החברה לחברה אחרת. declared: מוצהר ברישום (קו רציף) או הוסק מהמודל (קו מקווקו).
 * @typedef {Object} Relation
 * @property {string} id
 * @property {'company'} kind
 * @property {string|null} companyId   מזהה החברה הקשורה כשהיא קיימת כישות במערכת, אחרת null
 * @property {string} name
 * @property {string} profile          פרופיל החברה הקשורה (אחד מ-PROFILE_VALUES)
 * @property {'strong'|'medium'|'weak'} strength
 * @property {boolean} declared
 * @property {Evidence[]} evidence
 */

/**
 * אשכול: חברות שקשורות לחברה באותן ראיות בדיוק, מוצג כשורה אחת (למשל "18 חברות כלי בודד עם אותו מוטב").
 * @typedef {Object} Cluster
 * @property {string} id
 * @property {'cluster'} kind
 * @property {number} count
 * @property {string[]} members        שמות החברות באשכול
 * @property {string} profile
 * @property {'strong'|'medium'|'weak'} strength
 * @property {boolean} declared
 * @property {Evidence[]} evidence
 * @property {string} summary          שורת הראיות בטבלה
 */

/**
 * ראיה נפוצה שאינה יוצרת קשר (למשל כתובת של סוכן רישום): מוצגת כשורת עובדה אחת, לא כקשרים.
 * @typedef {Object} CommonEvidence
 * @property {string} text
 * @property {number} count   מספר החברות הנוספות שחולקות את הראיה
 */

const E = (type, text, prevalence = 2) => ({ type, text, prevalence });
const rows = (strength, declared, list) => list.map(([name, profile, evidence, companyId = null, mirror]) => ({
  kind: "company", companyId, name, profile, strength, declared, evidence, mirror
}));
const SPV_GEMS = ["Amber", "Basalt", "Cedar", "Dune", "Ember", "Flint", "Garnet", "Harbor", "Ivory", "Jade", "Kelp", "Lapis", "Marble", "Nacre", "Onyx", "Opal", "Quartz", "Reef"];

/**
 * נתוני הקשרים לפי החברה שאליה הם שמורים (anchor). חברות אחרות באותה קבוצה מפנות אליה דרך `controlGroup.anchor`.
 * `mirror` בשורה: איך השורה נראית מדף החברה הקשורה עצמה (השם, הפרופיל והראיות מתהפכים).
 */
const RELATION_DATA = {
  c13: {
    relations: [
      ...rows("strong", false, [
        ["GH Pearl One Ltd", "חברת כלי בודד", [E("beneficiary", "אותו מוטב רשום כמו Gulf Horizon Shipping", 21), E("address", "כתובת רישום משותפת עם 11 חברות בקבוצה", 12), E("exclusive", "מנוהלת באופן בלעדי על ידי Falcon Maritime", 2)]],
        ["GH Coral Two Ltd", "חברת כלי בודד", [E("beneficiary", "אותו מוטב רשום כמו Gulf Horizon Shipping", 21), E("address", "כתובת רישום משותפת עם 11 חברות בקבוצה", 12), E("exclusive", "מנוהלת באופן בלעדי על ידי Falcon Maritime", 2)]],
        ["GH Marine Services FZE", "מנהל פנימי", [E("officer", "שני בעלי תפקיד משותפים עם Gulf Horizon Shipping", 3), E("address", "כתובת רישום משותפת", 12), E("exclusive", "מנהלת באופן בלעדי 4 כלים של הקבוצה", 2)]],
        ["Al Noor Ship Management", "מנהל צד שלישי", [E("exclusive", "מנהלת באופן בלעדי 6 כלים של הקבוצה", 2), E("officer", "בעל תפקיד משותף שמונה ב-2025", 2)]],
        ["Horizon Crew Services LLC", "ללא פעילות נראית", [E("beneficiary", "אותו מוטב רשום כמו Gulf Horizon Shipping", 21), E("address", "כתובת רישום משותפת", 12)]]
      ]),
      ...rows("strong", true, [
        ["Falcon Maritime", "מנהל פנימי", [E("declared", "מנהל טכני של 21 מתוך 23 הכלים", 1)], "c4",
          { forCompany: "c4", companyId: "c13", name: "Gulf Horizon Shipping", profile: "בעל צי", evidence: [E("declared", "בעלים רשום או מוטב של 21 מתוך 23 הכלים שהיא מנהלת", 1)] }],
        ["Gulf Horizon Holdings", "חברת אחזקות", [E("declared", "חברת אם לפי הרישום", 1)]]
      ]),
      ...rows("medium", false, [
        ["Sandbar Marine SA", "חברת כלי בודד", [E("transfer", "הכלי Gulf Pearl עבר מבעלות Sandbar Marine SA לבעלות GH Pearl One Ltd ב-03.09.2026", 2), E("transfer", "הכלי Gulf Coral עבר מבעלות Sandbar Marine SA לבעלות GH Coral Two Ltd ב-21.10.2026", 2)]],
        ["Nakheel Tankers FZC", "בעל צי", [E("transfer", "הכלי Gulf Amber עבר ממנה לבעלות GH Marine Services FZE ב-12.08.2026", 2), E("address", "כתובת רישום משותפת", 9)]],
        ["Corniche Bulk Carriers", "בעל צי", [E("officer", "בעל תפקיד משותף עם Gulf Horizon Holdings", 3), E("address", "כתובת רישום משותפת", 9)]],
        ["Saadiyat Shipping LLC", "חברת כלי בודד", [E("vessel", "הכלי Gulf Pioneer רשום אצלה כבעלים ואצל Gulf Horizon Shipping כמפעיל", 2), E("officer", "בעל תפקיד משותף", 3)]],
        ["Al Reem Marine", "מפעיל", [E("beneficiary", "מוטב משותף חלקי (40%) עם Gulf Horizon Holdings", 4)]],
        ["Yas Island Lines", "בעל צי", [E("exclusive", "מנוהלת על ידי Al Noor Ship Management", 4), E("officer", "בעל תפקיד משותף", 3)]],
        ["Khalifa Port Logistics", "מנהל צד שלישי", [E("transfer", "הכלי Gulf Dune עבר אליה מ-GH Pearl One Ltd ב-30.09.2026", 2)]],
        ["Mina Zayed Chartering", "מנהל צד שלישי", [E("vessel", "הכלי Gulf Pioneer מושכר לה על ידי Gulf Horizon Shipping", 2), E("officer", "בעל תפקיד משותף", 3)]],
        ["Desert Rose Navigation", "חברת כלי בודד", [E("address", "כתובת רישום משותפת", 9), E("officer", "בעל תפקיד משותף", 3)]],
        ["Marina Offshore Ltd", "מפעיל", [E("beneficiary", "מוטב משותף חלקי (25%) עם GH Marine Services FZE", 4)]],
        ["Sir Bani Yas Shipping", "בעל צי", [E("exclusive", "מנוהלת על ידי GH Marine Services FZE", 4), E("address", "כתובת רישום משותפת", 9)]],
        ["Zakum Marine Services", "מנהל צד שלישי", [E("officer", "שני בעלי תפקיד משותפים", 3)]],
        ["Jebel Ali Bunkering", "ללא פעילות נראית", [E("address", "כתובת רישום משותפת", 9), E("officer", "בעל תפקיד משותף", 3)]],
        ["Fujairah Ocean Carriers", "בעל צי", [E("transfer", "שני כלים עברו אליה מ-Nakheel Tankers FZC בתוך חצי שנה", 2)]]
      ]),
      ...rows("weak", false, [
        ["Dhow Star Shipping", "בעל צי", [E("officer", "בעל תפקיד משותף", 6)]],
        ["Pearl Divers Marine", "חברת כלי בודד", [E("officer", "בעל תפקיד משותף", 6)]],
        ["Oasis Shipping Co", "מפעיל", [E("address", "כתובת במבנה משרדים משותף", 38)]],
        ["Gulf Anchor Ltd", "מנהל צד שלישי", [E("officer", "בעל תפקיד משותף שעזב ב-2024", 7)]],
        ["Falcon Wing Maritime", "בעל צי", [E("address", "כתובת במבנה משרדים משותף", 38)]],
        ["Palm Crest Shipping", "חברת כלי בודד", [E("officer", "בעל תפקיד משותף", 6)]],
        ["Sahara Wave Lines", "מפעיל", [E("vessel", "כלי אחד הועבר ביניהן ב-2023", 3)]],
        ["Emirates Coastal Agency", "ללא פעילות נראית", [E("address", "כתובת במבנה משרדים משותף", 38)]],
        ["Al Wasl Ship Chandlers", "ללא פעילות נראית", [E("officer", "בעל תפקיד משותף", 6)]],
        ["Dune Harbour Ltd", "חברת כלי בודד", [E("address", "כתובת במבנה משרדים משותף", 38)]],
        ["Sunrise Offshore FZE", "מנהל צד שלישי", [E("officer", "בעל תפקיד משותף", 6)]],
        ["Coral Reef Chartering", "מנהל צד שלישי", [E("vessel", "השכרה משותפת של כלי אחד", 3)]],
        ["Al Ain Tanker Pool", "מפעיל", [E("officer", "בעל תפקיד משותף", 6)]],
        ["Majan Marine", "בעל צי", [E("address", "כתובת במבנה משרדים משותף", 38)]],
        ["Horizon Sky Shipping", "חברת כלי בודד", [E("officer", "בעל תפקיד משותף", 6)]]
      ])
    ],
    clusters: [{
      kind: "cluster", count: 18, profile: "חברת כלי בודד", strength: "strong", declared: false,
      members: SPV_GEMS.map((g, i) => `GH ${g} ${i + 3} Ltd`),
      summary: "אותו מוטב לכל 18 · 11 מהן באותה כתובת",
      evidence: [E("beneficiary", "אותו מוטב רשום לכל 18 החברות", 21), E("address", "11 מהן רשומות באותה כתובת", 12)]
    }],
    commonEvidence: [{ text: "הכתובת של החברה משותפת ל-312 חברות נוספות (כנראה סוכן רישום)", count: 312 }]
  },
  c5: {
    relations: [
      ...rows("strong", true, [
        ["Bosphorus Mgmt", "מנהל פנימי", [E("declared", "חברה בת לפי הרישום; מנהלת טכנית של הצי כולו", 1)], "c9",
          { forCompany: "c9", companyId: "c5", name: "Marmara Tankers", profile: "בעל צי", evidence: [E("declared", "חברת אם לפי הרישום; הצי כולו מנוהל על ידי חברה זו", 1)] }]
      ]),
      ...rows("strong", false, [
        ["Marmara Ship Holding Ltd", "חברת אחזקות", [E("beneficiary", "אותו מוטב רשום כמו Marmara Tankers", 4), E("address", "כתובת רישום משותפת", 4)]]
      ]),
      ...rows("weak", false, [
        ["Istanbul Bay Shipping", "חברת כלי בודד", [E("officer", "בעל תפקיד משותף", 5)]]
      ])
    ],
    clusters: [],
    commonEvidence: []
  }
};

/**
 * נתוני הקשרים של חברה, מנקודת המבט שלה. ריק כשאין קבוצה (נבדק ולא נמצאו קשרים, או לא הוערך).
 * @param {string} id
 * @returns {{relations: Relation[], clusters: Cluster[], commonEvidence: CommonEvidence[]}}
 */
export function relationDataOf(id) {
  const anchor = getCompany(id)?.modelOutputs.controlGroup.anchor ?? id;
  const data = RELATION_DATA[anchor];
  if (!data) return { relations: [], clusters: [], commonEvidence: [] };
  const seen = (r) => {
    const { mirror, ...rest } = r;
    return mirror?.forCompany === id ? { ...rest, ...mirror } : rest;
  };
  return {
    relations: data.relations.filter((r) => r.companyId !== id || r.mirror).map((r, i) => ({ id: `${anchor}-r${i + 1}`, ...seen(r) })),
    clusters: data.clusters.map((k, i) => ({ id: `${anchor}-k${i + 1}`, ...k })),
    commonEvidence: data.commonEvidence
  };
}

/** סדר השורות: חוזק יורד, אחר כך קשרים שאינם מוצהרים, אשכול לפני חברה בודדת, ולבסוף לפי שם */
export const compareRelations = (a, b) => STRENGTHS[b.strength].rank - STRENGTHS[a.strength].rank
  || Number(a.declared) - Number(b.declared)
  || Number(b.kind === "cluster") - Number(a.kind === "cluster")
  || (a.name ?? "").localeCompare(b.name ?? "");

/** כל שורות הטבלה: אשכולות וחברות בודדות, ממוינות */
export const relationRows = ({ relations, clusters }) => [...clusters, ...relations].sort(compareRelations);

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
