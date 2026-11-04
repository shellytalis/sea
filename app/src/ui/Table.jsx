import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import Button from './Button';

/**
 * ליבת הטבלה המשותפת ל-DataTable ול-StaticTable.
 * columns: { id, label, render(row), align?, sort?(row), badge? }
 * sort/onSort: אם onSort קיים, כותרות העמודות הממיינות הן כפתורים.
 * onRowClick: הופך שורות לאינטראקטיביות (מקלדת, בחירה).
 */
export default function TableCore({ caption, columns, rows, rowKey, sort, onSort, onRowClick, selectedKey, stickyHead = true, className = '' }) {
  return (
    <table className={`ui-table ${onRowClick ? 'interactive' : ''} ${stickyHead ? 'sticky' : ''} ${className}`.trim()}>
      <caption className="sr-only">{caption}</caption>
      <thead>
        <tr>
          {columns.map((c) => {
            const dir = sort?.id === c.id ? sort.dir : null;
            return (
              <th key={c.id} scope="col" className={c.align === 'end' ? 'end' : ''}
                aria-sort={dir ? (dir === 'asc' ? 'ascending' : 'descending') : onSort && c.sort ? 'none' : undefined}>
                {onSort && c.sort ? (
                  <Button variant="th" onClick={() => onSort(c.id)}
>
                    {c.label}{c.headerExtra}{c.badge}
                    {dir === 'asc' ? <ArrowUp size={14} aria-hidden="true" /> : dir === 'desc' ? <ArrowDown size={14} aria-hidden="true" /> : <ChevronsUpDown size={14} aria-hidden="true" className="dim" />}
                  </Button>
                ) : <span className="ui-th">{c.label}{c.headerExtra}{c.badge}</span>}
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const k = rowKey(r);
          return (
            <tr key={k} className={selectedKey === k ? 'selected' : ''} aria-selected={onRowClick ? selectedKey === k : undefined}
              tabIndex={onRowClick ? 0 : undefined} onClick={() => onRowClick?.(r)}
              onKeyDown={(e) => { if (onRowClick && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onRowClick(r); } }}>
              {columns.map((c) => <td key={c.id} className={c.align === 'end' ? 'end' : ''}>{c.render(r)}</td>)}
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
