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

// שדות נוספים לפי BRAIN §7. הרשימה הוצעה, האפיון לא מגדיר אותה: ערכי דמה.
const EXTRA = {
  v1: { subType: "Aframax", beam: 44, draft: 14.8, classSociety: "DNV", pandi: "Gard", beneficialOwner: "Fjord Holding AS", operator: "Fjord Marine AS", technicalManager: "Nordic Ship Mgmt", commercialManager: "Fjord Marine AS", aisTransmitter: "Class A" },
  v2: { subType: "Panamax", beam: 32, draft: 14.2, classSociety: "Lloyd's Register", pandi: "UK Club", beneficialOwner: "Hellas Holdings", operator: "Aegean Bulk Ltd", technicalManager: "Hellas Ship Mgmt", commercialManager: "Aegean Bulk Ltd", aisTransmitter: "Class A" },
  v3: { subType: "Neo-Panamax", beam: 48, draft: 14.5, classSociety: "ABS", pandi: "Skuld", beneficialOwner: "Lotus Shipping Co", operator: "Lotus Shipping Co", technicalManager: "Lotus Ship Mgmt", commercialManager: "Lotus Logistics", aisTransmitter: "Class A" },
  v4: { subType: "Multipurpose", beam: 20, draft: 7.9, classSociety: "לא ידוע", pandi: "לא ידוע", beneficialOwner: "לא ידוע", operator: "Falcon Maritime", technicalManager: "Falcon Maritime", commercialManager: "Falcon Maritime", aisTransmitter: "Class B" },
  v5: { subType: "MR Tanker", beam: 32, draft: 11.0, classSociety: "Bureau Veritas", pandi: "Britannia", beneficialOwner: "Marmara Tankers", operator: "Marmara Tankers", technicalManager: "Bosphorus Mgmt", commercialManager: "Marmara Tankers", aisTransmitter: "Class A" },
  v6: { subType: "LNG Carrier", beam: 46, draft: 11.5, classSociety: "ClassNK", pandi: "Gard", beneficialOwner: "Atlas Group", operator: "Atlas Gas Transport", technicalManager: "Atlas Ship Mgmt", commercialManager: "Atlas Gas Transport", aisTransmitter: "Class A" }
};

/** @type {Record<string, Indicator[]>} */
const INDICATORS = {
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
export const VESSELS = RAW.map((v) => {
  const indicators = INDICATORS[v.id] ?? [];
  const risk = indicators.reduce((a, i) => (RANK[i.severity] > RANK[a] ? i.severity : a), "none");
  return { ...v, ...EXTRA[v.id], indicators, risk, history: HISTORY[v.id] ?? [] };
});

/** פעילות כללית ממקור א: דמה, בנויה מנתוני הכלי */
export const activityA = (v) => [
  { time: v.lastReceived, activity: "דיווח מיקום", place: `${v.lat.toFixed(2)}, ${v.lon.toFixed(2)}`, details: `${v.speed} kn · כיוון ${v.course}°` },
  { time: "2026-10-26 18:30", activity: "שינוי כיוון", place: "מזרח הים התיכון", details: "סטייה של 24° מהמסלול" },
  { time: "2026-10-25 07:05", activity: "יציאה מאזור נמל", place: v.destination, details: "הפלגה לכיוון נמל היעד" },
  { time: "2026-10-23 21:15", activity: "הפחתת מהירות", place: "מצרי קפריסין", details: "ירידה מתחת ל-3 קשר ל-2 שעות" }
];
