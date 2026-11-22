/**
 * בדיקת דפדפן ל"תמונת מצב" (כרטיס צף, שלב 4ו) + צילומי מסך. דורשת שרת פיתוח רץ ו-Chrome, ו-puppeteer-core (לא תלות של הפרויקט:
 * `npm i --no-save puppeteer-core`). הרצה: node scripts/snapshot-e2e.mjs [outDir] [widths, למשל 1920,1366]
 * משתני סביבה: BASE (ברירת מחדל http://localhost:5173), CHROME (נתיב ל-chrome.exe).
 * בודק: פריסת הדף לא משתנה בפתיחה (רוחב ומיקום זהים, גלילה במקום), אין סמן במשפטים, לחיצה על תווית גוללת ומדגישה,
 * סגירה ב-Escape / לחיצה בחוץ / X והמיקוד חוזר לכפתור, "לפרטים" סוגר וגולל, מצב שגיאה ו"נסה שוב", ושצילומים אינם זהים.
 */
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';

const BASE = process.env.BASE ?? 'http://localhost:5173';
const OUT = process.argv[2] ?? 'audit-screenshots/stage4g-snapshot-card-polish';
const widths = (process.argv[3] ?? '1920,1366').split(',').map(Number);
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new' });
const problems = [];
const hashes = {};

