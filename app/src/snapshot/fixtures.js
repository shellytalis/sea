/**
 * נתוני דמה לעובדות של "תמונת מצב" (תחליף לשאילתות מסד הנתונים). מקור: דמה.
 * מקרים: v4 (6 ממצאים בחומרות שונות), v7 (ניצולת והפסקת AIS), v9 (מקורות שלא נבדקו), v5 (כלי נקי).
 * כלי ללא רשומה כאן מקבלים ברירת מחדל: זהות ומפרט בלבד ורשימות לפי הכלי; שאר המקורות "אין נתונים".
 * תקופות בעלות/ניהול: { company, country?, fleet?, from, to } כש-to=null פירושו "עד היום"; company=null פירושו "לא ידוע".
 */
const P = (company, from, to = null, extra = {}) => ({ company, from, to, ...extra });

export const FIXTURES = {
  // כלי בן 27, בעלות שהוחלפה, מוטב שלא היה ידוע, שם שונה, התאמה לרשימת מעקב
  v4: {
    identity: { changes: [{ date: '2026-06-12', field: 'name', from: 'SEA HAWK', to: 'SEA FALCON' }] },
    ownership: {
      registered: [P('Hawk Marine Ltd', '2012-03-01', '2026-04-16', { country: 'פנמה' }), P('Reylaver SA', '2026-04-16', null, { country: 'מקסיקו', fleet: 4 })],
      beneficial: [P('Hawk Holding', '2012-03-01', '2020-02-10'), P(null, '2020-02-10', '2026-04-16'), P('Reylaver SA', '2026-04-16')],
      technical: [P('Hawk Ship Mgmt', '2012-03-01', '2025-11-03'), P('Falcon Maritime', '2025-11-03')],
      ism: [P('Falcon Maritime', '2025-11-03')],
      commercial: [P('Falcon Maritime', '2022-01-10')],
      operator: [P('Falcon Maritime', '2022-01-10')],
    },
    ports: { calls: [
      { port: 'LATAKIA', arrival: '2026-11-02', departure: '2026-11-05' }, { port: 'MERSIN', arrival: '2026-10-14', departure: '2026-10-18' },
      { port: 'LATAKIA', arrival: '2026-09-20', departure: '2026-09-23' }, { port: 'ALEXANDRIA', arrival: '2026-09-01', departure: '2026-09-04' },
      { port: 'LATAKIA', arrival: '2026-08-12', departure: '2026-08-15' } ] },
    ais: { gaps: [{ start: '2026-09-28', hours: 30 }], daysInPort: 96, sailingDays: 190, nm: 28400, windowDays: 365 },
    sources: {},
  },
  // ניצולת חריגה והפסקת AIS ארוכה, בלי בעיות בעלות
  v7: {
    identity: { changes: [] },
    ownership: {
      registered: [P('Gulf Horizon Shipping', '2015-05-01', null, { country: 'איחוד האמירויות', fleet: 5 })],
      beneficial: [P('Gulf Horizon Holdings', '2015-05-01')],
      technical: [P('Gulf Horizon Shipping', '2015-05-01')], ism: [P('Gulf Horizon Shipping', '2015-05-01')],
      commercial: [P('Gulf Horizon Shipping', '2015-05-01')], operator: [P('Gulf Horizon Shipping', '2015-05-01')],
    },
    ports: { calls: [
      { port: 'JEBEL ALI', arrival: '2026-11-08', departure: '2026-11-12' }, { port: 'JEBEL ALI', arrival: '2026-10-02', departure: '2026-10-09' },
      { port: 'JEBEL ALI', arrival: '2026-08-21', departure: '2026-08-30' }, { port: 'JEBEL ALI', arrival: '2026-07-10', departure: '2026-07-19' },
      { port: 'JEBEL ALI', arrival: '2026-05-30', departure: '2026-06-09' } ] },
    ais: { gaps: [{ start: '2026-10-22', hours: 52 }], daysInPort: 214, sailingDays: 41, nm: 9100, windowDays: 365 },
  },
  // מקורות שלא נבדקו (קריאות נמל ג, ופעילות AIS), מוטב לא ידוע כיום
  v9: {
    identity: { changes: [] },
    ownership: {
      registered: [P('Gulf Horizon Shipping', '2019-08-01', null, { country: 'איחוד האמירויות', fleet: 5 })],
      beneficial: [P(null, '2019-08-01')],
      technical: [P('Oceanus Fleet Mgmt', '2019-08-01')], ism: [P('Oceanus Fleet Mgmt', '2019-08-01')],
      commercial: [P('Gulf Horizon Shipping', '2019-08-01')], operator: [P('Gulf Horizon Shipping', '2019-08-01')],
    },
    ports: { calls: [
      { port: 'SUEZ', arrival: '2026-10-30', departure: '2026-11-01' }, { port: 'PIRAEUS', arrival: '2026-10-12', departure: '2026-10-14' },
      { port: 'ISTANBUL', arrival: '2026-09-25', departure: '2026-09-27' } ] },
    sources: { portsC: 'unchecked', ais: 'unchecked' },
  },
  // כלי נקי: כל המקורות נבדקו ואין אינדיקטורים
  v5: {
    identity: { changes: [] },
    ownership: {
      registered: [P('Marmara Tankers', '2010-06-01', null, { country: 'טורקיה', fleet: 8 })],
      beneficial: [P('Marmara Tankers', '2010-06-01')],
      technical: [P('Bosphorus Mgmt', '2010-06-01')], ism: [P('Bosphorus Mgmt', '2010-06-01')],
      commercial: [P('Marmara Tankers', '2010-06-01')], operator: [P('Marmara Tankers', '2010-06-01')],
    },
    ports: { calls: [
      { port: 'ASHDOD', arrival: '2026-11-04', departure: '2026-11-06' }, { port: 'MERSIN', arrival: '2026-10-19', departure: '2026-10-21' },
      { port: 'ISTANBUL', arrival: '2026-10-01', departure: '2026-10-04' }, { port: 'AUGUSTA', arrival: '2026-09-12', departure: '2026-09-15' },
      { port: 'ASHDOD', arrival: '2026-08-25', departure: '2026-08-27' } ] },
    ais: { gaps: [{ start: '2026-08-02', hours: 6 }], daysInPort: 70, sailingDays: 260, nm: 52000, windowDays: 365 },
  },
};
