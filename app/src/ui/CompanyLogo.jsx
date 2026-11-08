/**
 * לוגו החברה בסרגל העליון: מונוגרמה בריבוע 28px (placeholder בקובץ אחד).
 * להחלפה: שנו את COMPANY_NAME (ראשי התיבות נגזרים ממנו) או החליפו את התוכן בתג img.
 */
export const COMPANY_NAME = 'חברה לדוגמה';

export const initials = (name) => name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('');

export default function CompanyLogo({ size = 28 }) {
  return <span className="company-logo" role="img" aria-label={COMPANY_NAME} title={COMPANY_NAME} data-size={size}>{initials(COMPANY_NAME)}</span>;
}
