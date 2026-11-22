import test from 'node:test';
import assert from 'node:assert/strict';
import { collectFacts } from './collect.js';
import { peerStats } from './peers.js';
import { RULES } from './rules.js';
import { buildSnapshot, snapshotToText } from './compose.js';

/** עובדות נקיות (v5: כל המקורות נבדקו, אין ממצאים) כבסיס, עם שינוי נקודתי */
const base = () => structuredClone(collectFacts('v5'));
const peersOf = (f) => peerStats(f.vessel, f.now);
const rule = (id) => RULES.find((r) => r.id === id);
const fires = (id, f) => rule(id).when(f, peersOf(f));
/** בלי תווי הבידוד הכיווני */
const plain = (s) => s.replace(/[\u2068\u2069]/g, '');
const lose = (f, ...ids) => { ids.forEach((id) => { f.sources[id].state = 'unchecked'; }); return f; };

test('בסיס נקי: אף כלל לא מופעל', () => {
  const f = base();
  assert.deepEqual(RULES.filter((r) => r.when(f, peersOf(f))).map((r) => r.id), []);
});

test('כלל 1: בעלים רשום הוחלף ב-12 החודשים האחרונים', () => {
  const f = base();
  f.ownership.registered.push({ company: 'Reylaver SA', country: 'מקסיקו', fleet: 4, from: '2026-04-16', to: null });
  f.ownership.registered[0].to = '2026-04-16';
  assert.equal(fires('owner-changed', f), true);
  assert.equal(plain(rule('owner-changed').text(f)), 'הבעלים הרשום הוחלף ב-16.4.2026 (Reylaver SA, מקסיקו, 4 כלים).');
  f.ownership.registered[1].from = '2024-01-01';
  assert.equal(fires('owner-changed', f), false);
  assert.equal(fires('owner-changed', lose(f, 'ownership')), false);
});

test('כלל 2: בעלים מוטב לא היה ידוע בתקופה כלשהי', () => {
  const f = base();
  f.ownership.beneficial = [{ company: null, from: '2020-02-10', to: '2026-04-16' }, { company: 'X', from: '2026-04-16', to: null }];
  assert.equal(fires('beneficial-unknown-period', f), true);
  assert.match(rule('beneficial-unknown-period').text(f), /בין 10\.2\.2020 ל-16\.4\.2026/);
  assert.equal(fires('beneficial-unknown-period', base()), false);
  assert.equal(fires('beneficial-unknown-period', lose(f, 'ownership')), false);
});

test('כלל 3: המוטב הוא גם הבעלים הרשום החדש אחרי תקופה לא ידועה', () => {
  const f = base();
  f.ownership.registered = [{ company: 'A', from: '2012-01-01', to: '2026-04-16' }, { company: 'R', from: '2026-04-16', to: null }];
  f.ownership.beneficial = [{ company: null, from: '2020-01-01', to: '2026-04-16' }, { company: 'R', from: '2026-04-16', to: null }];
  assert.equal(fires('beneficial-became-registered', f), true);
  f.ownership.beneficial[1].company = 'Q';
  assert.equal(fires('beneficial-became-registered', f), false);
  assert.equal(fires('beneficial-became-registered', lose(f, 'ownership')), false);
});

test('כלל 4: מנהל טכני או ISM לא ידוע', () => {
  const f = base();
  f.ownership.ism = [{ company: null, from: '2020-01-01', to: null }];
  assert.equal(fires('manager-unknown', f), true);
  assert.equal(rule('manager-unknown').text(f), 'מנהל ISM אינו ידוע במקור הבעלות והניהול.');
  assert.equal(fires('manager-unknown', base()), false);
  assert.equal(fires('manager-unknown', lose(f, 'ownership')), false);
});

