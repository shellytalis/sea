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
  assert.equal(plain(rule('owner-changed').text(f)), 'הבעלים הרשום הוחלף בתאריך 16.4.2026 (Reylaver SA, מקסיקו, 4 כלים).');
  f.ownership.registered[1].from = '2024-01-01';
  assert.equal(fires('owner-changed', f), false);
  assert.equal(fires('owner-changed', lose(f, 'ownership')), false);
});

test('כלל 2: בעלים מוטב לא היה ידוע בתקופה כלשהי', () => {
  const f = base();
  f.ownership.beneficial = [{ company: null, from: '2020-02-10', to: '2026-04-16' }, { company: 'X', from: '2026-04-16', to: null }];
  assert.equal(fires('beneficial-unknown-period', f), true);
  assert.match(plain(rule('beneficial-unknown-period').text(f)), /בין 10\.2\.2020 ל־16\.4\.2026/);
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
  assert.equal(plain(rule('identity-changed').text(f)), 'שם הכלי שונה מ-SEA HAWK ל-SEA FALCON בתאריך 12.6.2026.');
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

const snap = (id) => { const f = collectFacts(id); return { f, s: buildSnapshot(f, peersOf(f)) }; };
const topic = (s, id) => s.topics.find((t) => t.id === id);
const texts = (t) => t.summary.map((x) => plain(x.text));
const marked = (t) => t.summary.filter((x) => x.marked);

test('v4: משפט שכלל הופעל עליו נושא סמן; אין רשימת "נקודות" נפרדת; severity נשמר ב-findings', () => {
  const { s } = snap('v4');
  assert.ok(s.topics.every((t) => !('attention' in t)));
  assert.equal(s.attentionCount, 4, 'רשום, מוטב, שינוי זהות, רשימה (גיל אינו מסומן)');
  assert.deepEqual(s.findings.map((x) => x.severity), ['critical', 'high', 'medium', 'medium', 'medium', 'low'], 'findings: לנתוני מדרגה ב׳');
  assert.equal(topic(s, 'ownership').markedCount, 2);
  assert.equal(topic(s, 'events').markedCount, 1);
  assert.equal(s.coverage.available, 7);
});

test('כמה כללים על אותה עובדה = משפט אחד עם סמן (מוטב: לא ידוע + הפך לבעלים הרשום)', () => {
  const { s } = snap('v4');
  const ben = topic(s, 'ownership').summary.filter((x) => x.key === 'beneficial');
  assert.equal(ben.length, 1);
  assert.deepEqual(ben[0].rules.sort(), ['beneficial-became-registered', 'beneficial-unknown-period']);
  assert.equal(plain(ben[0].text), 'הבעלים המוטב הוא Reylaver SA (גם הבעלים הרשום); לא היה ידוע בין 10.2.2020 ל־16.4.2026.');
});

test('משפטים מסומנים ראשונים בנושא, אחר כך שאר העובדות', () => {
  const { s } = snap('v4');
  const flags = topic(s, 'ownership').summary.map((x) => x.marked);
  assert.deepEqual(flags, [true, true, false]);
});

test('עובדות רגילות אינן מסומנות: גיל (כלל 12) ונמל חוזר (כלל 10) נשארים בנתונים בלי סמן', () => {
  assert.equal(rule('old-vessel').mark, false);
  assert.equal(rule('same-port').mark, false);
  const { s } = snap('v7');
  assert.ok(s.findings.some((x) => x.id === 'same-port'), 'הכלל מופעל ונשמר בנתונים');
  assert.equal(marked(topic(s, 'ports')).length, 1, 'רק הפסקת ה-AIS מסומנת, לא הנמל החוזר');
  assert.ok(!texts(topic(s, 'identity')).some((x) => x.includes('27')), 'הגיל לא חוזר בנושא זהות');
});

test('הפסקת AIS שייכת לנושא "פעילות ונמלים"; אין עוד משפט "נבדק ולא נמצא" בפלט הנושא', () => {
  const { s } = snap('v7');
  assert.equal(rule('ais-gap').topic, 'ports');
  assert.equal(marked(topic(s, 'ports'))[0].key, 'ais-gap');
  for (const id of ['v4', 'v5', 'v7', 'v9', 'v10']) {
    const all = JSON.stringify(snap(id).s);
    assert.ok(!all.includes('נבדק ולא נמצאו'), `${id}: אין "נבדק ולא נמצאו"`);
    assert.ok(!all.includes('לא נמצאו נקודות לתשומת לב'), `${id}: אין "לא נמצאו נקודות"`);
    assert.ok(!snap(id).s.topics.some((t) => 'clear' in t));
  }
});

test('אין כפילות: אף משפט לא מופיע פעמיים בפלט, בכל מקרי הדמה', () => {
  for (const id of ['v4', 'v5', 'v7', 'v9', 'v10', 'v1']) {
    const { s } = snap(id);
    const all = s.topics.flatMap((t) => t.summary.map((x) => plain(x.text)));
    assert.equal(new Set(all).size, all.length, `${id}: משפט כפול`);
    s.topics.forEach((t) => {
      const keyed = t.summary.filter((x) => !['identity-changes', 'lists'].includes(x.key)).map((x) => x.key);
      assert.equal(new Set(keyed).size, keyed.length, `${id}/${t.id}: מפתח עובדה כפול`);
    });
  }
});

test('איחוד תפקידי ניהול: אותה חברה במשפט אחד; חברות שונות בנפרד', () => {
  const { s } = snap('v4');
  assert.equal(texts(topic(s, 'ownership'))[2], 'מנהל טכני, מנהל ISM, מנהל מסחרי ומפעיל: Falcon Maritime.');
  const f = base();
  f.ownership.technical = [{ company: 'Bosphorus Mgmt', from: '2010-06-01', to: null }];
  f.ownership.ism = [{ company: 'Bosphorus Mgmt', from: '2010-06-01', to: null }];
  f.ownership.commercial = [{ company: 'Marmara Tankers', from: '2010-06-01', to: null }];
  f.ownership.operator = [{ company: 'Marmara Tankers', from: '2010-06-01', to: null }];
  const t = texts(topic(buildSnapshot(f, peersOf(f)), 'ownership')).at(-1);
  assert.equal(t, 'מנהל טכני ומנהל ISM: Bosphorus Mgmt; מנהל מסחרי ומפעיל: Marmara Tankers.');
});

test('בסיס השוואה תמיד מצוין; קבוצה קטנה: אין השוואה', () => {
  const { s } = snap('v7');
  const u = texts(topic(s, 'utilization'));
  assert.equal(u[0], '214 ימים בנמל, חציון של כלים דומים 95 (קבוצה של 168 כלים), בחלון של 365 ימים.');
  assert.equal(u[1], '41 ימי הפלגה, חציון של כלים דומים 205 (קבוצה של 168 כלים), בחלון של 365 ימים.');
  assert.deepEqual(topic(s, 'utilization').summary.map((x) => x.marked), [true, true]);
  const f = collectFacts('v7');
  const small = buildSnapshot(f, { ...peersOf(f), n: 12 });
  assert.match(texts(topic(small, 'utilization'))[0], /אין בסיס השוואה לכלים דומים \(קבוצה של 12 כלים בלבד\)/);
  assert.equal(small.findings.some((x) => x.id === 'port-days-high'), false, 'בלי בסיס אין כלל');
  const none = buildSnapshot(f, null);
  assert.match(texts(topic(none, 'utilization'))[0], /אין בסיס השוואה/);
});

test('רשימות: תבנית מלאה עם גרש, ובלי רשימה "אינו מופיע"', () => {
  assert.deepEqual(texts(topic(snap('v4').s, 'events')), ['מופיע ברשימת מעקב ב׳ מאז 1.3.2025.']);
  assert.equal(texts(topic(snap('v5').s, 'events'))[0], 'אינו מופיע ברשימות מעקב או סנקציות.');
});

test('overview: כלי מלא — 3 משפטי עובדה, והנקודות בשורת תוויות', () => {
  const { s } = snap('v4');
  const o = s.overview.map(plain);
  assert.equal(o.length, 3);
  assert.match(o[0], /^General Cargo, בן 27 שנים \(נבנה ב-1999\), דגל .+, \d+K DWT\.$/);
  assert.equal(o[1], 'הבעלים הרשום: Reylaver SA מתאריך 16.4.2026; מנהל טכני: Falcon Maritime.');
  assert.equal(o[2], 'הקריאה האחרונה בנמל LATAKIA בתאריך 2.11.2026.');
  assert.ok(!o.some((x) => x.includes('נקודות לתשומת לב')));
});

test('תוויות לתשומת לב: מהכללים שהופעלו, בסדר קבוע (לא לפי חומרה), כל אחת מפנה למשפט המסומן שלה', () => {
  const { s } = snap('v4');
  assert.deepEqual(s.attentionLabels.map((a) => a.label), ['רשימת מעקב', 'החלפת בעלים רשום', 'בעלים מוטב לא היה ידוע', 'מוטב הפך לבעלים רשום', 'שם הכלי שונה']);
  assert.deepEqual(s.attentionLabels.map((a) => a.topic), ['events', 'ownership', 'ownership', 'ownership', 'identity']);
  const ids = new Set(s.topics.flatMap((t) => t.summary.filter((x) => x.marked).map((x) => x.id)));
  s.attentionLabels.forEach((a) => assert.ok(ids.has(a.target), a.label));
  assert.deepEqual(snap('v7').s.attentionLabels.map((a) => a.label), ['הפסקת AIS', 'ניצולת חריגה'], 'פעילות לפני ניצולת');
  RULES.filter((r) => !r.mark).forEach((r) => assert.equal(r.label(base(), null), null, 'עובדה רגילה: בלי תווית'));
});

test('אין נקודות: אין תוויות ואין שורה על כך (v5, v10)', () => {
  for (const id of ['v5', 'v10']) {
    const { s } = snap(id);
    assert.deepEqual(s.attentionLabels, []);
    assert.equal(s.attentionCount, 0);
    assert.ok(s.overview.every((x) => !x.includes('לתשומת לב')));
  }
  assert.equal(snap('v10').s.overview[1], 'בעלות וניהול: אין נתונים במקור.');
  assert.equal(snap('v10').s.overview[2], 'קריאות נמל: אין נתונים במקור.');
});

test('מצבי אין נתונים / לא הוערך', () => {
  const v9 = snap('v9').s, v10 = snap('v10').s;
  assert.equal(topic(v9, 'utilization').state, 'unchecked');
  assert.deepEqual(topic(v9, 'utilization').summary, []);
  assert.match(topic(v9, 'utilization').note, /לא הוערך: פעילות ו-AIS לא נבדק/);
  assert.equal(topic(v9, 'ports').state, 'data');
  assert.match(topic(v9, 'ports').note, /קריאות נמל \(נוסף\).*לא נבדק/);
  assert.equal(topic(v10, 'ownership').state, 'no-data');
  assert.equal(topic(v10, 'ownership').note, 'אין נתונים בנושא זה.');
  assert.equal(topic(v10, 'ports').summary.length, 0);
});

test('אין ספירה ואין שורת מקורות בנושא; המקורות והתאריכים ב-coverage (שם אחד פעם אחת, בלי "(מקור א/ב/ג)")', () => {
  const { s } = snap('v4');
  s.topics.forEach((t) => assert.ok(!('evidence' in t), `${t.id}: אין evidence ברמת הנושא`));
  assert.deepEqual(s.coverage.included.map((m) => m.name), ['זהות ושינויים', 'בעלות וניהול', 'קריאות נמל', 'פעילות ו-AIS', 'רשימות וסנקציות', 'מפרט טכני']);
  assert.equal(s.coverage.included.find((m) => m.name === 'קריאות נמל').asOf, '2026-11-21', 'התאריך האחרון משני מקורות הקריאות');
  s.coverage.included.forEach((m) => assert.ok(m.asOf && m.link));
  const raw = JSON.stringify(s);
  assert.ok(!raw.includes('מקור א') && !raw.includes('מקור ב') && !raw.includes('מקור ג'));
  const v9 = snap('v9').s.coverage;
  assert.ok(v9.missing.some((m) => m.label === 'קריאות נמל (נוסף)' && m.state === 'unchecked'));
  assert.ok(!v9.included.some((m) => m.name === 'פעילות ו-AIS'), 'מקור שלא נבדק לא ברשימה הכללית');
});

test('העתקה/PDF: בלוק מקורות אחד בסוף, בלי שורה לכל נושא ובלי ספירה בכותרות', () => {
  const { f, s } = snap('v4');
  const t = snapshotToText(s, f.vessel.name);
  assert.equal(t.split('\n').filter((l) => l.startsWith('מקורות:')).length, 1);
  assert.match(t, /\nמקורות:\n- זהות ושינויים · עודכן 2026-11-20\n- בעלות וניהול · עודכן 2026-11-18\n- קריאות נמל · עודכן 2026-11-21/);
  assert.ok(!/לתשומת לב\)\s*:/.test(t) && !/\(\d+ לתשומת לב\)/.test(t), 'אין ספירה בכותרת נושא');
  assert.ok(t.indexOf('מקורות:') > t.indexOf('רשימות ואירועים:'), 'הבלוק אחרי הנושאים');
  const v9 = snapshotToText(snap('v9').s, 'X');
  assert.match(v9, /- קריאות נמל \(נוסף\): לא נבדק/);
});
test('כל משפט נושא evidence (מקור וזמן) במבנה הנתונים, גם בלי שורת מקורות בתצוגה', () => {
  const { s } = snap('v4');
  s.topics.forEach((t) => t.summary.forEach((x) => assert.ok(x.evidence.length && x.evidence.every((e) => e.source && e.asOf), `${t.id}`)));
});
test('bidi: שמות לועזיים, סוג ו-DWT עטופים בבידוד; בלי חץ בשינוי שם', () => {
  const { s } = snap('v4');
  assert.match(s.overview[0], /^\u2068General Cargo\u2069, .*\u2068\d+K DWT\u2069\.$/);
  const id = topic(s, 'identity').summary[0].text;
  assert.match(id, /שונה מ-\u2068SEA HAWK\u2069 ל-\u2068SEA FALCON\u2069 בתאריך \u2068\d+\.\d+\.\d+\u2069\./);
  assert.ok(!id.includes('←'));
  assert.match(topic(s, 'ownership').summary[0].text, /\u2068Reylaver SA\u2069/);
});

test('collectFacts: כלי לא קיים; snapshotToText משקף את המבנה (▸ למשפט מסומן)', () => {
  assert.equal(collectFacts('nope'), null);
  const { f, s } = snap('v4');
  const t = snapshotToText(s, f.vessel.name);
  assert.match(t, /^תמונת מצב: SEA FALCON/);
  assert.match(t, /במבט אחד:/);
  assert.match(t, /\nבעלות וניהול:\n/);
  assert.match(t, /▸ .*\(לתשומת לב\)/);
  assert.match(t, /- לתשומת לב: רשימת מעקב · החלפת בעלים רשום/);
  assert.doesNotMatch(t, /קריטי|בינוני/, 'חומרה לא מוצגת בטקסט כש-showSeverity כבוי');
  assert.match(t, /כיסוי: נתונים מ-7 מתוך 7 מקורות/);
});