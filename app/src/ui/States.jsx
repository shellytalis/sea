import { TriangleAlert, Lock } from 'lucide-react';
import Button from './Button';

/**
 * מצב ריק/שגיאה: טקסט בלבד, מיושר להתחלה. שורה ראשונה 14px/500 משני, שנייה 13px מעומעם.
 * icon (אופציונלי, בלי עיגול) רק במצבי שגיאה/אין הרשאה/אין תוצאות, שבהם הוא נושא משמעות.
 */
function Box({ icon, title, children, role = 'status' }) {
  return (
    <div className="ui-state" role={role}>
      <strong>{icon && <span className="ui-state-icon" aria-hidden="true">{icon}</span>}{title}</strong>
      {children}
    </div>
  );
}

export const EmptyState = ({ title, children }) => <Box title={title}>{children}</Box>;

export const ErrorState = ({ onRetry, title = 'הטעינה נכשלה', children }) => (
  <Box icon={<TriangleAlert size={16} />} title={title} role="alert">
    <span>{children ?? 'אירעה שגיאה בטעינת הנתונים. המצב שלך נשמר.'}</span>
    {onRetry && <Button variant="primary" onClick={onRetry}>נסה שוב</Button>}
  </Box>
);

export const ForbiddenState = ({ title = 'אין הרשאה לצפייה בנתוני חברות', children }) => (
  <Box icon={<Lock size={16} />} title={title}>
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
