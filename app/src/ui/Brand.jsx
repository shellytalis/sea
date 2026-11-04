/** סמל SEA (24px) ושם המערכת */
export function SeaMark({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="sea-mark">
      <path d="M2 15c2.5-4 4.5-4 6.5-1s4 3 6.5-1 4-4 7-1" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M2 20c2.5-4 4.5-4 6.5-1s4 3 6.5-1 4-4 7-1" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity=".55" />
      <circle cx="12" cy="6" r="2.5" fill="currentColor" />
    </svg>
  );
}

export default function Brand() {
  return <span className="brand"><SeaMark /><span className="brand-name">SEA</span></span>;
}
