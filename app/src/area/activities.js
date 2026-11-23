// שש הפעילויות של ניתוח אזור, בסדר קבוע (FR-05).
// לכל פעילות צבע משלה (מחלקה act-<id> וטוקן --area-<id> ב-tokens.css), במקום אייקון: בלגנד, בכותרת ובנקודות הפעילות הנבחרת במפה.
// BR-06 (עודכן): בלי צורות סולם החומרה (● ▲ ◆ ■ ◌ ✓) ובלי צבעי החומרה (ירוק, ענבר, כתום, אדום); הצבעים הם הצעה.
// anchor: מה נקודת העיגון של האירוע (BR-01): היא שנבדקת מול הפוליגון.
// unique: שדות ייחודיים שמוצגים בכרטיס האירוע (מפתחות ב-event.extra, או vessel2).

/**
 * @typedef {Object} Activity
 * @property {string} id
 * @property {string} label
  * @property {string} anchor
 * @property {string[]} unique
 */

/** @type {Activity[]} */
export const ACTIVITIES = [
  { id: 'sts', label: 'מפגש ship-to-ship', anchor: 'מיקום בתחילת המפגש', unique: ['vessel2'] },
  { id: 'anchorage', label: 'עגינה והמתנה', anchor: 'מיקום העגינה', unique: [] },
  { id: 'port-visit', label: 'ביקור בנמל', anchor: 'מיקום הכלי בהגעה', unique: ['port'] },
  { id: 'ais-gap', label: 'הפסקת שידור AIS', anchor: 'המיקום האחרון לפני ההפסקה', unique: ['resume'] },
  { id: 'loitering', label: 'שיטוט', anchor: 'מרכז אזור השיטוט', unique: [] },
  { id: 'identity', label: 'שינוי זהות', anchor: 'מיקום בזמן השינוי', unique: ['change'] },
];

export const ACTIVITY_IDS = ACTIVITIES.map((a) => a.id);
export const activityById = (id) => ACTIVITIES.find((a) => a.id === id);
