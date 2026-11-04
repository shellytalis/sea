/**
 * @typedef {Object} Indicator אינדיקטור פעילות חריגה (BRAIN §6)
 * @property {string} id
 * @property {string} type       הפסקת שידור AIS | מפגש ship-to-ship | ביקור בנמל ברשימת מעקב | שיטוט חשוד | שינוי זהות
 * @property {import('../ui/severity').Severity} severity
 * @property {string} time       YYYY-MM-DD HH:mm
 * @property {number} lat
 * @property {number} lon
 * @property {string} source
 * @property {string} evidence
 */

/**
 * @typedef {Object} Vessel
 * @property {string} id            "v1".."vN"
 * @property {string} name
 * @property {string} imo           טקסט
 * @property {string} mmsi          טקסט, שומר אפסים מובילים
 * @property {string} callSign
 * @property {string} type
 * @property {string} flag
 * @property {number} built
 * @property {number} dwt
 * @property {number} length
 * @property {string} owner         שם חברה
 * @property {string} manager       שם חברה
 * @property {number} lat
 * @property {number} lon
 * @property {string[]} lists       רשימות מעקב שהכלי נמצא בהן
 * @property {import('../ui/severity').Severity} risk  החומרה הגבוהה ביותר מבין האינדיקטורים (נגזר)
 * @property {Indicator[]} indicators
 * @property {string} subType
 * @property {number} beam
 * @property {number} draft
 * @property {string} classSociety
 * @property {string} pandi
 * @property {string} beneficialOwner
 * @property {string} operator
 * @property {string} technicalManager
 * @property {string} commercialManager
 * @property {string} aisTransmitter
 * @property {{date: string, field: string, from: string, to: string, source: string}[]} history
 * @property {{source: string, updated: string}} stamp
 */

const RAW = [
  {
    id: "v1",
    name: "NORDIC AURORA",
    imo: "9487231",
    mmsi: "257184000",
    callSign: "LAXY",
    type: "Crude Oil Tanker",
    flag: "נורווגיה",
    built: 2011,
    dwt: 115e3,
    length: 249,
    owner: "Fjord Marine AS",
    manager: "Nordic Ship Mgmt",
    lat: 34.2,
    lon: 26.4,
    prevLat: 33.1,
    prevLon: 24.9,
    speed: 12.4,
    course: 98,
    destination: "HAIFA",
    lastReceived: "2026-10-27 08:14",
    lists: ["רשימת מעקב א"],
    stamp: {
      source: "מקור א",
      updated: "2026-10-27 08:14"
    }
  },
  {
    id: "v2",
    name: "ARIADNE STAR",
    imo: "9321877",
    mmsi: "241556000",
    callSign: "SVAB",
    type: "Bulk Carrier",
    flag: "יוון",
    built: 2006,
    dwt: 76e3,
    length: 225,
    owner: "Aegean Bulk Ltd",
    manager: "Hellas Ship Mgmt",
    lat: 35.9,
    lon: 21.7,
    prevLat: 36.4,
    prevLon: 20.2,
    speed: 10.1,
    course: 112,
    destination: "ASHDOD",
    lastReceived: "2026-10-27 07:52",
    lists: [],
    stamp: {
      source: "מקור א",
      updated: "2026-10-27 07:52"
    }
  },
  {
    id: "v3",
    name: "PACIFIC LOTUS",
    imo: "9612045",
    mmsi: "477331200",
    callSign: "VRXQ",
    type: "Container Ship",
    flag: "הונג קונג",
    built: 2015,
    dwt: 94e3,
    length: 300,
    owner: "Lotus Shipping Co",
    manager: "Lotus Ship Mgmt",
    lat: 31.6,
    lon: 33.3,
    prevLat: 31.9,
    prevLon: 32.1,
    speed: 7.8,
    course: 135,
    destination: "PORT SAID",
    lastReceived: "2026-10-27 08:20",
    lists: ["רשימת מעקב א", "רשימת מעקב ב"],
    stamp: {
      source: "מקור א",
      updated: "2026-10-27 08:20"
    }
  },
  {
    id: "v4",
    name: "SEA FALCON",
    imo: "9198364",
    mmsi: "636092441",
    callSign: "A8TR",
    type: "General Cargo",
    flag: "ליבריה",
    built: 1999,
    dwt: 12400,
    length: 132,
    owner: "Unknown",
    manager: "Falcon Maritime",
    lat: 33.4,
    lon: 29,
    prevLat: 33,
    prevLon: 29.3,
    speed: .4,
    course: 0,
    destination: "—",
    lastReceived: "2026-10-26 22:03",
    lists: ["רשימת מעקב ב"],
    stamp: {
      source: "מקור א",
      updated: "2026-10-26 22:03"
    }
  },
  {
    id: "v5",
    name: "MARMARA SPIRIT",
    imo: "9405512",
    mmsi: "271040118",
    callSign: "TCMS",
    type: "Chemical Tanker",
    flag: "טורקיה",
    built: 2009,
    dwt: 38e3,
    length: 183,
    owner: "Marmara Tankers",
    manager: "Bosphorus Mgmt",
    lat: 36.1,
    lon: 30.8,
    prevLat: 36.3,
    prevLon: 29.4,
    speed: 11,
    course: 84,
    destination: "MERSIN",
    lastReceived: "2026-10-27 08:01",
    lists: [],
    stamp: {
      source: "מקור א",
      updated: "2026-10-27 08:01"
    }
  },
  {
    id: "v6",
    name: "ATLAS GLORY",
    imo: "9533208",
    mmsi: "311074500",
    callSign: "C6BQ",
    type: "LNG Carrier",
    flag: "איי בהאמס",
    built: 2013,
    dwt: 85e3,
    length: 289,
    owner: "Atlas Gas Transport",
    manager: "Atlas Ship Mgmt",
    lat: 32.4,
    lon: 17.5,
    prevLat: 32.9,
    prevLon: 15.2,
    speed: 15.3,
    course: 105,
    destination: "PORT SAID",
    lastReceived: "2026-10-27 08:18",
    lists: ["רשימת מעקב א"],
    stamp: {
      source: "מקור א",
      updated: "2026-10-27 08:18"
    }
  }
];
export const VISITS_B = [
  {
    port: "Haifa",
    country: "ישראל",
    arrival: "2026-09-02 06:10",
    departure: "2026-09-03 14:40"
  },
  {
    port: "Piraeus",
    country: "יוון",
    arrival: "2026-08-21 11:00",
    departure: "2026-08-22 09:25"
  },
  {
    port: "Limassol",
    country: "קפריסין",
    arrival: "2026-08-05 16:45",
    departure: "2026-08-06 04:30"
  }
];
export const VISITS_C = [{
  port: "Ceyhan",
  country: "טורקיה",
  arrival: "2026-09-14 02:20",
  departure: "2026-09-15 20:00"
}, {
  port: "Port Said",
  country: "מצרים",
  arrival: "2026-07-29 13:05",
  departure: "2026-07-30 08:15"
}];
export const LISTS = ["רשימת מעקב א", "רשימת מעקב ב"];
export function searchVessels(q) {
  const s = q.trim().toLowerCase();
  if (!s) return [];
  return VESSELS.filter((v) => v.name.toLowerCase().includes(s) || v.imo.includes(s) || v.mmsi.includes(s));
}
export const getVessel = (id) => VESSELS.find((v) => v.id === id);


