import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--no-sandbox'] });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const fails = []; const info = [];
const check = (name, ok, detail) => { if (!ok) fails.push(`${name} :: ${JSON.stringify(detail)}`); };
const types = encodeURIComponent('בעלים רשום|מפעיל');
for (const w of [1366, 1920, 2560]) {
  const p = await b.newPage();
  await p.setViewport({ width: w, height: w === 1366 ? 768 : w === 2560 ? 1440 : 1080 });
  await p.evaluateOnNewDocument(() => { try { localStorage.setItem('sea-theme', 'dark'); } catch {} });
  const go = async u => { await p.goto('http://localhost:5173' + u, { waitUntil: 'networkidle2' }); await sleep(1000); };
  const t = `[${w}]`;

  // סוג חברה: גובה קבוע עם שלושה ערכים
  await go('/companies');
  await p.evaluate(() => document.querySelector('.ui-multi-toggle').click()); await sleep(200);
  await p.evaluate(() => [...document.querySelectorAll('.ui-pop input[type=checkbox]')].slice(0, 4).forEach(i => i.click())); await sleep(300);
  const multi = await p.evaluate(() => ({ h: Math.round(document.querySelector('.ui-multi').getBoundingClientRect().height), chips: document.querySelectorAll('.ui-multi .ui-chip:not(.more)').length, more: document.querySelector('.ui-multi .ui-chip.more')?.textContent }));
  check(`${t} types field stays 40px with 4 selected (2 chips + +N)`, multi.h === 40 && multi.chips === 2 && !!multi.more, multi);

  // גלילה משוחזרת בחזרה מהפרופיל (נבדק ב-1366, שבו הטבלה גוללת)
  if (w === 1366) {
    await go(`/companies?types=${types}`);
    const before = p.url();
    await p.evaluate(() => { document.querySelector('.cs-body .ui-table-scroll').scrollTop = 120; });
    const st = await p.evaluate(() => document.querySelector('.cs-body .ui-table-scroll').scrollTop);
    await p.evaluate(() => document.querySelector('tbody tr td:first-child a').click()); await sleep(700);
    const onProfile = p.url().includes('/companies/c');
    await p.evaluate(() => document.querySelector('.entity-back').click()); await sleep(1200);
    const after = await p.evaluate(() => document.querySelector('.cs-body .ui-table-scroll')?.scrollTop);
    check(`${t} back restores search URL + table scroll`, onProfile && p.url() === before && Math.abs(after - st) <= 2 && st > 0, { onProfile, url: p.url(), before, st, after });
  }

  // מפה בצי, וללא כפתור מפה בכותרת
  await go('/companies/c13');
  const map = await p.evaluate(() => ({ fleetLinks: document.querySelectorAll('#fleet a[href^="/?v="]').length, header: !!document.querySelector('.entity-head a[href^="/?v="], .entity-head button[disabled]'), nameLinks: document.querySelectorAll('#fleet a[href^="/vessels/"]').length }));
  check(`${t} fleet: 5 map links, 5 vessel links, none in header`, map.fleetLinks === 5 && map.nameLinks === 5 && !map.header, map);

  // +N
  await p.evaluate(() => document.querySelector('.signal-more')?.click()); await sleep(300);
  const pop = await p.evaluate(() => document.querySelectorAll('.ui-pop[role=dialog] li').length);
  check(`${t} +N opens full reasons list`, pop >= 2, pop);

  // קו התחלה אחד (RTL: הקצה הימני פחות padding)
  for (const u of ['/companies/c13', '/vessels/v7']) {
    await go(u);
    const starts = await p.evaluate(() => {
      const start = (e) => { const r = e.getBoundingClientRect(); return Math.round(r.right - parseFloat(getComputedStyle(e).paddingRight)); };
      const out = {};
      const first = document.querySelector('.entity-section');
      const sec = [...document.querySelectorAll('.entity-section')];
      out.h2 = [...new Set(sec.map(s => start(s.querySelector('h2')) + 0).map(x => x))];
      const h2Start = sec.map(s => { const band = s.querySelector('.entity-section-head'); const r = band.getBoundingClientRect(); return Math.round(r.right - parseFloat(getComputedStyle(band).paddingRight)); });
      out.band = [...new Set(h2Start)];
      out.dt = [...new Set([...document.querySelectorAll('.ui-facts.grid dt')].map(e => Math.round(e.getBoundingClientRect().right)).filter((x, i, a) => true))];
      const grid0 = document.querySelector('.ui-facts.grid');
      out.dtFirstCol = Math.round(grid0.children[0].getBoundingClientRect().right);
      out.subs = [...new Set([...document.querySelectorAll('.entity-sub')].map(e => Math.round(e.getBoundingClientRect().right)))];
      out.th = [...new Set([...document.querySelectorAll('.entity-section table:not(.rel-side table)')].map(t => start(t.querySelector('th'))))];
      out.notes = [...new Set([...document.querySelectorAll('.entity-note, .ui-state strong')].filter(e => e.offsetParent).map(e => Math.round(e.getBoundingClientRect().right)))];
      return out;
    });
    const ref = starts.band[0];
    const ok = [starts.dtFirstCol, ...starts.subs, ...starts.th.filter(x => true), ...starts.notes].every(x => Math.abs(x - ref) <= 1);
    check(`${t} ${u} text start line shared (band=${ref})`, ok && starts.band.length === 1, starts);
  }
  await p.close();
}
console.log(fails.length ? `FAILS (${fails.length}):\n` + fails.join('\n') : 'ALL CHECKS PASSED');
await b.close();
