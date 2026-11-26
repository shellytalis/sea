// נוסח ההנחיה בפאנל חקירת שטח בזמן שרטוט בדקירה (שלב 5ה): בתוך החלון, לא בשורה צפה על המפה. לפי מספר הנקודות התקינות.
// רמז המקלדת מוצג בשורה נפרדת מנקודה אחת ומעלה (בלי כפתור).
/** @param {number} count */
export function terrainHint(count) {
  if (count === 0) return 'לחץ על המפה בפינה הראשונה של האזור';
  if (count < 3) return 'המשך ללחוץ על פינות האזור לפי הסדר. נדרשות לפחות 3 נקודות';
  return 'כדי לסיים, לחץ שוב על הנקודה הראשונה או לחץ פעמיים על הנקודה האחרונה';
}

/** רמז מקלדת, מנקודה אחת ומעלה: Backspace או Ctrl+Z מבטלים נקודה אחרונה */
export const TERRAIN_KEY_HINT = 'Backspace: ביטול נקודה אחרונה';
export const terrainKeyHint = (count) => (count >= 1 ? TERRAIN_KEY_HINT : '');
