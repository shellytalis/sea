/**
 * לוגו החברה בסרגל העליון: placeholder בקובץ אחד. להחלפה: שנו את התוכן של CompanyLogo
 * (או החליפו בתג img לקובץ הלוגו). הגודל נקבע על ידי size.
 */
export const COMPANY_NAME = 'חברה לדוגמה';

export default function CompanyLogo({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" role="img" aria-label={COMPANY_NAME} className="company-logo">
      <rect x="1" y="1" width="26" height="26" rx="4" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M7 19c3-6 5-6 7-3s4 2 7-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
