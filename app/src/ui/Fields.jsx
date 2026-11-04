import { useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import Chip from './Chip';
import Combobox from './Combobox';
import Popover from './Popover';
import { Mono } from './Ltr';

export function Field({ label, id, children, hint, className = '' }) {
  return (
    <div className={`ui-field ${className}`.trim()}>
      <label htmlFor={id}>{label}</label>
      {children}
      {hint && <span className="ui-hint">{hint}</span>}
    </div>
  );
}

export function TextField({ label, hint, className, ...rest }) {
  const id = useId();
  return <Field label={label} id={id} hint={hint} className={className}><input {...rest} id={id} className="ui-input" /></Field>;
}

export function Select({ label, options, placeholder = 'הכל', className, ...rest }) {
  const id = useId();
  return (
    <Field label={label} id={id} className={className}>
      <div className="ui-select">
        <select {...rest} id={id} className="ui-input">
          <option value="">{placeholder}</option>
          {options.map((o) => <option key={o}>{o}</option>)}
        </select>
        <ChevronDown size={16} aria-hidden="true" />
      </div>
    </Field>
  );
}

/** שדה עם השלמה: Combobox שבחירה בו ממלאת את הטקסט */
export function Autocomplete({ label, value, onChange, suggestions, placeholder, onEnter, className }) {
  const id = useId();
  const q = value.trim().toLowerCase();
  const items = q
    ? suggestions.filter((s) => s.toLowerCase().includes(q) && s.toLowerCase() !== q).slice(0, 6)
        .map((s) => ({ key: s, text: s, render: () => <Mono>{s}</Mono> }))
    : [];
  return (
    <Field label={label} id={id} className={className}>
      <Combobox id={id} value={value} onChange={onChange} onEnter={onEnter} placeholder={placeholder}
        groups={[{ id: 'all', items }]} onSelect={(it) => onChange(it.text)} />
    </Field>
  );
}

/** בחירה מרובה כ-dropdown: הנבחרים מוצגים כצ'יפים בתוך השדה */
export function MultiSelect({ label, options, value, onChange, placeholder = 'הכל' }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const toggle = (o) => onChange(value.includes(o) ? value.filter((x) => x !== o) : [...value, o]);
  return (
    <Field label={label} id={id}>
      <Popover open={open} onClose={() => setOpen(false)} fit panelProps={{ role: 'group', 'aria-label': label }}
        anchor={
          <div className="ui-input ui-multi">
            {value.map((v) => <Chip key={v} label={v} removeLabel={`הסר ${v}`} onRemove={() => toggle(v)} />)}
            <button type="button" id={id} className="ui-multi-toggle" aria-expanded={open} aria-haspopup="true"
              onClick={() => setOpen(!open)}>
              {value.length === 0 && <span className="ui-multi-ph">{placeholder}</span>}
              <ChevronDown size={16} aria-hidden="true" />
            </button>
          </div>
        }>
        {options.map((o) => (
          <label key={o} className="ui-check">
            <input type="checkbox" checked={value.includes(o)} onChange={() => toggle(o)} />
            <span>{o}</span>
          </label>
        ))}
      </Popover>
    </Field>
  );
}

/** טווח: שני שדות מספר מסונכרנים (בלי סליידר: הוא לא מוסיף דיוק) */
export function RangeField({ label, min, max, value, onChange }) {
  const id = useId();
  const [lo, hi] = value;
  const clamp = (n) => Math.min(max, Math.max(min, Number.isFinite(n) ? n : min));
  return (
    <div className="ui-range" role="group" aria-labelledby={id + "l"}>
      <span id={id + "l"} className="ui-label">{label}</span>
      <div className="ui-range-inputs">
        <input id={id + 'a'} className="ui-input num" type="number" min={min} max={max} value={lo} aria-label={`${label}, מ-`}
          onChange={(e) => onChange([Math.min(clamp(+e.target.value), hi), hi])} dir="ltr" />
        <span className="ui-range-dash" aria-hidden="true">–</span>
        <input id={id + 'b'} className="ui-input num" type="number" min={min} max={max} value={hi} aria-label={`${label}, עד`}
          onChange={(e) => onChange([lo, Math.max(clamp(+e.target.value), lo)])} dir="ltr" />
      </div>
    </div>
  );
}

export function CheckGroup({ legend, options, value, onChange, render }) {
  const toggle = (o) => onChange(value.includes(o) ? value.filter((x) => x !== o) : [...value, o]);
  return (
    <fieldset className="ui-checks">
      <legend>{legend}</legend>
      {options.map((o) => (
        <label key={o} className="ui-check">
          <input type="checkbox" checked={value.includes(o)} onChange={() => toggle(o)} />
          <span>{render ? render(o) : o}</span>
        </label>
      ))}
    </fieldset>
  );
}