/** כלי דמה נוספים, לשיוך לצי של Gulf Horizon Shipping ו-Marmara Tankers */
const mk = (id, name, imo, mmsi, callSign, type, flag, built, dwt, length, owner, manager, lat, lon, speed, course, destination, lists) => ({
  id, name, imo, mmsi, callSign, type, flag, built, dwt, length, owner, manager,
  lat, lon, prevLat: lat - 0.4, prevLon: lon - 0.6, speed, course, destination,
  lastReceived: "2026-10-27 07:30", lists, ...(id === "v10" ? { assessed: false } : {}),
  stamp: { source: "מקור א", updated: "2026-10-27 07:30" }
});
const MORE = [
  mk("v7", "GULF PIONEER", "9455102", "470118000", "A6PQ", "Crude Oil Tanker", "איחוד האמירויות", 2009, 158e3, 274, "Gulf Horizon Shipping", "Gulf Horizon Shipping", 27.1, 51.4, 11.2, 305, "FUJAIRAH", []),
  mk("v8", "GULF MERIDIAN", "9501876", "470225000", "A6RM", "Product Tanker", "איחוד האמירויות", 2012, 74e3, 228, "Gulf Horizon Shipping", "Gulf Horizon Shipping", 25.4, 55.9, 9.6, 112, "JEBEL ALI", ["רשימת מעקב ב"]),
  mk("v9", "AL SADAF", "9388241", "470331000", "A6SD", "Bulk Carrier", "פנמה", 2004, 56e3, 190, "Gulf Horizon Shipping", "Oceanus Fleet Mgmt", 29.9, 32.6, 6.4, 20, "SUEZ", []),
  mk("v10", "HORIZON STAR", "9620557", "352114000", "3EHS", "Container Ship", "פנמה", 2016, 61e3, 260, "Gulf Horizon Shipping", "Gulf Horizon Shipping", 12.8, 43.7, 14.1, 330, "JEDDAH", []),
  mk("v11", "DESERT WIND", "9277410", "636017733", "A8WD", "General Cargo", "ליבריה", 2001, 18e3, 148, "Gulf Horizon Shipping", "Falcon Maritime", 31.1, 33.8, 0.3, 0, "—", ["רשימת מעקב א"]),
  mk("v12", "MARMARA PRIDE", "9412690", "271043000", "TCMP", "Chemical Tanker", "טורקיה", 2010, 38e3, 183, "Marmara Tankers", "Bosphorus Mgmt", 37.2, 27.1, 10.8, 140, "ASHDOD", [])
];
const RAW_ALL = [...RAW, ...MORE];

