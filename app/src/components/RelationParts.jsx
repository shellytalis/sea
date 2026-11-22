import { STRENGTHS } from '../data/companies';

/** שלושה פסים בגבהים עולים; מלאים כמספר רמת החוזק. עם svg: קבוצת SVG להצבה בתוך הגרף */
export function StrengthBars({ strength, svg, x = 0, y = 0 }) {
  const on = STRENGTHS[strength].rank;
  const heights = [6, 10, 14];
  if (svg) {
    return (
      <g className="rel-bars" transform={`translate(${x} ${y})`} aria-hidden="true">
        {heights.map((h, i) => <rect key={h} x={i * 6} y={14 - h} width="4" height={h} className={i < on ? 'on' : ''} />)}
      </g>
    );
  }
  return (
    <span className="rel-bars" aria-hidden="true">
      {heights.map((h, i) => <span key={h} className={i < on ? 'on' : ''} style={{ height: h }} />)}
    </span>
  );
}

/** חוזק הקשר: פסים + תווית טקסט */
export function StrengthMeter({ strength }) {
  return <span className="rel-strength"><StrengthBars strength={strength} /><span>{STRENGTHS[strength].label}</span></span>;
}

/** דוגמת קו: רציף לקשר מוצהר, מקווקו לקשר שהוסק */
export function LineKey({ declared }) {
  return (
    <svg width="24" height="8" aria-hidden="true" className="rel-linekey">
      <line x1="0" y1="4" x2="24" y2="4" className={declared ? '' : 'dashed'} />
    </svg>
  );
}

/** סוג הקשר: דוגמת קו + תווית */
export function RelationKind({ declared }) {
  return <span className="rel-kind"><LineKey declared={declared} /><span>{declared ? 'מוצהר' : 'הוסק'}</span></span>;
}

/** מקרא הקווים בכותרת מקטע הקשרים */
export function RelationLegend() {
  return (
    <span className="rel-legend-inline">
      <span><LineKey declared />קשר מוצהר</span>
      <span><LineKey declared={false} />קשר שהוסק</span>
    </span>
  );
}