test('כלל 5: שני תפקידי ניהול ומעלה השתנו ב-24 חודשים', () => {
  const f = base();
  f.ownership.technical = [{ company: 'A', from: '2015-01-01', to: '2025-06-01' }, { company: 'B', from: '2025-06-01', to: null }];
  assert.equal(fires('management-churn', f), false, 'תפקיד אחד בלבד');
  f.ownership.operator = [{ company: 'A', from: '2015-01-01', to: '2026-01-01' }, { company: 'C', from: '2026-01-01', to: null }];
  assert.equal(fires('management-churn', f), true);
  assert.match(rule('management-churn').text(f), /2 תפקידי ניהול.*1\.1\.2026/);
  assert.equal(fires('management-churn', lose(f, 'ownership')), false);
});

test('כלל 6: שינוי דגל פעמיים ב-24 חודשים', () => {
  const f = base();
  f.identity.changes = [{ date: '2025-01-10', field: 'flag', from: 'פנמה', to: 'מלטה' }];
  assert.equal(fires('flag-changes', f), false);
  f.identity.changes.push({ date: '2026-03-02', field: 'flag', from: 'מלטה', to: 'קמרון' });
  assert.equal(fires('flag-changes', f), true);
  assert.match(rule('flag-changes').text(f), /2 פעמים.*2\.3\.2026/);
  assert.equal(fires('flag-changes', lose(f, 'identity')), false);
});

test('כלל 7: שינוי שם או IMO/MMSI בשנה האחרונה', () => {
  const f = base();
  f.identity.changes = [{ date: '2026-06-12', field: 'name', from: 'SEA HAWK', to: 'SEA FALCON' }];
  assert.equal(fires('identity-changed', f), true);
  assert.equal(plain(rule('identity-changed').text(f)), 'שם הכלי הוחלף ב-12.6.2026 (SEA HAWK ← SEA FALCON).');
  f.identity.changes[0].date = '2024-06-12';
  assert.equal(fires('identity-changed', f), false);
  assert.equal(fires('identity-changed', lose(f, 'identity')), false);
});

test('כלל 8: הפסקת AIS מעל 48 שעות ב-90 הימים', () => {
  const f = base();
  f.ais.gaps = [{ start: '2026-10-22', hours: 52 }];
  assert.equal(fires('ais-gap', f), true);
  f.ais.gaps = [{ start: '2026-10-22', hours: 48 }, { start: '2026-03-01', hours: 100 }];
  assert.equal(fires('ais-gap', f), false, 'בדיוק על הסף, ומחוץ לחלון');
  assert.equal(fires('ais-gap', lose(f, 'ais')), false);
});

test('כלל 9: ימים בנמל גבוהים מפי 1.5 מהחציון וימי הפלגה מתחת לחצי', () => {
  const f = base(); // Chemical Tanker: חציון 102 ימי נמל, 198 ימי הפלגה
  f.ais.daysInPort = 160; f.ais.sailingDays = 90;
  assert.equal(fires('port-days-high', f), true);
  assert.match(rule('port-days-high').text(f, peersOf(f)), /^160 ימים בנמל לעומת חציון 102 של 121 כלים דומים/);
  f.ais.sailingDays = 120; 
  assert.equal(fires('port-days-high', f), false, 'ימי הפלגה לא נמוכים מספיק');
  f.ais.sailingDays = 90; f.ais.daysInPort = 140;
  assert.equal(fires('port-days-high', f), false, 'ימים בנמל מתחת לסף');
  f.ais.daysInPort = 160;
  assert.equal(fires('port-days-high', lose(f, 'ais')), false);
  assert.equal(rule('port-days-high').when(base(), null), false, 'אין כלים דומים להשוואה');
});

test('כלל 10: חמש הקריאות האחרונות באותו נמל', () => {
  const f = base();
  f.ports.calls = Array.from({ length: 5 }, (_, i) => ({ port: 'JEBEL ALI', arrival: `2026-0${i + 1}-01`, departure: `2026-0${i + 1}-03` }));
  assert.equal(fires('same-port', f), true);
  f.ports.calls[2].port = 'FUJAIRAH';
  assert.equal(fires('same-port', f), false);
  f.ports.calls = f.ports.calls.slice(0, 3).map((c) => ({ ...c, port: 'X' }));
  assert.equal(fires('same-port', f), false, 'פחות מחמש קריאות');
  assert.equal(fires('same-port', lose(f, 'portsB')), false);
});

