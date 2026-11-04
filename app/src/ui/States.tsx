import type { ReactNode } from 'react';
import { SearchX, TriangleAlert, Lock, Inbox } from 'lucide-react';
import Button from './Button';

function Box({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="ui-state" role="status">
      <span className="ui-state-icon" aria-hidden="true">{icon}</span>
      <strong>{title}</strong>
      {children}
    </div>
  );
}

export const EmptyState = ({ title, children }: { title: string; children?: ReactNode }) =>
  <Box icon={<Inbox size={20} />} title={title}>{children}</Box>;

export const NoResults = ({ onClear }: { onClear?: () => void }) => (
  <Box icon={<SearchX size={20} />} title="לא נמצאו חברות">
    <span>נסה להסיר מסנן או לשנות את הפרמטרים.</span>
    {onClear && <Button variant="secondary" onClick={onClear}>נקה את כל המסננים</Button>}
  </Box>
);

export const ErrorState = ({ onRetry }: { onRetry: () => void }) => (
  <div className="ui-state" role="alert">
    <span className="ui-state-icon error" aria-hidden="true"><TriangleAlert size={20} /></span>
    <strong>החיפוש נכשל</strong>
    <span>אירעה שגיאה בטעינת התוצאות. הפרמטרים נשמרו.</span>
    <Button variant="primary" onClick={onRetry}>נסה שוב</Button>
  </div>
);

export const ForbiddenState = ({ title = 'אין הרשאה לצפייה בנתוני חברות', children }: { title?: string; children?: ReactNode }) => (
  <Box icon={<Lock size={20} />} title={title}>
    <span>{children ?? 'פנה למנהל המערכת כדי לקבל הרשאה.'}</span>
  </Box>
);

export function TableSkeleton({ rows = 8, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="ui-skeleton" role="status" aria-label="טוען תוצאות">
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="ui-skel-row">
          {Array.from({ length: cols }, (_, c) => <span key={c} style={{ width: `${c === 0 ? 22 : 8 + ((r * 7 + c * 11) % 10)}%` }} />)}
        </div>
      ))}
    </div>
  );
}
