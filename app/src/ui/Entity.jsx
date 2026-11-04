import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Mono } from './Ltr';
import TableCore from './Table';
import { ErrorState, ForbiddenState, TableSkeleton } from './States';

/** גלילה בתוך המיכל בלבד (scrollIntoView היה מגלגל גם אבות) */
function scrollToSection(root, el, headH, smooth) {
  const top = el.getBoundingClientRect().top - root.getBoundingClientRect().top + root.scrollTop - headH;
  root.scrollTo({ top, behavior: smooth ? 'smooth' : 'auto' });
}

/**
 * מעטפת דף ישות: כותרת-על דביקה (בתוך מיכל ברוחב מרבי וממורכז), פס מסקנה מיד מתחתיה,
 * ניווט מקטעים בצד ההתחלה (scrollspy) והמקטע הנוכחי נשמר ב-hash של ה-URL.
 */
export function EntityPage({ header, summary, sections, resetKey, children }) {
  const scroller = useRef(null);
  const head = useRef(null);
  const { hash } = useLocation();
  const [active, setActive] = useState(() => (sections.find((s) => `#${s.id}` === hash) ?? sections[0])?.id);
  const ids = sections.map((s) => s.id).join();

  // גובה הכותרת הדביקה, לשימוש ב-scroll-margin ובאזור הזיהוי של המקטע הנוכחי
  useEffect(() => {
    const root = scroller.current;
    if (!root || !head.current) return undefined;
    const ro = new ResizeObserver(() => root.style.setProperty('--head-h', `${head.current.offsetHeight}px`));
    ro.observe(head.current);
    return () => ro.disconnect();
  }, [resetKey]);

  useEffect(() => {
    const root = scroller.current;
    if (!root) return undefined;
    const top = (head.current?.offsetHeight ?? 0) + 8;
    const io = new IntersectionObserver((es) => {
      const e = es.find((x) => x.isIntersecting);
      if (!e) return;
      setActive(e.target.id);
      window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}#${e.target.id}`);
    }, { root, rootMargin: `-${top}px 0px -65% 0px` });
    sections.forEach((s) => { const n = root.querySelector(`#${s.id}`); if (n) io.observe(n); });
    // קישור עם hash: גלילה למקטע
    const target = hash && root.querySelector(hash);
    if (target) scrollToSection(root, target, head.current?.offsetHeight ?? 0, false);
    return () => io.disconnect();
  }, [resetKey, ids]); // eslint-disable-line react-hooks/exhaustive-deps

  const go = (id) => {
    setActive(id);
    const el = scroller.current?.querySelector(`#${id}`);
    if (el) scrollToSection(scroller.current, el, head.current?.offsetHeight ?? 0, true);
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}#${id}`);
  };

  return (
    <div className="entity">
      <nav className="entity-nav" aria-label="מקטעי הדף">
        {sections.map((s) => (
          <a key={s.id} href={`#${s.id}`} aria-current={active === s.id ? 'location' : undefined}
            onClick={(e) => { e.preventDefault(); go(s.id); }}>{s.label}</a>
        ))}
      </nav>
      <div className="entity-scroll" ref={scroller}>
        <header className="entity-head" ref={head}><div className="entity-inner">{header}</div></header>
        <div className="entity-inner">
          {summary && <div className="entity-summary">{summary}</div>}
          {children}
        </div>
      </div>
    </div>
  );
}

/** שם ומטא-דאטה בצד ההתחלה, והפעולות צמודות אליהם באותה שורה */
export function EntityHead({ back, title, meta, badges, actions }) {
  return (
    <div className="entity-head-row">
      <div className="entity-head-main">
        {back}
        <h1>{title}</h1>
        {meta && <div className="entity-meta">{meta}</div>}
        {badges && <div className="entity-badges">{badges}</div>}
      </div>
      {actions && <div className="entity-actions">{actions}</div>}
    </div>
  );
}

/** חותמת מקור ועדכון, צמודה לכותרת הקטע */
export function Source({ source, updated }) {
  return <span className="entity-src">{source} · עודכן <Mono>{updated}</Mono></span>;
}

export function Section({ id, title, source, children }) {
  return (
    <section id={id} className="entity-section" aria-labelledby={`${id}-h`}>
      <div className="entity-section-head">
        <h2 id={`${id}-h`}>{title}</h2>
        {source && <Source {...source} />}
      </div>
      {children}
    </section>
  );
}

/** שדה-ערך: דפוס יחיד. layout="grid" (תווית מעל הערך, בדפי ישות) או "list" (תווית וערך בשורה, במגירות) */
export function Facts({ items, layout = 'grid' }) {
  return (
    <dl className={`ui-facts ${layout}`}>
      {items.map(([k, v]) => <div key={k} className="ui-fact"><dt>{k}</dt><dd>{v}</dd></div>)}
    </dl>
  );
}

/** קבוצת שדות עם כותרת משנה */
export function FactGroup({ title, items }) {
  return (
    <div className="fact-group">
      <h3 className="entity-sub">{title}</h3>
      <Facts items={items} />
    </div>
  );
}

export function Metrics({ items }) {
  return (
    <dl className="ui-metrics">
      {items.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
    </dl>
  );
}

export function StaticTable({ caption, columns, rows, rowKey }) {
  return (
    <div className="ui-table-scroll bordered">
      <TableCore caption={caption} columns={columns} rows={rows} rowKey={rowKey} stickyHead={false} className="static" />
    </div>
  );
}

/** מצבי טעינה / שגיאה / אין הרשאה של דף ישות (גם מעל נתוני דמה, דרך שכבת ה-API) */
export function EntityStatus({ status, onRetry, children }) {
  if (status === 'loading') return <div className="entity-status" aria-busy="true"><TableSkeleton rows={6} cols={4} /></div>;
  if (status === 'error') return <div className="entity-status"><ErrorState onRetry={onRetry} /></div>;
  if (status === 'forbidden') return <div className="entity-status"><ForbiddenState title="אין הרשאה לצפייה בדף זה" /></div>;
  return children;
}
