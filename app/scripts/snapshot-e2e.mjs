/**
 * בדיקת דפדפן ל"תמונת מצב" (שלבים 4ד, 4ה) + צילומי מסך. דורשת שרת פיתוח רץ ו-Chrome, ו-puppeteer-core (לא תלות של הפרויקט:
 * `npm i --no-save puppeteer-core`). הרצה: node scripts/snapshot-e2e.mjs [outDir] [widths, למשל 1920,1366,2560]
 * משתני סביבה: BASE (ברירת מחדל http://localhost:5173), CHROME (נתיב ל-chrome.exe).
 * בודק: מצב שגיאה מוצג, "נסה שוב" טוען מחדש, המגירה דוחפת את הדף (לא מכסה את כותרת הכלי) והגלילה נשמרת, ושצילומי טעינה ושגיאה שונים.
 */
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';

const BASE = process.env.BASE ?? 'http://localhost:5173';
const OUT = process.argv[2] ?? 'audit-screenshots/stage4e-snapshot-remove-meta';
const widths = (process.argv[3] ?? '1920').split(',').map(Number);
const KEEP = Number(process.argv[4] ?? widths[0]); // רק רוחב אחד נשמר כצילום
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new' });
const problems = [];
const hashes = {};

for (const w of widths) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: 900 });
  page.on('console', (m) => { if (m.type() === 'error') problems.push(`[${w}] ${m.text()}`); });
  page.on('pageerror', (e) => problems.push(`[${w}] pageerror: ${e.message}`));
  const open = async (path) => {
    await page.goto(BASE + path, { waitUntil: 'networkidle0' });
    await page.waitForSelector('.entity-actions');
    await page.evaluate(() => [...document.querySelectorAll('.entity-actions button')].find((b) => b.textContent.includes('תמונת מצב')).click());
    await page.waitForSelector('.ui-drawer.snapshot');
  };
  const shot = async (name) => {
    if (w !== KEEP) return;
    const file = `${OUT}/${name}-${w}.png`;
    await page.screenshot({ path: file });
    hashes[name] = crypto.createHash('md5').update(fs.readFileSync(file)).digest('hex');
  };

  // 1. דחיפת הדף ושימור גלילה
  await page.goto(`${BASE}/vessels/v4`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('.entity-scroll');
  await page.evaluate(() => { document.querySelector('.entity-scroll').scrollTop = 420; });
  await sleep(200);
  const before = await page.evaluate(() => document.querySelector('.entity-scroll').scrollTop);
  await page.evaluate(() => [...document.querySelectorAll('.entity-actions button')].find((b) => b.textContent.includes('תמונת מצב')).click());
  await page.waitForSelector('.snap-glance'); await sleep(300);
  const geo = await page.evaluate(() => {
    const r = (s) => { const x = document.querySelector(s).getBoundingClientRect(); return { left: x.left, right: x.right }; };
    return { drawer: r('.ui-drawer.snapshot'), entity: r('.entity'), nav: r('.entity-nav'), scroll: document.querySelector('.entity-scroll').scrollTop, doc: document.documentElement.scrollWidth };
  });
  assert.ok(geo.entity.right <= geo.drawer.left + 1 || geo.entity.left >= geo.drawer.right - 1, `[${w}] המגירה מכסה את הדף`);
  assert.ok(geo.doc <= w, `[${w}] גלישה אופקית`);
  // הדף מסתדר מחדש ברוחב הקטן, לכן סטייה קטנה (עיגון גלילה) מותרת; קפיצה גדולה לא`n  assert.ok(Math.abs(geo.scroll - before) <= 40, `[${w}] הגלילה זזה בפתיחה ${before} -> ${geo.scroll}`);
  await shot('01-rich-v4');
  await page.keyboard.press('Escape'); await sleep(300);
  assert.ok(Math.abs(await page.evaluate(() => document.querySelector('.entity-scroll').scrollTop) - before) <= 40, `[${w}] הגלילה זזה בסגירה`);
  assert.equal(await page.evaluate(() => !!document.querySelector('.ui-drawer.snapshot')), false);

  // 2. תוויות לתשומת לב: לחיצה גוללת ומדגישה משפט
  await open('/vessels/v4'); await page.waitForSelector('.snap-label');
  const target = await page.evaluate(() => { document.querySelector('.snap-label').click(); return true; });
  await sleep(700);
  assert.ok(await page.evaluate(() => !!document.querySelector('.snap-sentence.snap-flash')), `[${w}] לחיצה על תווית לא הדגישה משפט`);

  // 3. מקרי דמה
  for (const [name, path] of [['02-critical-util-v7', '/vessels/v7'], ['03-missing-source-v9', '/vessels/v9'], ['04-clean-v5', '/vessels/v5'], ['05-almost-no-data-v10', '/vessels/v10']]) {
    await open(path); await page.waitForSelector('.snap-glance'); await sleep(300); await shot(name);
  }

  // 3ב. שלב 4ה: אין ספירה ואין שורת מקורות בנושאים; הסמן מסביר את עצמו; ה-Popover מפרט מקורות ותאריכים
  await open('/vessels/v4'); await page.waitForSelector('.snap-glance');
  assert.equal(await page.evaluate(() => document.querySelectorAll('.snap-count, .snap-src').length), 0, `[${w}] נשארו ספירה או שורת מקורות בנושא`);
  assert.ok(await page.evaluate(() => [...document.querySelectorAll('.snap-mark')].length > 0 && [...document.querySelectorAll('.snap-mark')].every((e) => e.getAttribute('aria-label') === 'לתשומת לב')), 'סמן בלי aria-label');
  await page.evaluate(() => document.querySelector('.snap-cov').click());
  await page.waitForSelector('.snap-sources');
  const pop = await page.evaluate(() => document.querySelector('.snapshot .ui-pop').innerText);
  assert.match(pop, /בעלות וניהול\s+עודכן 2026-11-18/); assert.ok(!/מקור [אבג]/.test(pop));
  await shot('08-sources-popover');
  await page.evaluate(() => document.querySelector('.snapshot .ui-pop a.link').click());
  await sleep(300);
  assert.equal(await page.evaluate(() => !!document.querySelector('.snapshot .ui-pop')), false, 'ה-Popover לא נסגר אחרי קישור');
  await open('/vessels/v9'); await page.waitForSelector('.snap-glance');
  await page.evaluate(() => document.querySelector('.snap-cov').click()); await page.waitForSelector('.snap-sources'); await shot('09-sources-popover-missing-v9');
  // 4. טעינה ושגיאה (ממתינים לרכיב בתוך המגירה, לא לאלמנט כללי בדף)
  await open('/vessels/v4?snapshot=slow'); await page.waitForSelector('.snapshot .snap-skel'); await shot('06-loading');
  await open('/vessels/v4?snapshot=error'); await page.waitForSelector('.snapshot .ui-state[role=alert]'); await sleep(200);
  const errText = await page.evaluate(() => document.querySelector('.snapshot .ui-state').innerText);
  assert.match(errText, /הפקת תמונת המצב נכשלה/); assert.match(errText, /נסה שוב/);
  await shot('07-error');

  // 5. "נסה שוב" טוען מחדש (כשל בפעם הראשונה בלבד)
  await open('/vessels/v4?snapshot=error-once'); await page.waitForSelector('.snapshot .ui-state[role=alert]');
  await page.evaluate(() => [...document.querySelectorAll('.snapshot .ui-state button')].find((b) => b.textContent.includes('נסה שוב')).click());
  await page.waitForSelector('.snapshot .snap-glance', { timeout: 5000 });
  assert.equal(await page.evaluate(() => !!document.querySelector('.snapshot .ui-state[role=alert]')), false, `[${w}] "נסה שוב" לא טען מחדש`);
  await page.close();
}
await browser.close();

if (Object.keys(hashes).length) {
  assert.notEqual(hashes['06-loading'], hashes['07-error'], 'צילומי טעינה ושגיאה זהים');
  const vals = Object.values(hashes);
  assert.equal(new Set(vals).size, vals.length, 'יש צילומים זהים בית לבית');
}
console.log(problems.length ? `console errors:\n${problems.join('\n')}` : 'no console errors');
console.log('snapshot e2e OK');
