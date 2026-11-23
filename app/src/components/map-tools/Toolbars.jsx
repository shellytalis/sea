import { useEffect, useId, useRef, useState } from 'react';
import { Calendar, Check, ChevronDown, ChevronLeft, ChevronRight, Hexagon, Mountain, Navigation, Radius, Route, Ruler, ScanSearch, Target, Timer, X } from 'lucide-react';
import Button from '../../ui/Button';
import { Shape } from '../../ui/Badges';
import { Ltr, Mono, Num } from '../../ui/Ltr';
import { PRESETS, combine, fmtDayYear, fmtTime, monthCells, rangeLabel, startOfDay, validateRange } from '../../map/range';

/** הכלים הכלליים: זמינים תמיד. "חקירת שטח" = ניתוח אזור (פוליגון, טווח תאריכים, פעילויות) */
export const GENERAL_TOOLS = [
  { id: 'distance', label: 'מרחק', icon: Ruler },
  { id: 'radius', label: 'רדיוס חופשי', icon: Radius },
  { id: 'area', label: 'שטח', icon: Hexagon },
  { id: 'height', label: 'גובה', icon: Mountain },
  { id: 'terrain', label: 'חקירת שטח', icon: ScanSearch },
  { id: 'time', label: 'חישוב זמנים', icon: Timer },
];

/** שכבות כלי השיט: אפשר להפעיל במקביל */
export const VESSEL_TOOLS = [
  { id: 'prox', label: 'מעגלי קרבה', icon: Target },
  { id: 'route', label: 'מסלול', icon: Route },
  { id: 'arrival', label: 'חישוב הגעה', icon: Navigation },
];

/** סרגל כלים כלליים, אנכי בקצה ה-end של המפה. תוויות גלויות, בלי tooltip. */
export function GeneralToolbar({ active, onPick, canClear, onClear }) {
  return (
    <nav className="mt-bar" aria-label="כלי מפה">
      {GENERAL_TOOLS.map((t) => {
        const Icon = t.icon;
        return (
          <button key={t.id} type="button" className={`mt-tool${active === t.id ? ' active' : ''}`} aria-pressed={active === t.id} onClick={() => onPick(t.id)}>
            <Icon size={20} aria-hidden="true" />
            <span className="mt-tool-label">{t.label}</span>
          </button>
        );
      })}
      {canClear && (
        <button type="button" className="mt-tool mt-clear" onClick={onClear}>
          <X size={20} aria-hidden="true" />
          <span className="mt-tool-label">נקה הכול</span>
        </button>
      )}
    </nav>
  );
}

/** dropdown הסט: כפתור 32px (צורת חומרה, שם הפעיל, ספירה) ורשימה עם ניווט מקלדת מלא */
function SetDropdown({ vessels, activeId, colors, onActivate, onRemove, onClear }) {
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const btn = useRef(null);
  const box = useRef(null);
  const listId = useId();
  const active = vessels.find((v) => v.id === activeId) ?? vessels[0];
  useEffect(() => {
    if (!open) return undefined;
    const down = (e) => { if (!box.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', down);
    return () => document.removeEventListener('mousedown', down);
  }, [open]);
  const openList = () => { setHi(Math.max(0, vessels.findIndex((v) => v.id === activeId))); setOpen(true); };
  const close = () => { setOpen(false); btn.current?.focus(); };
  const key = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setHi((i) => Math.min(vessels.length - 1, i + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((i) => Math.max(0, i - 1)); }
    else if (e.key === 'Home') { e.preventDefault(); setHi(0); }
    else if (e.key === 'End') { e.preventDefault(); setHi(vessels.length - 1); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (vessels[hi]) { onActivate(vessels[hi].id); close(); } }
    else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); if (vessels[hi]) { onRemove(vessels[hi].id); setHi((i) => Math.max(0, Math.min(i, vessels.length - 2))); } }
  };
  if (!active) return null;
  return (
    <div className="mt-setdd" ref={box}>
      <button ref={btn} type="button" className="mt-setbtn" aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? listId : undefined} aria-label={`סט כלים, ${vessels.length} כלים. הפעיל: ${active.name}`}
        onClick={() => (open ? close() : openList())}
        onKeyDown={(e) => { if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) { e.preventDefault(); openList(); } }}>
        <span className={`mt-swatch vi-${colors[active.id] ?? 0}`} aria-hidden="true" />
        <Shape risk={active.risk} />
        <Ltr className="mt-setname">{active.name}</Ltr>
        <span className="mt-setcount"><Num>{vessels.length}</Num></span>
        <ChevronDown size={16} aria-hidden="true" />
      </button>
      {open && (
        <div className="mt-vpop mt-setpop">
          <ul id={listId} className="mt-setlist" role="listbox" aria-label="כלים בסט" tabIndex={0} aria-activedescendant={vessels[hi] ? `${listId}-${vessels[hi].id}` : undefined}
            onKeyDown={key} ref={(el) => { if (el && !el.contains(document.activeElement)) el.focus(); }}>
            {vessels.map((v, i) => (
              <li key={v.id} id={`${listId}-${v.id}`} role="option" aria-selected={v.id === activeId} className={`mt-setrow${i === hi ? ' hi' : ''}${v.id === activeId ? ' on' : ''}`}
                onMouseEnter={() => setHi(i)} onClick={() => { onActivate(v.id); close(); }}>
                <span className={`mt-swatch vi-${colors[v.id] ?? 0}`} aria-hidden="true" />
                <Shape risk={v.risk} />
                <Ltr className="mt-setrow-name">{v.name}</Ltr>
                <span className="mt-setrow-imo"><Mono>IMO {v.imo}</Mono></span>
                <span className="mt-setrow-check">{v.id === activeId && <Check size={16} aria-label="פעיל" />}</span>
                <button type="button" tabIndex={-1} className="mt-setrow-x" aria-label={`הסר ${v.name} מהסט`} onClick={(e) => { e.stopPropagation(); onRemove(v.id); }}>
                  <X size={16} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-setfoot"><Button variant="text" size="sm" onClick={() => { onClear(); setOpen(false); }}>הסר הכול</Button></div>
        </div>
      )}
    </div>
  );
}

const WEEKDAYS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];
const MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

