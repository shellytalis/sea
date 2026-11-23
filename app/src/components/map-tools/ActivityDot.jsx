/**
 * סמן צבע של פעילות (מחליף את האייקונים): עיגול בצבע הפעילות, אותו צבע כמו הנקודות שלה במפה.
 * הצבע בא ממחלקה act-<id> (טוקנים --area-* ב-tokens.css). בלי צבעי סולם החומרה (BR-06).
 */
export default function ActivityDot({ id }) {
  return <span className={`area-dot act-${id}`} aria-hidden="true" />;
}
