import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import Button from './Button';

/**
 * ליבת הטבלה המשותפת ל-DataTable ול-StaticTable.
 * columns: { id, label, render(row), align?, sort?(row), badge?, headerExtra?, weight?, width?, group?, header? }
 *   weight: משקל רוחב יחסי; width: רוחב קבוע ב-px; header: תוכן מותאם לכותרת העמודה; group: עמודות סמוכות עם אותו group חולקות כותרת-על
 * sort/onSort: אם onSort קיים, כותרות העמודות הממיינות הן כפתורים.
 * onRowClick: הופך שורות לאינטראקטיביות (מקלדת, בחירה).
 */
export default function TableCore({ caption, columns, rows, rowKey, sort, onSort, onRowClick, selectedKey, stickyHead = true, className = '' }) {
  const weighted = columns.some((c) => c.weight || c.width);
  const total = columns.reduce((a, c) => a + (c.width ? 0 : (c.weight ?? 1)), 0);
  const grouped = columns.some((c) => c.group);
  const cellClass = (c) => [c.align === 'end' && 'end', c.width && `col-fixed w-${c.width}`].filter(Boolean).join(' ');

  const label = (c) => {
    if (c.header) return c.header;
    const dir = sort?.id === c.id ? sort.dir : null;
    return onSort && c.sort ? (
      <Button variant="th" onClick={() => onSort(c.id)}>
        {c.label}{c.headerExtra}{c.badge}
        {dir === 'asc' ? <ArrowUp size={16} aria-hidden="true" /> : dir === 'desc' ? <ArrowDown size={16} aria-hidden="true" /> : <ChevronsUpDown size={16} aria-hidden="true" className="dim" />}
      </Button>
    ) : <span className="ui-th">{c.srLabel ? <span className="sr-only">{c.srLabel}</span> : c.label}{c.headerExtra}{c.badge}</span>;
  };
  const ariaSort = (c) => {
    const dir = sort?.id === c.id ? sort.dir : null;
    return dir ? (dir === 'asc' ? 'ascending' : 'descending') : onSort && c.sort ? 'none' : undefined;
  };

  // כותרת דו-שורתית כשיש קבוצות: עמודות בלי קבוצה נמתחות על שתי השורות
  const topRow = [];
  if (grouped) {
    columns.forEach((c, i) => {
      if (!c.group) { topRow.push(<th key={c.id} scope="col" rowSpan={2} className={cellClass(c)} aria-sort={ariaSort(c)}>{label(c)}</th>); return; }
      if (columns[i - 1]?.group === c.group) return;
      const span = columns.slice(i).findIndex((x) => x.group !== c.group);
      topRow.push(<th key={`g-${c.group}`} scope="colgroup" colSpan={span === -1 ? columns.length - i : span} className="group" title={c.groupTitle}>{c.group}</th>);
    });
  }

  return (
    <table className={`ui-table ${onRowClick ? 'interactive' : ''} ${stickyHead ? 'sticky' : ''} ${weighted ? 'fixed' : ''} ${className}`.trim()}>
      <caption className="sr-only">{caption}</caption>
      {weighted && (
        <colgroup>
          {columns.map((c) => <col key={c.id} width={c.width ?? `${(((c.weight ?? 1) / total) * 100).toFixed(2)}%`} />)}
        </colgroup>
      )}
      <thead>
        {grouped ? (
          <>
            <tr>{topRow}</tr>
            <tr className="sub-head">
              {columns.filter((c) => c.group).map((c) => (
                <th key={c.id} scope="col" className={cellClass(c)} aria-sort={ariaSort(c)}>{label(c)}</th>
              ))}
            </tr>
          </>
        ) : (
          <tr>
            {columns.map((c) => <th key={c.id} scope="col" className={cellClass(c)} aria-sort={ariaSort(c)}>{label(c)}</th>)}
          </tr>
        )}
      </thead>
      <tbody>
        {rows.map((r) => {
          const k = rowKey(r);
          return (
            <tr key={k} className={selectedKey === k ? 'selected' : ''} aria-selected={onRowClick ? selectedKey === k : undefined}
              tabIndex={onRowClick ? 0 : undefined} onClick={() => onRowClick?.(r)}
              onKeyDown={(e) => { if (onRowClick && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onRowClick(r); } }}>
              {columns.map((c) => <td key={c.id} className={cellClass(c)}>{c.render(r)}</td>)}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/** מיון מקומי לפי sort = { id, dir } */
export function sortRows(rows, columns, sort) {
  const col = columns.find((c) => c.id === sort?.id);
  if (!col?.sort || !sort) return rows;
  const f = col.sort;
  const k = sort.dir === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const x = f(a), y = f(b);
    return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'he')) * k;
  });
}
