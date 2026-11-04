import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Columns3 } from 'lucide-react';
import Button from './Button';
import Popover from './Popover';
import TableCore, { sortRows } from './Table';
import { Ltr } from './Ltr';

export const PAGE_SIZES = [10, 25, 50];

/** ערך מבוקר כשהועבר, אחרת state פנימי */
function useControllable(value, onChange, initial) {
  const [inner, setInner] = useState(initial);
  const controlled = value !== undefined;
  return [controlled ? value : inner, (v) => { if (!controlled) setInner(v); onChange?.(v); }];
}

function ColumnManager({ cols, hidden, onToggle }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onClose={() => setOpen(false)} panelProps={{ role: 'group', 'aria-label': 'ניהול עמודות' }}
      anchor={<Button size="sm" icon={<Columns3 size={16} aria-hidden="true" />} aria-expanded={open} aria-haspopup="true" onClick={() => setOpen(!open)}>ניהול עמודות</Button>}>
      {cols.filter((c) => !c.noManage).map((c) => (
        <label key={c.id} className="ui-check">
          <input type="checkbox" checked={!hidden.includes(c.id)} disabled={c.locked} onChange={() => onToggle(c.id)} />
          <span>{c.label}{c.locked && <span className="ui-hint"> (חובה)</span>}</span>
        </label>
      ))}
    </Popover>
  );
}

/**
 * טבלת נתונים כמיכל אחד: שורת כלים (ניהול עמודות), כותרת, שורות בגובה קבוע ופוטר עימוד, הכול על אותו רקע.
 * כל חלקי המצב ניתנים לשליטה מבחוץ (למשל מה-URL): sort {id,dir}|null · page (0-based) · size · hidden.
 */
export default function DataTable({
  rows, columns, rowKey, onRowClick, selectedKey, caption, resetKey,
  sort: sortProp, onSortChange, page: pageProp, onPageChange, size: sizeProp, onSizeChange, hidden: hiddenProp, onHiddenChange,
}) {
  const [sort, setSort] = useControllable(sortProp, onSortChange, null);
  const [page, setPage] = useControllable(pageProp, onPageChange, 0);
  const [size, setSize] = useControllable(sizeProp, onSizeChange, PAGE_SIZES[1]);
  const [hidden, setHidden] = useControllable(hiddenProp, onHiddenChange, columns.filter((c) => c.hidden).map((c) => c.id));
  const scroller = useRef(null);
  const [scrolledX, setScrolledX] = useState(false);

  useEffect(() => { if (resetKey !== undefined && pageProp === undefined) setPage(0); }, [resetKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const visible = columns.filter((c) => !hidden.includes(c.id) || c.locked || c.noManage);
  const sorted = useMemo(() => sortRows(rows, columns, sort), [rows, columns, sort]);
  const pages = Math.max(1, Math.ceil(sorted.length / size));
  const cur = Math.min(page, pages - 1);
  const slice = sorted.slice(cur * size, cur * size + size);
  const from = sorted.length ? cur * size + 1 : 0;
  const to = Math.min(sorted.length, cur * size + size);
  const toggleSort = (id) => setSort(!sort || sort.id !== id ? { id, dir: 'asc' } : sort.dir === 'asc' ? { id, dir: 'desc' } : null);

  // עמודת השם דביקה רק כשיש גלילה אופקית, עם צל בשוליה
  const onScroll = () => setScrolledX(Math.abs(scroller.current?.scrollLeft ?? 0) > 1);

  return (
    <div className="ui-table-block">
      <div className="ui-table-toolbar">
        <ColumnManager cols={columns} hidden={hidden}
          onToggle={(id) => setHidden(hidden.includes(id) ? hidden.filter((x) => x !== id) : [...hidden, id])} />
      </div>
      <div className={`ui-table-scroll${scrolledX ? ' scrolled-x' : ''}`} ref={scroller} onScroll={onScroll}>
        <TableCore caption={caption} columns={visible} rows={slice} rowKey={rowKey} sort={sort} onSort={toggleSort}
          onRowClick={onRowClick} selectedKey={selectedKey} />
      </div>
      <div className="ui-pager">
        <label>שורות בעמוד
          <select className="ui-input sm" value={size} onChange={(e) => { setSize(+e.target.value); setPage(0); }}>
            {PAGE_SIZES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        <span className="ui-pager-range"><Ltr>{from}–{to}</Ltr> מתוך <Ltr>{sorted.length}</Ltr></span>
        <div className="ui-pager-nav">
          <Button variant="icon" size="sm" aria-label="העמוד הקודם" disabled={cur === 0} onClick={() => setPage(cur - 1)}><ChevronRight size={18} aria-hidden="true" /></Button>
          <Button variant="icon" size="sm" aria-label="העמוד הבא" disabled={cur >= pages - 1} onClick={() => setPage(cur + 1)}><ChevronLeft size={18} aria-hidden="true" /></Button>
        </div>
      </div>
    </div>
  );
}
