import { EVIDENCE_TYPES, STRENGTHS } from '../data/companies';
import { StrengthBars } from './RelationParts';

/*
 * גרף קשרים (הצעה): SVG עם פריסה סטטית, ללא ספרייה. החברה במרכז (בצד ה-start), עד MAX_NODES הקשרים החזקים
 * ביותר בעמודה בצד ה-end; אשכול הוא צומת אחד. עובי הקו = חוזק, קו רציף = קשר מוצהר, מקווקו = קשר שהוסק.
 * חוזק וסוג מובחנים גם בצורה ובתווית (פסי חוזק בתוך הצומת, aria-label), לא רק בעובי ובדפוס הקו.
 * הקשר הנבחר מודגש (צבע accent וגבול עבה). הגרף מקבל את השורות אחרי הסינון.
 */
export const MAX_NODES = 15;

const W = 460, NODE_W = 184, NODE_H = 30, PITCH = 40, PAD = 16, CENTER_W = 150, CENTER_H = 36;
const NODE_X = PAD, CENTER_X = W - PAD - CENTER_W;
const clip = (s, n) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const label = (r) => `${r.kind === 'cluster' ? `אשכול של ${r.count} חברות` : r.name}, חוזק ${STRENGTHS[r.strength].label}, ${r.declared ? 'קשר מוצהר' : 'קשר שהוסק'}`;

export default function RelationsView({ center, items, selectedId, onSelect }) {
  if (items.length === 0) return null;
  const H = items.length * PITCH + PAD * 2;
  const cy = H / 2;
  const y = (i) => PAD + i * PITCH + PITCH / 2;
  const press = (r) => (e) => {
    if (e.type === 'click' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(r); }
  };

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="group" aria-label={`גרף קבוצת השליטה של ${center.name}`} className="rel-svg">
      {items.map((r, i) => (
        <g key={r.id} className={`rel-edge strength-${r.strength} ${r.declared ? 'declared' : 'inferred'}${selectedId === r.id ? ' selected' : ''}`}
          role="button" tabIndex={0} aria-pressed={selectedId === r.id} aria-label={`קשר: ${label(r)}`} onClick={press(r)} onKeyDown={press(r)}>
          <line x1={CENTER_X} y1={cy} x2={NODE_X + NODE_W} y2={y(i)} className="hit" />
          <line x1={CENTER_X} y1={cy} x2={NODE_X + NODE_W} y2={y(i)} className="stroke" />
        </g>
      ))}
      {items.map((r, i) => (
        <g key={`n-${r.id}`} className={`rel-node strength-${r.strength}${selectedId === r.id ? ' selected' : ''}`} role="button" tabIndex={0}
          aria-label={`חברה: ${label(r)}`} onClick={press(r)} onKeyDown={press(r)} transform={`translate(${NODE_X} ${y(i) - NODE_H / 2})`}>
          <title>{r.kind === 'cluster' ? `${r.count} חברות: ${r.profile}` : `${r.name} · ${r.profile} · ${EVIDENCE_TYPES[r.evidence[0].type]}`}</title>
          <rect width={NODE_W} height={NODE_H} rx="4" />
          {r.kind === 'cluster'
            ? <text x={NODE_W / 2 - 12} y={NODE_H / 2 + 4} textAnchor="middle">אשכול · {r.count} חברות</text>
            : <text x={NODE_W / 2 - 12} y={NODE_H / 2 + 4} textAnchor="middle" direction="ltr">{clip(r.name, 24)}</text>}
          <StrengthBars strength={r.strength} x={NODE_W - 24} y={NODE_H / 2 - 7} svg />
        </g>
      ))}
      <g className="rel-node center" transform={`translate(${CENTER_X} ${cy - CENTER_H / 2})`}>
        <rect width={CENTER_W} height={CENTER_H} rx="4" />
        <text x={CENTER_W / 2} y={CENTER_H / 2 + 4} textAnchor="middle" direction="ltr">{clip(center.name, 22)}</text>
      </g>
    </svg>
  );
}
