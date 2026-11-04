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

/** מעבר למקטע לפי מזהה (לשימוש כרטיסים וקישורים בתוך הדף), דרך פריט הניווט שלו */
export const goSection = (id) => document.querySelector(`.entity-nav a[href="#${id}"]`)?.click();

const COLLAPSE_AT = 60;
const EXPAND_AT = 20;

/**
 * מעטפת דף ישות: כותרת-על דביקה (בתוך מיכל ברוחב מרבי וממורכז) שמתכווצת לשורה אחת בגלילה,
 * פס מסקנה מיד מתחתיה, ניווט מקטעים בצד ההתחלה (scrollspy) והמקטע הנוכחי נשמר ב-hash.
 */
export function EntityPage({ header, summary, sections, resetKey, children }) {
  const scroller = useRef(null);
  const head = useRef(null);
  const { hash } = useLocation();
  const [active, setActive] = useState(() => (sections.find((s) => `#${s.id}` === hash) ?? sections[0])?.id);
  const [compact, setCompact] = useState(false);
  const ids = sections.map((s) => s.id).join();

  // גובה הכותרת הדביקה, לשימוש ב-scroll-margin ובאזור הזיהוי של המקטע הנוכחי
  useEffect(() => {
    const root = scroller.current;
    if (!root || !head.current) return undefined;
    // --sbw: רוחב פס הגלילה. הוא יושב בתוך השוליים (32px משני הצדדים, מדידה עד קצה המסך)
    const sync = () => {
      root.style.setProperty('--head-h', `${head.current.offsetHeight}px`);
      root.style.setProperty('--sbw', `${root.offsetWidth - root.clientWidth}px`);
    };
    const ro = new ResizeObserver(sync);
    ro.observe(head.current);
    ro.observe(root);
    ro.observe(root.lastElementChild);
    return () => ro.disconnect();
  }, [resetKey]);

  // התכווצות הכותרת בגלילה (עם היסטרזיס, כדי שהשינוי בגובה לא יגרום להתנדנדות)
  useEffect(() => {
    const root = scroller.current;
    if (!root) return undefined;
    setCompact(false);
    const onScroll = () => setCompact((c) => (c ? root.scrollTop > EXPAND_AT : root.scrollTop > COLLAPSE_AT));
    root.addEventListener('scroll', onScroll, { passive: true });
    return () => root.removeEventListener('scroll', onScroll);
  }, [resetKey]);

  useEffect(() => {
    const root = scroller.current;
    if (!root) return undefined;
    const top = 64;
    const io = new IntersectionObserver((es) => {
      const e = es.find((x) => x.isIntersecting);
      if (!e) return;
      setActive(e.target.id);
      window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}#${e.target.id}`);
    }, { root, rootMargin: `-${top}px 0px -65% 0px` });
    sections.forEach((s) => { const n = root.querySelector(`#${s.id}`); if (n) io.observe(n); });
    // קישור עם hash: גלילה למקטע
    const target = hash && root.querySelector(hash);
    if (target) scrollToSection(root, target, 72, false);
    return () => io.disconnect();
  }, [resetKey, ids]); // eslint-disable-line react-hooks/exhaustive-deps

  const go = (id) => {
    setActive(id);
    const el = scroller.current?.querySelector(`#${id}`);
    if (el) scrollToSection(scroller.current, el, 72, true);
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
        <header className={`entity-head${compact ? ' compact' : ''}`} ref={head}><div className="entity-inner">{header}</div></header>
        <div className="entity-inner">
          {summary && <div className="entity-summary">{summary}</div>}
          {children}
        </div>
      </div>
    </div>
  );
}

/**
 * שם ומטא-דאטה בצד ההתחלה, והפעולות צמודות אליהם באותה שורה.
 * compactBadge: החיווי שנשאר ליד השם כשהכותרת מכווצת לשורה אחת (שם, חיווי, פעולות).
 */
export function EntityHead({ back, title, meta, badges, compactBadge, actions }) {
  return (
    <div className="entity-head-row">
      <div className="entity-head-main">
        {back}
        <div className="entity-title-line">
          <h1>{title}</h1>
          {compactBadge && <span className="entity-compact-badge">{compactBadge}</span>}
        </div>
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

/** מקטע: רצועת כותרת 40px (שם המקטע וחותמת המקור), 48px בין מקטעים, והתוכן ישירות על רקע הדף */
export function Section({ id, title, source, children }) {
  return (
    <section id={id} className="entity-section" aria-labelledby={`${id}-h`}>
      <div className="entity-section-head">
        <h2 id={`${id}-h`}>{title}</h2>
        {source && <><span className="entity-sep" aria-hidden="true">·</span><Source {...source} /></>}
      </div>
      <div className="entity-section-body">{children}</div>
    </section>
  );
}

/** שדה-ערך: דפוס יחיד. layout="grid" (תווית מעל הערך, בדפי ישות) או "list" (תווית וערך בשורה, במגירות) */
/** עמודות קבועות: עד 5 שדות בשורה אחת; מעל זה המחלק הגדול ביותר של הכמות עד 4 (בלי שדה יתום) */
const columnsFor = (n) => {
  if (n <= 5) return Math.max(n, 1);
  for (const c of [4, 3, 2]) if (n % c === 0) return c;
  return 4;
};

export function Facts({ items, layout = 'grid' }) {
  return (
    <dl className={`ui-facts ${layout}${layout === 'grid' ? ` cols-${columnsFor(items.length)}` : ''}`}>
      {items.map(([k, v]) => <div key={k} className="ui-fact"><dt>{k}</dt><dd>{v}</dd></div>)}
    </dl>
  );
}

/** קבוצת שדות. כותרת משנה רק כשיש יותר מקבוצה אחת במקטע: בקבוצה יחידה משתמשים ב-Facts ישירות */
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
