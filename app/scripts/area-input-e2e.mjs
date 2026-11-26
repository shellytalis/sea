/**
 * בדיקת דפדפן לשני אופני הקלט של "חקירת שטח" (שלב 5ג) + צילומי מסך. דורשת שרת פיתוח רץ ו-Chrome ו-puppeteer-core
 * (`npm i --no-save puppeteer-core`). הרצה: node scripts/area-input-e2e.mjs [outDir] [widths, למשל 1366,1920]
 * שלב 5ד: בזמן שרטוט הפאנל מינימלי (בורר אופן קלט בלבד, בלי הנחיה, בלי "נקודות: N", בלי שורת פעולות), ההנחיה רק בשורה הצפה, אחרי סגירה אין בורר ויש "עריכת נקודות".
 * בודקת: מצב ריק בלי כפתורים, שלוש הנחיות בשורה הצפה, ביטול נקודה במקלדת, רשימה משותפת בין האופנים (נקודה שנדקרה ברשימה,
 * נקודה שהוקלדה במפה), שגיאה בשורה, "הצגה על המפה" מושבת עם סיבה ואין ניתוח לפני הלחיצה, הדבקת רשימה (12 שורות, 2 שגויות),
 * מעל 50 נקודות, פוליגון חוצה, עדכון אחרי סגירה, ושורת פעולות (ייצוא CSV ונקה, בלי העתק).
 */
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import assert from 'node:assert/strict';

const BASE = process.env.BASE ?? 'http://localhost:5173';
const OUT = process.argv[2] ?? 'audit-screenshots/stage5c-area-input';
const widths = (process.argv[3] ?? '1366,1920').split(',').map(Number);
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new' });
const problems = [];
const DENSE = [[34.4, 32.55], [35.05, 32.55], [35.05, 33.1], [34.4, 33.1]];

