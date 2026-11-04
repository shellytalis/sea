import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--no-sandbox'] });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const fails = [];
const check = (name, ok, detail) => { if (!ok) fails.push(`${name} :: ${JSON.stringify(detail)}`); };
const types = encodeURIComponent('בעלים רשום|מפעיל');

for (const w of [1366, 1920, 2560]) {
  const p = await b.newPage();
  await p.setViewport({ width: w, height: w === 1366 ? 768 : w === 2560 ? 1440 : 1080 });
  await p.evaluateOnNewDocument(() => { try { localStorage.setItem('sea-theme', 'dark'); } catch {} });
  const go = async u => { await p.goto('http://localhost:5173' + u, { waitUntil: 'networkidle2' }); await sleep(1000); };
  const overflow = () => p.evaluate(() => [...document.querySelectorAll('html, body, #root, .shell, .main, .cs, .cs-head, .cs-body, .cs-form, .entity, .entity-scroll, .entity-inner, .ui-table-block')]
    .filter(e => e.scrollWidth > e.clientWidth + 1).map(e => `${e.className || e.tagName}:${e.scrollWidth}>${e.clientWidth}`));

  // ===== /companies: טופס =====
  await go('/companies');
  const form = await p.evaluate(() => {
    const ctr = [...document.querySelectorAll('.cs-form input:not([type=checkbox]), .cs-form select, .cs-form .ui-multi, .cs-form button[type=submit], .cs-actions button')].map(e => { const r = e.getBoundingClientRect(); return { cls: e.className.slice(0, 20), h: Math.round(r.height), top: Math.round(r.top), bottom: Math.round(r.bottom), w: Math.round(r.width) }; });
    const labels = [...document.querySelectorAll('.cs-form .ui-field > label, .cs-form .ui-label')].map(e => getComputedStyle(e).fontSize);
    const fields = [...document.querySelectorAll('.cs-form > .ui-field, .cs-form > .ui-range')].map(e => { const r = e.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right) }; });
    return { ctr, labels, fields };
  });
  check(`[${w}] form control heights all 40`, form.ctr.every(c => c.h === 40), form.ctr.map(c => c.h));
  check(`[${w}] form labels 13px`, form.labels.every(l => l === '13px'), form.labels);
  const row1 = form.fields.slice(0, 4), row2 = form.fields.slice(4);
  check(`[${w}] row1 fields share top/bottom`, new Set(row1.map(f => f.top)).size === 1 && new Set(row1.map(f => f.bottom)).size === 1, row1);
  const actions = form.ctr.filter(c => c.cls.includes('ui-btn'));
  check(`[${w}] actions bottom aligned with row2 field bottom`, actions.every(a => Math.abs(a.bottom - row2[0].bottom) <= 1), { actions, row2 });
  check(`[${w}] /companies no horizontal overflow`, (await overflow()).length === 0, await overflow());

  // ===== /companies: תוצאות =====
  await go(`/companies?types=${types}`);
  const res = await p.evaluate(() => {
    const tb = [...document.querySelectorAll('.ui-table-toolbar button')].map(e => Math.round(e.getBoundingClientRect().height));
    const dim = [...document.querySelectorAll('.ui-btn.th .dim')].map(e => getComputedStyle(e).opacity);
    const nameA = document.querySelector('tbody tr td:first-child a');
    const rows = document.querySelectorAll('tbody tr').length;
    return { tb, dimOpacities: [...new Set(dim)], nameIsLink: !!nameA && nameA.tagName === 'A' && nameA.getAttribute('href')?.startsWith('/companies/'), rows };
  });
  check(`[${w}] toolbar buttons 32px`, res.tb.every(h => h === 32), res.tb);
  check(`[${w}] sort icons hidden when idle`, res.dimOpacities.length === 1 && res.dimOpacities[0] === '0', res.dimOpacities);
  check(`[${w}] name is a real link`, res.nameIsLink, res);
  const before = p.url();
  await p.evaluate(() => document.querySelector('tbody tr td:nth-child(2)').click()); await sleep(300);
  check(`[${w}] row click does nothing`, p.url() === before, p.url());
  await p.evaluate(() => document.querySelector('.row-action').click()); await sleep(500);
  check(`[${w}] quick view opens from icon`, p.url().includes('sel=') && !!(await p.$('.ui-drawer')), p.url());
  check(`[${w}] results no horizontal overflow`, (await overflow()).length === 0, await overflow());
  check(`[${w}] table container fits`, await p.evaluate(() => { const s = document.querySelector('.ui-table-scroll'); return s.scrollWidth <= s.clientWidth + 1 || w === 1366; }) || w === 1366, 'scroll');

  // ===== דפי ישות =====
  for (const u of ['/companies/c13', '/companies/c12', '/vessels/v7', '/vessels/v1']) {
    await go(u);
    const m = await p.evaluate(() => {
      const sc = document.querySelector('.entity-scroll'); const sr = sc.getBoundingClientRect();
      const heads = [...document.querySelectorAll('.entity-section-head')];
      const gaps = heads.map(h => { const r = h.getBoundingClientRect(); return { l: Math.round(r.left - sr.left), r: Math.round(sr.right - r.right), h: Math.round(r.height) }; });
      const secs = [...document.querySelectorAll('.entity-section')].map(s => s.getBoundingClientRect());
      const between = secs.slice(1).map((s, i) => Math.round(s.top - secs[i].bottom));
      const grids = [...document.querySelectorAll('.ui-facts.grid')].map(g => {
        const items = [...g.children].map(c => c.getBoundingClientRect());
        const lefts = [...new Set(items.map(i => Math.round(i.left)))];
        const cols = lefts.length; const rows = new Set(items.map(i => Math.round(i.top))).size;
        return { n: items.length, cols, rows, orphan: items.length % cols !== 0 };
      });
      const cards = [...document.querySelectorAll('.signal-card')].map(c => { const r = c.getBoundingClientRect(); const s = c.querySelector('.signal-sev').getBoundingClientRect(); return { h: Math.round(r.height), sevY: Math.round(s.top - r.top) }; });
      const legend = document.querySelector('.rel-legend'); const lis = legend ? [...legend.children].map(l => Math.round(l.getBoundingClientRect().top)) : null;
      const lh = legend ? Math.round(legend.getBoundingClientRect().height) : null;
      const inner = document.querySelector('.entity-inner:not(header *)');
      return { gaps, between, grids, cards, legendTops: lis, legendH: lh, scrollW: [sc.scrollWidth, sc.clientWidth] };
    });
    const tag = `[${w}] ${u}`;
    check(`${tag} gutters symmetric (|l-r|<=1)`, m.gaps.every(g => Math.abs(g.l - g.r) <= 1), m.gaps.slice(0, 2));
    check(`${tag} gutters >= 32`, m.gaps.every(g => g.l >= 32 && g.r >= 32), m.gaps.slice(0, 2));
    check(`${tag} band height 40`, m.gaps.every(g => g.h === 40), m.gaps.map(g => g.h));
    check(`${tag} 48px between sections`, m.between.every(x => x === 48), m.between);
    check(`${tag} facts grids: no orphan fields`, m.grids.every(g => !g.orphan), m.grids);
    if (m.cards.length) check(`${tag} signal cards same height + severity y`, new Set(m.cards.map(c => c.h)).size === 1 && new Set(m.cards.map(c => c.sevY)).size === 1, m.cards);
    if (m.legendTops) check(`${tag} legend single row 32px`, new Set(m.legendTops).size === 1 && m.legendH === 32, { tops: m.legendTops, h: m.legendH });
    check(`${tag} no horizontal overflow`, m.scrollW[0] <= m.scrollW[1] + 1 && (await overflow()).length === 0, { m: m.scrollW, o: await overflow() });
    if (u === '/vessels/v7') {
      await p.evaluate(() => document.querySelector('.entity-scroll').scrollTo({ top: 600 })); await sleep(400);
      const hh = await p.evaluate(() => document.querySelector('.entity-head').offsetHeight);
      check(`${tag} compact header <=56`, hh <= 56, hh);
    }
  }
  // כרטיס אות לחיץ
  await go('/companies/c13');
  const nav = await p.evaluate(() => { document.querySelector('.signal-card .signal-name').click(); return true; }); await sleep(700);
  check(`[${w}] signal card navigates`, await p.evaluate(() => location.hash.length > 1), await p.evaluate(() => location.hash));
  await p.close();
}
console.log(fails.length ? `FAILS (${fails.length}):\n` + fails.join('\n') : 'ALL CHECKS PASSED');
await b.close();
