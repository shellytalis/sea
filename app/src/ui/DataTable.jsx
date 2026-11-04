import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsUpDown, Columns3 } from "lucide-react";
import { useDensity } from "./prefs";
import Button from "./Button";
const PAGE_SIZES = [
  10,
  25,
  50
];
function ColumnManager({ cols, hidden, onToggle }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const h = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false);
    };
    const k = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", h);
    document.addEventListener("keydown", k);
    return () => {
      document.removeEventListener("mousedown", h);
      document.removeEventListener("keydown", k);
    };
  }, [open]);
  return <div className="ui-pop-wrap" ref={ref}>
      <Button variant="secondary" icon={<Columns3 size={16} aria-hidden="true" />} aria-expanded={open} aria-haspopup="true" onClick={() => setOpen(!open)}>ניהול עמודות</Button>
      {open && <div className="ui-pop" role="group" aria-label="ניהול עמודות">
          {cols.map((c) => <label key={c.id} className="ui-check">
              <input type="checkbox" checked={!hidden.has(c.id)} disabled={c.locked} onChange={() => onToggle(c.id)} />
              <span>{c.label}{c.locked && <span className="ui-hint"> (חובה)</span>}</span>
            </label>)}
        </div>}
    </div>;
}
export function DensityToggle() {
  const { density, setDensity } = useDensity();
  return <div className="ui-seg" role="group" aria-label="צפיפות תצוגה">
      {["comfortable", "compact"].map((d) => <button key={d} type="button" aria-pressed={density === d} onClick={() => setDensity(d)}>{d === "comfortable" ? "נוח" : "דחוס"}</button>)}
    </div>;
}
export default function DataTable({ rows, columns, rowKey, onRowClick, selectedKey, caption, resetKey }) {
  const [sort, setSort] = useState(null);
  const [hidden, setHidden] = useState(() => new Set(columns.filter((c) => c.hidden).map((c) => c.id)));
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(PAGE_SIZES[0]);
  useEffect(() => {
    setPage(0);
  }, [resetKey, size]);
  const visible = columns.filter((c) => !hidden.has(c.id));
  const sorted = useMemo(() => {
    const col = columns.find((c) => c.id === sort?.id);
    if (!col?.sort || !sort) return rows;
    const f = col.sort;
    const k = sort.dir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const x = f(a), y = f(b);
      return (typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), "he")) * k;
    });
  }, [
    rows,
    columns,
    sort
  ]);
  const pages = Math.max(1, Math.ceil(sorted.length / size));
  const cur = Math.min(page, pages - 1);
  const slice = sorted.slice(cur * size, cur * size + size);
  const from = sorted.length ? cur * size + 1 : 0;
  const toggleSort = (id) => setSort((s) => !s || s.id !== id ? {
    id,
    dir: "asc"
  } : s.dir === "asc" ? {
    id,
    dir: "desc"
  } : null);
  return <div className="ui-table-block">
      <div className="ui-table-toolbar">
        <ColumnManager cols={columns} hidden={hidden} onToggle={(id) => setHidden((h) => {
    const n = new Set(h);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    return n;
  })} />
        <DensityToggle />
      </div>
      <div className="ui-table-scroll">
        <table className="ui-table">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr>
              {visible.map((c) => {
    const dir = sort?.id === c.id ? sort.dir : null;
    return <th key={c.id} scope="col" className={c.align === "end" ? "end" : ""} aria-sort={dir ? dir === "asc" ? "ascending" : "descending" : c.sort ? "none" : undefined}>
                    {c.sort ? <button type="button" onClick={() => toggleSort(c.id)} className="ui-th-btn">
                        {c.label}{c.badge}
                        {dir === "asc" ? <ArrowUp size={14} aria-hidden="true" /> : dir === "desc" ? <ArrowDown size={14} aria-hidden="true" /> : <ChevronsUpDown size={14} aria-hidden="true" className="dim" />}
                      </button> : <span className="ui-th-btn static">{c.label}{c.badge}</span>}
                  </th>;
  })}
            </tr>
          </thead>
          <tbody>
            {slice.map((r) => {
    const k = rowKey(r);
    return <tr key={k} className={selectedKey === k ? "selected" : ""} aria-selected={onRowClick ? selectedKey === k : undefined} tabIndex={onRowClick ? 0 : undefined} onClick={() => onRowClick?.(r)} onKeyDown={(e) => {
      if (onRowClick && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        onRowClick(r);
      }
    }}>
                  {visible.map((c) => <td key={c.id} className={c.align === "end" ? "end" : ""}>{c.render(r)}</td>)}
                </tr>;
  })}
          </tbody>
        </table>
      </div>
      <div className="ui-pager">
        <label>שורות בעמוד
          <select className="ui-input sm" value={size} onChange={(e) => setSize(+e.target.value)}>{PAGE_SIZES.map((s) => <option key={s}>{s}</option>)}</select>
        </label>
        <span className="ui-pager-range" dir="ltr">{from}–{Math.min(sorted.length, cur * size + size)} / {sorted.length}</span>
        <div className="ui-pager-nav">
          <button type="button" className="ui-icon-btn" aria-label="העמוד הקודם" disabled={cur === 0} onClick={() => setPage(cur - 1)}><ChevronRight size={18} aria-hidden="true" /></button>
          <button type="button" className="ui-icon-btn" aria-label="העמוד הבא" disabled={cur >= pages - 1} onClick={() => setPage(cur + 1)}><ChevronLeft size={18} aria-hidden="true" /></button>
        </div>
      </div>
    </div>;
}
