/**
 * Panel: הקומפוננטה היחידה לקבוצת תוכן. רקע --surface, גבול 1px, radius 4px.
 * כותרת 48px: שם 16/600, "·" ומטא 12px משני (מקור · עודכן · גרסה), פעולות בקצה ה-end.
 * flush: הגוף בלי padding (טבלאות נוגעות בקצוות). בלי title: פאנל בלי כותרת (למשל טבלת תוצאות).
 */
export default function Panel({ id, title, meta, actions, flush, className = '', children }) {
  const hid = id && title ? `${id}-h` : undefined;
  return (
    <section id={id} className={`panel ${className}`.trim()} aria-labelledby={hid}>
      {(title || actions) && (
        <header className="panel-head">
          {title && <h2 id={hid}>{title}</h2>}
          {meta && <><span className="panel-sep" aria-hidden="true">·</span><span className="panel-meta">{meta}</span></>}
          {actions && <div className="panel-actions">{actions}</div>}
        </header>
      )}
      <div className={`panel-body${flush ? ' flush' : ''}`}>{children}</div>
    </section>
  );
}
