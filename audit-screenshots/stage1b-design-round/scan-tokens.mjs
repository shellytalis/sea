import fs from 'node:fs';
import path from 'node:path';
const root = process.argv[3] ?? 'C:/Users/shell/Desktop/Sea/app/src';
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
const files = walk(root).filter((f) => /\.(css|jsx?)$/.test(f));
const SCALE_FS = new Set(['12px', '13px', '14px', '16px', '20px', '24px']);
const out = { hex: [], fontSize: [], spacing: [], physical: [], rgba: [], iconSize: [], namedColor: [], spacingLiteral: [], physicalTransform: [], monoOnNonId: [] };
for (const f of files) {
  const rel = path.relative(root, f).replace(/\\/g, '/');
  const lines = fs.readFileSync(f, 'utf8').split('\n');
  lines.forEach((line, i) => {
    const at = `${rel}:${i + 1}`;
    const isTokens = rel === 'styles/tokens.css';
    const isMap = rel === 'components/MapView.jsx';
    if (/#[0-9a-fA-F]{3,8}\b/.test(line) && !isTokens && !/^\s*\/\*/.test(line) && !/href="#|\(#|`#|'#|"#/.test(line.replace(/#[0-9a-f]{6}/i, (m) => m))) out.hex.push(at + ' ' + line.trim().slice(0, 80));
    else if (/#[0-9a-fA-F]{6}\b/.test(line) && !isTokens) out.hex.push(at + ' ' + line.trim().slice(0, 80));
    if (/rgba?\(/.test(line) && !isTokens && !isMap) out.rgba.push(at + ' ' + line.trim().slice(0, 80));
    if (rel.endsWith('.css')) {
      if (line.includes(':') && !line.includes('var(') && line.split(/[^a-z-]+/).some((w) => ['white','black','red','blue','green','gray','grey','orange','yellow'].includes(w))) out.namedColor.push(at + ' ' + line.trim().slice(0, 70));
      for (const m of line.matchAll(/(margin|padding|gap)[a-z-]*:\s*([^;}]*\d+px[^;}]*)/g)) { if (/\d+px/.test(m[2].replace(/var\([^)]*\)/g, ''))) out.spacingLiteral.push(at + ' ' + m[0].slice(0, 60)); }
      if (/translateX\(/.test(line)) out.physicalTransform.push(at + ' ' + line.trim().slice(0, 70));
      for (const m of line.matchAll(/font-size:\s*([^;}]+)/g)) {
        const v = m[1].trim();
        if (/^var\(--fs-/.test(v) || v === 'inherit') continue;
        if (!SCALE_FS.has(v)) out.fontSize.push(`${at} ${v}`);
      }
      for (const m of line.matchAll(/(?:^|[;{\s])font:\s*[^;}]*?(\d+(?:\.\d+)?px)/g)) { if (!SCALE_FS.has(m[1])) out.fontSize.push(`${at} font:${m[1]}`); }
      for (const m of line.matchAll(/(margin|padding|gap)[a-z-]*:\s*([^;}]+)/g)) {
        const vals = m[2].match(/-?\d+(?:\.\d+)?px/g) ?? [];
        for (const v of vals) { const n = Math.abs(parseFloat(v)); if (n !== 0 && n % 4 !== 0 && n !== 1 && n !== 2) out.spacing.push(`${at} ${m[1]}:${v}`); }
      }
      if (/(^|[\s;{])(left|right)\s*:|margin-(left|right)|padding-(left|right)|border-(left|right)|text-align:\s*(left|right)|float:\s*(left|right)/.test(line)) out.physical.push(at + ' ' + line.trim().slice(0, 90));
    } else {
      if (/<Mono[ >]/.test(line) && !/imo|mmsi|callSign|dnb|IMO|MMSI|D&B|pathname|9487231|257184000/.test(line)) out.monoOnNonId.push(at + ' ' + line.trim().slice(0, 70));
      for (const m of line.matchAll(/size=\{(\d+)\}/g)) { if (![12, 14, 16, 20, 24].includes(+m[1])) out.iconSize.push(`${at} size=${m[1]}`); }
      if (/\b(marginLeft|marginRight|paddingLeft|paddingRight|textAlign: ?['"](left|right)['"])/.test(line)) out.physical.push(at + ' ' + line.trim().slice(0, 90));
    }
  });
}
const summary = Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v.length]));
console.log(JSON.stringify(summary));
if (process.argv[2] === 'detail') for (const [k, v] of Object.entries(out)) { console.log(`--- ${k} (${v.length})`); v.slice(0, 60).forEach((x) => console.log(x)); }
