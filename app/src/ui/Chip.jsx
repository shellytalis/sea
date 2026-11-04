import { X } from 'lucide-react';

/** צ'יפ/תג יחיד: סטטי, או עם כפתור הסרה כשמועבר onRemove */
export default function Chip({ children, label, onRemove, removeLabel = 'הסר', className = '' }) {
  return (
    <span className={`ui-chip${onRemove ? ' removable' : ''} ${className}`.trim()}>
      {label ?? children}
      {onRemove && (
        <button type="button" className="ui-chip-x" onClick={onRemove} aria-label={removeLabel}>
          <X size={12} aria-hidden="true" />
        </button>
      )}
    </span>
  );
}
