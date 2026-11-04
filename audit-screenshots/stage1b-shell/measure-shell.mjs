import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--no-sandbox'] });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const fails = []; const log = [];
const check = (name, ok, detail) => { if (!ok) fails.push(`${name} :: ${JSON.stringify(detail)}`); };
const types = encodeURIComponent('בעלים רשום|מפעיל');

for (const w of [1366, 1920, 2560]) {
  const p = await b.newPage();
  await p.setViewport({ width: w, height: w === 1366 ? 768 : w === 2560 ? 1440 : 1080 });
  // שעון מזויף: 12:23:58 כדי לבדוק עדכון בתחילת הדקה
  await p.evaluateOnNewDocument(() => {
    try { localStorage.setItem('sea-theme', 'dark'); } catch {}
    const RealDate = Date; const target = new RealDate('2026-11-04T10:23:50Z').getTime(); const off = target - RealDate.now();
    globalThis.Date = class extends RealDate { constructor(...a) { if (a.length) super(...a); else super(RealDate.now() + off); } static now() { return RealDate.now() + off; } };
  });
  const go = async u => { await p.goto('http://localhost:5173' + u, { waitUntil: 'networkidle2' }); await sleep(900); };
  const t = `[${w}]`;
  const overflow = () => p.evaluate(() => [...document.querySelectorAll('html, body, #root, .shell, .toolbar, .main, .cs, .entity, .entity-scroll, .ui-table-block, .ui-table-scroll')]
    .filter(e => e.scrollWidth > e.clientWidth + 1).map(e => `${e.className || e.tagName}:${e.scrollWidth}>${e.clientWidth}`));

  // ===== toolbar =====
  await go('/companies');
  const tb = await p.evaluate(() => {
    const bar = document.querySelector('.toolbar').getBoundingClientRect();
    const cy = (e) => { const r = e.getBoundingClientRect(); return Math.round(r.top + r.height / 2); };
    const items = ['.brand', '.page-title, .breadcrumb', '.search', '.clock', '.tb-end .user', '.company-logo', ...[...document.querySelectorAll('.tb-end .ui-btn')].map((_, i) => `.tb-end .ui-tip:nth-of-type(${i + 1}) .ui-btn`)]
      .map(s => document.querySelector(s)).filter(Boolean);
    const btns = [...document.querySelectorAll('.tb-end .ui-btn')].map(e => { const r = e.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), icon: Math.round(e.querySelector('svg').getBoundingClientRect().width) }; });
    const gaps = [...document.querySelectorAll('.tb-end > *')].slice(1).map((e, i, a) => 0);
    const rail = document.querySelector('.rail').getBoundingClientRect();
    return { h: Math.round(bar.height), w: Math.round(bar.width), vw: innerWidth, centers: items.map(cy), btns, railTop: Math.round(rail.top), railW: Math.round(rail.width), border: getComputedStyle(document.querySelector('.toolbar')).borderBottomWidth };
  });
  check(`${t} toolbar 56px full width`, tb.h === 56 && tb.w === tb.vw, tb);
  check(`${t} toolbar items vertically centered`, new Set(tb.centers).size <= 2 && Math.max(...tb.centers) - Math.min(...tb.centers) <= 1, tb.centers);
  check(`${t} toolbar buttons 32x32, icons 20`, tb.btns.length === 4 && tb.btns.every(x => x.w === 32 && x.h === 32 && x.icon === 20), tb.btns);
  check(`${t} rail 72px below toolbar`, tb.railTop === 56 && tb.railW === 72, tb);

  // שעון
  const clock1 = await p.evaluate(() => document.querySelector('.clock').textContent.trim());
  const rem = await p.evaluate(() => 60000 - (Date.now() % 60000));
  await sleep(rem + 600);
  const clock2 = await p.evaluate(() => document.querySelector('.clock').textContent.trim());
  check(`${t} clock format + updates at minute boundary`, /^\d\d\.\d\d\.\d{4} · \d\d:\d\d$/.test(clock1) && clock1 !== clock2, { clock1, clock2 });

  // פאנלים: נפתחים ונסגרים ב-Esc
  for (const name of ['ספר טלפונים', "צ'אט תמיכה", 'התראות']) {
    await p.evaluate((n) => document.querySelector(`.tb-end button[aria-label="${n}"]`).click(), name); await sleep(300);
    const open = await p.evaluate(() => document.querySelector('.ui-drawer')?.getAttribute('aria-label'));
    const text = await p.evaluate(() => document.querySelector('.ui-drawer .ui-state strong')?.textContent);
    await p.keyboard.press('Escape'); await sleep(250);
    const closed = await p.evaluate(() => !document.querySelector('.ui-drawer'));
    check(`${t} panel "${name}" opens and Esc closes`, open === name && closed && !!text, { open, text, closed });
  }

  // ===== /companies: שוליים, גלישה, טבלה =====
  await go(`/companies?types=${types}`);
  const cs = await p.evaluate(() => {
    const page = document.querySelector('.cs').getBoundingClientRect(); const blk = document.querySelector('.ui-table-block').getBoundingClientRect();
    const rows = [...document.querySelectorAll('tbody tr')].map(r => Math.round(r.getBoundingClientRect().height));
    const trunc = [...document.querySelectorAll('tbody td, thead th')].filter(e => e.scrollWidth > e.clientWidth + 1).map(e => e.textContent.slice(0, 12));
    const updatedIdx = [...document.querySelectorAll('thead tr:last-child th, thead tr:first-child th')].findIndex(h => h.textContent.includes('עדכון אחרון'));
    const chips = [...document.querySelectorAll('.cs-summary .ui-chip')].map(e => Math.round(e.getBoundingClientRect().height));
    const sum = document.querySelector('.cs-summary'); const sumR = sum.getBoundingClientRect();
    const edit = [...sum.querySelectorAll('button')].find(x => x.textContent.includes('ערוך חיפוש')).getBoundingClientRect();
    const chipBottom = document.querySelector('.cs-summary .ui-chip').getBoundingClientRect().bottom;
    const editBtn = [...document.querySelectorAll('.cs-summary button')].find(x => x.textContent.includes('ערוך'));
    const bs = getComputedStyle(document.querySelector('.ui-table-block'));
    const head = getComputedStyle(document.querySelector('thead th'));
    return { l: Math.round(blk.left - page.left), r: Math.round(page.right - blk.right), rows: [...new Set(rows)], trunc, chips: [...new Set(chips)], editBottomDelta: Math.round(edit.bottom - chipBottom), radius: bs.borderRadius, border: bs.borderTopWidth, bg: bs.backgroundColor, thBg: head.backgroundColor, overflowing: document.querySelector('.cs').scrollWidth > document.querySelector('.cs').clientWidth + 1, h1: !!document.querySelector('.cs h1') };
  });
  check(`${t} /companies gutters 32/32`, cs.l === 32 && cs.r === 32, cs);
  check(`${t} /companies rows 44px`, cs.rows.length === 1 && cs.rows[0] === 44, cs.rows);
  check(`${t} no truncated cells (updated column included)`, cs.trunc.length === 0, cs.trunc);
  check(`${t} chips 28px, edit button bottom aligned with chips`, cs.chips.length === 1 && cs.chips[0] === 28 && Math.abs(cs.editBottomDelta) <= 2, cs);
  check(`${t} container radius 4, border 1, header same bg, no big title`, cs.radius === '4px' && cs.border === '1px' && cs.thBg === cs.bg && !cs.h1, cs);
  check(`${t} /companies no horizontal overflow`, (await overflow()).length === 0, await overflow());

  // שורה אחת: מיכל לא מתנפח, ריווח 24 מתחת
  await go('/companies?name=Falcon');
  const one = await p.evaluate(() => { const page = document.querySelector('.cs'); const blk = document.querySelector('.ui-table-block').getBoundingClientRect(); return { rows: document.querySelectorAll('tbody tr').length, h: Math.round(blk.height), below: Math.round(page.scrollHeight - (blk.bottom - page.getBoundingClientRect().top + page.scrollTop)) }; });
  check(`${t} single row: compact container, >=24 below`, one.rows === 1 && one.h < 260 && one.below >= 24, one);

  // breadcrumb מחזיר את החיפוש עם הפילטרים
  await go(`/companies?types=${types}&sort=name.desc`);
  const before = p.url();
  await p.evaluate(() => document.querySelector('tbody td:first-child a').click()); await sleep(700);
  const crumb = await p.evaluate(() => document.querySelector('.breadcrumb')?.textContent);
  check(`${t} breadcrumb shape`, /חברות.*›?.*[A-Za-z]/.test(crumb ?? ''), crumb);
  check(`${t} no in-body back link`, await p.evaluate(() => !document.querySelector('.entity-back')), 'entity-back');
  await p.evaluate(() => document.querySelector('.breadcrumb-link').click()); await sleep(900);
  check(`${t} breadcrumb restores search + filters`, p.url() === before, { url: p.url(), before });

  // ===== דפי ישות =====
  for (const u of ['/companies/c13', '/vessels/v7']) {
    await go(u);
    const e = await p.evaluate(() => {
      const sc = document.querySelector('.entity-scroll'); const sr = sc.getBoundingClientRect();
      const bands = [...document.querySelectorAll('.entity-section-head')].map(h => { const r = h.getBoundingClientRect(); return [Math.round(r.left - sr.left), Math.round(sr.right - r.right)]; });
      const head = document.querySelector('.entity-head').getBoundingClientRect();
      return { bands, headTop: Math.round(head.top - sr.top), sbw: sc.offsetWidth - sc.clientWidth };
    });
    check(`${t} ${u} gutters 32/32`, e.bands.every(([l, r]) => l >= 32 && Math.abs(l - r) <= 1 && (w >= 2560 || (l === 32 && r === 32))), e.bands.slice(0, 3));
    check(`${t} ${u} sticky header at scroller top`, e.headTop === 0, e);
    check(`${t} ${u} no horizontal overflow`, (await overflow()).length === 0, await overflow());
    if (u === '/vessels/v7') {
      await p.evaluate(() => document.querySelector('.entity-scroll').scrollTo({ top: 700 })); await sleep(400);
      const hh = await p.evaluate(() => document.querySelector('.entity-head').offsetHeight);
      check(`${t} compact header <=56`, hh <= 56, hh);
    }
  }

  // ===== מפה =====
  await go('/');
  const map = await p.evaluate(() => { const m = document.querySelector('.main').getBoundingClientRect(); const c = document.querySelector('.map-canvas').getBoundingClientRect(); return { dw: Math.round(m.width - c.width), dh: Math.round(m.height - c.height), top: Math.round(m.top) }; });
  check(`${t} map fills area under toolbar`, Math.abs(map.dw) <= 1 && Math.abs(map.dh) <= 1 && map.top === 56, map);
  check(`${t} map page no overflow`, (await overflow()).length === 0, await overflow());
  await p.close();
}
console.log(fails.length ? `FAILS (${fails.length}):\n` + fails.join('\n') : 'ALL CHECKS PASSED');
await b.close();
