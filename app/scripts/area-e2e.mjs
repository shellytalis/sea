/**
 * בדיקת דפדפן לניתוח אזור ("חקירת שטח", שלב 5) + צילומי מסך. דורשת שרת פיתוח רץ ו-Chrome, ו-puppeteer-core
 * (לא תלות של הפרויקט: `npm i --no-save puppeteer-core`). הרצה: node scripts/area-e2e.mjs [outDir] [widths, למשל 1366,1920,2560]
 * משתני סביבה: BASE (ברירת מחדל http://localhost:5173), CHROME. משתמשת ב-window.__seaMap (נחשף רק ב-dev) כדי לחשב מיקומי לחיצה.
 * בודקת: שרטוט וסגירה (לחיצה על הקודקוד הראשון), פוליגון חוצה את עצמו, רוחב פאנל 320/480, ברירת מחדל במקרא, ספירות
 * (צפוף/דליל/לא נבדק), סכום נקודות וקבוצות = הספירה, כרטיס אירוע (שורה/נקודה/Esc/מחוץ), מיון, לשוניות ושמירת מצב,
 * מקלדת במקרא, טווח 90 יום, תקרת נקודות (?area=cap), טעינה/שגיאה/נסה שוב, תקרת שטח, ייצוא CSV, וכלים בשטח כעת.
 */
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import assert from 'node:assert/strict';

const BASE = process.env.BASE ?? 'http://localhost:5173';
const OUT = process.argv[2] ?? 'audit-screenshots/stage5-area-analysis';
const widths = (process.argv[3] ?? '1366,1920,2560').split(',').map(Number);
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new' });
const problems = [];

const AREAS = {
  dense: [[34.4, 32.55], [35.05, 32.55], [35.05, 33.1], [34.4, 33.1]],
  sparse: [[31.4, 34.4], [32.2, 34.4], [32.2, 35.0], [31.4, 35.0]],
  uncovered: [[33.7, 27.4], [34.7, 27.4], [34.7, 28.0], [33.7, 28.0]],
  huge: [[22, 30], [37, 30], [37, 38], [22, 38]],
  vessel: [[25.9, 33.9], [26.9, 33.9], [26.9, 34.5], [25.9, 34.5]], // סביב NORDIC AURORA (34.2N, 26.4E)
  butterfly: [[34.4, 32.55], [35.05, 33.1], [35.05, 32.55], [34.4, 33.1]],
};

