import { useEffect, useState } from 'react';
import { Check, ChevronDown, Copy, Eye, EyeOff, Trash2, X } from 'lucide-react';
import Panel from '../../ui/Panel';
import Button from '../../ui/Button';
import { Ltr, Mono, Num } from '../../ui/Ltr';
import { KIND_LABEL, inRange, metrics } from '../../map/scene';
import { UNITS, formatArea, formatBearing, formatDistance, fromUnit, toUnit } from '../../map/units';

const NAMES = { distance: 'מרחק', radius: 'רדיוס חופשי', area: 'שטח', prox: 'מעגלי קרבה' };

/** מדד: תווית 12 משנית, ערך 16/600 tabular, יחידה 12 */
function Readout({ label, value, unit }) {
  return (
    <div className="mt-readout">
      <span className="mt-readout-label">{label}</span>
      <span className="mt-readout-value">
        <Num className="mt-num">{value}</Num>
        {unit && <span className="mt-readout-unit">{unit}</span>}
      </span>
    </div>
  );
}

function UnitSelect({ unit, onChange }) {
  return (
    <div className="mt-seg" role="radiogroup" aria-label="יחידת מידה">
      {Object.entries(UNITS).map(([id, u]) => (
        <button key={id} type="button" role="radio" aria-checked={unit === id} className={unit === id ? 'active' : ''} onClick={() => onChange(id)}>
          {u.label}
        </button>
      ))}
    </div>
  );
}

/** שדה מספר ביחידה הנוכחית. מחזיר מטרים דרך onValue. */
function NumberField({ meters, unit, onValue, label, disabled }) {
  const shown = meters > 0 ? String(+toUnit(meters, unit).toFixed(UNITS[unit].decimals + 1)) : '';
  const [text, setText] = useState(shown);
  useEffect(() => setText(shown), [shown]);
  return (
    <input className="ui-input sm mt-field" type="text" inputMode="decimal" dir="ltr" aria-label={label} value={text} disabled={disabled}
      onChange={(e) => {
        setText(e.target.value);
        const n = Number(e.target.value);
        if (Number.isFinite(n) && n > 0) onValue(fromUnit(n, unit));
      }} />
  );
}

