import { useEffect, useRef, useState } from "react";
/** מעטפת דף ישות: ניווט מקטעים בצד ההתחלה, גלילה מרכזית והדגשת המקטע הנוכחי */
export function EntityPage({ header, sections, resetKey, children }) {
  const scroller = useRef(null);
  const [active, setActive] = useState(sections[0]?.id);
  useEffect(() => {
    const root = scroller.current;
    if (!root) return;
    const io = new IntersectionObserver((es) => {
      const e = es.find((x) => x.isIntersecting);
      if (e) setActive(e.target.id);
    }, {
      root,
      rootMargin: "0px 0px -70% 0px"
    });
    sections.forEach((s) => {
      const n = root.querySelector("#" + s.id);
      if (n) io.observe(n);
    });
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey, sections.map((s) => s.id).join()]);
  const go = (id) => {
    setActive(id);
    scroller.current?.querySelector("#" + id)?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  };
  return <div className="entity">
      <nav className="entity-nav" aria-label="מקטעי הדף">
        {sections.map((s) => <a key={s.id} href={"#" + s.id} aria-current={active === s.id ? "location" : undefined} onClick={(e) => {
    e.preventDefault();
    go(s.id);
  }}>{s.label}</a>)}
      </nav>
      <div className="entity-scroll" ref={scroller}>
        <header className="entity-head">{header}</header>
        {children}
      </div>
    </div>;
}
export function EntityHead({ back, title, meta, badges, actions }) {
  return <div className="entity-head-row">
      <div className="entity-head-main">
        {back}
        <h1>{title}</h1>
        {meta && <div className="entity-meta">{meta}</div>}
        {badges && <div className="entity-badges">{badges}</div>}
      </div>
      {actions && <div className="entity-actions">{actions}</div>}
    </div>;
}
export function Source({ source, updated }) {
  return <span className="entity-src">{source} · עודכן <span className="mono" dir="ltr">{updated}</span></span>;
}
export function Section({ id, title, source, children }) {
  return <section id={id} className="entity-section" aria-labelledby={id + "-h"}>
      <div className="entity-section-head">
        <h2 id={id + "-h"}>{title}</h2>
        {source && <Source {...source} />}
      </div>
      {children}
    </section>;
}
/** שדות עם תווית מעל הערך: צפופים אך קריאים */
export function Facts({ items }) {
  return <dl className="ui-fact-grid">
      {items.map(([k, v]) => <div key={k} className="ui-fact"><dt>{k}</dt><dd>{v}</dd></div>)}
    </dl>;
}
export function Metrics({ items }) {
  return <dl className="ui-metrics">
      {items.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
    </dl>;
}
export function StaticTable({ caption, columns, rows, rowKey }) {
  return <div className="ui-table-scroll bordered">
      <table className="ui-table static">
        <caption className="sr-only">{caption}</caption>
        <thead><tr>{columns.map((c) => <th key={c.id} scope="col" className={c.align === "end" ? "end" : ""}><span className="ui-th-btn static">{c.label}</span></th>)}</tr></thead>
        <tbody>
          {rows.map((r) => <tr key={rowKey(r)}>{columns.map((c) => <td key={c.id} className={c.align === "end" ? "end" : ""}>{c.render(r)}</td>)}</tr>)}
        </tbody>
      </table>
    </div>;
}
