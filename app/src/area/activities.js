// שש הפעילויות של ניתוח אזור, בסדר קבוע (FR-05).
// icon: שם אייקון lucide (ממופה ב-ActivityIcon). BR-06: אסור להשתמש בצורות סולם החומרה או בצבעיו; כל הנקודות במפה בצבע אחד.
// anchor: מה נקודת העיגון של האירוע (BR-01): היא שנבדקת מול הפוליגון.
// unique: שדות ייחודיים שמוצגים בכרטיס האירוע (מפתחות ב-event.extra, או vessel2).

/**
 * @typedef {Object} Activity
 * @property {string} id
 * @property {string} label
 * @property {string} icon
 * @property {string} anchor
 * @property {string[]} unique
 */

/** @type {Activity[]} */
export const ACTIVITIES = [
  { id: 'sts', label: 'מפגש ship-to-ship', icon: 'ArrowLeftRight', anchor: 'מיקום בתחילת המפגש', unique: ['vessel2'] },
  { id: 'anchorage', label: 'עגינה והמתנה', icon: 'Anchor', anchor: 'מיקום העגינה', unique: [] },
  { id: 'port-visit', label: 'ביקור בנמל', icon: 'Warehouse', anchor: 'מיקום הכלי בהגעה', unique: ['port'] },
  { id: 'ais-gap', label: 'הפסקת שידור AIS', icon: 'WifiOff', anchor: 'המיקום האחרון לפני ההפסקה', unique: ['resume'] },
  { id: 'loitering', label: 'שיטוט', icon: 'Orbit', anchor: 'מרכז אזור השיטוט', unique: [] },
  { id: 'identity', label: 'שינוי זהות', icon: 'IdCard', anchor: 'מיקום בזמן השינוי', unique: ['change'] },
];

export const ACTIVITY_IDS = ACTIVITIES.map((a) => a.id);
export const activityById = (id) => ACTIVITIES.find((a) => a.id === id);