// שדות נוספים לפי BRAIN §7. הרשימה הוצעה, האפיון לא מגדיר אותה: ערכי דמה.
const EXTRA = {
  v1: { subType: "Aframax", beam: 44, draft: 14.8, classSociety: "DNV", pandi: "Gard", beneficialOwner: "Fjord Holding AS", operator: "Fjord Marine AS", technicalManager: "Nordic Ship Mgmt", commercialManager: "Fjord Marine AS", aisTransmitter: "Class A" },
  v2: { subType: "Panamax", beam: 32, draft: 14.2, classSociety: "Lloyd's Register", pandi: "UK Club", beneficialOwner: "Hellas Holdings", operator: "Aegean Bulk Ltd", technicalManager: "Hellas Ship Mgmt", commercialManager: "Aegean Bulk Ltd", aisTransmitter: "Class A" },
  v3: { subType: "Neo-Panamax", beam: 48, draft: 14.5, classSociety: "ABS", pandi: "Skuld", beneficialOwner: "Lotus Shipping Co", operator: "Lotus Shipping Co", technicalManager: "Lotus Ship Mgmt", commercialManager: "Lotus Logistics", aisTransmitter: "Class A" },
  v4: { subType: "Multipurpose", beam: 20, draft: 7.9, classSociety: "לא ידוע", pandi: "לא ידוע", beneficialOwner: "לא ידוע", operator: "Falcon Maritime", technicalManager: "Falcon Maritime", commercialManager: "Falcon Maritime", aisTransmitter: "Class B" },
  v5: { subType: "MR Tanker", beam: 32, draft: 11.0, classSociety: "Bureau Veritas", pandi: "Britannia", beneficialOwner: "Marmara Tankers", operator: "Marmara Tankers", technicalManager: "Bosphorus Mgmt", commercialManager: "Marmara Tankers", aisTransmitter: "Class A" },
  v6: { subType: "LNG Carrier", beam: 46, draft: 11.5, classSociety: "ClassNK", pandi: "Gard", beneficialOwner: "Atlas Group", operator: "Atlas Gas Transport", technicalManager: "Atlas Ship Mgmt", commercialManager: "Atlas Gas Transport", aisTransmitter: "Class A" },
  v7: { subType: "Aframax", beam: 46, draft: 14.1, classSociety: "ABS", pandi: "Gard", beneficialOwner: "Gulf Horizon Holdings", operator: "Gulf Horizon Shipping", technicalManager: "Gulf Horizon Shipping", commercialManager: "Gulf Horizon Shipping", aisTransmitter: "Class A" },
  v8: { subType: "MR Tanker", beam: 32, draft: 11.2, classSociety: "Lloyd's Register", pandi: "UK Club", beneficialOwner: "Gulf Horizon Holdings", operator: "Gulf Horizon Shipping", technicalManager: "Gulf Horizon Shipping", commercialManager: "Gulf Horizon Shipping", aisTransmitter: "Class A" },
  v9: { subType: "Handymax", beam: 30, draft: 10.4, classSociety: "Bureau Veritas", pandi: "Skuld", beneficialOwner: "לא ידוע", operator: "Gulf Horizon Shipping", technicalManager: "Oceanus Fleet Mgmt", commercialManager: "Gulf Horizon Shipping", aisTransmitter: "Class A" },
  v10: { subType: "Feeder", beam: 32, draft: 10.8, classSociety: "DNV", pandi: "Gard", beneficialOwner: "Gulf Horizon Holdings", operator: "Gulf Horizon Shipping", technicalManager: "Gulf Horizon Shipping", commercialManager: "Gulf Horizon Shipping", aisTransmitter: "Class A" },
  v11: { subType: "Multipurpose", beam: 22, draft: 8.1, classSociety: "לא ידוע", pandi: "לא ידוע", beneficialOwner: "לא ידוע", operator: "Gulf Horizon Shipping", technicalManager: "Falcon Maritime", commercialManager: "Gulf Horizon Shipping", aisTransmitter: "Class B" },
  v12: { subType: "Chemical", beam: 29, draft: 10.6, classSociety: "Bureau Veritas", pandi: "Britannia", beneficialOwner: "Marmara Tankers", operator: "Marmara Tankers", technicalManager: "Bosphorus Mgmt", commercialManager: "Marmara Tankers", aisTransmitter: "Class A" }
};

