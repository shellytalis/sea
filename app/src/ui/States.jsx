import { SearchX, TriangleAlert, Lock, Inbox } from 'lucide-react';
import Button from './Button';

function Box({ icon, title, children, role = 'status', compact }) {
  return (
    <div className={`ui-state${compact ? ' compact' : ''}`} role={role}>
      <span className="ui-state-icon" aria-hidden="true">{icon}</span>
      <strong>{title}</strong>
      {children}
    </div>
  );
}

export const EmptyState = ({ title, children, compact }) => <Box icon={<Inbox size={20} />} title={title} compact={compact}>{children}</Box>;

export const NoResults = ({ onClear, title = 'לא נמצאו חברות', clearLabel = 'נקה את כל המסננים' }) => (
  <Box icon={<SearchX size={20} />} title={title}>
    <span>נסה להסיר מסנן או לשנות את הפרמטרים.</span>
    {onClear && <Button onClick={onClear}>{clearLabel}</Button>}
  </Box>
);

export const ErrorState = ({ onRetry, title = 'הטעינה נכשלה', children }) => (
  <Box icon={<TriangleAlert size={20} />} title={title} role="alert">
    <span>{children ?? 'אירעה שגיאה בטעינת הנתונים. המצב שלך נשמר.'}</span>
    {onRetry && <Button variant="primary" onClick={onRetry}>נסה שוב</Button>}
  </Box>
);

export const ForbiddenState = ({ title = 'אין הרשאה לצפייה בנתוני חברות', children }) => (
  <Box icon={<Lock size={20} />} title={title}>
    <span>{children ?? 'פנה למנהל המערכת כדי לקבל הרשאה.'}</span>
  </Box>
);

/** שלד טבלה: רוחב התאים נקבע ב-CSS לפי nth-child */
export function TableSkeleton({ rows = 8, cols = 6 }) {
  return (
    <div className="ui-skeleton" role="status" aria-label="טוען תוצאות">
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="ui-skel-row">
          {Array.from({ length: cols }, (_, c) => <span key={c} />)}
        </div>
      ))}
    </div>
  );
}
