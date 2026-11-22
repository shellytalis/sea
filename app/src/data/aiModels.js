/*
 * נתוני דמה לדף "מודלי בינה מלאכותית" (שלב 3, הצעה). אין כאן חישוב אמיתי: ההרצות נוצרות באופן דטרמיניסטי.
 * המודלים מסמנים "שווה לבדוק", לא קובעים. הרצה שנכשלה אינה "אין ממצאים"; הרצה שלא סימנה כלים היא תקינה.
 */

/**
 * @typedef {Object} AiModel
 * @property {string} id
 * @property {string} name
 * @property {string} description   מה המודל מזהה, שורה אחת
 * @property {string[]} reasons     אוצר התוויות ("סיבות") שהמודל מפיק
 */

/**
 * @typedef {Object} Customer
 * @property {string} id
 * @property {string} name   שם גנרי (דמה)
 */

/**
 * שיוך מודל ללקוח: מודל שמשוכפל לכמה לקוחות מופיע בכמה שיוכים.
 * @typedef {Object} Assignment
 * @property {string} id            `${modelId}.${customerId}`
 * @property {string} modelId
 * @property {string} customerId
 */

/** @typedef {'complete'|'partial'|'failed'|'unassessed'} RunStatus */

/**
 * כלי שהמודל סימן בהרצה.
 * @typedef {Object} FlaggedVessel
 * @property {string} vesselId
 * @property {string[]} reasons
 * @property {import('../ui/severity').Severity} severity
 * @property {number} confidence   0..1
 * @property {string} detectedAt   YYYY-MM-DD HH:mm
 */

/**
 * @typedef {Object} Run
 * @property {string} id           מזהה קומפקטי של המועד (YYYYMMDDHHmm), ייחודי בתוך שיוך
 * @property {string} assignmentId
 * @property {string} date         YYYY-MM-DD HH:mm
 * @property {RunStatus} status
 * @property {string} modelVersion
 * @property {FlaggedVessel[]} vessels   ריק בכשל, בלא הוערכה, ובהרצה שלא סימנה כלים (תקין)
 * @property {string} [note]       הסבר להרצה חלקית, שנכשלה או שלא הוערכה
 */

/** @type {AiModel[]} */
export const MODELS = [
  { id: 'm1', name: 'כלי בלי AIS לאורך זמן', description: 'כלים שהפסיקו לשדר AIS לתקופה ממושכת או חוזרת', reasons: ['הפסקת שידור מעל 12 שעות', 'הפסקות שידור חוזרות', 'שידור נעלם סמוך לנמל', 'קליטה חוזרת רחוקה מנקודת ההפסקה'] },
  { id: 'm2', name: 'שינוי זהות כלי', description: 'שינויי שם, דגל או בעלות בתוך פרק זמן קצר', reasons: ['שינוי שם', 'שינוי דגל', 'החלפת בעלים רשום', 'החלפת מנהל טכני'] },
  { id: 'm3', name: 'חריגה ממסלול רגיל', description: 'סטייה ממסלולי השיט הרגילים של סוג הכלי', reasons: ['סטייה ממסלול רגיל', 'עצירה ממושכת בים הפתוח', 'שיטוט באזור קטן', 'שינוי חד של יעד'] },
  { id: 'm4', name: 'מפגש חשוד בים', description: 'מפגשים בין כלים באזורים ללא נמל', reasons: ['מפגש ship-to-ship', 'מפגש חוזר עם אותו כלי', 'מפגש עם כלי ללא AIS', 'מהירות נמוכה משותפת'] },
];

/** @type {Customer[]} */
export const CUSTOMERS = [
  { id: 'k1', name: 'לקוח לדוגמה א׳' },
  { id: 'k2', name: 'לקוח לדוגמה ב׳' },
  { id: 'k3', name: 'לקוח לדוגמה ג׳' },
];

/** מודל 1 משוכפל לשלושת הלקוחות; m4 × k1 הוא מודל בלי הרצות בכלל */
const PAIRS = [['m1', 'k1'], ['m1', 'k2'], ['m1', 'k3'], ['m2', 'k1'], ['m3', 'k2'], ['m4', 'k3'], ['m4', 'k1']];

