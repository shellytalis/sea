/**
 * לוגו החברה בסרגל העליון: placeholder בקובץ אחד. להחלפה: שנו את התוכן של CompanyLogo
 * (או החליפו בתג img לקובץ הלוגו). הגודל נקבע על ידי size.
 */
export const COMPANY_NAME = 'חברה לדוגמה';

export default function CompanyLogo({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label={COMPANY_NAME} className="company-logo">
      <path d="M3 16c3-7 6-7 9-3s6 3 9-6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="12" cy="20" r="1.5" fill="currentColor" />
    </svg>
  );
}
