import { useEffect, useState } from 'react';
import { Check, ChevronDown, Copy, Eye, EyeOff, Search, Trash2, X } from 'lucide-react';
import Combobox from '../../ui/Combobox';
import { searchPorts } from '../../data/ports';
import Panel from '../../ui/Panel';
import Button from '../../ui/Button';
import { Ltr, Mono, Num } from '../../ui/Ltr';
import { COMPARE_KNOTS, KIND_LABEL, inRange, metrics } from '../../map/scene';
import { elevationAt } from '../../map/elevation';
import { LISTS } from '../../data/vessels';
import { UNITS, formatArea, formatBearing, formatDistance, formatDuration, formatEta, formatEtaShort, fromUnit, toUnit, travelHours } from '../../map/units';
import { fmtFull, rangeLabel, spanLabel } from '../../map/range';

const NAMES = { distance: 'מרחק', radius: 'רדיוס חופשי', area: 'שטח', time: 'חישוב זמנים', height: 'גובה ופרופיל', terrain: 'חקירת שטח', prox: 'מעגלי קרבה', route: 'מסלול', arrival: 'חישוב הגעה' };
const HEB = /[א-ת]/;

/** מדד: תווית 12 משנית; ערך 16/600 ואחריו יחידה 12 משנית, הכול בתוך bdi ltr ("716.92 NM"). משך בעברית נשאר RTL. */
function Readout({ label, value, unit, wide }) {
  return (
    <div className={`mt-readout${wide ? ' wide' : ''}`}>
      <span className="mt-readout-label">{label}</span>
      <span className="mt-readout-value">
        {HEB.test(value)
          ? <bdi className="num mt-num">{value}</bdi>
          : <bdi dir="ltr" className="mt-val"><span className="num mt-num">{value}</span>{unit && <span className="mt-readout-unit">{unit}</span>}</bdi>}
      </span>
    </div>
  );
}

/** בקרת יחידות אחת בכותרת הפאנל: select 32px */
function UnitDropdown({ unit, onChange }) {
  return (
    <span className="mt-unit">
      <select className="ui-input sm" aria-label="יחידת מידה" value={unit} onChange={(e) => onChange(e.target.value)}>
        {Object.entries(UNITS).map(([id, u]) => <option key={id} value={id}>{u.label}</option>)}
      </select>
      <ChevronDown size={16} aria-hidden="true" />
    </span>
  );
}

function HeaderActions({ unit, setUnit, onClose }) {
  return (
    <>
      <UnitDropdown unit={unit} onChange={setUnit} />
      <Button variant="icon" size="sm" aria-label="סגירת הכלי" onClick={onClose} icon={<X size={16} aria-hidden="true" />} />
    </>
  );
}