test('כלל 11: התאמה לרשימה', () => {
  const f = base();
  f.lists.matches = [{ list: 'רשימת מעקב ב', since: '2025-03-01' }];
  assert.equal(fires('list-match', f), true);
  assert.equal(rule('list-match').severity, 'critical');
  assert.equal(fires('list-match', base()), false);
  assert.equal(fires('list-match', lose(f, 'lists')), false);
});

test('כלל 12: כלי בן 20+', () => {
  const f = base();
  f.vessel.built = 2006;
  assert.equal(fires('old-vessel', f), true);
  assert.equal(rule('old-vessel').text(f), 'הכלי בן 20 שנים (נבנה ב-2006).');
  f.vessel.built = 2007;
  assert.equal(fires('old-vessel', f), false);
  assert.equal(fires('old-vessel', lose(f, 'spec')), false);
});

test('כל כלל נושא ראיה (מקור וזמן), נושא וקישור למקטע', () => {
  const f = base();
  for (const r of RULES) {
    assert.ok(r.topic && r.link && r.severity, r.id);
    assert.ok(r.evidence(f).every((e) => e.source && e.asOf), r.id);
  }
});

test('buildSnapshot, מקרה עשיר (v4): ממוין לפי חומרה, חומרה עליונה קריטית', () => {
  const f = collectFacts('v4');
  const s = buildSnapshot(f, peersOf(f));
  assert.deepEqual(s.findings.map((x) => x.severity), ['critical', 'high', 'medium', 'medium', 'medium', 'low']);
  assert.equal(s.conclusion.severity, 'critical');
  assert.equal(s.conclusion.text, '6 ממצאים: 1 קריטי, 1 גבוה, 3 בינוני, 1 נמוך');
  assert.equal(s.coverage.available, 7);
});

test('buildSnapshot, כלי נקי (v5): "אין אינדיקטורים" ולא "נמוך"', () => {
  const f = collectFacts('v5');
  const s = buildSnapshot(f, peersOf(f));
  assert.equal(s.findings.length, 0);
  assert.deepEqual(s.conclusion, { severity: 'none', text: 'אין אינדיקטורים' });
  assert.ok(s.topics.every((t) => t.state === 'no-findings'));
});

test('buildSnapshot, מקור שלא נבדק (v9): "לא הוערך" נפרד מ"אין ממצאים"', () => {
  const f = collectFacts('v9');
  const s = buildSnapshot(f, peersOf(f));
  const by = Object.fromEntries(s.topics.map((t) => [t.id, t]));
  assert.equal(by.utilization.state, 'unchecked');
  assert.equal(by.events.state, 'no-findings');
  assert.match(by.events.text, /פעילות ו-AIS \(מקור א\): לא נבדק/);
  assert.equal(by.ports.state, 'no-findings');
  assert.equal(s.coverage.available, 5);
  assert.deepEqual(s.coverage.missing.map((m) => m.state), ['unchecked', 'unchecked']);
});

test('buildSnapshot, כלי כמעט בלי נתונים: נושאים "אין נתונים", מסקנה ללא "אין אינדיקטורים" מלא', () => {
  const f = collectFacts('v10');
  const s = buildSnapshot(f, peersOf(f));
  const by = Object.fromEntries(s.topics.map((t) => [t.id, t]));
  assert.equal(by.ownership.state, 'no-data');
  assert.equal(by.utilization.state, 'no-data');
  assert.equal(by.ports.state, 'no-data');
  assert.equal(s.coverage.available, 3);
  assert.match(s.conclusion.text, /במקורות שנבדקו \(3 מתוך 7\)/);
});

test('collectFacts: כלי לא קיים; snapshotToText כולל מסקנה, ממצאים וכיסוי', () => {
  assert.equal(collectFacts('nope'), null);
  const f = collectFacts('v4');
  const t = snapshotToText(buildSnapshot(f, peersOf(f)), f.vessel.name);
  assert.match(t, /^תמונת מצב: SEA FALCON/);
  assert.match(t, /\[קריטי\]/);
  assert.match(t, /כיסוי: נתונים מ-7 מתוך 7 מקורות/);
});
