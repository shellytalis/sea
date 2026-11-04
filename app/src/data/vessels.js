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
 * @property {{source: string, updated: string}} stamp
 */

/** @type {Vessel[]} */
export const VESSELS = [
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
    risk: "none",
    riskNotes: [],
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
    risk: "warning",
    riskNotes: ["כיבוי AIS לפרק זמן של 9 שעות"],
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
    risk: "none",
    riskNotes: [],
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
    risk: "danger",
    riskNotes: ["שינוי שם בשנה האחרונה", "העברה בין כלים באזור ללא נמל"],
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
    risk: "none",
    riskNotes: [],
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
    risk: "none",
    riskNotes: [],
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