function CopyButton({ lines }) {
  const [done, setDone] = useState(false);
  useEffect(() => { if (!done) return undefined; const t = setTimeout(() => setDone(false), 1500); return () => clearTimeout(t); }, [done]);
  return (
    <Button size="sm" disabled={!lines.length} icon={done ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
      onClick={async () => { try { await navigator.clipboard.writeText(lines.join('\n')); setDone(true); } catch { /* אין הרשאת לוח */ } }}>
      {done ? 'הועתק' : 'העתק'}
    </Button>
  );
}

const fd = (m, unit) => formatDistance(m, unit);
const coord = (c) => `${Math.abs(c[1]).toFixed(4)}°${c[1] >= 0 ? 'N' : 'S'} ${Math.abs(c[0]).toFixed(4)}°${c[0] >= 0 ? 'E' : 'W'}`;

function SavedList({ items, selId, unit, max, onSelect, onToggle, onDelete }) {
  const label = (it, i) => {
    const same = items.filter((x) => x.kind === it.kind);
    const n = same.indexOf(it) + 1;
    const mm = metrics(it);
    let val = '';
    if (it.kind === 'distance') val = Object.values(fd(mm.total, unit)).join(' ');
    if (it.kind === 'radius') val = Object.values(fd(it.radius, unit)).join(' ');
    if (it.kind === 'area') { const a = formatArea(mm.area, unit); val = `${a.value} ${a.unit}`; }
    return { text: `${KIND_LABEL[it.kind]} ${n}`, val, i };
  };
  return (
    <div className="mt-saved">
      <h3>מדידות שמורות <Num>{items.length}/{max}</Num></h3>
      {items.length === 0 ? <p className="mt-empty">מדידה שהושלמה נשמרת כאן.</p> : (
        <ul>
          {items.map((it, i) => {
            const l = label(it, i);
            return (
              <li key={it.id} className={it.id === selId ? 'selected' : ''}>
                <button type="button" className="mt-saved-main" onClick={() => onSelect(it.id)} aria-pressed={it.id === selId}>
                  <span className="mt-saved-name">{l.text}</span>
                  <Num className="mt-saved-val">{l.val}</Num>
                </button>
                <Button variant="icon" size="sm" aria-label={it.visible ? `הסתר ${l.text}` : `הצג ${l.text}`} onClick={() => onToggle(it.id)}
                  icon={it.visible ? <Eye size={16} aria-hidden="true" /> : <EyeOff size={16} aria-hidden="true" />} />
                <Button variant="icon" size="sm" aria-label={`מחק ${l.text}`} onClick={() => onDelete(it.id)} icon={<Trash2 size={16} aria-hidden="true" />} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** פאנל יחיד (320px) לכלים הכלליים */
export function GeneralPanel({ tool, live, m, unit, setUnit, items, selId, max, onSelect, onToggle, onDelete, onClose, onClearCurrent, onRadius }) {
  const rows = [];
  const copy = [];
  if (m) {
    if (tool === 'distance') {
      const t = fd(m.total, unit);
      rows.push(['מרחק כולל', t.value, t.unit], ['קטעים', String(m.segments)], ['כיוון (קטע אחרון)', m.bearing == null ? '—' : formatBearing(m.bearing)]);
      copy.push(`מרחק כולל: ${t.value} ${t.unit}`, `קטעים: ${m.segments}`, m.bearing == null ? '' : `כיוון: ${formatBearing(m.bearing)}`);
    } else if (tool === 'area') {
      const a = formatArea(m.area, unit);
      const p = fd(m.perimeter, unit);
      rows.push(['שטח', a.value, a.unit], ['היקף', p.value, p.unit], ['נקודות', String(m.points)]);
      copy.push(`שטח: ${a.value} ${a.unit}`, `היקף: ${p.value} ${p.unit}`);
    } else {
      const c = fd(m.circumference, unit);
      const a = formatArea(circleAreaOf(m.radius), unit);
      rows.push(['היקף', c.value, c.unit], ['שטח', a.value, a.unit]);
      copy.push(`מרכז: ${coord(m.center)}`, `רדיוס: ${fd(m.radius, unit).value} ${fd(m.radius, unit).unit}`, `היקף: ${c.value} ${c.unit}`, `שטח: ${a.value} ${a.unit}`);
    }
  }
  return (
    <Panel id="mt-panel" title={NAMES[tool]} className="mt-panel"
      actions={<Button variant="icon" size="sm" aria-label="סגירת הכלי" onClick={onClose} icon={<X size={16} aria-hidden="true" />} />}>
      <UnitSelect unit={unit} onChange={setUnit} />
      {tool === 'radius' && (
        <div className="mt-field-row">
          <label>
            <span className="mt-readout-label">רדיוס ({UNITS[unit].short})</span>
            <NumberField meters={m?.radius ?? 0} unit={unit} label="רדיוס" disabled={!m || !m.center} onValue={onRadius} />
          </label>
          <div className="mt-readout">
            <span className="mt-readout-label">מרכז</span>
            <span className="mt-readout-coord">{m?.center ? <Mono>{coord(m.center)}</Mono> : '—'}</span>
          </div>
        </div>
      )}
      {m ? (
        <div className="mt-readouts">{rows.map(([l, v, u]) => <Readout key={l} label={l} value={v} unit={u} />)}</div>
      ) : (
        <p className="mt-empty">{tool === 'radius' ? 'לחץ על המפה כדי לבחור מרכז.' : 'לחץ על המפה כדי להתחיל במדידה.'}</p>
      )}
      <div className="mt-actions">
        <CopyButton lines={copy.filter(Boolean)} />
        <Button size="sm" disabled={!live} onClick={onClearCurrent}>נקה</Button>
      </div>
      <SavedList items={items} selId={selId} unit={unit} max={max} onSelect={onSelect} onToggle={onToggle} onDelete={onDelete} />
    </Panel>
  );
}

const circleAreaOf = (r) => Math.PI * r * r;

/** פאנל מעגלי קרבה: שם הכלי בכותרת, עד שלושה מעגלים עם ספירת כלים בטווח */
export function ProximityPanel({ vessel, vessels, radii, visible, unit, setUnit, onRadii, onToggle, onClear, onClose, onPickVessel }) {
  const [open, setOpen] = useState(null);
  const copy = radii.map((r, i) => `מעגל ${i + 1}: ${fd(r, unit).value} ${fd(r, unit).unit} · ${inRange(vessel, r, vessels).length} כלים בטווח`);
  return (
    <Panel id="mt-panel" title={NAMES.prox} meta={<Ltr>{vessel.name}</Ltr>} className="mt-panel"
      actions={<Button variant="icon" size="sm" aria-label="סגירת הכלי" onClick={onClose} icon={<X size={16} aria-hidden="true" />} />}>
      <UnitSelect unit={unit} onChange={setUnit} />
      <ul className="mt-circles">
        {radii.map((r, i) => {
          const found = inRange(vessel, r, vessels);
          const isOpen = open === i;
          return (
            <li key={i}>
              <div className="mt-circle-head">
                <span className="mt-circle-name">מעגל {i + 1}</span>
                <NumberField meters={r} unit={unit} label={`רדיוס מעגל ${i + 1}`} onValue={(m) => onRadii(radii.map((x, j) => (j === i ? m : x)))} />
                <span className="mt-readout-unit">{UNITS[unit].short}</span>
              </div>
              <button type="button" className="mt-range" aria-expanded={isOpen} disabled={found.length === 0} onClick={() => setOpen(isOpen ? null : i)}>
                <span className="mt-readout-label">כלים בטווח</span>
                <Num className="mt-num">{found.length}</Num>
                <ChevronDown size={16} aria-hidden="true" className={isOpen ? 'flip' : ''} />
              </button>
              {isOpen && (
                <ul className="mt-range-list">
                  {found.map(({ v, d }) => (
                    <li key={v.id}>
                      <button type="button" onClick={() => onPickVessel(v.id)}>
                        <Ltr className="cell-name">{v.name}</Ltr>
                        <Num className="mt-saved-val">{fd(d, unit).value} {fd(d, unit).unit}</Num>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
      <div className="mt-actions">
        <CopyButton lines={copy} />
        <Button size="sm" onClick={onToggle}>{visible ? 'הסתר' : 'הצג'}</Button>
        <Button size="sm" onClick={onClear}>נקה</Button>
      </div>
    </Panel>
  );
}
