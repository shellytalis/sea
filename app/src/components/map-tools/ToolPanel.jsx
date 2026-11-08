import { useEffect, useState } from 'react';
import { Check, ChevronDown, Copy, Eye, EyeOff, Search, Trash2, X } from 'lucide-react';
import Combobox from '../../ui/Combobox';
import { searchPorts } from '../../data/ports';
import { ROUTE_WINDOWS } from '../../map/route';
import Panel from '../../ui/Panel';
import Button from '../../ui/Button';
import { Ltr, Mono, Num } from '../../ui/Ltr';
import { COMPARE_KNOTS, KIND_LABEL, inRange, metrics } from '../../map/scene';
import { elevationAt } from '../../map/elevation';
import { LISTS } from '../../data/vessels';
import { UNITS, formatArea, formatBearing, formatDistance, formatDuration, formatEta, fromUnit, toUnit, travelHours } from '../../map/units';

const NAMES = { distance: 'מרחק', radius: 'רדיוס חופשי', area: 'שטח', time: 'חישוב זמנים', height: 'גובה ופרופיל', terrain: 'חקירת שטח', prox: 'מעגלי קרבה', route: 'מסלול', arrival: 'חישוב הגעה' };

/** מדד: תווית 12 משנית, ערך 16/600 tabular, יחידה 12 */
function Readout({ label, value, unit, wide }) {
  return (
    <div className={`mt-readout${wide ? ' wide' : ''}`}>
      <span className="mt-readout-label">{label}</span>
      <span className="mt-readout-value">
        {/[א-ת]/.test(value) ? <bdi className="num mt-num">{value}</bdi> : <Num className="mt-num">{value}</Num>}
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
    if (it.kind === 'time') val = formatDuration(mm.hours);
    if (it.kind === 'height') val = Object.values(fd(mm.total, unit)).join(' ');
    if (it.kind === 'terrain') val = Object.values(fd(it.radius, unit)).join(' ');
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
                  {/[א-ת]/.test(l.val) ? <bdi className="num mt-saved-val">{l.val}</bdi> : <Num className="mt-saved-val">{l.val}</Num>}
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
export function GeneralPanel({ tool, onSpeed, hits, onPickVessel, onHover, watch, onAddToList, live, m, unit, setUnit, items, selId, max, onSelect, onToggle, onDelete, onClose, onClearCurrent, onRadius }) {
  const rows = [];
  const copy = [];
  if (m) {
    if (tool === 'distance') {
      const t = fd(m.total, unit);
      rows.push(['מרחק כולל', t.value, t.unit], ['קטעים', String(m.segments)], ['כיוון (קטע אחרון)', m.bearing == null ? '—' : formatBearing(m.bearing)]);
      copy.push(`מרחק כולל: ${t.value} ${t.unit}`, `קטעים: ${m.segments}`, m.bearing == null ? '' : `כיוון: ${formatBearing(m.bearing)}`);
    } else if (tool === 'time') {
      const t = fd(m.total, unit);
      rows.push(['מרחק כולל', t.value, t.unit], ['משך', formatDuration(m.hours)], ['שעת הגעה (יציאה עכשיו)', formatEta(Date.now() + m.hours * 36e5)]);
      copy.push(`מרחק כולל: ${t.value} ${t.unit}`, `מהירות: ${m.knots} קשר`, `משך: ${formatDuration(m.hours)}`, `שעת הגעה: ${formatEta(Date.now() + m.hours * 36e5)}`);
    } else if (tool === 'height') {
      const conv = (v) => String(unit === 'ft' ? Math.round(v / 0.3048) : Math.round(v));
      const hu = unit === 'ft' ? 'ft' : 'm';
      const t = fd(m.total, unit);
      if (m.points < 2) {
        rows.push(['גובה/עומק בנקודה', conv(m.stats.max.h), hu]);
        copy.push(`גובה/עומק בנקודה: ${conv(m.stats.max.h)} ${hu}`);
      } else {
        rows.push(['מרחק קו', t.value, t.unit], ['נקודה גבוהה', conv(m.stats.max.h), hu], ['נקודה נמוכה', conv(m.stats.min.h), hu], ['עלייה מצטברת', conv(m.stats.ascent), hu]);
        copy.push(`מרחק קו: ${t.value} ${t.unit}`, `נקודה גבוהה: ${conv(m.stats.max.h)} ${hu}`, `נקודה נמוכה: ${conv(m.stats.min.h)} ${hu}`, `עלייה מצטברת: ${conv(m.stats.ascent)} ${hu}`);
      }
    } else if (tool === 'terrain') {
      const el = elevationAt(m.center[0], m.center[1]);
      const hu = unit === 'ft' ? 'ft' : 'm';
      rows.push(['גובה/עומק במרכז', String(unit === 'ft' ? Math.round(el / 0.3048) : el), hu], ['כלים באזור', String(hits.length)]);
      copy.push(`מרכז: ${coord(m.center)}`, `רדיוס: ${fd(m.radius, unit).value} ${fd(m.radius, unit).unit}`, `כלים באזור: ${hits.length}`);
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
      {tool === 'time' && (
        <label className="mt-knots">
          <span className="mt-readout-label">מהירות (קשר)</span>
          <KnotField value={m?.knots ?? 10} label="מהירות בקשרים" onValue={onSpeed} />
        </label>
      )}
      {(tool === 'radius' || tool === 'terrain') && (
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
        <div className="mt-readouts">{rows.map(([l, v, u]) => <Readout key={l} label={l} value={v} unit={u} wide={l.startsWith('שעת')} />)}</div>
      ) : (
        <p className="mt-empty">{tool === 'radius' || tool === 'terrain' ? 'לחץ על המפה כדי לבחור מרכז.' : tool === 'height' ? 'לחץ על המפה: נקודה לקריאת גובה, שתי נקודות ויותר לפרופיל.' : tool === 'time' ? 'לחץ על המפה: מוצא, נקודות ביניים ויעד.' : 'לחץ על המפה כדי להתחיל במדידה.'}</p>
      )}
      {tool === 'time' && m && <CompareTable total={m.total} />}
      {tool === 'height' && m && m.points >= 2 && <ProfileChart samples={m.samples} stats={m.stats} unit={unit} onHover={onHover} />}
      {tool === 'terrain' && m && m.radius > 0 && <TerrainResults hits={hits} unit={unit} watch={watch} onAddToList={onAddToList} onPickVessel={onPickVessel} />}
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

/** שדה מהירות בקשרים (מספר חיובי) */
function KnotField({ value, onValue, label }) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);
  return (
    <input className="ui-input sm mt-field" type="text" inputMode="decimal" dir="ltr" aria-label={label} value={text}
      onChange={(e) => {
        setText(e.target.value);
        const n = Number(e.target.value);
        if (Number.isFinite(n) && n > 0 && n <= 60) onValue(n);
      }} />
  );
}

/** השוואת מהירויות 8/10/12/14 קשר: משך ושעת הגעה, ויציאה עכשיו */
function CompareTable({ total }) {
  const now = Date.now();
  return (
    <div className="mt-compare">
      <h3>השוואה למהירויות אחרות</h3>
      <table>
        <thead><tr><th scope="col">מהירות</th><th scope="col">משך</th><th scope="col">הגעה</th></tr></thead>
        <tbody>
          {COMPARE_KNOTS.map((k) => {
            const h = travelHours(total, k);
            return (
              <tr key={k}>
                <th scope="row"><Num>{k}</Num> קשר</th>
                <td>{formatDuration(h)}</td>
                <td><Num>{formatEta(now + h * 36e5)}</Num></td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-note">קו ישר, בלי יבשה, נתיבי שיט או מזג אוויר.</p>
    </div>
  );
}

/** פאנל מסלול כלי: חלון זמן, סימוני זמן, מדדים. נתוני דמה */
export function RoutePanel({ vessel, hours, marks, visible, stats, unit, setUnit, onHours, onMarks, onToggle, onClear, onClose }) {
  const d = fd(stats.distance, unit);
  const copy = [`מסלול ${vessel.name}, ${hours} שעות אחרונות`, `מרחק שנעבר: ${d.value} ${d.unit}`, `מהירות ממוצעת: ${stats.avgKnots.toFixed(1)} קשר`];
  return (
    <Panel id="mt-panel" title={NAMES.route} meta={<Ltr>{vessel.name}</Ltr>} className="mt-panel"
      actions={<Button variant="icon" size="sm" aria-label="סגירת הכלי" onClick={onClose} icon={<X size={16} aria-hidden="true" />} />}>
      <UnitSelect unit={unit} onChange={setUnit} />
      <div>
        <span className="mt-readout-label">חלון זמן</span>
        <div className="mt-seg" role="radiogroup" aria-label="חלון זמן">
          {ROUTE_WINDOWS.map((h) => (
            <button key={h} type="button" role="radio" aria-checked={hours === h} className={hours === h ? 'active' : ''} onClick={() => onHours(h)}>
              <Num>{h}</Num> ש׳
            </button>
          ))}
        </div>
      </div>
      <label className="ui-check mt-check">
        <input type="checkbox" checked={marks} onChange={(e) => onMarks(e.target.checked)} />
        <span>סימוני זמן</span>
      </label>
      <div className="mt-readouts">
        <Readout label="מרחק שנעבר" value={d.value} unit={d.unit} />
        <Readout label="מהירות ממוצעת" value={stats.avgKnots.toFixed(1)} unit="קשר" />
        <Readout label="כיוון נוכחי" value={formatBearing(vessel.course ?? 0)} />
        <Readout label="מהירות נוכחית" value={String(vessel.speed ?? 0)} unit="קשר" />
      </div>
      <p className="mt-note">נתוני דמה: המסלול מחושב לאחור מהמיקום, המהירות והכיוון האחרונים. החצים מראים את כיוון התנועה.</p>
      <div className="mt-actions">
        <CopyButton lines={copy} />
        <Button size="sm" onClick={onToggle}>{visible ? 'הסתר' : 'הצג'}</Button>
        <Button size="sm" onClick={onClear}>נקה</Button>
      </div>
    </Panel>
  );
}

/** פאנל חישוב הגעה: מוצא = הכלי, מהירות ברירת מחדל = מהירות הכלי, יעד בלחיצה על המפה או בחיפוש נמל */
export function ArrivalPanel({ vessel, dest, destName, knots, usedFallback, metricsArr, unit, setUnit, onSpeed, onPickPort, onClear, onClose }) {
  const [q, setQ] = useState('');
  const ports = q.trim() ? searchPorts(q) : [];
  const groups = [{
    id: 'ports', label: 'נמלים', icon: <Search size={16} aria-hidden="true" />,
    items: ports.map((p) => ({ key: p.id, text: p.name, id: p.id, render: () => <span className="search-hit"><Ltr className="cell-name">{p.name}</Ltr><span className="sub grow">{p.country}</span></span> })),
  }];
  const m = metricsArr;
  const d = m ? fd(m.distance, unit) : null;
  const eta = m ? formatEta(Date.now() + m.hours * 36e5) : null;
  const copy = m ? [`מוצא: ${vessel.name}`, `יעד: ${destName}`, `מרחק: ${d.value} ${d.unit}`, `כיוון: ${formatBearing(m.bearing)}`, `מהירות: ${knots} קשר`, `משך: ${formatDuration(m.hours)}`, `שעת הגעה: ${eta}`] : [];
  return (
    <Panel id="mt-panel" title={NAMES.arrival} meta={<Ltr>{vessel.name}</Ltr>} className="mt-panel"
      actions={<Button variant="icon" size="sm" aria-label="סגירת הכלי" onClick={onClose} icon={<X size={16} aria-hidden="true" />} />}>
      <UnitSelect unit={unit} onChange={setUnit} />
      <div className="mt-readout">
        <span className="mt-readout-label">מוצא</span>
        <span className="mt-origin"><Ltr className="cell-name">{vessel.name}</Ltr> · מיקום נוכחי</span>
      </div>
      <div className="mt-readout">
        <span className="mt-readout-label">יעד</span>
        <div className="search mt-port-search">
          <Search size={16} aria-hidden="true" />
          <Combobox value={q} onChange={setQ} ariaLabel="חיפוש נמל יעד" placeholder={dest ? destName : 'חפש נמל, או לחץ על המפה'} inputClassName=""
            emptyText="לא נמצאו נמלים" groups={groups} onSelect={(it) => { setQ(''); onPickPort(it.id); }} onEnter={() => { if (ports[0]) { setQ(''); onPickPort(ports[0].id); } }} />
        </div>
        {dest && <span className="mt-readout-coord">{destName}</span>}
      </div>
      <label className="mt-knots">
        <span className="mt-readout-label">מהירות (קשר)</span>
        <KnotField value={knots} label="מהירות בקשרים" onValue={onSpeed} />
        {usedFallback && <span className="mt-note">מהירות הכלי נמוכה מ-1 קשר, ולכן ברירת המחדל היא 10 קשר.</span>}
      </label>
      {m ? (
        <div className="mt-readouts">
          <Readout label="מרחק" value={d.value} unit={d.unit} />
          <Readout label="כיוון" value={formatBearing(m.bearing)} />
          <Readout label="משך" value={formatDuration(m.hours)} />
          <Readout label="שעת הגעה" value={eta} wide />
        </div>
      ) : <p className="mt-empty">בחר יעד: לחיצה על המפה או חיפוש נמל.</p>}
      {m && <p className="mt-note">קו ישר, בלי יבשה, נתיבי שיט או מזג אוויר.</p>}
      <div className="mt-actions">
        <CopyButton lines={copy} />
        <Button size="sm" disabled={!dest} onClick={onClear}>נקה</Button>
      </div>
    </Panel>
  );
}

/** פרופיל גובה/עומק לאורך הקו (SVG). ריחוף מציג קריאה ומסמן את הנקודה על המפה. נתוני דמה */
function ProfileChart({ samples, stats, unit, onHover }) {
  const [idx, setIdx] = useState(null);
  const W = 288;
  const H = 96;
  const PAD = 8;
  const conv = (v) => (unit === 'ft' ? Math.round(v / 0.3048) : Math.round(v));
  const hu = unit === 'ft' ? 'ft' : 'm';
  const lo = stats.min.h;
  const hi = stats.max.h;
  const span = hi - lo || 1;
  const total = stats.length || 1;
  const x = (d) => (d / total) * W;
  const y = (h) => PAD + (1 - (h - lo) / span) * (H - 2 * PAD);
  const line = samples.map((s, i) => `${i ? 'L' : 'M'}${x(s.d).toFixed(1)} ${y(s.h).toFixed(1)}`).join(' ');
  const base = lo <= 0 && hi >= 0 ? y(0) : H - PAD;
  const area = `${line} L${x(samples[samples.length - 1].d).toFixed(1)} ${base.toFixed(1)} L0 ${base.toFixed(1)} Z`;
  const cur = idx == null ? null : samples[idx];
  const move = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const i = Math.max(0, Math.min(samples.length - 1, Math.round(((e.clientX - r.left) / r.width) * (samples.length - 1))));
    setIdx(i);
    onHover?.(samples[i].ll);
  };
  const leave = () => { setIdx(null); onHover?.(null); };
  return (
    <div className="mt-chart">
      <h3>פרופיל לאורך הקו</h3>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`פרופיל גובה, מ-${conv(lo)} עד ${conv(hi)} ${hu}`} onMouseMove={move} onMouseLeave={leave}>
        {lo <= 0 && hi >= 0 && <line x1="0" x2={W} y1={y(0)} y2={y(0)} className="mt-chart-zero" />}
        <path d={area} className="mt-chart-fill" />
        <path d={line} className="mt-chart-line" />
        {cur && <><line x1={x(cur.d)} x2={x(cur.d)} y1="0" y2={H} className="mt-chart-cursor" /><circle cx={x(cur.d)} cy={y(cur.h)} r="3" className="mt-chart-dot" /></>}
      </svg>
      <div className="mt-chart-read">
        {cur ? <><Num>{`${fd(cur.d, unit).value} ${fd(cur.d, unit).unit} · ${conv(cur.h)} ${hu}`}</Num>{cur.h < 0 ? ' (עומק)' : ''}</> : <span className="mt-note">העבר עכבר על הגרף. גובה חיובי, עומק שלילי. נתוני דמה.</span>}
      </div>
    </div>
  );
}

/** תוצאות חקירת שטח: כלים באזור (מודגשים על המפה), הוספה לרשימת מעקב וייצוא CSV */
function TerrainResults({ hits, unit, watch, onAddToList, onPickVessel }) {
  const [list, setList] = useState(LISTS[0]);
  const [note, setNote] = useState('');
  useEffect(() => setNote(''), [hits.length]);
  const add = () => {
    const ids = hits.map((h) => h.v.id);
    const have = new Set([...(watch[list] ?? []), ...hits.filter((h) => h.v.lists?.includes(list)).map((h) => h.v.id)]);
    const fresh = ids.filter((id) => !have.has(id));
    onAddToList(list, fresh);
    setNote(`נוספו ${fresh.length} כלים לרשימה "${list}"${ids.length - fresh.length ? `, ${ids.length - fresh.length} כבר ברשימה` : ''}.`);
  };
  const exportCsv = () => {
    const q = (v) => `"${String(v).replace(/"/g, '""')}"`;
    const head = ['שם', 'IMO', 'MMSI', 'סוג', 'דגל', 'קו רוחב', 'קו אורך', `מרחק מהמרכז (${UNITS[unit].short})`];
    const rows = hits.map(({ v, d }) => [v.name, v.imo, v.mmsi, v.type, v.flag, v.lat, v.lon, toUnit(d, unit).toFixed(UNITS[unit].decimals + 1)]);
    const csv = '﻿' + [head, ...rows].map((r) => r.map(q).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'terrain-inspection.csv';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <div className="mt-terrain">
      <h3>כלים באזור <Num>{hits.length}</Num></h3>
      {hits.length === 0 ? <p className="mt-empty">אין כלי שיט באזור. הגדל את הרדיוס או הזז את המרכז.</p> : (
        <ul className="mt-range-list">
          {hits.map(({ v, d }) => (
            <li key={v.id}>
              <button type="button" onClick={() => onPickVessel(v.id)}>
                <span className="mt-hit"><Ltr className="cell-name">{v.name}</Ltr><span className="mt-note">{v.type}</span></span>
                <Num className="mt-saved-val">{fd(d, unit).value} {fd(d, unit).unit}</Num>
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-list-row">
        <label className="mt-list-pick">
          <span className="mt-readout-label">רשימת מעקב</span>
          <select className="ui-input sm" value={list} onChange={(e) => setList(e.target.value)} aria-label="רשימת מעקב">
            {LISTS.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </label>
        <Button size="sm" disabled={!hits.length} onClick={add}>הוסף לרשימה</Button>
        <Button size="sm" disabled={!hits.length} onClick={exportCsv}>ייצוא CSV</Button>
      </div>
      {note && <p className="mt-note" role="status">{note}</p>}
    </div>
  );
}
