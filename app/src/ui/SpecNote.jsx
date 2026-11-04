/** הערת מפרט/הצעה: מוסתרת עד שמתג "הערות מפרט" ב-/design פעיל */
export default function SpecNote({ tag, children }) {
  return <span className={`spec-note${tag ? ' tag' : ''}`}>{children}</span>;
}