for (const w of widths) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: 900 });
  page.on('console', (m) => { if (m.type() === 'error') problems.push(`[${w}] ${m.text()}`); });
  page.on('pageerror', (e) => problems.push(`[${w}] pageerror: ${e.message}`));
  const shot = async (name) => { for (let i = 0; i < 3; i++) { try { await page.screenshot({ path: `${OUT}/${name}-${w}.png` }); return; } catch { await sleep(500); } } };
  const load = async () => {
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle0' });
    await page.waitForFunction(() => !!window.__seaMap && document.querySelector('.mt-bar'));
    await sleep(500);
    await page.evaluate(() => [...document.querySelectorAll('.mt-tool')].find((b) => b.textContent.includes('חקירת שטח')).click());
    await page.waitForSelector('.area-panel');
    await page.evaluate((pts) => {
      const lons = pts.map((p) => p[0]); const lats = pts.map((p) => p[1]);
      window.__seaMap.fitBounds([[Math.min(...lons), Math.min(...lats)], [Math.max(...lons), Math.max(...lats)]], { padding: { top: 150, bottom: 150, left: 640, right: 120 }, duration: 0, maxZoom: 12 });
    }, DENSE);
    await sleep(900);
  };
  const pts = () => page.evaluate((poly) => poly.map((p) => { const m = window.__seaMap; const q = m.project(p); const r = m.getContainer().getBoundingClientRect(); return [r.left + q.x, r.top + q.y]; }), DENSE);
  const click = async (i, P) => { await page.mouse.click(P[i][0], P[i][1]); await sleep(150); };
  const guide = () => page.$eval('.mt-hint-long', (e) => e.textContent);
  const rows = () => page.$$eval('.area-point-row', (l) => l.map((r) => [...r.querySelectorAll('input')].map((i) => i.value)));
  const handles = () => page.$$eval('.map-handle', (l) => l.length);
  const mode = (id) => page.evaluate((i) => document.querySelector(`[data-mode=${i}]`).click(), id);
  const typeCell = async (label, text) => { const el = await page.$(`input[aria-label="${label}"]`); await el.focus(); await page.keyboard.down('Control'); await page.keyboard.press('a'); await page.keyboard.up('Control'); await page.keyboard.press('Backspace'); await el.type(text); };
  const showBtn = () => page.evaluate(() => { const b = [...document.querySelectorAll('.area-show button')][0]; return { text: b?.textContent, disabled: b?.disabled, note: document.querySelector('.area-show .mt-note')?.textContent ?? '' }; });

  // ===== 1. מצב ריק =====
  await load();
  assert.equal(await page.$('.area-panel .panel-foot'), null, `[${w}] שורת פעולות במצב ריק`);
  assert.ok(!(await page.$eval('.area-panel', (e) => e.textContent)).includes('העתק'), `[${w}] כפתור העתק`);
  assert.equal(await page.$eval('[data-mode=click]', (e) => e.getAttribute('aria-checked')), 'true', `[${w}] ברירת מחדל דקירה`);
  assert.equal(await page.$eval('.area-modeseg', (e) => e.getAttribute('role')), 'radiogroup');
  assert.equal(await guide(), 'לחץ על המפה בפינה הראשונה של האזור', `[${w}] הנחיה 0 נקודות (שורה צפה)`);
  const minimal = async (label) => {
    const txt = await page.$eval('.area-panel', (e) => e.textContent);
    assert.ok(!/לחץ על המפה|המשך ללחוץ|כדי לסיים/.test(txt), `[${w}] ${label}: הנחיה בפאנל`);
    assert.ok(!/נקודות:|בטל נקודה אחרונה/.test(txt), `[${w}] ${label}: ספירה או "בטל נקודה אחרונה" בפאנל`);
    assert.equal(await page.$('.area-panel .panel-foot'), null, `[${w}] ${label}: שורת פעולות בזמן שרטוט`);
    assert.equal(await page.$('.area-guide'), null);
  };
  await minimal('0 נקודות');  await shot('01-empty-no-actions');

  // ===== 2. הנחיות בדקירה: 0 / 2 / 3 נקודות =====
  const P = await pts();
  await click(0, P); await click(1, P);
  assert.equal(await guide(), 'המשך ללחוץ על פינות האזור לפי הסדר. נדרשות לפחות 3 נקודות · Backspace: ביטול נקודה', `[${w}] הנחיה 1-2`);
  await minimal('2 נקודות');
  await shot('02-click-2-points');
  await click(2, P);
  assert.equal(await guide(), 'כדי לסיים, לחץ שוב על הנקודה הראשונה או לחץ פעמיים על הנקודה האחרונה · Backspace: ביטול נקודה', `[${w}] הנחיה 3+`);
  assert.ok(await page.$('.map-handle.closable'), `[${w}] הנקודה הראשונה לא מודגשת`);
  await minimal('3 נקודות');
  await shot('03-click-3-points');
  // ביטול נקודה אחרונה: במקלדת בלבד (Backspace, Ctrl+Z)
  await page.keyboard.press('Backspace'); await sleep(150);
  assert.equal(await handles(), 2, `[${w}] Backspace`);
  await click(2, P);
  await page.keyboard.down('Control'); await page.keyboard.press('z'); await page.keyboard.up('Control'); await sleep(150);
  assert.equal(await handles(), 2, `[${w}] Ctrl+Z`);
  await click(2, P);

  // ===== 3. רשימה משותפת: נקודות שנדקרו מופיעות בהזנה הידנית =====
  await mode('manual');
  await sleep(200);
  let r = await rows();
  assert.equal(r.filter((x) => x[0]).length, 3, `[${w}] נקודות שנדקרו לא ברשימה: ${JSON.stringify(r)}`);
  assert.match(r[0][0], /° N$/);
  assert.match(r[0][1], /° E$/);
  assert.equal(await page.$eval('.area-modeseg [aria-checked=true]', (e) => e.dataset.mode), 'manual');
  assert.equal(await handles(), 3, `[${w}] נקודות במפה`);
  // נקודה שהוקלדה מופיעה במפה (4 נקודות)
  await typeCell('קו רוחב, נקודה 4', "33°06' N"); await typeCell('קו אורך, נקודה 4', '34,4'); await page.keyboard.press('Tab'); await sleep(250);
  r = await rows();
  assert.equal(r[3][0], '33.100° N', `[${w}] תצוגה אחרי עזיבת שדה`);
  assert.equal(r[3][1], '34.400° E');
  assert.equal(await handles(), 4, `[${w}] נקודה שהוקלדה לא הופיעה במפה`);
  assert.equal(await page.$('.area-panel .panel-foot'), null, `[${w}] שורת פעולות בזמן שרטוט בהזנה ידנית`);
  assert.equal((await page.$$('.area-legend')).length, 0, `[${w}] ניתוח רץ לפני "הצגה על המפה"`);
  let sb = await showBtn();
  assert.deepEqual([sb.text, sb.disabled], ['הצגה על המפה', false]);
  await shot('04-manual-list');

  // שגיאה בשורה: נקודה אחת תקינה ואחת שגויה
  await typeCell('קו רוחב, נקודה 5', '95'); await typeCell('קו אורך, נקודה 5', 'abc'); await page.keyboard.press('Tab'); await sleep(250);
  const err = await page.$eval('.area-point-err', (e) => e.textContent);
  assert.match(err, /קו רוחב חייב להיות בין 90- ל-90\./);
  assert.match(err, /לא זוהה פורמט\. דוגמה: 34°42\.6' N/);
  assert.equal(await page.$eval('input[aria-label="קו רוחב, נקודה 5"]', (e) => e.getAttribute('aria-invalid')), 'true');
  assert.equal(await page.$eval('input[aria-label="קו רוחב, נקודה 1"]', (e) => e.getAttribute('aria-invalid')), null, `[${w}] השדה התקין סומן`);
  sb = await showBtn();
  assert.deepEqual([sb.disabled, sb.note], [true, 'תקן את הנקודות המסומנות'], `[${w}] סיבת ההשבתה`);
  assert.equal(await handles(), 4, `[${w}] שורה שגויה נכנסה לפוליגון`);
  await shot('05-manual-error');
  await typeCell('קו רוחב, נקודה 5', '33.2'); await typeCell('קו אורך, נקודה 5', '34.5');
  assert.equal(await page.$eval('body', () => document.querySelector('.area-point-err')?.textContent ?? null), null, `[${w}] ההודעה לא נעלמה כשהערך תקין`);
  // מחיקת שורה
  await page.click('button[aria-label="מחק נקודה 5"]'); await sleep(200);
  assert.equal((await rows()).filter((x) => x[0]).length, 4);

  // ===== 4. "הצגה על המפה" מושבת עם פחות מ-3 =====
  // Esc מוחק את השרטוט (בלי כפתור נקה בזמן שרטוט): קודם משחררים פוקוס משדה
  await page.evaluate(() => document.activeElement?.blur()); await page.keyboard.press('Escape'); await sleep(300);
  assert.ok(await page.$('.area-panel'), `[${w}] Esc סגר את הכלי`);
  assert.equal((await rows()).filter((x) => x[0]).length, 0, `[${w}] Esc לא מחק את השרטוט`);
  assert.equal(await page.$eval('[data-mode=manual]', (e) => e.getAttribute('aria-checked')), 'true', `[${w}] Esc שינה אופן קלט`);
  sb = await showBtn();
  assert.deepEqual([sb.disabled, sb.note], [true, 'נדרשות עוד 3 נקודות']);
  await typeCell('קו רוחב, נקודה 1', '32.55'); await typeCell('קו אורך, נקודה 1', '34.40'); await page.keyboard.press('Tab');
  await typeCell('קו רוחב, נקודה 2', '32.55 N'); await typeCell('קו אורך, נקודה 2', '35.05 E'); await page.keyboard.press('Tab');
  sb = await showBtn();
  assert.equal(sb.note, 'נדרשות עוד 1 נקודות');
  assert.match(await page.$eval('.area-points-status', (e) => e.textContent), /2 נקודות · נדרשות לפחות 3/);

  // ===== 5. הדבקת רשימה: 12 שורות, 2 שגויות =====
  await page.evaluate(() => [...document.querySelectorAll('.area-manual-links button')].find((b) => b.textContent.includes('הדבקת רשימה')).click());
  await page.waitForSelector('.area-paste-text');
  const lines = Array.from({ length: 12 }, (_, i) => `${32.6 + i * 0.04}, ${34.5 + i * 0.04}`);
  lines[3] = 'לא קואורדינטה'; lines[9] = '100, 34.5';
  await page.type('.area-paste-text', lines.join('\n'));
  await page.evaluate(() => [...document.querySelectorAll('.area-paste button')][0].click()); await sleep(300);
  const errs = await page.$$eval('.area-paste-errors li', (l) => l.map((e) => e.textContent));
  assert.equal(errs.length, 2, `[${w}] שגיאות הדבקה: ${errs}`);
  assert.match(errs[0], /שורה\s*4/);
  assert.match(errs[1], /שורה\s*10/);
  assert.equal((await rows()).filter((x) => x[0]).length, 12, `[${w}] 2 קיימות + 10 מודבקות`);
  assert.equal(await page.$eval('.area-paste-text', (e) => e.value.split('\n').length), 2, `[${w}] רק השורות השגויות נשארו`);
  await shot('06-paste-errors');

  // ===== 6. הצגה על המפה: סוגר ומריץ ניתוח; עדכון =====
  // השורות השגויות הן שורות שהודבקו ונכשלו: הן לא נכנסו לרשימה, ולכן "הצגה על המפה" פעיל
  sb = await showBtn();
  assert.deepEqual([sb.text, sb.disabled], ['הצגה על המפה', false], `[${w}] ${JSON.stringify(sb)}`);
  await page.evaluate(() => [...document.querySelectorAll('.area-show button')][0].click());
  await page.waitForFunction(() => document.querySelectorAll('.area-act-count').length === 6 && !document.querySelector('.area-act-skel'), { timeout: 8000 });
  assert.ok(await page.$('.area-panel.wide'), `[${w}] הפאנל לא הורחב`);
  // 5ד: אחרי סגירה אין בורר אופן קלט; יש קישור "עריכת נקודות", ושורת הפעולות נשארת
  assert.equal(await page.$('.area-modeseg'), null, `[${w}] הבורר נשאר אחרי סגירה`);
  assert.match(await page.$eval('.area-edit-link', (e) => e.textContent), /עריכת נקודות/);
  assert.equal(await page.$('.area-points'), null);
  const foot = await page.$eval('.area-panel .panel-foot', (e) => [...e.querySelectorAll('button')].map((b) => b.textContent.trim()));
  assert.deepEqual(foot, ['ייצוא CSV', 'נקה'], `[${w}] שורת פעולות אחרי סגירה`);
  await shot('07-closed-no-selector');
  // מסך "עריכת נקודות": במקום הלשוניות והמקרא, עם "חזרה לתוצאות" ו"עדכון"; הניתוח לא רץ מחדש עד הלחיצה
  await page.click('.area-edit-link');
  await page.waitForSelector('.area-points');
  assert.equal(await page.$('.area-legend'), null, `[${w}] המקרא נשאר במסך העריכה`);
  assert.equal(await page.$('.area-tabs'), null, `[${w}] הלשוניות נשארו במסך העריכה`);
  assert.equal(await page.$('.area-panel.wide'), null, `[${w}] הפאנל נשאר רחב במסך העריכה`);
  assert.match(await page.$eval('.area-edit-head', (e) => e.textContent), /חזרה לתוצאות.*עריכת נקודות|עריכת נקודות.*חזרה לתוצאות/);
  assert.equal((await showBtn()).text, 'עדכון');
  await shot('08-edit-points');
  const before = (await rows())[0].join('|');
  await typeCell('קו רוחב, נקודה 1', '32.552'); await page.keyboard.press('Tab');
  assert.equal(await page.$('.area-act-skel'), null, `[${w}] ניתוח רץ לפני "עדכון"`);
  // חזרה לתוצאות בלי עדכון: העריכה נזרקת
  await page.evaluate(() => [...document.querySelectorAll('.area-edit-head button')][0].click());
  await page.waitForSelector('.area-legend');
  await page.click('.area-edit-link'); await page.waitForSelector('.area-points');
  assert.equal((await rows())[0].join('|'), before, `[${w}] עריכה שלא אושרה לא נזרקה`);
  // עריכה ו"עדכון": חוזרים לתוצאות והניתוח רץ מחדש
  await typeCell('קו רוחב, נקודה 1', '32.552'); await page.keyboard.press('Tab');
  await page.evaluate(() => [...document.querySelectorAll('.area-show button')][0].click());
  await page.waitForFunction(() => document.querySelectorAll('.area-act-count').length === 6 && !document.querySelector('.area-act-skel'), { timeout: 8000 });
  assert.ok(await page.$('.area-edit-link'), `[${w}] לא חזרנו לתוצאות אחרי עדכון`);
  assert.equal(await page.$('.area-points'), null);
  // ===== 7. פוליגון חוצה, מעל 50 נקודות =====
  await load();
  await mode('manual');
  const bow = [[34.4, 32.55], [35.05, 33.1], [35.05, 32.55], [34.4, 33.1]];
  await page.click('.area-paste-text').catch(() => {});
  await page.evaluate(() => [...document.querySelectorAll('.area-manual-links button')].find((b) => b.textContent.includes('הדבקת רשימה')).click());
  await page.waitForSelector('.area-paste-text');
  await page.type('.area-paste-text', bow.map(([lo, la]) => `${la}, ${lo}`).join('\n'));
  await page.evaluate(() => [...document.querySelectorAll('.area-paste button')][0].click()); await sleep(250);
  await page.evaluate(() => [...document.querySelectorAll('.area-show button')][0].click()); await sleep(300);
  assert.match(await page.$eval('.area-panel [role=alert]', (e) => e.textContent), /חוצות/, `[${w}] אין הודעת חיתוך`);
  assert.equal(await page.$('.area-legend'), null, `[${w}] פוליגון חוצה נסגר`);
  await shot('08-self-intersect');
  await page.evaluate(() => document.activeElement?.blur()); await page.keyboard.press('Escape'); await sleep(250);
  await page.waitForSelector('.area-paste-text');
  await page.click('.area-paste-text', { clickCount: 3 }); await page.keyboard.press('Backspace');
  await page.type('.area-paste-text', Array.from({ length: 63 }, (_, i) => `${20 + (i % 40) * 0.5}, ${10 + i * 0.5}`).join('\n'));
  await page.evaluate(() => [...document.querySelectorAll('.area-paste button')][0].click()); await sleep(300);
  assert.equal((await rows()).filter((x) => x[0]).length, 50, `[${w}] מעל 50`);
  assert.match(await page.$eval('.area-panel .mt-note[role=status]', (e) => e.textContent), /נקלטו 50 מתוך 63 נקודות/);
  await shot('09-over-50');
  await page.close();
}

await browser.close();
if (problems.length) { console.error('שגיאות קונסולה:\n' + [...new Set(problems)].join('\n')); process.exit(1); }
console.log('area input e2e OK', widths.join(','));
