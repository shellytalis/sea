import { useId, useState } from 'react';

/**
 * לשוניות (ARIA tablist): חיצים ימינה/שמאלה, Home/End.
 * tabs: [{ id, label, content }]
 */
export default function Tabs({ tabs, label }) {
  const base = useId();
  const [cur, setCur] = useState(tabs[0].id);
  const idx = tabs.findIndex((t) => t.id === cur);
  const move = (e) => {
    // ב-RTL חץ שמאלה מתקדם ללשונית הבאה
    const next = e.key === 'ArrowLeft' ? idx + 1 : e.key === 'ArrowRight' ? idx - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : null;
    if (next === null) return;
    e.preventDefault();
    const t = tabs[(next + tabs.length) % tabs.length];
    setCur(t.id);
    document.getElementById(`${base}-t-${t.id}`)?.focus();
  };
  return (
    <div className="ui-tabs">
      <div role="tablist" aria-label={label} className="ui-tablist" onKeyDown={move}>
        {tabs.map((t) => (
          <button key={t.id} id={`${base}-t-${t.id}`} role="tab" type="button" aria-selected={cur === t.id}
            aria-controls={`${base}-p-${t.id}`} tabIndex={cur === t.id ? 0 : -1} onClick={() => setCur(t.id)}>{t.label}</button>
        ))}
      </div>
      {tabs.map((t) => (
        <div key={t.id} id={`${base}-p-${t.id}`} role="tabpanel" aria-labelledby={`${base}-t-${t.id}`} hidden={cur !== t.id} className="ui-tabpanel">
          {cur === t.id && t.content}
        </div>
      ))}
    </div>
  );
}