/** שדה מספר ביחידה הנוכחית. מחזיר מטרים דרך onValue. */
function NumberField({ meters, unit, onValue, label, disabled, invalid }) {
  const shown = meters > 0 ? String(+toUnit(meters, unit).toFixed(UNITS[unit].decimals + 1)) : '';
  const [text, setText] = useState(shown);
  useEffect(() => setText(shown), [shown]);
  return (
    <input className="ui-input sm mt-field" type="text" inputMode="decimal" dir="ltr" aria-label={label} value={text} disabled={disabled}
      aria-invalid={invalid || undefined}
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

/** שורת פעולות דביקה בתחתית הפאנל: "העתק", פעולות נוספות, ו"נקה" כקישור טקסטואלי בקצה */
function Actions({ copy, onClear, clearDisabled, children }) {
  return (
    <div className="mt-actions">
      <CopyButton lines={copy.filter(Boolean)} />
      {children}
      <Button variant="text" size="sm" className="mt-clear-link" disabled={clearDisabled} onClick={onClear}>נקה</Button>
    </div>
  );
}

const fd = (m, unit) => formatDistance(m, unit);
const coord = (c) => `${Math.abs(c[1]).toFixed(4)}°${c[1] >= 0 ? 'N' : 'S'} ${Math.abs(c[0]).toFixed(4)}°${c[0] >= 0 ? 'E' : 'W'}`;
const DemoTag = () => <span className="ui-chip tag">נתוני דמה</span>;

function SavedList({ items, selId, unit, max, onSelect, onToggle, onDelete }) {
  const label = (it) => {
    const n = items.filter((x) => x.kind === it.kind).indexOf(it) + 1;
    const mm = metrics(it);
    let val = '';
    if (it.kind === 'distance' || it.kind === 'height') val = Object.values(fd(mm.total, unit)).join(' ');
    if (it.kind === 'radius' || it.kind === 'terrain') val = Object.values(fd(it.radius, unit)).join(' ');
    if (it.kind === 'time') val = formatDuration(mm.hours);
    if (it.kind === 'area') { const a = formatArea(mm.area, unit); val = `${a.value} ${a.unit}`; }
    return { text: `${KIND_LABEL[it.kind]} ${n}`, val };
  };
  return (
    <div className="mt-saved">
      <h3>מדידות שמורות <Num>{items.length}/{max}</Num></h3>
      {items.length === 0 ? <p className="mt-empty">מדידה שהושלמה נשמרת כאן.</p> : (
        <ul>
          {items.map((it) => {
            const l = label(it);
            return (
              <li key={it.id} className={it.id === selId ? 'selected' : ''}>
                <button type="button" className="mt-saved-main" onClick={() => onSelect(it.id)} aria-pressed={it.id === selId}>
                  <span className="mt-saved-name">{l.text}</span>
                  {HEB.test(l.val) ? <bdi className="num mt-saved-val">{l.val}</bdi> : <Num className="mt-saved-val">{l.val}</Num>}
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

const circleAreaOf = (r) => Math.PI * r * r;

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
      const eta = formatEta(Date.now() + m.hours * 36e5);
      rows.push(['מרחק כולל', t.value, t.unit], ['משך', formatDuration(m.hours)], ['שעת הגעה (יציאה עכשיו)', eta]);
      copy.push(`מרחק כולל: ${t.value} ${t.unit}`, `מהירות: ${m.knots} קשר`, `משך: ${formatDuration(m.hours)}`, `שעת הגעה: ${eta}`);
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
      rows.push(['גובה/עומק במרכז', String(unit === 'ft' ? Math.round(el / 0.3048) : el), unit === 'ft' ? 'ft' : 'm'], ['כלים באזור', String(hits.length)]);
      copy.push(`מרכז: ${coord(m.center)}`, `רדיוס: ${fd(m.radius, unit).value} ${fd(m.radius, unit).unit}`, `כלים באזור: ${hits.length}`, ...hits.map((h) => `${h.v.name} (${fd(h.d, unit).value} ${fd(h.d, unit).unit})`));
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
  const circleTool = tool === 'radius' || tool === 'terrain';
  return (
    <Panel id="mt-panel" title={NAMES[tool]} className="mt-panel" actions={<HeaderActions unit={unit} setUnit={setUnit} onClose={onClose} />}
      footer={(
        <>
          {tool === 'terrain' && m && m.radius > 0 && <TerrainControls hits={hits} unit={unit} watch={watch} onAddToList={onAddToList} />}
          <Actions copy={copy} clearDisabled={!live} onClear={onClearCurrent} />
        </>
      )}>
      {tool === 'time' && (
        <label className="mt-knots">
          <span className="mt-readout-label">מהירות (קשר)</span>
          <KnotField value={m?.knots ?? 10} label="מהירות בקשרים" onValue={onSpeed} />
        </label>
      )}
      {circleTool && (
        <>
          <label className="mt-radius">
            <span className="mt-readout-label">רדיוס ({UNITS[unit].short})</span>
            <NumberField meters={m?.radius ?? 0} unit={unit} label="רדיוס" disabled={!m || !m.center} onValue={onRadius} />
          </label>
          <div className="mt-readout">
            <span className="mt-readout-label">מרכז</span>
            <span className="mt-readout-coord">{m?.center ? <Mono>{coord(m.center)}</Mono> : '—'}</span>
          </div>
        </>
      )}
      {m ? (
        <div className="mt-readouts">{rows.map(([l, v, u]) => <Readout key={l} label={l} value={v} unit={u} wide={l.startsWith('שעת')} />)}</div>
      ) : (
        <p className="mt-empty">{circleTool ? 'לחץ על המפה כדי לבחור מרכז.' : tool === 'height' ? 'לחץ על המפה: נקודה לקריאת גובה, שתי נקודות ויותר לפרופיל.' : tool === 'time' ? 'לחץ על המפה: מוצא, נקודות ביניים ויעד.' : 'לחץ על המפה כדי להתחיל במדידה.'}</p>
      )}
      {tool === 'time' && m && <CompareTable total={m.total} />}
      {tool === 'height' && m && m.points >= 2 && <ProfileChart samples={m.samples} stats={m.stats} unit={unit} onHover={onHover} />}
      {tool === 'terrain' && m && m.radius > 0 && <TerrainList hits={hits} unit={unit} onPickVessel={onPickVessel} />}
      <SavedList items={items} selId={selId} unit={unit} max={max} onSelect={onSelect} onToggle={onToggle} onDelete={onDelete} />
    </Panel>
  );
}

const Swatch = ({ vi }) => <span className={`mt-swatch vi-${vi ?? 0}`} aria-hidden="true" />;

/** פאנל מעגלי קרבה: רדיוסים משותפים לסט (ring1 < ring2 < ring3), וטבלת "כלים בטווח" מקובצת לפי כלי (אקורדיון) */
export function ProximityPanel({ meta, targets, colors, all, radii, anyOn, unit, setUnit, onRadii, onToggle, onClear, onClose, onPickVessel }) {
  const [openV, setOpenV] = useState(null);
  const [openR, setOpenR] = useState(null);
  const [bad, setBad] = useState(null);
  useEffect(() => setBad(null), [unit, radii.length]);
  const short = UNITS[unit].short;
  const fmtR = (m) => `${fd(m, unit).value} ${short}`;
  const L = (m) => <Ltr>{fmtR(m)}</Ltr>;
  const rule = (i) => (i === 0 ? <>קטן מ-{L(radii[1])}</> : i === radii.length - 1 ? <>גדול מ-{L(radii[i - 1])}</> : <>בין {L(radii[i - 1])} ל-{L(radii[i + 1])}</>);
  const change = (i, m) => {
    const ok = (i === 0 || m > radii[i - 1]) && (i === radii.length - 1 || m < radii[i + 1]);
    if (!ok) { setBad(i); return; }
    setBad(null);
    onRadii(radii.map((x, j) => (j === i ? m : x)));
  };
  const copy = targets.flatMap((v) => [v.name, ...radii.map((r, i) => `  מעגל ${i + 1}: ${fmtR(r)} · ${inRange(v, r, all).length} כלים בטווח`)]);
  const open = openV ?? targets[0]?.id;
  return (
    <Panel id="mt-panel" title={NAMES.prox} meta={meta} className="mt-panel" actions={<HeaderActions unit={unit} setUnit={setUnit} onClose={onClose} />}
      footer={(
        <Actions copy={copy} onClear={onClear}>
          <Button variant="icon" size="sm" aria-pressed={!anyOn} aria-label={anyOn ? 'כבה את שכבת מעגלי הקרבה' : 'הפעל את שכבת מעגלי הקרבה'} onClick={onToggle}
            icon={anyOn ? <Eye size={16} aria-hidden="true" /> : <EyeOff size={16} aria-hidden="true" />} />
        </Actions>
      )}>
      <ul className="mt-circles">
        {radii.map((r, i) => (
          <li key={i}>
            <div className="mt-circle-head">
              <span className="mt-circle-name">מעגל {i + 1}</span>
              <NumberField meters={r} unit={unit} label={`רדיוס מעגל ${i + 1}`} invalid={bad === i} onValue={(m) => change(i, m)} />
              <span className="mt-readout-unit">{short}</span>
            </div>
            {bad === i && <p className="mt-field-error" role="alert">הרדיוס חייב להיות {rule(i)}</p>}
          </li>
        ))}
      </ul>
      {!anyOn && <p className="mt-empty">השכבה כבויה. לחץ על העין כדי להפעיל.</p>}
      <div className="mt-acc">
        <h3>כלים בטווח, לפי כלי</h3>
        {targets.map((v) => {
          const isOpen = open === v.id;
          const outer = inRange(v, radii[radii.length - 1], all).length;
          return (
            <div key={v.id} className="mt-acc-item">
              <button type="button" className="mt-acc-head" aria-expanded={isOpen} onClick={() => setOpenV(isOpen ? '' : v.id)}>
                <Swatch vi={colors[v.id]} />
                <Ltr className="cell-name">{v.name}</Ltr>
                <Num className="mt-num mt-acc-count">{outer}</Num>
                <ChevronDown size={16} aria-hidden="true" className={isOpen ? 'flip' : ''} />
              </button>
              {isOpen && (
                <ul className="mt-acc-body">
                  {radii.map((r, i) => {
                    const found = inRange(v, r, all);
                    const k = `${v.id}:${i}`;
                    return (
                      <li key={k}>
                        <button type="button" className="mt-range" aria-expanded={openR === k} disabled={found.length === 0} onClick={() => setOpenR(openR === k ? null : k)}>
                          <span className="mt-readout-label">מעגל {i + 1} · <Ltr>{fmtR(r)}</Ltr></span>
                          <Num className="mt-num">{found.length}</Num>
                          <ChevronDown size={16} aria-hidden="true" className={openR === k ? 'flip' : ''} />
                        </button>
                        {openR === k && (
                          <ul className="mt-range-list">
                            {found.map(({ v: o, d }) => (
                              <li key={o.id}>
                                <button type="button" onClick={() => onPickVessel(o.id)}>
                                  <Ltr className="cell-name">{o.name}</Ltr>
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
              )}
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

/** שדה מהירות בקשרים (מספר חיובי); allowEmpty: ריק = ביטול הערך */
function KnotField({ value, onValue, label, placeholder, allowEmpty }) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);
  return (
    <input className="ui-input sm mt-field" type="text" inputMode="decimal" dir="ltr" aria-label={label} value={text} placeholder={placeholder}
      onChange={(e) => {
        setText(e.target.value);
        if (allowEmpty && e.target.value.trim() === '') { onValue(null); return; }
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
                <th scope="row"><bdi dir="ltr"><span className="num">{k}</span> <span className="mt-readout-unit">קשר</span></bdi></th>
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

/** פאנל מסלול כלי: סיכום הטווח (הבחירה עצמה בכפתור הטווח בסרגל), סימוני זמן, מדדים. נתוני דמה */
export function RoutePanel({ meta, targets, colors, info, marks, anyOn, statsList, unit, setUnit, onMarks, onToggle, onClear, onClose }) {
  const multi = targets.length > 1;
  const rows = targets.map((v, i) => ({ v, d: fd(statsList[i].distance, unit), k: statsList[i].avgKnots }));
  const copy = [`מסלול, ${rangeLabel(info.from, info.to)} (${spanLabel(info.hours)})`, ...rows.map((r) => `${r.v.name}: ${r.d.value} ${r.d.unit}, ממוצע ${r.k.toFixed(1)} קשר`)];
  const one = targets[0];
  return (
    <Panel id="mt-panel" title={NAMES.route} meta={meta} className="mt-panel" actions={<HeaderActions unit={unit} setUnit={setUnit} onClose={onClose} />}
      footer={(
        <Actions copy={copy} onClear={onClear}>
          <Button variant="icon" size="sm" aria-pressed={!anyOn} aria-label={anyOn ? 'כבה את שכבת המסלול' : 'הפעל את שכבת המסלול'} onClick={onToggle}
            icon={anyOn ? <Eye size={16} aria-hidden="true" /> : <EyeOff size={16} aria-hidden="true" />} />
        </Actions>
      )}>
      <div className="mt-readout">
        <div className="mt-label-row"><span className="mt-readout-label">טווח</span><DemoTag /></div>
        <span className="mt-range-sum"><Num>{fmtFull(info.from)}</Num> – <Num>{fmtFull(info.to)}</Num> · {spanLabel(info.hours)}</span>
      </div>
      <label className="ui-check mt-check">
        <input type="checkbox" checked={marks} onChange={(e) => onMarks(e.target.checked)} />
        <span>סימוני זמן</span>
      </label>
      {!anyOn && <p className="mt-empty">השכבה כבויה. לחץ על העין כדי להפעיל.</p>}
      {multi ? (
        <div className="mt-compare">
          <table>
            <thead><tr><th scope="col">כלי</th><th scope="col">מרחק ({UNITS[unit].short})</th><th scope="col">ממוצע (קשר)</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.v.id}>
                  <th scope="row"><span className="mt-rowname"><Swatch vi={colors[r.v.id]} /><Ltr>{r.v.name}</Ltr></span></th>
                  <td><Num>{r.d.value}</Num></td>
                  <td><Num>{r.k.toFixed(1)}</Num></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : one && (
        <div className="mt-readouts">
          <Readout label="מרחק שנעבר" value={rows[0].d.value} unit={rows[0].d.unit} />
          <Readout label="מהירות ממוצעת" value={rows[0].k.toFixed(1)} unit="קשר" />
          <Readout label="כיוון נוכחי" value={formatBearing(one.course ?? 0)} />
          <Readout label="מהירות נוכחית" value={String(one.speed ?? 0)} unit="קשר" />
        </div>
      )}
      <p className="mt-note">המסלול מחושב לאחור מהמיקום, המהירות והכיוון האחרונים. החצים מראים את כיוון התנועה, והתוויות את הזמן עד סוף הטווח.</p>
    </Panel>
  );
}

/** פאנל חישוב הגעה: יעד משותף (לחיצה על המפה או חיפוש נמל), מהירות אחידה אופציונלית, וטבלה: כלי | מרחק | משך | הגעה */
export function ArrivalPanel({ meta, colors, dest, destName, uniform, anyOn, rows, multi, unit, setUnit, onUniform, onPickPort, onToggle, onClear, onClose }) {
  const [q, setQ] = useState('');
  const ports = q.trim() ? searchPorts(q) : [];
  const groups = [{
    id: 'ports', label: 'נמלים', icon: <Search size={16} aria-hidden="true" />,
    items: ports.map((p) => ({ key: p.id, text: p.name, id: p.id, render: () => <span className="search-hit"><Ltr className="cell-name">{p.name}</Ltr><span className="sub grow">{p.country}</span></span> })),
  }];
  const copy = dest ? [`יעד: ${destName}`, ...rows.map((r) => `${r.vessel.name}: ${fd(r.distance, unit).value} ${fd(r.distance, unit).unit}, ${formatDuration(r.hours)}, הגעה ${formatEta(Date.now() + r.hours * 36e5)}`)] : [];
  const anyFallback = rows.some((r) => r.fallback);
  return (
    <Panel id="mt-panel" title={NAMES.arrival} meta={meta} className="mt-panel" actions={<HeaderActions unit={unit} setUnit={setUnit} onClose={onClose} />}
      footer={(
        <Actions copy={copy} clearDisabled={!dest} onClear={onClear}>
          <Button variant="icon" size="sm" aria-pressed={!anyOn} aria-label={anyOn ? 'כבה את שכבת ההגעה' : 'הפעל את שכבת ההגעה'} onClick={onToggle}
            icon={anyOn ? <Eye size={16} aria-hidden="true" /> : <EyeOff size={16} aria-hidden="true" />} />
        </Actions>
      )}>
      <div className="mt-readout">
        <span className="mt-readout-label">יעד {multi ? 'משותף' : ''}</span>
        <div className="search mt-port-search">
          <Search size={16} aria-hidden="true" />
          <Combobox value={q} onChange={setQ} ariaLabel="חיפוש נמל יעד" placeholder={dest ? destName : 'חפש נמל, או לחץ על המפה'} inputClassName=""
            emptyText="לא נמצאו נמלים" groups={groups} onSelect={(it) => { setQ(''); onPickPort(it.id); }} onEnter={() => { if (ports[0]) { setQ(''); onPickPort(ports[0].id); } }} />
        </div>
        {dest && <span className="mt-readout-coord">{destName}</span>}
      </div>
      <label className="mt-knots">
        <span className="mt-readout-label">{multi ? 'מהירות אחידה (קשר, אופציונלי)' : 'מהירות (קשר, אופציונלי)'}</span>
        <KnotField value={uniform ?? ''} label="מהירות אחידה בקשרים" placeholder="מהירות הכלי" onValue={onUniform} allowEmpty />
      </label>
      {!anyOn && <p className="mt-empty">השכבה כבויה. לחץ על העין כדי להפעיל.</p>}
      {dest ? (
        <div className="mt-compare">
          <table>
            <thead><tr><th scope="col">כלי</th><th scope="col">מרחק ({UNITS[unit].short})</th><th scope="col">משך</th><th scope="col">הגעה</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.vessel.id}>
                  <th scope="row"><span className="mt-rowname"><Swatch vi={colors[r.vessel.id]} /><Ltr>{r.vessel.name}</Ltr></span></th>
                  <td><Num>{fd(r.distance, unit).value}</Num></td>
                  <td>{formatDuration(r.hours)}{r.fallback ? ' *' : ''}</td>
                  <td><Num>{formatEtaShort(Date.now() + r.hours * 36e5)}</Num></td>
                </tr>
              ))}
            </tbody>
          </table>
          {anyFallback && <p className="mt-note">* מהירות הכלי מתחת ל-1 קשר, ולכן חושב ב-10 קשר.</p>}
          <p className="mt-note">קו ישר, בלי יבשה, נתיבי שיט או מזג אוויר.</p>
        </div>
      ) : <p className="mt-empty">בחר יעד: לחיצה על המפה או חיפוש נמל.</p>}
    </Panel>
  );
}

/** פרופיל גובה/עומק לאורך הקו (SVG): ציר Y עם min/max ושורת אפס. ריחוף מסמן את הנקודה על המפה. נתוני דמה */
function ProfileChart({ samples, stats, unit, onHover }) {
  const [idx, setIdx] = useState(null);
  const W = 288;
  const H = 104;
  const L = 44;
  const PAD = 10;
  const conv = (v) => (unit === 'ft' ? Math.round(v / 0.3048) : Math.round(v));
  const hu = unit === 'ft' ? 'ft' : 'm';
  const lo = stats.min.h;
  const hi = stats.max.h;
  const span = hi - lo || 1;
  const total = stats.length || 1;
  const x = (d) => L + (d / total) * (W - L - 4);
  const y = (h) => PAD + (1 - (h - lo) / span) * (H - 2 * PAD);
  const line = samples.map((s, i) => `${i ? 'L' : 'M'}${x(s.d).toFixed(1)} ${y(s.h).toFixed(1)}`).join(' ');
  const hasZero = lo < 0 && hi > 0;
  const base = hasZero ? y(0) : H - PAD;
  const area = `${line} L${x(samples[samples.length - 1].d).toFixed(1)} ${base.toFixed(1)} L${L} ${base.toFixed(1)} Z`;
  const cur = idx == null ? null : samples[idx];
  const move = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    const i = Math.max(0, Math.min(samples.length - 1, Math.round(((px - L) / (W - L - 4)) * (samples.length - 1))));
    setIdx(i);
    onHover?.(samples[i].ll);
  };
  const leave = () => { setIdx(null); onHover?.(null); };
  const zeroLabel = `0 ${unit === 'ft' ? 'ft' : 'מ׳'}`;
  const showZeroLabel = hasZero && Math.abs(y(0) - y(hi)) > 14 && Math.abs(y(0) - y(lo)) > 14;
  return (
    <div className="mt-chart">
      <div className="mt-label-row"><h3>פרופיל לאורך הקו</h3><DemoTag /></div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`פרופיל גובה, מ-${conv(lo)} עד ${conv(hi)} ${hu}`} onMouseMove={move} onMouseLeave={leave}>
        <line x1={L} x2={L} y1={PAD} y2={H - PAD} className="mt-chart-axisline" />
        {hasZero && <line x1={L} x2={W} y1={y(0)} y2={y(0)} className="mt-chart-zero" />}
        <path d={area} className="mt-chart-fill" />
        <path d={line} className="mt-chart-line" />
        <text x={L - 6} y={y(hi) + 4} textAnchor="end" className="mt-chart-axis">{conv(hi)}</text>
        <text x={L - 6} y={y(lo) + 4} textAnchor="end" className="mt-chart-axis">{conv(lo)}</text>
        {showZeroLabel && <text x={L - 6} y={y(0) + 4} textAnchor="end" className="mt-chart-axis zero">{zeroLabel}</text>}
        {cur && <><line x1={x(cur.d)} x2={x(cur.d)} y1="0" y2={H} className="mt-chart-cursor" /><circle cx={x(cur.d)} cy={y(cur.h)} r="3" className="mt-chart-dot" /></>}
      </svg>
      <div className="mt-chart-read">
        {cur ? <><Num>{`${fd(cur.d, unit).value} ${fd(cur.d, unit).unit} · ${conv(cur.h)} ${hu}`}</Num>{cur.h < 0 ? ' (עומק)' : ''}</> : <span className="mt-note">העבר עכבר על הגרף. גובה חיובי, עומק שלילי.</span>}
      </div>
    </div>
  );
}

/** רשימת הכלים באזור (גוף הפאנל): max-height וגלילה פנימית */
function TerrainList({ hits, unit, onPickVessel }) {
  return (
    <div className="mt-terrain">
      <h3>כלים באזור <Num>{hits.length}</Num></h3>
      {hits.length === 0 ? <p className="mt-empty">אין כלי שיט באזור. הגדל את הרדיוס או הזז את המרכז.</p> : (
        <ul className="mt-range-list mt-terrain-list">
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
    </div>
  );
}

/** פעולות חקירת שטח, דביקות בתחתית הפאנל: הוספה לרשימת מעקב וייצוא CSV */
function TerrainControls({ hits, unit, watch, onAddToList }) {
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
    <div className="mt-terrain-actions">
      <div className="mt-list-row">
        <select className="ui-input sm" value={list} onChange={(e) => setList(e.target.value)} aria-label="רשימת מעקב">
          {LISTS.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
        <Button size="sm" disabled={!hits.length} onClick={add}>הוסף לרשימה</Button>
        <Button size="sm" disabled={!hits.length} onClick={exportCsv}>ייצוא CSV</Button>
      </div>
      {note && <p className="mt-note" role="status">{note}</p>}
    </div>
  );
}