for (const w of widths) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: 900 });
  page.on('console', (m) => { if (m.type() === 'error') problems.push(`[${w}] ${m.text()}`); });
  page.on('pageerror', (e) => problems.push(`[${w}] pageerror: ${e.message}`));
  const shot = (name) => page.screenshot({ path: `${OUT}/${name}-${w}.png` });
  const load = async (query = '') => {
    await page.goto(`${BASE}/${query}`, { waitUntil: 'networkidle0' });
    await page.waitForFunction(() => !!window.__seaMap && document.querySelector('.mt-bar'));
    await sleep(500);
  };
  const openTool = async () => {
    await page.evaluate(() => [...document.querySelectorAll('.mt-tool')].find((b) => b.textContent.includes('חקירת שטח')).click());
    await page.waitForSelector('.area-panel');
  };
  const screenPts = (poly) => page.evaluate((pts) => pts.map((p) => {
    const m = window.__seaMap;
    const q = m.project(p);
    const r = m.getContainer().getBoundingClientRect();
    return [r.left + q.x, r.top + q.y];
  }), poly);
  const fit = async (poly) => {
    await page.evaluate((pts) => {
      const lons = pts.map((p) => p[0]);
      const lats = pts.map((p) => p[1]);
      window.__seaMap.fitBounds([[Math.min(...lons), Math.min(...lats)], [Math.max(...lons), Math.max(...lats)]], { padding: { top: 150, bottom: 150, left: 640, right: 120 }, duration: 0, maxZoom: 12 });
    }, poly);
    await sleep(900);
  };
  /** משרטט ב-4 לחיצות; close: סגירה בלחיצה על הקודקוד הראשון */
  const draw = async (poly, { close = true } = {}) => {
    await fit(poly);
    const pts = await screenPts(poly);
    for (const [x, y] of pts) { await page.mouse.click(x, y); await sleep(120); }
    if (close) { await page.mouse.click(pts[0][0], pts[0][1]); await sleep(300); }
    return pts;
  };
  const ready = () => page.waitForFunction(() => document.querySelectorAll('.area-act-count').length === 6 && !document.querySelector('.area-act-skel'), { timeout: 8000 });
  const counts = () => page.evaluate(() => Object.fromEntries([...document.querySelectorAll('.area-act')].map((b) => [b.querySelector('.area-act-name').textContent, b.querySelector('.area-act-count')?.textContent ?? null])));
  const checked = () => page.evaluate(() => document.querySelector('.area-act[aria-checked=true] .area-act-name')?.textContent);
  const pick = (label) => page.evaluate((l) => [...document.querySelectorAll('.area-act')].find((b) => b.textContent.includes(l)).click(), label);
  const pointSum = () => page.evaluate(() => [...document.querySelectorAll('.map-event')].length + [...document.querySelectorAll('.map-cluster')].reduce((s, e) => s + Number(e.textContent), 0));
  const panelW = () => page.evaluate(() => Math.round(document.querySelector('.area-panel').getBoundingClientRect().width));
  const clear = async () => { await page.evaluate(() => [...document.querySelectorAll('.area-panel .mt-clear-link')][0].click()); await sleep(300); };

  // ===== 1. שרטוט: ידיות, סגירה, פוליגון חוצה את עצמו =====
  await load();
  await openTool();
  assert.equal(await panelW(), 320, `[${w}] רוחב פאנל בשרטוט`);
  // 5ג: מצב ריק: בלי שורת פעולות בכלל (לא כפתורים מושבתים), ובלי "העתק"
  assert.equal(await page.$('.area-panel .panel-foot'), null, `[${w}] יש שורת פעולות במצב ריק`);
  assert.ok(!(await page.$eval('.area-panel', (e) => e.textContent)).includes('העתק'), `[${w}] נשאר כפתור העתק`);
  await shot('05b-empty-no-actions');
  assert.match(await page.$eval('.area-hint-text', (e) => e.textContent), /לחץ על המפה בפינה הראשונה/);
  assert.equal(await page.$('.mt-hint'), null, `[${w}] שורה צפה מעל המפה`);
  await fit(AREAS.dense);
  const dpts = await screenPts(AREAS.dense);
  for (const [x, y] of dpts.slice(0, 3)) { await page.mouse.click(x, y); await sleep(120); }
  await shot('01-drawing');
  assert.ok(await page.$('.map-handle.closable'), `[${w}] הקודקוד הראשון לא ניתן לסגירה`);
  await page.keyboard.press('Escape'); // Esc בשרטוט מוחק את הטיוטה, והכלי נשאר
  await sleep(200);
  assert.ok(await page.$('.area-panel'), `[${w}] Esc ראשון סגר את הכלי`);
  assert.equal(await page.$('.map-handle'), null, `[${w}] הטיוטה לא נמחקה`);
  // פוליגון חוצה
  const bpts = await draw(AREAS.butterfly, { close: false });
  await page.keyboard.press('Enter');
  await sleep(300);
  assert.match(await page.$eval('.area-panel [role=alert]', (e) => e.textContent), /חוצות/, `[${w}] אין הודעת חיתוך עצמי`);
  assert.equal(await page.$('.area-legend'), null, `[${w}] פוליגון חוצה נסגר`);
  await shot('02-self-intersect');
  await page.keyboard.press('Escape'); await sleep(200);
  void bpts;
  // שתי לחיצות מחדש: פחות מ-3 קודקודים
  await page.mouse.click(...dpts[0]); await sleep(100); await page.mouse.click(...dpts[1]); await sleep(100);
  await page.keyboard.press('Enter'); await sleep(200);
  assert.match(await page.$eval('.area-panel [role=alert]', (e) => e.textContent), /3 קודקודים/, `[${w}] אין הודעת 3 קודקודים`);
  await page.keyboard.press('Escape'); await sleep(200);

  // ===== 2. אזור צפוף =====
  await draw(AREAS.dense);
  await ready();
  assert.equal(await panelW(), 480, `[${w}] רוחב פאנל בלשונית פעילויות`);
  let c = await counts();
  assert.equal(c['מפגש ship-to-ship'], '3');
  assert.equal(c['עגינה והמתנה'], '31');
  assert.equal(c['ביקור בנמל'], '18');
  assert.equal(c['הפסקת שידור AIS'], '9');
  assert.equal(c['שיטוט'], '6');
  assert.equal(c['שינוי זהות'], '3');
  assert.equal(await checked(), 'מפגש ship-to-ship', `[${w}] ברירת מחדל`);
  assert.match(await page.$eval('.area-totals', (e) => e.textContent), /סה״כ\s*70\s*פעילויות · \d+\s*כלי שיט ייחודיים/, `[${w}] שורת סיכום`);
  // הוסרו: בקרת יחידות ושטח/היקף בכותרת, והערה על פעילויות שלא נבדקו בשורת הסיכום
  assert.equal(await page.$('.area-panel .mt-unit, .area-panel .panel-meta'), null, `[${w}] יחידות או שטח והיקף עדיין בכותרת`);
  assert.equal(await page.$('.area-totals-note'), null);
  // 5ב.7: ברירת מחדל של הטווח היא 30 יום
  assert.match(await page.$eval('.area-range .mt-datebtn', (e) => e.textContent), /30 ימים/, `[${w}] טווח ברירת מחדל`);
  // 5ב.2: גובה שורת מקרא = --row-h (44px)
  assert.equal(await page.$eval('.area-act', (e) => Math.round(e.getBoundingClientRect().height)), 44, `[${w}] גובה שורת מקרא`);
  // 5ב.3: מצב חקירת שטח: סמלי כלי השיט מוסתרים, מסכה קיימת, מדידת השטח לא מוצגת על המפה
  const mapState = () => page.evaluate(() => { const m = window.__seaMap; return { vis: m.getLayoutProperty('vessels', 'visibility'), ring: m.getLayoutProperty('sel-ring', 'visibility'), filter: m.getFilter('vessels') ?? null, mask: window.__seaFeatures().some((f) => f.properties.t === 'mask'), chip: !!document.querySelector('.map-chip') }; });
  let ms = await mapState();
  assert.deepEqual([ms.vis, ms.ring, ms.mask, ms.chip], ['none', 'none', true, false], `[${w}] מצב חקירת שטח: ${JSON.stringify(ms)}`);
  assert.equal(await pointSum(), 3, `[${w}] נקודות STS`);
  // 5ב.6: מפגש STS: שני הכלים באותו משקל, מופרדים ב-" ↔ ", לפי סדר אלפביתי
  const sts = await page.$$eval('.area-row td:nth-child(2)', (l) => l.map((e) => e.textContent));
  assert.ok(sts.length === 3 && sts.every((s) => { const [a, b] = s.split(' ↔ '); return b != null && a <= b; }), `[${w}] STS בטבלה: ${sts.join(' | ')}`);
  const hasShapes = await page.evaluate(() => /[●▲◆■◌✓]/.test(document.querySelector('.area-legend').textContent));
  assert.equal(hasShapes, false, `[${w}] צורות סולם חומרה במקרא`);
  await pick('עגינה והמתנה');
  await sleep(300);
  assert.equal(await pointSum(), 31, `[${w}] סכום נקודות וקבוצות שונה מהספירה`);
  assert.equal(await page.evaluate(() => document.querySelectorAll('.area-row').length), 31);
  const dotColor = await page.evaluate(() => getComputedStyle(document.querySelector('.map-event, .map-cluster')).backgroundColor);
  assert.ok(dotColor.startsWith('rgb(182, 124, 236)'), `[${w}] צבע נקודות עגינה (סגול) ${dotColor}`);
  assert.ok(await page.evaluate(() => !/[●▲◆■◌✓]/.test(document.querySelector('.area-legend').textContent) && !document.querySelector('.area-legend svg')), `[${w}] אייקונים או צורות חומרה במקרא`);
  await shot('03-dense-anchorage');
  // 5ב.1: כותרת מקטע דביקה בגלילה (גוף הפאנל הוא אזור הגלילה היחיד)
  await page.evaluate(() => { document.querySelector('.area-panel .panel-body').scrollTop = 900; });
  await sleep(250);
  const sticky = await page.evaluate(() => {
    const body = document.querySelector('.area-panel .panel-body');
    const b = body.getBoundingClientRect(); const h = document.querySelector('.area-section-head').getBoundingClientRect(); const th = document.querySelector('.area-table thead th').getBoundingClientRect();
    return { top: Math.round(h.top - b.top), th: Math.round(th.top - h.bottom), text: document.querySelector('.area-section-head').textContent, scrolled: body.scrollTop, legendHidden: document.querySelector('.area-legend').getBoundingClientRect().bottom < b.top + 1, label: document.querySelector('.area-section-head').getAttribute('aria-label'), nested: [...document.querySelectorAll('.area-results, .area-table, .area-tabpanel')].some((e) => getComputedStyle(e).overflowY !== 'visible') };
  });
  assert.ok(sticky.scrolled > 0 && sticky.legendHidden, `[${w}] לא גללנו: ${JSON.stringify(sticky)}`);
  assert.ok(Math.abs(sticky.top) <= 1 && Math.abs(sticky.th) <= 1, `[${w}] כותרות לא דביקות: ${JSON.stringify(sticky)}`);
  assert.match(sticky.text, /עגינה והמתנה.*31 אירועים/);
  assert.equal(sticky.label, 'החלף פעילות');
  assert.equal(sticky.nested, false, `[${w}] גלילה פנימית נוספת`);
  await shot('02-sticky-header');
  await page.click('.area-section-head');
  await sleep(900);
  assert.equal(await page.$eval('.area-panel .panel-body', (e) => e.scrollTop), 0, `[${w}] לחיצה על הכותרת לא גללה למקרא`);
  await shot('01-legend-no-scroll');

  // מיון לפי כלי
  await page.evaluate(() => [...document.querySelectorAll('.area-table th button')].find((b) => b.textContent.includes('כלי')).click());
  assert.equal(await page.$eval('.area-table th[aria-sort=ascending]', (e) => e.textContent.trim()), 'כלי', `[${w}] מיון`);
  const names = await page.$$eval('.area-row td:nth-child(2) .cell-name', (l) => l.map((e) => e.textContent));
  assert.deepEqual(names, [...names].sort((a, b) => a.localeCompare(b)), `[${w}] מיון לפי שם`);
  await page.evaluate(() => [...document.querySelectorAll('.area-table th button')].find((b) => b.textContent.includes('התחלה')).click());

  // כרטיס אירוע: לחיצה על שורה
  await page.click('.area-row');
  await page.waitForSelector('.area-card');
  assert.ok(await page.$('.map-event.sel, .map-cluster.sel'), `[${w}] הנקודה לא מודגשת`);
  const card = await page.$eval('.area-card', (e) => ({ text: e.textContent, role: e.getAttribute('role'), href: e.querySelector('a')?.getAttribute('href') }));
  assert.match(card.text, /עגינה והמתנה/);
  assert.match(card.text, /IMO/);
  assert.match(card.text, /מקור א/);
  assert.match(card.href, /^\/vessels\//);
  await shot('04-dense-card');
  await page.keyboard.press('Escape'); await sleep(200);
  assert.equal(await page.$('.area-card'), null, `[${w}] Esc לא סגר את הכרטיס`);
  assert.ok(await page.$('.area-panel'), `[${w}] Esc סגר את הכלי במקום את הכרטיס`);
  // לחיצה על נקודה בודדת פותחת כרטיס וגוללת לשורה; לחיצה מחוץ סוגרת
  // נקודה בודדת שלא מכוסה בסמל אחר
  const dot = await page.evaluate(() => { const e = [...document.querySelectorAll('.map-event')].find((el) => { const r = el.getBoundingClientRect(); return document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) === el; }); const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
  await page.mouse.click(dot[0], dot[1]);
  await page.waitForSelector('.area-card');
  assert.ok(await page.$('.area-row.sel'), `[${w}] השורה לא מודגשת`);
  await page.mouse.click(1, 300); // מחוץ לכרטיס, על מקום ריק (תחילת המפה)
  await sleep(300);
  assert.equal(await page.$('.area-card'), null, `[${w}] לחיצה בחוץ לא סגרה את הכרטיס`);
  assert.equal(await page.$('.area-legend') != null, true, `[${w}] הלחיצה בחוץ סגרה/שינתה את הפוליגון`);

  // לשוניות: שומרות פעילות וטווח
  const rangeBefore = await page.$eval('.area-range .mt-datebtn', (e) => e.textContent);
  await page.evaluate(() => document.querySelector('#area-tab-now').click());
  await sleep(200);
  ms = await mapState();
  assert.deepEqual([ms.vis, ms.ring, ms.mask], ['visible', 'none', true], `[${w}] לשונית כלים בשטח כעת: ${JSON.stringify(ms)}`);
  assert.ok(Array.isArray(ms.filter) && ms.filter[0] === 'in', `[${w}] אין סינון כלים בשטח`);
  assert.equal(await panelW(), 320, `[${w}] רוחב פאנל בלשונית כלים בשטח`);
  await page.evaluate(() => document.querySelector('#area-tab-range').click());
  await sleep(200);
  assert.equal(await checked(), 'עגינה והמתנה', `[${w}] הפעילות לא נשמרה במעבר לשוניות`);
  assert.equal(await page.$eval('.area-range .mt-datebtn', (e) => e.textContent), rangeBefore, `[${w}] הטווח לא נשמר`);

  // מקלדת במקרא: חץ למטה בוחר את הבאה
  await page.evaluate(() => document.querySelector('.area-act[aria-checked=true]').focus());
  await page.keyboard.press('ArrowDown'); await sleep(150);
  assert.equal(await checked(), 'ביקור בנמל', `[${w}] חץ למטה`);
  await page.keyboard.press('ArrowUp'); await sleep(100);
  assert.equal(await checked(), 'עגינה והמתנה');

  // ייצוא CSV
  await page.evaluate(() => { window.__csv = null; const o = URL.createObjectURL; URL.createObjectURL = (b) => { b.arrayBuffer().then((buf) => { window.__csv = new TextDecoder('utf-8', { ignoreBOM: true }).decode(buf); }); return o.call(URL, b); }; });
  await page.evaluate(() => [...document.querySelectorAll('.area-panel .panel-foot button')].find((b) => b.textContent.includes('ייצוא CSV')).click());
  await page.waitForFunction(() => window.__csv != null);
  const csv = await page.evaluate(() => window.__csv);
  const lines = csv.split('\r\n');
  assert.equal(csv.charCodeAt(0), 0xfeff, `[${w}] אין BOM`);
  assert.match(lines[0], /קודקודי הפוליגון/);
  assert.match(lines[1], /טווח/);
  assert.match(lines[2], /פעילות.*שם.*IMO.*MMSI.*דגל.*כלי שני.*התחלה.*סיום.*משך/);
  assert.equal(lines.length, 3 + 31, `[${w}] מספר שורות ב-CSV`);

  // טווח 90 יום: שיטוט הופך ל"לא נבדק" (מקור ג מכסה 60 יום), ועגינה 32
  await page.evaluate(() => document.querySelector('.area-range .mt-datebtn').click());
  await page.waitForSelector('.area-rangepop');
  await page.evaluate(() => [...document.querySelectorAll('.area-rangepop .mt-presets button')].find((b) => b.textContent.includes('90')).click());
  await page.evaluate(() => [...document.querySelectorAll('.area-rangepop .mt-popfoot button')].find((b) => b.textContent.includes('החל')).click());
  await ready();
  c = await counts();
  assert.equal(c['שיטוט'], 'לא נבדק', `[${w}] שיטוט ב-90 יום`);
  assert.equal(c['עגינה והמתנה'], '32', `[${w}] אירוע שהתחיל לפני 30 יום`);
  // טווח מעל 90 יום: הבורר לא מקבל
  await page.evaluate(() => document.querySelector('.area-range .mt-datebtn').click());
  await page.waitForSelector('.area-rangepop');
  await page.evaluate(() => { const i = [...document.querySelectorAll('.area-rangepop .mt-cal-day:not(:disabled)')]; i[0].click(); });
  const preset = await page.evaluate(() => [...document.querySelectorAll('.area-rangepop .mt-presets button')].map((b) => b.textContent));
  assert.deepEqual(preset.length, 3, `[${w}] קיצורים`);
  await page.keyboard.press('Escape'); await sleep(200);
  assert.ok(await page.$('.area-panel'), `[${w}] Esc בבורר סגר את הכלי`);

  // ===== 3. כלים בשטח כעת =====
  await clear();
  await draw(AREAS.vessel);
  await ready();
  await page.evaluate(() => document.querySelector('#area-tab-now').click());
  await page.waitForSelector('.mt-terrain-list');
  assert.match(await page.$eval('.mt-terrain-list', (e) => e.textContent), /NORDIC AURORA/, `[${w}] כלי בשטח`);
  const nowCsv = await page.evaluate(() => [...document.querySelectorAll('.area-panel .panel-foot button')].map((b) => b.textContent));
  assert.ok(nowCsv.includes('ייצוא CSV') && nowCsv.includes('הוסף לרשימה'), `[${w}] פעולות לשונית כלים בשטח`);
  await shot('08-now-tab');
  ms = await mapState();
  assert.ok(JSON.stringify(ms.filter).includes('v1'), `[${w}] NORDIC AURORA לא ברשימת הסינון: ${JSON.stringify(ms.filter)}`);
  await clear();
  ms = await mapState();
  assert.deepEqual([ms.vis, ms.ring, ms.filter, ms.mask], ['visible', 'visible', null, false], `[${w}] היציאה ("נקה") לא החזירה את השכבות: ${JSON.stringify(ms)}`);
  await shot('12-exit-layers-back');

  // ===== 4. דליל ו"לא נבדק" ותקרת שטח =====
  await draw(AREAS.sparse);
  await ready();
  c = await counts();
  assert.deepEqual([c['מפגש ship-to-ship'], c['עגינה והמתנה'], c['הפסקת שידור AIS'], c['שינוי זהות'], c['שיטוט']], ['1', '0', '1', '1', '0'], `[${w}] דליל`);
  await pick('עגינה והמתנה');
  await sleep(200);
  assert.match(await page.$eval('.area-status', (e) => e.textContent), /אין אירועים בשטח ובטווח/);
  await shot('05-sparse-empty');
  await clear();
  await draw(AREAS.uncovered);
  await ready();
  c = await counts();
  assert.equal(c['שיטוט'], 'לא נבדק', `[${w}] לא נבדק`);
  assert.notEqual(c['שיטוט'], '0');
  await pick('שיטוט');
  await sleep(200);
  assert.match(await page.$eval('.area-status', (e) => e.textContent), /זה לא אומר שאין אירועים/);
  assert.equal(await page.evaluate(() => [...document.querySelectorAll('.area-panel .panel-foot button')].find((b) => b.textContent.includes('ייצוא CSV')).disabled), true, `[${w}] CSV פעיל ב"לא נבדק"`);
  await shot('06-uncovered');
  await clear();
  await draw(AREAS.huge);
  await page.waitForFunction(() => /השטח גדול מדי/.test(document.querySelector('.area-panel')?.textContent ?? ''));
  await shot('07-too-large');
  await clear();
  await page.keyboard.press('Escape'); await sleep(200);
  assert.equal(await page.$('.area-panel'), null, `[${w}] Esc שני לא סגר את הכלי`);
  ms = await mapState();
  assert.deepEqual([ms.vis, ms.ring, ms.filter], ['visible', 'visible', null], `[${w}] סגירת הכלי לא החזירה את השכבות`);

  // ===== 5. דגלי הדגמה =====
  await load('?area=cap');
  await openTool();
  await draw(AREAS.dense);
  await ready();
  await pick('עגינה והמתנה');
  await sleep(300);
  c = await counts();
  assert.equal(c['עגינה והמתנה'], '31', `[${w}] במקרא תמיד המספר המלא`);
  assert.match(await page.$eval('.area-section-meta', (e) => e.textContent), /מוצגים 20 מתוך 31/);
  assert.equal(await page.evaluate(() => document.querySelectorAll('.area-row').length), 20);
  assert.equal(await pointSum(), 20, `[${w}] נקודות מעל תקרה`);
  await shot('09-cap');

  await load('?area=slow');
  await openTool();
  await draw(AREAS.dense);
  await sleep(700);
  assert.ok(await page.$('.area-act-skel'), `[${w}] אין שלד בטעינה`);
  assert.ok(await page.$('.area-loading .ui-skeleton'), `[${w}] אין שלד טבלה`);
  await shot('10-loading');

  await load('?area=error');
  await openTool();
  await draw(AREAS.dense);
  await page.waitForFunction(() => /לא הצלחנו לטעון את הפעילויות/.test(document.querySelector('.area-panel')?.textContent ?? ''), { timeout: 5000 });
  assert.ok(await page.$('.map-handle'), `[${w}] הפוליגון לא נשמר בשגיאה`);
  assert.ok(await page.evaluate(() => [...document.querySelectorAll('.area-panel button')].some((b) => b.textContent.includes('נסה שוב'))));
  await shot('11-error');

  // ===== 5ב: מדידות שמורות מוסתרות במצב חקירת שטח וחוזרות ביציאה =====
  await load();
  const pickTool = (name) => page.evaluate((n) => [...document.querySelectorAll('.mt-tool')].find((b) => b.textContent.includes(n)).click(), name);
  await pickTool('שטח'); await sleep(200);
  await draw(AREAS.sparse, { close: false }); await page.keyboard.press('Enter'); await sleep(200);
  await draw(AREAS.dense, { close: false }); await page.keyboard.press('Enter'); await sleep(200);
  const drawn = () => page.evaluate(() => window.__seaFeatures().filter((f) => f.properties.t === 'draw').length);
  assert.equal(await drawn(), 2, `[${w}] שתי מדידות שמורות`);
  await openTool();
  await draw(AREAS.uncovered);
  await ready();
  assert.equal(await drawn(), 1, `[${w}] מדידות שמורות לא הוסתרו במצב חקירת שטח`);
  await pickTool('מרחק'); await sleep(300); // מעבר לכלי אחר מסיים את המצב
  assert.equal(await page.$('.area-panel'), null);
  ms = await mapState();
  assert.deepEqual([ms.vis, ms.ring, ms.mask], ['visible', 'visible', false], `[${w}] מעבר לכלי אחר לא החזיר שכבות`);
  assert.equal(await drawn(), 2, `[${w}] המדידות השמורות לא חזרו`);

  // ===== 6. רגרסיה: כלי אחר נשאר 320px ובלי פאנל ניתוח =====
  await load();
  await page.evaluate(() => [...document.querySelectorAll('.mt-tool')].find((b) => b.textContent.includes('מרחק')).click());
  await page.waitForSelector('.mt-panel');
  assert.equal(await page.$('.area-panel'), null);
  assert.equal(await page.$eval('.mt-panel', (e) => Math.round(e.getBoundingClientRect().width)), 320);
  await page.close();
}

await browser.close();
if (problems.length) { console.error('שגיאות קונסולה:\n' + [...new Set(problems)].join('\n')); process.exit(1); }
console.log('area e2e OK', widths.join(','));