/** @type {Assignment[]} */
export const ASSIGNMENTS = PAIRS.map(([modelId, customerId]) => ({ id: `${modelId}.${customerId}`, modelId, customerId }));

const rng = (seed) => () => {
  seed = (seed + 0x6D2B79F5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const SEVERITY_BY_ROLL = ['low', 'low', 'medium', 'medium', 'high', 'critical'];
const pad = (n) => String(n).padStart(2, '0');
const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
const runId = (date) => date.replace(/\D/g, '');
const POOL = Array.from({ length: 100 }, (_, i) => `v${i + 1}`);

/** @returns {FlaggedVessel[]} */
function flag(model, runDate, count, rand) {
  const pool = [...POOL];
  const out = [];
  for (let i = 0; i < count; i += 1) {
    const vesselId = pool.splice(Math.floor(rand() * pool.length), 1)[0];
    const n = 1 + Math.floor(rand() * 3);
    const reasons = [...model.reasons].sort(() => rand() - 0.5).slice(0, n);
    const detected = new Date(new Date(runDate.replace(' ', 'T')).getTime() - Math.floor(rand() * 20) * 36e5);
    out.push({ vesselId, reasons, severity: SEVERITY_BY_ROLL[Math.floor(rand() * SEVERITY_BY_ROLL.length)], confidence: Math.round((0.55 + rand() * 0.43) * 100) / 100, detectedAt: fmt(detected) });
  }
  return out;
}

/** מספר ההרצות לשיוך, ומצבים מיוחדים (דמה) */
const RUN_COUNT = { 'm1.k1': 8, 'm1.k2': 6, 'm1.k3': 5, 'm2.k1': 6, 'm3.k2': 7, 'm4.k3': 5, 'm4.k1': 0 };

/** @type {Run[]} */
export const RUNS = ASSIGNMENTS.flatMap((a, ai) => {
  const model = MODELS.find((m) => m.id === a.modelId);
  const rand = rng(1000 + ai * 77);
  return Array.from({ length: RUN_COUNT[a.id] }, (_, k) => {
    const d = new Date(2026, 10, 16 - k * 2 - (ai % 2), 6 + (ai % 3) * 4, 0);
    const date = fmt(d);
    let status = 'complete';
    if (k === 2) status = 'partial';
    if (k === 4) status = 'failed';
    if (a.id === 'm3.k2' && k === 3) status = 'unassessed';
    const modelVersion = k < 3 ? '2.4' : '2.3';
    const big = a.id === 'm1.k1' && k === 0;
    let count = big ? 84 : 3 + Math.floor(rand() * 13);
    if (a.id === 'm2.k1' && k === 1) count = 0; // רץ ולא סימן כלים: תקין
    if (status === 'partial') count = Math.max(2, Math.floor(count / 2));
    const failedLike = status === 'failed' || status === 'unassessed';
    const note = status === 'partial' ? 'נותחו כ-60% מהכלים בחלון הניתוח; חלק מהמקורות לא היו זמינים. התוצרים חלקיים.'
      : status === 'failed' ? 'ההרצה נכשלה לפני סיום הניתוח. אין תוצרים להצגה, וזה אינו "אין ממצאים".'
        : status === 'unassessed' ? 'ההרצה לא הוערכה: אין מספיק נתונים בחלון הניתוח. אין תוצרים להצגה.' : undefined;
    return { id: runId(date), assignmentId: a.id, date, status, modelVersion, vessels: failedLike ? [] : flag(model, date, count, rand), ...(note ? { note } : {}) };
  });
});

export const getModel = (id) => MODELS.find((m) => m.id === id);
export const getCustomer = (id) => CUSTOMERS.find((c) => c.id === id);
export const getAssignment = (modelId, customerId) => ASSIGNMENTS.find((a) => a.modelId === modelId && a.customerId === customerId);
/** @returns {Run[]} החדשה למעלה */
export const runsOf = (assignmentId) => RUNS.filter((r) => r.assignmentId === assignmentId).sort((a, b) => b.date.localeCompare(a.date));
export const getRun = (assignmentId, id) => RUNS.find((r) => r.assignmentId === assignmentId && r.id === id);
