/**
 * סולם חומרה יחיד לכל המערכת (BRAIN §5).
 * ארבע רמות חומרה, ושני מצבים שאינם חומרה: "לא הוערך" (חסר מידע) ו"אין אינדיקטורים" (נבדק ונקי).
 * @typedef {'low'|'medium'|'high'|'critical'|'unassessed'|'none'} Severity
 */

/** @type {Severity[]} מהחמור לקל, ואחריהן שני המצבים הלא-חומרה */
export const SEVERITIES = ['critical', 'high', 'medium', 'low', 'unassessed', 'none'];

/** @type {Record<Severity, string>} */
export const SEVERITY_LABEL = {
  critical: 'קריטי',
  high: 'גבוה',
  medium: 'בינוני',
  low: 'נמוך',
  unassessed: 'לא הוערך',
  none: 'אין אינדיקטורים',
};

const RANK = { critical: 4, high: 3, medium: 2, low: 1, unassessed: 0, none: 0 };

/** @param {Severity} s מספר להשוואה; מצבים שאינם חומרה מדורגים 0 */
export const severityRank = (s) => RANK[s] ?? 0;

/** @param {Severity[]} list החומרה הגבוהה ביותר ברשימה, או 'none' כשהרשימה ריקה */
export const maxSeverity = (list) =>
  list.reduce((a, b) => (severityRank(b) > severityRank(a) ? b : a), /** @type {Severity} */ ('none'));

/** @param {Severity} s ל-MapView המוקפא: הוא מכיר רק none/warning/danger */
export const mapRisk = (s) => (s === 'critical' || s === 'high' ? 'danger' : s === 'medium' ? 'warning' : 'none');