for (const w of widths) {
  const ctx = browser.defaultBrowserContext(); await ctx.overridePermissions(BASE, ['clipboard-read', 'clipboard-write', 'clipboard-sanitized-write']);
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: 900 });
  page.on('console', (m) => { if (m.type() === 'error') problems.push(`[${w}] ${m.text()}`); });
  page.on('pageerror', (e) => problems.push(`[${w}] pageerror: ${e.message}`));
  const clickBtn = () => page.evaluate(() => [...document.querySelectorAll('.entity-actions button')].find((b) => b.textContent.includes('תמונת מצב')).click());
  const load = async (path) => { await page.goto(BASE + path, { waitUntil: 'networkidle0' }); await page.waitForSelector('.entity-actions'); };
  const open = async (path) => { await load(path); await clickBtn(); await page.waitForSelector('.snap-card'); };
  const gone = () => page.evaluate(() => !document.querySelector('.snap-card'));
  const shot = async (name) => {
    const file = `${OUT}/${name}-${w}.png`;
    await page.screenshot({ path: file });
    hashes[`${name}-${w}`] = crypto.createHash('md5').update(fs.readFileSync(file)).digest('hex');
  };
  const layout = () => page.evaluate(() => {
    const r = (e) => { const x = e.getBoundingClientRect(); return [x.left, x.top, x.width, x.height].map(Math.round); };
    return {
      entity: r(document.querySelector('.entity')), nav: r(document.querySelector('.entity-nav')), head: r(document.querySelector('.entity-head')),
      tables: [...document.querySelectorAll('.ui-table-scroll')].slice(0, 3).map(r), scroll: document.querySelector('.entity-scroll').scrollTop, doc: document.documentElement.scrollWidth,
    };
  });
  const activeIsBtn = () => page.evaluate(() => !!document.activeElement?.closest('.entity-actions') && document.activeElement.textContent.includes('תמונת מצב'));

  // 1. הדף לא זז: אותה פריסה לפני ואחרי הפתיחה (גם כשהדף גלול), וכותרת הכלי לא מכוסה
  await load('/vessels/v4');
  await page.evaluate(() => { document.querySelector('.entity-scroll').scrollTop = 300; });
  await sleep(300);
  const before = await layout();
  await shot('00-page-before');
  await clickBtn(); await page.waitForSelector('.snap-glance'); await sleep(400);
  const after = await layout();
  assert.deepEqual(after, before, `[${w}] פריסת הדף השתנתה בפתיחת הכרטיס`);
  assert.ok(after.doc <= w, `[${w}] גלישה אופקית`);
  const card = await page.evaluate(() => {
    const c = document.querySelector('.snap-card'), x = c.getBoundingClientRect();
    const b = [...document.querySelectorAll('.entity-actions button')].find((e) => e.textContent.includes('תמונת מצב')).getBoundingClientRect();
    const s = document.querySelector('.snap-card-body');
    return { top: x.top, left: x.left, right: x.right, bottom: x.bottom, width: x.width, btnBottom: b.bottom, btnRight: b.right, headBottom: Math.max(...[...document.querySelector('.entity-head').querySelectorAll('h1, .entity-meta, .entity-badges, .entity-actions, .ui-btn, .ui-chip, .entity-badges *')].map((e) => e.getBoundingClientRect().bottom)), scrollable: s.scrollHeight > s.clientHeight, role: c.getAttribute('role'), modal: c.getAttribute('aria-modal'), focused: document.activeElement === c };
  });
  // יישור: קצה ההתחלה (ימין ב-RTL) של הכרטיס = קצה ההתחלה של הכפתור (אלא אם הוצמד לקצה החלון), והכרטיס לא מכסה אף רכיב בכותרת הדף
  assert.ok(Math.abs(card.right - card.btnRight) <= 1 || card.left <= 24.5 || card.right >= w - 24.5, `[${w}] הכרטיס לא מיושר לקצה הכפתור (${card.right} מול ${card.btnRight})`);
  assert.ok(card.top >= card.headBottom, `[${w}] הכרטיס מכסה רכיב בכותרת הדף`);
  assert.ok(card.top >= card.btnBottom, `[${w}] הכרטיס מכסה את שורת הכפתורים`);
  assert.ok(card.left >= 24 && card.right <= w - 24, `[${w}] הכרטיס חורג מהחלון`);
  assert.ok(card.bottom <= 900 - 24 + 1, `[${w}] הכרטיס חורג מתחתית החלון`);
  assert.equal(Math.round(card.width), Math.min(600, w - 48));
  assert.equal(card.role, 'dialog'); assert.equal(card.modal, null); assert.ok(card.focused, `[${w}] המיקוד לא נכנס לכרטיס`);
  // כפתורי הפעולה בכותרת הכרטיס (aria-label, בסדר העתקה, PDF, סגירה מימין לשמאל), והתחתית בשורה אחת בלי כפתורים
  const head = await page.evaluate(() => [...document.querySelectorAll('.snap-card > header button')].map((b) => ({ label: b.getAttribute('aria-label'), x: b.getBoundingClientRect().left, text: b.textContent.trim() })));
  assert.deepEqual(head.map((b) => b.label), ['העתק טקסט', 'ייצא PDF', 'סגור']);
  assert.ok(head[0].x > head[1].x && head[1].x > head[2].x, `[${w}] סדר הכפתורים בכותרת לא תקין (מימין לשמאל: העתקה, PDF, סגירה)`);
  assert.ok(head.every((b) => b.text === ''), `[${w}] יש תווית טקסט בכפתור אייקון`);
  const foot = await page.evaluate(() => { const f = document.querySelector('.snap-card > footer'); return { h: f.getBoundingClientRect().height, buttons: [...f.querySelectorAll('button:not(.snap-cov)')].length, text: f.innerText.replace(/\s+/g, ' ').trim() }; });
  assert.ok(foot.h <= 40, `[${w}] התחתית גבוהה מדי: ${foot.h}`); assert.equal(foot.buttons, 0);
  assert.match(foot.text, /^נתונים מ-7 מתוך 7 מקורות · הופק 2026-11-22$/);
  // תוויות כקישורים: תגי a, בלי מסגרת, בצבע הקישור הקיים, מופרדות ב-"·"
  const lab = await page.evaluate(() => { const a = [...document.querySelectorAll('.snap-label')]; const cs = getComputedStyle(a[0]); const link = getComputedStyle(document.querySelector('.snap-details')); return { n: a.length, tags: [...new Set(a.map((x) => x.tagName))], border: cs.borderTopWidth, bg: cs.backgroundColor, color: cs.color, linkColor: link.color, seps: document.querySelectorAll('.snap-sep').length }; });
  assert.deepEqual(lab.tags, ['A']); assert.equal(lab.border, '0px'); assert.equal(lab.color, lab.linkColor); assert.equal(lab.seps, lab.n - 1);
  assert.equal(lab.bg, 'rgba(0, 0, 0, 0)');
  await shot('01-rich-v4-page-after');
  // העתקה: האייקון מוחלף ל-✓ ל-1.5 שניות והכרטיס נשאר פתוח
  await page.evaluate(() => document.querySelector('.snap-card > header button[aria-label="העתק טקסט"]').click());
  await page.waitForSelector('.snap-card > header button[data-copied]', { timeout: 3000 });
  assert.ok(await page.evaluate(() => !!document.querySelector('.snap-card > header button[aria-label="הועתק"]')), `[${w}] אין משוב אחרי העתקה`);
  assert.ok(!(await gone()), `[${w}] הכרטיס נסגר בהעתקה`);
  await shot('02-after-copy');
  await sleep(1900);
  assert.ok(await page.evaluate(() => !document.querySelector('.snap-card > header button[data-copied]')), `[${w}] משוב ההעתקה לא חזר`);
  console.log(`[${w}] card ${Math.round(card.width)}x${Math.round(card.bottom - card.top)} top=${Math.round(card.top)} bodyScrolls=${card.scrollable}`);

  // 2. אין סמן במשפטים; לחיצה על תווית גוללת (בתוך הכרטיס) ומדגישה, ואחרי 2 שניות חוזר
  assert.equal(await page.evaluate(() => document.querySelectorAll('.snap-mark, .snap-gutter, .snap-sentence svg').length), 0, `[${w}] נשאר סמן במשפט`);
  await page.evaluate(() => [...document.querySelectorAll('.snap-label')].at(-1).click());
  await sleep(600);
  assert.ok(await page.evaluate(() => !!document.querySelector('.snap-sentence.snap-hl')), `[${w}] התווית לא הדגישה משפט`);
  assert.equal(await page.evaluate(() => document.querySelector('.entity-scroll').scrollTop), before.scroll, `[${w}] לחיצה על תווית גללה את הדף`);
  await sleep(2000);
  assert.equal(await page.evaluate(() => !!document.querySelector('.snap-sentence.snap-hl')), false, `[${w}] ההדגשה לא נעלמה`);

  // 3. סגירה: Escape, לחיצה בחוץ, X, והכפתור עצמו; המיקוד חוזר לכפתור והפריסה זהה
  await page.keyboard.press('Escape'); await sleep(250);
  assert.ok(await gone(), `[${w}] Escape לא סגר`);
  assert.ok(await activeIsBtn(), `[${w}] המיקוד לא חזר לכפתור אחרי Escape`);
  assert.deepEqual(await layout(), before, `[${w}] הפריסה השתנתה אחרי סגירה`);
  await clickBtn(); await page.waitForSelector('.snap-card');
  const h1 = await page.evaluate(() => { const r = document.querySelector('.entity-head h1').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
  await page.mouse.click(h1[0], h1[1]); await sleep(250);   // לחיצה על שם הכלי, מחוץ לכרטיס
  assert.ok(await gone(), `[${w}] לחיצה בחוץ לא סגרה`);
  assert.ok(await activeIsBtn(), `[${w}] המיקוד לא חזר לכפתור אחרי לחיצה בחוץ`);
  await clickBtn(); await page.waitForSelector('.snap-card');
  await page.evaluate(() => document.querySelector('.snap-card > header button[aria-label="סגור"]').click()); await sleep(250);
  assert.ok(await gone(), `[${w}] X לא סגר`);
  assert.ok(await activeIsBtn(), `[${w}] המיקוד לא חזר לכפתור אחרי X`);
  await clickBtn(); await page.waitForSelector('.snap-card'); await sleep(200);
  await clickBtn(); await sleep(250);
  assert.ok(await gone(), `[${w}] הכפתור לא החליף מצב`);

  // 4. "לפרטים" סוגר את הכרטיס, גולל לסעיף ומדגיש אותו
  await open('/vessels/v4'); await page.waitForSelector('.snap-details');
  await page.evaluate(() => [...document.querySelectorAll('.snap-details')].find((a) => a.closest('section').getAttribute('aria-label') === 'בעלות וניהול').click());
  await sleep(900);
  assert.ok(await gone(), `[${w}] "לפרטים" לא סגר`);
  assert.ok(await page.evaluate(() => !!document.querySelector('#ownership.snap-flash')), `[${w}] הסעיף לא הודגש`);

  // 5. Popover המקורות (Escape סוגר אותו ולא את הכרטיס), ושאר מקרי הדמה
  await open('/vessels/v4'); await page.waitForSelector('.snap-cov');
  await page.evaluate(() => document.querySelector('.snap-cov').click()); await page.waitForSelector('.snap-sources');
  assert.match(await page.evaluate(() => document.querySelector('.snap-card .ui-pop').innerText), /בעלות וניהול\s+עודכן 2026-11-18/);
  await shot('03-sources-popover-v4');
  await page.keyboard.press('Escape'); await sleep(250);
  assert.ok(!(await gone()), `[${w}] Escape סגר את הכרטיס ולא רק את ה-Popover`);
  for (const [name, path] of [['02-lean-v10', '/vessels/v10'], ['03-missing-source-v9', '/vessels/v9']]) {
    await open(path); await page.waitForSelector('.snap-glance'); await sleep(300); await shot(name);
  }

  // 6. טעינה ושגיאה, ו"נסה שוב"
  await open('/vessels/v4?snapshot=slow'); await page.waitForSelector('.snap-card .snap-skel'); await shot('05-loading');
  await open('/vessels/v4?snapshot=error'); await page.waitForSelector('.snap-card .ui-state[role=alert]'); await sleep(200);
  assert.match(await page.evaluate(() => document.querySelector('.snap-card .ui-state').innerText), /הפקת תמונת המצב נכשלה[\s\S]*נסה שוב/);
  await shot('06-error');
  await open('/vessels/v4?snapshot=error-once'); await page.waitForSelector('.snap-card .ui-state[role=alert]');
  await page.evaluate(() => [...document.querySelectorAll('.snap-card .ui-state button')].find((b) => b.textContent.includes('נסה שוב')).click());
  await page.waitForSelector('.snap-card .snap-glance', { timeout: 5000 });
  await page.close();
}
await browser.close();

const vals = Object.values(hashes);
assert.equal(new Set(vals).size, vals.length, 'יש צילומים זהים בית לבית');
console.log(problems.length ? `console errors:\n${problems.join('\n')}` : 'no console errors');
console.log('snapshot e2e OK');