/** בורר טווח תאריכים: קיצורים, from/to עם תאריך ושעה, לוח שנה (שבוע מתחיל באחד). "החל" מימין, "ביטול" משמאל */
/**
 * presets/maxDays/title ניתנים להתאמה: סרגל כלי השיט משתמש בברירות המחדל (עד 30 יום), וניתוח אזור ב-7/30/90 ועד 90 יום.
 * className מוסיף מחלקה לעטיפה (ניתוח אזור: מוצג בתוך הפאנל ולא כ-popover צף).
 */
export function RangePopover({ range, onApply, onCancel, presets = PRESETS, maxDays = 30, title = 'טווח תאריכים למסלול', className = '' }) {
  const now = Date.now();
  const [draft, setDraft] = useState({ from: range.from, to: range.to, preset: range.preset ?? null });
  const [field, setField] = useState('from');
  const [view, setView] = useState(() => { const d = new Date(range.from); return { y: d.getFullYear(), m: d.getMonth() }; });
  const box = useRef(null);
  const err = validateRange(draft.from, draft.to, now, maxDays);
  useEffect(() => {
    const down = (e) => { if (!box.current?.contains(e.target)) onCancel(); };
    const esc = (e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onCancel(); } };
    document.addEventListener('mousedown', down);
    document.addEventListener('keydown', esc, true);
    return () => { document.removeEventListener('mousedown', down); document.removeEventListener('keydown', esc, true); };
  }, [onCancel]);
  const today = startOfDay(now);
  const cells = monthCells(view.y, view.m);
  const step = (d) => setView((v) => { const n = new Date(v.y, v.m + d, 1); return { y: n.getFullYear(), m: n.getMonth() }; });
  const pickDay = (day) => {
    setDraft((x) => ({ ...x, [field]: combine(day, fmtTime(x[field])), preset: null }));
    if (field === 'from') setField('to');
  };
  const setTime = (f, hhmm) => setDraft((x) => ({ ...x, [f]: combine(startOfDay(x[f]), hhmm), preset: null }));
  const lo = startOfDay(draft.from);
  const hi = startOfDay(draft.to);
  return (
    <div className={`mt-vpop mt-rangepop ${className}`.trim()} ref={box} role="dialog" aria-label={title}
      onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onCancel(); } }}>
      <div className="mt-presets" role="group" aria-label="קיצורים">
        {presets.map((p) => (
          <button key={p.hours} type="button" aria-pressed={draft.preset === p.hours} className={draft.preset === p.hours ? 'active' : ''}
            onClick={() => { setDraft({ from: now - p.hours * 3600e3, to: now, preset: p.hours }); const d = new Date(now - p.hours * 3600e3); setView({ y: d.getFullYear(), m: d.getMonth() }); }}>
            {p.label}
          </button>
        ))}
      </div>
      <div className="mt-fields">
        {[['from', 'מתאריך'], ['to', 'עד תאריך']].map(([f, label]) => (
          <div key={f} className={`mt-rfield${field === f ? ' on' : ''}`}>
            <button type="button" className="mt-rfield-day" aria-pressed={field === f} onClick={() => { setField(f); const d = new Date(draft[f]); setView({ y: d.getFullYear(), m: d.getMonth() }); }}>
              <span className="mt-readout-label">{label}</span>
              <Num>{fmtDayYear(draft[f])}</Num>
            </button>
            <input type="time" className="ui-input sm" aria-label={`שעה, ${label}`} value={fmtTime(draft[f])} onChange={(e) => e.target.value && setTime(f, e.target.value)} />
          </div>
        ))}
      </div>
      <div className="mt-cal">
        <div className="mt-cal-head">
          <Button variant="icon" size="sm" aria-label="החודש הקודם" onClick={() => step(-1)} icon={<ChevronRight size={16} aria-hidden="true" />} />
          <span className="mt-cal-title">{MONTHS[view.m]} <Num>{view.y}</Num></span>
          <Button variant="icon" size="sm" aria-label="החודש הבא" onClick={() => step(1)} icon={<ChevronLeft size={16} aria-hidden="true" />} />
        </div>
        <div className="mt-cal-grid" role="grid" aria-label={`${MONTHS[view.m]} ${view.y}`}>
          {WEEKDAYS.map((d) => <span key={d} className="mt-cal-wd" role="columnheader">{d}</span>)}
          {cells.map((day, i) => (day == null ? <span key={`e${i}`} /> : (
            <button key={day} type="button" role="gridcell" disabled={day > today} aria-label={fmtDayYear(day)} aria-selected={day === lo || day === hi}
              className={`mt-cal-day${day === lo || day === hi ? ' sel' : ''}${day > lo && day < hi ? ' in' : ''}${day === today ? ' today' : ''}`} onClick={() => pickDay(day)}>
              {new Date(day).getDate()}
            </button>
          )))}
        </div>
      </div>
      {err && <p className="mt-field-error" role="alert">{err}</p>}
      <div className="mt-popfoot">
        <Button variant="primary" size="sm" disabled={!!err} onClick={() => onApply(draft.preset ? { preset: draft.preset } : { from: draft.from, to: draft.to })}>החל</Button>
        <Button size="sm" onClick={onCancel}>ביטול</Button>
      </div>
    </div>
  );
}

