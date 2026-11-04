import { useEffect, useId, useMemo, useRef, useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';

export function Field({ label, id, children, hint }: { label: string; id: string; children: ReactNode; hint?: string }) {
  return (
    <div className="ui-field">
      <label htmlFor={id}>{label}</label>
      {children}
      {hint && <span className="ui-hint">{hint}</span>}
    </div>
  );
}

export function TextField({ label, hint, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  const id = useId();
  return <Field label={label} id={id} hint={hint}><input {...rest} id={id} className="ui-input" /></Field>;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: string[];
  placeholder?: string;
}
export function Select({ label, options, placeholder = 'הכל', ...rest }: SelectProps) {
  const id = useId();
  return (
    <Field label={label} id={id}>
      <div className="ui-select">
        <select {...rest} id={id} className="ui-input">
          <option value="">{placeholder}</option>
          {options.map(o => <option key={o}>{o}</option>)}
        </select>
        <ChevronDown size={16} aria-hidden="true" />
      </div>
    </Field>
  );
}

/** שדה עם השלמה: combobox לפי ARIA 1.2 וניווט מקלדת */
export function Autocomplete({ label, value, onChange, suggestions, placeholder, onEnter }: {
  label: string; value: string; onChange: (v: string) => void; suggestions: string[]; placeholder?: string; onEnter?: () => void;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const wrap = useRef<HTMLDivElement>(null);
  const matches = useMemo(() => {
    const q = value.trim().toLowerCase();
    return q ? suggestions.filter(s => s.toLowerCase().includes(q) && s.toLowerCase() !== q).slice(0, 6) : [];
  }, [value, suggestions]);
  const show = open && matches.length > 0;

  useEffect(() => {
    const h = (e: MouseEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const pick = (s: string) => { onChange(s); setOpen(false); setActive(-1); };
  return (
    <Field label={label} id={id}>
      <div className="ui-ac" ref={wrap}>
        <input
          id={id} className="ui-input" role="combobox" aria-expanded={show} aria-controls={id + '-list'} aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${id}-o${active}` : undefined} autoComplete="off"
          value={value} placeholder={placeholder}
          onChange={e => { onChange(e.target.value); setOpen(true); setActive(-1); }}
          onFocus={() => setOpen(true)}
          onKeyDown={e => {
            if (e.key === 'ArrowDown' && show) { e.preventDefault(); setActive(a => (a + 1) % matches.length); }
            else if (e.key === 'ArrowUp' && show) { e.preventDefault(); setActive(a => (a <= 0 ? matches.length - 1 : a - 1)); }
            else if (e.key === 'Escape') setOpen(false);
            else if (e.key === 'Enter') {
              if (show && active >= 0) { e.preventDefault(); pick(matches[active]); }
              else onEnter?.();
            }
          }}
        />
        {show && (
          <ul id={id + '-list'} role="listbox" className="ui-listbox">
            {matches.map((m, i) => (
              <li key={m} id={`${id}-o${i}`} role="option" aria-selected={i === active} className={i === active ? 'active' : ''}
                onMouseDown={e => { e.preventDefault(); pick(m); }}><span dir="ltr">{m}</span></li>
            ))}
          </ul>
        )}
      </div>
    </Field>
  );
}

/** טווח: סליידר כפול ושני שדות מספר מסונכרנים */
export function RangeField({ label, min, max, value, onChange }: {
  label: string; min: number; max: number; value: [number, number]; onChange: (v: [number, number]) => void;
}) {
  const id = useId();
  const [lo, hi] = value;
  const clamp = (n: number) => Math.min(max, Math.max(min, Number.isFinite(n) ? n : min));
  const setLo = (n: number) => onChange([Math.min(clamp(n), hi), hi]);
  const setHi = (n: number) => onChange([lo, Math.max(clamp(n), lo)]);
  const pct = (n: number) => ((n - min) / (max - min)) * 100;
  return (
    <fieldset className="ui-range">
      <legend>{label}</legend>
      <div className="ui-range-inputs">
        <div className="ui-field"><label htmlFor={id + 'a'}>מ-</label>
          <input id={id + 'a'} className="ui-input num" type="number" min={min} max={max} value={lo} onChange={e => setLo(+e.target.value)} dir="ltr" /></div>
        <span className="ui-range-dash" aria-hidden="true">–</span>
        <div className="ui-field"><label htmlFor={id + 'b'}>עד</label>
          <input id={id + 'b'} className="ui-input num" type="number" min={min} max={max} value={hi} onChange={e => setHi(+e.target.value)} dir="ltr" /></div>
      </div>
      <div className="ui-slider">
        <div className="ui-slider-track" />
        <div className="ui-slider-fill" style={{ insetInlineStart: pct(lo) + '%', insetInlineEnd: 100 - pct(hi) + '%' }} />
        <input type="range" min={min} max={max} value={lo} onChange={e => setLo(+e.target.value)} aria-label={`${label}, מינימום`} />
        <input type="range" min={min} max={max} value={hi} onChange={e => setHi(+e.target.value)} aria-label={`${label}, מקסימום`} />
      </div>
    </fieldset>
  );
}

export function CheckGroup<T extends string>({ legend, options, value, onChange, render }: {
  legend: string; options: readonly T[]; value: T[]; onChange: (v: T[]) => void; render?: (o: T) => ReactNode;
}) {
  const toggle = (o: T) => onChange(value.includes(o) ? value.filter(x => x !== o) : [...value, o]);
  return (
    <fieldset className="ui-checks">
      <legend>{legend}</legend>
      {options.map(o => (
        <label key={o} className="ui-check">
          <input type="checkbox" checked={value.includes(o)} onChange={() => toggle(o)} />
          <span>{render ? render(o) : o}</span>
        </label>
      ))}
    </fieldset>
  );
}
