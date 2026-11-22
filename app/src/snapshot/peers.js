/**
 * חציוני כלים דומים (אותו סוג, טווח גודל וטווח גיל) לחלון של 365 ימים.
 * באב-טיפוס: טבלת דמה קבועה לפי סוג כלי. בשרת האמיתי: טבלה מסוכמת שמחושבת בלילה, מפתח (סוג, טווח גודל, טווח גיל).
 */
const TABLE = {
  'General Cargo': { n: 214, daysInPort: 173, sailingDays: 148, nm: 31200 },
  'Crude Oil Tanker': { n: 168, daysInPort: 95, sailingDays: 205, nm: 48500 },
  'Product Tanker': { n: 190, daysInPort: 88, sailingDays: 214, nm: 50100 },
  'Chemical Tanker': { n: 121, daysInPort: 102, sailingDays: 198, nm: 44800 },
  'Bulk Carrier': { n: 305, daysInPort: 110, sailingDays: 190, nm: 40200 },
  'Container Ship': { n: 142, daysInPort: 78, sailingDays: 236, nm: 61800 },
};

const sizeBand = (dwt) => (dwt < 30e3 ? 'עד 30K DWT' : dwt < 80e3 ? '30K–80K DWT' : 'מעל 80K DWT');
const ageBand = (built, now) => { const age = Number(now.slice(0, 4)) - built; return age >= 20 ? '20+ שנה' : age >= 10 ? '10–20 שנה' : 'עד 10 שנים'; };

/** @returns {{n:number, daysInPort:number, sailingDays:number, nm:number, group:string, windowDays:number, asOf:string}|null} */
export function peerStats(vessel, now) {
  const row = TABLE[vessel.type];
  if (!row) return null;
  return { ...row, group: `${vessel.type}, ${sizeBand(vessel.dwt)}, ${ageBand(vessel.built, now)}`, windowDays: 365, asOf: '2026-11-22' };
}