/**
 * סרגל כלי שיט בשתי שורות: [dropdown הסט] [מתג כלי בודד / כל הסט] [טווח תאריכים], ומתחתיהן השכבות.
 * מעוגן בתחתית, מימין לסרגל הכללי (בצד ה-start שלו), ו-× בקצה השורה התחתונה מנקה את הסט.
 */
export function VesselBar({ vessels, activeId, colors, mode, onMode, onActivate, onRemove, onClear, range, onRange, toolStates, openTool, onTool }) {
  const [pop, setPop] = useState(null);
  return (
    <section className="mt-vbar" aria-label="סט כלי שיט וכלים">
      <div className="mt-vrow">
        <SetDropdown vessels={vessels} activeId={activeId} colors={colors} onActivate={onActivate} onRemove={onRemove} onClear={onClear} />
        <div className="mt-seg mt-modeseg" role="radiogroup" aria-label="חלות הכלים">
          <button type="button" role="radio" aria-checked={mode === 'single'} className={mode === 'single' ? 'active' : ''} onClick={() => onMode('single')}>כלי בודד</button>
          <button type="button" role="radio" aria-checked={mode === 'all'} className={mode === 'all' ? 'active' : ''} onClick={() => onMode('all')}>כל הסט (<Num>{vessels.length}</Num>)</button>
        </div>
        <div className="mt-daterange">
          <button type="button" className="mt-datebtn" aria-haspopup="dialog" aria-expanded={pop === 'range'} onClick={() => setPop(pop === 'range' ? null : 'range')}
            aria-label={`טווח תאריכים למסלול: ${rangeLabel(range.from, range.to)}`}>
            <Calendar size={16} aria-hidden="true" />
            <Num>{rangeLabel(range.from, range.to)}</Num>
          </button>
          {pop === 'range' && <RangePopover range={range} onApply={(r) => { onRange(r); setPop(null); }} onCancel={() => setPop(null)} />}
        </div>
      </div>
      <div className="mt-vrow">
        <div className="mt-vtools">
          {VESSEL_TOOLS.map((t) => {
            const Icon = t.icon;
            const st = toolStates[t.id];
            return (
              <button key={t.id} type="button" className={`mt-vtool${openTool === t.id ? ' active' : ''}${st !== 'off' ? ` on ${st}` : ''}`} aria-pressed={st === 'on'}
                aria-label={`${t.label}${st === 'on' ? ', פעיל' : st === 'part' ? ', פעיל בחלק מהכלים' : ''}`} onClick={() => onTool(t.id)}>
                <Icon size={20} aria-hidden="true" />
                <span>{t.label}</span>
                {st !== 'off' && <span className="mt-ondot" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
        <button type="button" className="mt-vclose" aria-label="נקה את הסט" onClick={onClear}>
          <X size={16} aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
