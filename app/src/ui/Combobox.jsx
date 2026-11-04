import { useId, useMemo, useState } from 'react';
import Popover from './Popover';

/**
 * Combobox יחיד (ARIA 1.2): ניווט חיצים, Enter, Esc, תוצאות מקובצות.
 * groups: [{ id, label?, items: [{ key, text, render?() }] }]  (text = מה שנכנס לשדה בבחירה)
 * onSelect(item, group): נקרא בבחירה (Enter או לחיצה).
 * onEnter(): Enter בלי פריט נבחר. emptyText: מוצג כשיש טקסט ואין תוצאות.
 */
export default function Combobox({
  id: idProp, value, onChange, groups, onSelect, onEnter, placeholder, emptyText, ariaLabel, className = '', inputClassName = 'ui-input',
}) {
  const auto = useId();
  const id = idProp ?? auto;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const flat = useMemo(() => groups.flatMap((g) => g.items.map((it) => ({ it, g }))), [groups]);
  const hasText = value.trim().length > 0;
  const showList = open && flat.length > 0;
  const showEmpty = open && hasText && flat.length === 0 && !!emptyText;
  const close = () => { setOpen(false); setActive(-1); };
  const pick = (entry) => { onSelect?.(entry.it, entry.g); close(); };

  const onKey = (e) => {
    if (e.key === 'ArrowDown' && flat.length) {
      e.preventDefault(); setOpen(true); setActive((a) => (a + 1) % flat.length);
    } else if (e.key === 'ArrowUp' && flat.length) {
      e.preventDefault(); setOpen(true); setActive((a) => (a <= 0 ? flat.length - 1 : a - 1));
    } else if (e.key === 'Enter') {
      if (showList && active >= 0) { e.preventDefault(); pick(flat[active]); }
      else onEnter?.();
    }
  };

  let n = -1;
  return (
    <Popover open={showList || showEmpty} onClose={close} fit className="ui-listbox"
      panelProps={showList ? { id: `${id}-list`, role: 'listbox', 'aria-label': ariaLabel } : { role: 'status' }}
      anchor={
        <input id={id} className={`${inputClassName} ${className}`.trim()} role="combobox" autoComplete="off"
          aria-expanded={showList} aria-controls={showList ? `${id}-list` : undefined} aria-autocomplete="list"
          aria-label={ariaLabel} aria-activedescendant={active >= 0 && showList ? `${id}-o${active}` : undefined}
          value={value} placeholder={placeholder}
          onChange={(e) => { onChange(e.target.value); setOpen(true); setActive(-1); }}
          onFocus={() => setOpen(true)} onKeyDown={onKey} />
      }>
      {showEmpty && <div className="ui-listbox-empty">{emptyText}</div>}
      {showList && groups.filter((g) => g.items.length).map((g) => (
        <div key={g.id} role="group" aria-label={g.label} className="ui-listbox-group">
          {g.label && <div className="ui-listbox-label" aria-hidden="true">{g.label}</div>}
          {g.items.map((it) => {
            n += 1;
            const i = n;
            return (
              <div key={it.key} id={`${id}-o${i}`} role="option" aria-selected={i === active}
                className={`ui-option${i === active ? ' active' : ''}`}
                onMouseDown={(e) => { e.preventDefault(); pick(flat[i]); }}
                onMouseMove={() => setActive(i)}>
                {it.render ? it.render() : it.text}
              </div>
            );
          })}
        </div>
      ))}
    </Popover>
  );
}
