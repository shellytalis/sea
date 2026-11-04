import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--no-sandbox'] });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const fails = []; const notes = [];
const check = (name, ok, detail) => { if (!ok) fails.push(`${name} :: ${JSON.stringify(detail)}`); };
const types = encodeURIComponent('בעלים רשום|מפעיל');
const SCALE = new Set(['12px', '13px', '14px', '16px', '20px', '24px']);

const typeScan = () => document.querySelectorAll('*') && (() => {
  const bad = new Map();
  for (const el of document.querySelectorAll('body *')) {
    if (el.closest('.sr-only, svg, .maplibregl-map')) continue;
    if (![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue;
    const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const fs = cs.fontSize; if (!['12px', '13px', '14px', '16px', '20px', '24px'].includes(fs)) bad.set(fs + ' ' + el.className, (bad.get(fs) ?? 0) + 1);
  }
  return [...bad.keys()].slice(0, 6);
})();

for (const w of [1366, 1920, 2560]) {
  const p = await b.newPage();
  await p.setViewport({ width: w, height: w === 1366 ? 768 : w === 2560 ? 1440 : 1080 });
  await p.evaluateOnNewDocument(() => { try { localStorage.setItem('sea-theme', 'dark'); } catch {} });
  const go = async u => { await p.goto('http://localhost:5173' + u, { waitUntil: 'networkidle2' }); await sleep(900); };
  const t = `[${w}]`;
  const overflow = () => p.evaluate(() => [...document.querySelectorAll('html, body, #root, .shell, .toolbar, .main, .cs, .entity, .entity-scroll, .panel, .ui-table-scroll')]
    .filter(e => e.scrollWidth > e.clientWidth + 1).map(e => `${e.className || e.tagName}:${e.scrollWidth}>${e.clientWidth}`));
  const scan = async () => p.evaluate(`(${typeScan.toString()})()`);

  // ===== toolbar =====
  await go('/companies');
  const tb = await p.evaluate(() => {
    const R = (e) => e.getBoundingClientRect();
    const bar = R(document.querySelector('.toolbar'));
    const end = [...document.querySelector('.tb-end').children].map(R);
    const gaps = end.slice(1).map((r, i) => Math.round(end[i].left - r.right)); // RTL: הקודם מימין
    const icons = [...document.querySelectorAll('.tb-icons > *')].map(R); const iconGaps = icons.slice(1).map((r, i) => Math.round(icons[i].left - r.right));
    const brand = R(document.querySelector('.brand')); const logo = R(document.querySelector('.company-logo'));
    const btns = [...document.querySelectorAll('.tb-icons .ui-btn')].map(e => [Math.round(R(e).width), Math.round(R(e).height), Math.round(R(e.querySelector('svg')).width)]);
    const user = document.querySelector('.user-btn'); const ur = R(user);
    const cy = [...document.querySelectorAll('.brand, .page-title, .breadcrumb, .search, .clock, .user-btn, .company-logo, .tb-icons .ui-btn')].map(e => Math.round(R(e).top + R(e).height / 2));
    const clock = getComputedStyle(document.querySelector('.clock'));
    const rail = [...document.querySelectorAll('.rail .ui-btn')].map(e => [Math.round(R(e).height), Math.round(R(e.querySelector('svg')).width)]);
    return { h: Math.round(bar.height), padStart: Math.round(innerWidth - brand.right), padEnd: Math.round(logo.left), gaps, iconGaps, btns, userH: Math.round(ur.height), cy, clockFs: clock.fontSize, clockNum: clock.fontVariantNumeric, rail, avatarR: getComputedStyle(document.querySelector('.avatar')).borderRadius, logoH: Math.round(R(document.querySelector('.company-logo')).height) };
  });
  check(`${t} toolbar 56px`, tb.h === 56, tb.h);
  check(`${t} toolbar padding-inline 16`, tb.padStart === 16 && tb.padEnd === 16, tb);
  check(`${t} toolbar group gaps 16 (and icons 4)`, tb.gaps.every(g => g === 16) && tb.iconGaps.every(g => g === 4), { gaps: tb.gaps, iconGaps: tb.iconGaps });
  check(`${t} toolbar buttons 32x32, icons 20; user 32; logo 24`, tb.btns.every(x => x[0] === 32 && x[1] === 32 && x[2] === 20) && tb.userH === 32 && tb.logoH === 24, tb);
  check(`${t} toolbar vertical centers aligned`, Math.max(...tb.cy) - Math.min(...tb.cy) <= 1, tb.cy);
  check(`${t} clock 14px tabular`, tb.clockFs === '14px' && tb.clockNum.includes('tabular'), tb);
  check(`${t} rail items 64px, icons 20; avatar radius 4`, tb.rail.every(x => x[0] === 64 && x[1] === 20) && tb.avatarR === '4px', tb);

  // ===== /companies ריק: טופס ורשימות =====
  const f = await p.evaluate(() => {
    const R = (e) => e.getBoundingClientRect();
    const ctr = [...document.querySelectorAll('.cs-form input:not([type=checkbox]), .cs-form select, .cs-form .ui-multi, .cs-form button[type=submit], .cs-actions button')].map(e => Math.round(R(e).height));
    const panels = [...document.querySelectorAll('.cs .panel')].map(R); const main = R(document.querySelector('.main'));
    const lists = [...document.querySelectorAll('.cs-lists > .panel')].map(R);
    const rows = [...document.querySelectorAll('.cs-list li')].map(e => Math.round(R(e).height));
    return { ctr, formLR: [Math.round(R(document.querySelector('.cs-form-panel')).left - main.left), Math.round(main.right - R(document.querySelector('.cs-form-panel')).right)], panelEdges: panels.map(r => [Math.round(r.left), Math.round(r.right)]),
      gapBetweenLists: Math.round(lists[0].left - lists[1].right), vGap: Math.round(lists[0].top - R(document.querySelector('.cs-form-panel')).bottom), listH: lists.map(r => Math.round(r.height)), rows: [...new Set(rows)], hint: !!document.querySelector('.cs-help') || document.body.innerText.includes('הזן פרמטר אחד לפחות') && !document.querySelector('.sr-only')?.textContent.includes('הזן') };
  });
  check(`${t} form controls all 40px`, f.ctr.every(h => h === 40), f.ctr);
  check(`${t} page gutters 32/32 and panels share edges`, f.formLR[0] === 32 && f.formLR[1] === 32 && f.panelEdges[1][1] === f.panelEdges[0][1] && f.panelEdges[2][0] === f.panelEdges[0][0], f);
  check(`${t} lists: 24 gap, equal height, rows 48`, f.gapBetweenLists === 24 && f.vGap === 24 && f.listH[0] === f.listH[1] && f.rows.every(r => r === 48), f);
  check(`${t} no visible 'enter a parameter' sentence`, !(await p.evaluate(() => [...document.querySelectorAll('body *')].some(e => e.children.length === 0 && e.textContent.includes('הזן פרמטר אחד לפחות') && !e.closest('.sr-only') && e.offsetParent))), 'hint');
  check(`${t} /companies empty no overflow`, (await overflow()).length === 0, await overflow());
  const ts1 = await scan(); check(`${t} /companies empty type scale`, ts1.length === 0, ts1);

  // ===== תוצאות =====
  await go(`/companies?types=${types}`);
  const r = await p.evaluate(() => {
    const R = (e) => e.getBoundingClientRect();
    const th = [...document.querySelectorAll('thead th')]; const first = R(document.querySelector('thead tr:first-child th'));
    const headH = Math.round(R(document.querySelector('thead')).height);
    const lastTh = [...document.querySelectorAll('thead tr:first-child th')].pop();
    const rowH = [...new Set([...document.querySelectorAll('tbody tr')].map(e => Math.round(R(e).height)))];
    const pager = Math.round(R(document.querySelector('.ui-pager')).height);
    const tbl = R(document.querySelector('.ui-table-block')); const sum = R(document.querySelector('.cs-summary'));
    const cs = R(document.querySelector('.cs')); const main = R(document.querySelector('.main'));
    const sigW = [...document.querySelectorAll('thead .sub-head th')].slice(0, 3).map(e => Math.round(R(e).width));
    const hdrFs = getComputedStyle(document.querySelector('thead th .ui-th, thead th button')).fontSize;
    const iconBtn = document.querySelector('thead th:last-child .ui-btn');
    return { headH, lastW: Math.round(R(lastTh).width), rowH, pager, vGap: Math.round(tbl.top - sum.bottom), edges: [Math.round(tbl.left - main.left), Math.round(main.right - tbl.right)], sigW, hdrFs, mgr: iconBtn ? [Math.round(R(iconBtn).width), Math.round(R(iconBtn).height)] : null, toolbar: !!document.querySelector('.ui-table-toolbar'), sumH: Math.round(sum.height), range: document.querySelector('.ui-pager-range').textContent };
  });
  check(`${t} table header 60, actions col 48, mgr icon 32`, r.headH === 60 && r.lastW === 48 && r.mgr && r.mgr[0] === 32 && r.mgr[1] === 32 && !r.toolbar, r);
  check(`${t} rows 44, pager 48, summary 40, gap 16, gutters 32`, r.rowH.length === 1 && r.rowH[0] === 44 && r.pager === 48 && r.sumH >= 40 && r.vGap === 16 && r.edges[0] === 32 && r.edges[1] === 32, r);
  check(`${t} signal columns 120`, r.sigW.every(x => x === 120), r.sigW);
  check(`${t} pager range text`, /1–14.*מתוך.*14/.test(r.range), r.range);
  check(`${t} results no overflow`, (await overflow()).length === 0, await overflow());
  const ts2 = await scan(); check(`${t} results type scale`, ts2.length === 0, ts2);

  // ===== דפי ישות: פאנלים =====
  for (const u of ['/companies/c13', '/companies/c10', '/companies/c12', '/vessels/v7', '/vessels/v1']) {
    await go(u);
    const e = await p.evaluate(() => {
      const R = (x) => x.getBoundingClientRect();
      const sc = R(document.querySelector('.entity-scroll')); const ps = [...document.querySelectorAll('.entity-stack > .panel')].map(R);
      const gaps = ps.slice(1).map((r, i) => Math.round(r.top - ps[i].bottom));
      const heads = [...document.querySelectorAll('.panel-head')].map(h => Math.round(R(h).height));
      const lefts = [...new Set(ps.map(r => Math.round(r.left)))]; const rights = [...new Set(ps.map(r => Math.round(r.right)))];
      const pad = [Math.round(ps[0].left - sc.left), Math.round(sc.right - ps[0].right)];
      const grids = [...document.querySelectorAll('.ui-facts.grid')].map(g => new Set([...g.children].map(c => Math.round(R(c).left))).size);
      const cols = getComputedStyle(document.querySelector('.ui-facts.grid') ?? document.body).gridTemplateColumns.split(' ').length;
      const dts = [...document.querySelectorAll('.ui-facts dt')].map(e => getComputedStyle(e).fontSize); const dds = [...document.querySelectorAll('.ui-facts dd')].map(e => getComputedStyle(e).fontSize);
      const monos = [...document.querySelectorAll('.mono')].map(e => e.textContent.trim()).filter(x => !/^\d{6,}$|^[A-Z0-9]{3,5}$|^IMO|^MMSI/.test(x));
      const states = [...document.querySelectorAll('.ui-state-icon')].filter(e => getComputedStyle(e).borderRadius.includes('50%') || getComputedStyle(e).backgroundColor !== 'rgba(0, 0, 0, 0)').length;
      return { n: ps.length, gaps: [...new Set(gaps)], heads: [...new Set(heads)], lefts, rights, pad, cols, dts: [...new Set(dts)], dds: [...new Set(dds)], monos: monos.slice(0, 4), states };
    });
    const tag = `${t} ${u}`;
    check(`${tag} panels share left/right edges`, e.lefts.length === 1 && e.rights.length === 1, e);
    check(`${tag} 24px between panels`, e.gaps.every(g => g === 24), e.gaps);
    check(`${tag} panel heads 48`, e.heads.every(h => h === 48), e.heads);
    check(`${tag} page gutters 32 (<=1680 layout)`, w >= 2560 || (e.pad[0] === 32 && e.pad[1] === 32), e.pad);
    check(`${tag} facts: 4 fixed columns, label 12 / value 14`, e.cols === 4 && e.dts.every(x => x === '12px') && e.dds.every(x => x === '14px'), { cols: e.cols, dts: e.dts, dds: e.dds });
    check(`${tag} no circled state icons; mono only for identifiers`, e.states === 0 && e.monos.length === 0, e);
    const lines = await p.evaluate(() => [...document.querySelectorAll('.entity-stack > .panel')].map(pn => { const R = (x) => x.getBoundingClientRect(); const s = (x, pr) => Math.round(R(x).right - parseFloat(getComputedStyle(x)[pr] || 0)); const out = [s(pn.querySelector('.panel-head h2'), 'paddingRight')]; const dt = pn.querySelector('.ui-facts dt'); if (dt) out.push(s(dt, 'paddingRight')); const th = pn.querySelector('thead th'); if (th) out.push(s(th, 'paddingRight')); const st = pn.querySelector('.ui-state strong'); if (st) out.push(Math.round(R(st.parentElement).right - parseFloat(getComputedStyle(st.parentElement).paddingRight))); return out; }));
    check(`${tag} text start line shared inside every panel (title, label, table text, empty state)`, lines.every((l) => Math.max(...l) - Math.min(...l) <= 1), lines);
    check(`${tag} no horizontal overflow`, (await overflow()).length === 0, await overflow());
    const ts = await scan(); check(`${tag} type scale`, ts.length === 0, ts);
  }
  // אותות: גובה שווה, עמודות מופרדות
  await go('/companies/c13');
  const sg = await p.evaluate(() => { const cols = [...document.querySelectorAll('.signal-col')].map(e => { const r = e.getBoundingClientRect(); return [Math.round(r.height), Math.round(r.width), getComputedStyle(e).borderInlineStartWidth]; }); return cols; });
  check(`${t} signals: 4 equal columns/heights, 1px dividers`, sg.length === 4 && new Set(sg.map(x => x[0])).size === 1 && new Set(sg.map(x => x[1])).size <= 2 && sg.slice(1).every(x => x[2] === '1px'), sg);
  await p.close();
}
console.log(fails.length ? `FAILS (${fails.length}):\n` + fails.join('\n') : 'ALL CHECKS PASSED');
await b.close();