/** @type {Record<string, Indicator[]>} */
const INDICATORS = {
  v7: [
    { id: "i4", type: "מפגש ship-to-ship", severity: "critical", time: "2026-10-25 02:15", lat: 26.2, lon: 52.8, source: "מקור א", evidence: "מפגש חוזר, בפעם השלישית בחודש, עם כלי ללא AIS פעיל באותו אזור" },
    { id: "i5", type: "הפסקת שידור AIS", severity: "high", time: "2026-10-22 19:40", lat: 26.9, lon: 52.0, source: "מקור א", evidence: "הפסקת שידור של 14 שעות באזור ללא כיסוי חוף" }
  ],
  v8: [
    { id: "i6", type: "ביקור בנמל ברשימת מעקב", severity: "high", time: "2026-10-20 08:30", lat: 27.1, lon: 56.2, source: "מקור ב", evidence: "עגינה של 18 שעות בנמל שנמצא ברשימת המעקב" }
  ],
  v9: [
    { id: "i7", type: "שיטוט חשוד", severity: "medium", time: "2026-10-26 11:05", lat: 29.7, lon: 32.9, source: "מקור א", evidence: "תנועה במעגלים בשטח של 6 מייל ימי למשך 7 שעות" }
  ],
  v2: [
    { id: "i1", type: "הפסקת שידור AIS", severity: "medium", time: "2026-10-26 22:10", lat: 36.1, lon: 20.9, source: "מקור א", evidence: "כיבוי AIS לפרק זמן של 9 שעות, עם קליטה חוזרת כ-40 ק״מ מנקודת ההפסקה" }
  ],
  v4: [
    { id: "i2", type: "מפגש ship-to-ship", severity: "high", time: "2026-10-24 03:40", lat: 33.5, lon: 29.4, source: "מקור א", evidence: "העברה בין כלים באזור ללא נמל, שהייה משותפת של כ-5 שעות במהירות נמוכה מ-1 קשר" },
    { id: "i3", type: "שינוי זהות", severity: "medium", time: "2026-06-12 09:00", lat: 34.9, lon: 32.9, source: "מקור ב", evidence: "שינוי שם הכלי בשנה האחרונה (ראו היסטוריית שינויים)" }
  ]
};

/** @type {Record<string, Vessel['history']>} */
const HISTORY = {
  v4: [
    { date: "2026-06-12", field: "שם", from: "SEA HAWK", to: "SEA FALCON", source: "מקור ב" },
    { date: "2025-11-03", field: "מנהל טכני", from: "Hawk Ship Mgmt", to: "Falcon Maritime", source: "מקור ב" }
  ],
  v2: [{ date: "2025-04-18", field: "מנהל טכני", from: "Aegean Ship Mgmt", to: "Hellas Ship Mgmt", source: "מקור ב" }]
};

const RANK = { critical: 4, high: 3, medium: 2, low: 1, unassessed: 0, none: 0 };

/** @type {Vessel[]} */
export const VESSELS = RAW_ALL.map((v) => {
  const indicators = INDICATORS[v.id] ?? [];
  const risk = indicators.reduce((a, i) => (RANK[i.severity] > RANK[a] ? i.severity : a), v.assessed === false ? "unassessed" : "none");
  return { ...v, ...EXTRA[v.id], indicators, risk, history: HISTORY[v.id] ?? [] };
});

/** פעילות כללית ממקור א: דמה, בנויה מנתוני הכלי */
export const activityA = (v) => [
  { time: v.lastReceived, activity: "דיווח מיקום", place: `${v.lat.toFixed(2)}, ${v.lon.toFixed(2)}`, details: `${v.speed} kn · כיוון ${v.course}°` },
  { time: "2026-10-26 18:30", activity: "שינוי כיוון", place: "מזרח הים התיכון", details: "סטייה של 24° מהמסלול" },
  { time: "2026-10-25 07:05", activity: "יציאה מאזור נמל", place: v.destination, details: "הפלגה לכיוון נמל היעד" },
  { time: "2026-10-23 21:15", activity: "הפחתת מהירות", place: "מצרי קפריסין", details: "ירידה מתחת ל-3 קשר ל-2 שעות" }
];
