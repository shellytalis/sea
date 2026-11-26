import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowRight, ArrowUp, Calendar, Pencil, X } from 'lucide-react';
import Panel from '../../ui/Panel';
import Button from '../../ui/Button';
import { EmptyState, ErrorState, TableSkeleton } from '../../ui/States';
import { Ltr, Num } from '../../ui/Ltr';
import { ACTIVITIES, activityById } from '../../area/activities';
import { buildAreaCsv, downloadCsv } from '../../area/csv';
import { eventDuration, orderVessels, summarizeResult } from '../../area/query';
import { MAX_RANGE_DAYS } from '../../area/thresholds';
import { fmtDay, fmtFull, fmtTime, spanLabel } from '../../map/range';
import { formatArea, formatDuration } from '../../map/units';
import { ManualList, ModeSwitch } from './AreaInput';
import ActivityDot from './ActivityDot';
import { RangePopover } from './Toolbars';
import { TerrainControls, TerrainList } from './ToolPanel';

/** קיצורי הטווח של ניתוח אזור (7 / 30 / 90 יום), באותו רכיב בורר כמו בסרגל כלי השיט */
const AREA_PRESETS = [{ hours: 168, label: '7 י׳' }, { hours: 720, label: '30 י׳' }, { hours: 2160, label: '90 י׳' }];
const TABS = [{ id: 'range', label: 'פעילויות בטווח' }, { id: 'now', label: 'כלים בשטח כעת' }];
const COLS = [
  { id: 'start', label: 'התחלה' },
  { id: 'vessel', label: 'כלי' },
  { id: 'duration', label: 'משך' },
  { id: 'source', label: 'מקור' },
];

/** משך לתצוגה בטבלה: ממשיך (עם משך עד עכשיו), רגעי (שינוי זהות) או משך רגיל */
export function durationText(e, now) {
  if (e.activity === 'identity') return '—';
  const text = formatDuration(eventDuration(e, now) / 3600e3);
  return e.end == null ? `ממשיך, ${text}` : text;
}

const sortValue = { start: (e) => e.start, vessel: (e) => e.vessel.name, duration: (e, now) => eventDuration(e, now), source: (e) => e.source };


const eventsWord = (n) => (n === 1 ? 'אירוע אחד' : `${n} אירועים`);

/**
 * כותרת מקטע דביקה מעל הטבלה: איזו פעילות ואיזה טווח הטבלה מציגה, גם כשהמקרא והטווח יצאו מהמסך בגלילה.
 * לחיצה (או Enter) גוללת לראש גוף הפאנל, למקרא, להחלפת פעילות. נטענת: שלד במקום המספר.
 */
function SectionHeader({ analysis: a }) {
  const act = activityById(a.activity);
  const count = a.result?.counts[a.activity];
  const loading = a.status === 'loading';
  const goTop = (e) => {
    const body = e.currentTarget.closest('.panel-body');
    body?.scrollTo({ top: 0, behavior: 'smooth' });
    body?.querySelector('.area-act[aria-checked=true]')?.focus({ preventScroll: true });
  };
  if (!act) return null;
  return (
    <button type="button" className="area-section-head" aria-label="החלף פעילות" onClick={goTop}>
      <ActivityDot id={act.id} />
      <span className="area-section-name">{act.label}</span>
      {loading || typeof count !== 'number' ? <span className="area-act-skel" aria-hidden="true" /> : (
        <span className="area-section-meta">
          {a.shown.limited ? <>מוצגים <Num>{a.shown.shown.length}</Num> מתוך <Num>{a.shown.total}</Num></> : eventsWord(count)}
          {' · '}<Num>{fmtDay(a.range.from)}–{fmtDay(a.range.to)}</Num>
        </span>
      )}
    </button>
  );
}

function Legend({ analysis: a }) {
  const loading = a.status === 'loading';
  const move = (e) => {
    const keys = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1, Home: 'first', End: 'last' };
    if (!(e.key in keys)) return;
    e.preventDefault();
    const i = ACTIVITIES.findIndex((x) => x.id === a.activity);
    const next = keys[e.key] === 'first' ? 0 : keys[e.key] === 'last' ? ACTIVITIES.length - 1 : (i + keys[e.key] + ACTIVITIES.length) % ACTIVITIES.length;
    a.pickActivity(ACTIVITIES[next].id);
    e.currentTarget.querySelectorAll('[role=radio]')[next]?.focus();
  };
  return (
    <div className="area-legend" role="radiogroup" aria-label="פעילויות בשטח" aria-busy={loading || undefined} onKeyDown={move}>
      {ACTIVITIES.map((act) => {
        const c = a.result?.counts[act.id];
        const on = a.activity === act.id;
        return (
          <button key={act.id} type="button" role="radio" aria-checked={on} tabIndex={(a.activity ?? ACTIVITIES[0].id) === act.id ? 0 : -1} className={`area-act${on ? ' on' : ''}`} onClick={() => a.pickActivity(act.id)}>
            <ActivityDot id={act.id} />
            <span className="area-act-name">{act.label}</span>
            {loading || c == null ? <span className="area-act-skel" aria-hidden="true" />
              : c === 'not-covered' ? <span className="area-act-count unchecked">לא נבדק</span>
                : <Num className="area-act-count">{c}</Num>}
          </button>
        );
      })}
    </div>
  );
}

/** שורת סיכום מתחת למקרא: סך הפעילויות וכלי שיט ייחודיים בשטח ובטווח (פעילות "לא נבדק" לא נכללת) */
function Totals({ analysis: a }) {
  const s = useMemo(() => (a.result ? summarizeResult(a.result) : null), [a.result]);
  if (a.status === 'loading' || !s) return <p className="area-totals" aria-hidden="true"><span className="area-act-skel" /></p>;
  return (
    <p className="area-totals">
      סה״כ <Num>{s.activities.toLocaleString('en')}</Num> {s.activities === 1 ? 'פעילות' : 'פעילויות'} · <Num>{s.vessels.toLocaleString('en')}</Num> כלי שיט ייחודיים
    </p>
  );
}

function EventsTable({ analysis: a, now, onSelect }) {
  const [sort, setSort] = useState({ key: 'start', dir: 'desc' });
  const rows = useMemo(() => {
    const get = sortValue[sort.key];
    const sign = sort.dir === 'asc' ? 1 : -1;
    return [...a.shown.shown].sort((x, y) => {
      const vx = get(x, now);
      const vy = get(y, now);
      return sign * (typeof vx === 'string' ? vx.localeCompare(vy) : vx - vy) || (x.id < y.id ? -1 : 1);
    });
  }, [a.shown, sort, now]);
  useEffect(() => { if (a.selId) document.querySelector(`[data-eid="${a.selId}"]`)?.scrollIntoView({ block: 'nearest' }); }, [a.selId]);
  const toggle = (id) => setSort((s) => (s.key === id ? { key: id, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key: id, dir: id === 'start' || id === 'duration' ? 'desc' : 'asc' }));
  return (
    <div className="area-results">
      <SectionHeader analysis={a} />
      {a.shown.limited && (
        <p className="mt-note area-limit" role="status">
          מוצגים האירועים החדשים ביותר. כדי לראות את השאר, צמצם את השטח או את הטווח. ייצוא CSV כולל את כולם.
        </p>
      )}
      <table className="area-table">
        <thead>
          <tr>
            {COLS.map((c) => (
              <th key={c.id} scope="col" aria-sort={sort.key === c.id ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                <button type="button" onClick={() => toggle(c.id)}>
                  {c.label}
                  {sort.key === c.id && (sort.dir === 'asc' ? <ArrowUp size={12} aria-hidden="true" /> : <ArrowDown size={12} aria-hidden="true" />)}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((e) => (
            <tr key={e.id} data-eid={e.id} tabIndex={0} aria-selected={a.selId === e.id} className={`area-row${a.selId === e.id ? ' sel' : ''}`}
              onClick={() => onSelect(e.id)} onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); onSelect(e.id); } }}>
              <td><Num>{fmtDay(e.start)} {fmtTime(e.start)}</Num></td>
              <td>{orderVessels(e).map((v, i) => <span key={v.id}>{i > 0 && ' ↔ '}<Ltr className="cell-name">{v.name}</Ltr></span>)}</td>
              <td>{durationText(e, now)}</td>
              <td>{e.source}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * פאנל "חקירת שטח" (ניתוח אזור, מדרגה א'): שתי לשוניות. הרחב ל-480px בלשונית "פעילויות בטווח" (טוקן --mt-panel-w-wide).
 * כל המצב (טווח, פעילות נבחרת, לשונית) חי ב-useAreaAnalysis, ולכן מעבר בין לשוניות שומר אותו.
 */
export default function AreaPanel({ analysis: a, polygon, committed, notice, unit, onClose, onClear, ts, dispatch, inputMode, setInputMode, onShow, onRevert, hits, watch, onAddToList, onPickVessel, onSelectEvent }) {
  const [pop, setPop] = useState(false);
  const [now] = useState(() => Date.now());
  const tabs = useRef(null);
  const [editing, setEditing] = useState(false); // מסך "עריכת נקודות" (רק בפוליגון סגור)
  useEffect(() => { if (!committed) setEditing(false); }, [committed]);
  const edit = editing && committed;
  const wide = committed && !edit && a.tab === 'range';

  const count = a.result?.counts[a.activity];
  const canExport = a.status === 'ready' && typeof count === 'number' && count > 0;

  const tabKey = (e) => {
    const i = TABS.findIndex((t) => t.id === a.tab);
    const next = e.key === 'ArrowLeft' ? i + 1 : e.key === 'ArrowRight' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? TABS.length - 1 : null;
    if (next === null) return;
    e.preventDefault();
    const t = TABS[(next + TABS.length) % TABS.length];
    a.setTab(t.id);
    tabs.current?.querySelector(`#area-tab-${t.id}`)?.focus();
  };

  // שלב 5ד: בזמן שרטוט (פוליגון לא סגור) הפאנל מינימלי: כותרת ובורר אופן הקלט (ברשימה בהזנה ידנית). ההנחיה רק בשורה הצפה שבמפה,
  // ובלי ספירת נקודות, בלי "בטל נקודה אחרונה" (Backspace/Ctrl+Z) ובלי שורת פעולות. אחרי סגירה אין בורר: קישור "עריכת נקודות" פותח את הרשימה.
  let body;
  if (!committed) {
    body = (
      <>
        <ModeSwitch mode={inputMode} onChange={setInputMode} />
        {inputMode === 'manual' && <ManualList ts={ts} dispatch={dispatch} closed={false} onShow={onShow} />}
        {notice && <p className="mt-field-error" role="alert">{notice}</p>}
      </>
    );
  } else if (edit) {
    body = (
      <>
        <div className="area-edit-head">
          <Button variant="text" size="sm" icon={<ArrowRight size={16} aria-hidden="true" />} onClick={() => { onRevert(); setEditing(false); }}>חזרה לתוצאות</Button>
          <h3>עריכת נקודות</h3>
        </div>
        <ManualList ts={ts} dispatch={dispatch} closed onShow={() => { if (onShow() !== false) setEditing(false); }} />
        {notice && <p className="mt-field-error" role="alert">{notice}</p>}
      </>
    );
  } else {
    body = (
      <>
        <Button variant="text" size="sm" className="area-edit-link" icon={<Pencil size={16} aria-hidden="true" />} onClick={() => setEditing(true)}>עריכת נקודות</Button>
        <div className="ui-tablist area-tabs" role="tablist" aria-label="תצוגות חקירת שטח" ref={tabs} onKeyDown={tabKey}>
          {TABS.map((t) => (
            <button key={t.id} id={`area-tab-${t.id}`} role="tab" type="button" aria-selected={a.tab === t.id} aria-controls="area-tabpanel" tabIndex={a.tab === t.id ? 0 : -1} onClick={() => a.setTab(t.id)}>{t.label}</button>
          ))}
        </div>
        <div id="area-tabpanel" role="tabpanel" aria-labelledby={`area-tab-${a.tab}`} className="area-tabpanel">
          {a.tab === 'now' ? <TerrainList hits={hits} onPickVessel={onPickVessel} /> : (
            <>
              <div className="area-range">
                <button type="button" className="mt-datebtn" aria-haspopup="dialog" aria-expanded={pop} onMouseDown={(e) => e.stopPropagation()} onClick={() => setPop((v) => !v)}
                  aria-label={`טווח תאריכים לניתוח: ${fmtFull(a.range.from)} עד ${fmtFull(a.range.to)}`}>
                  <Calendar size={16} aria-hidden="true" />
                  <Num>{fmtFull(a.range.from)} – {fmtFull(a.range.to)}</Num>
                  <span className="mt-note">{spanLabel((a.range.to - a.range.from) / 3600e3)}</span>
                </button>
                {pop && (
                  <RangePopover className="area-rangepop" range={{ from: a.range.from, to: a.range.to, preset: null }} presets={AREA_PRESETS} maxDays={MAX_RANGE_DAYS} title="טווח תאריכים לניתוח אזור"
                    onApply={(r) => { a.applyRange(r); setPop(false); }} onCancel={() => setPop(false)} />
                )}
              </div>
              {notice && <p className="mt-field-error" role="alert">{notice}</p>}
              {a.status === 'error' ? (
                <ErrorState title="לא הצלחנו לטעון את הפעילויות" onRetry={a.retry}>הפוליגון נשמר. אפשר לנסות שוב.</ErrorState>
              ) : a.status === 'too-large' ? (
                <EmptyState title="השטח גדול מדי לניתוח">
                  <span>השטח המרבי לניתוח הוא <Num>{formatArea(a.maxAreaKm2 * 1e6, unit).value} {formatArea(a.maxAreaKm2 * 1e6, unit).unit}</Num>. הקטן את הפוליגון: גרור קודקודים פנימה.</span>
                </EmptyState>
              ) : (
                <>
                  <Legend analysis={a} />
                  <Totals analysis={a} />
                  <div role="status" aria-live="polite" className="area-status">
                    {a.status === 'loading' ? (
                      <div className="area-loading"><SectionHeader analysis={a} /><TableSkeleton rows={5} cols={4} /></div>
                    ) : a.status === 'ready' && count === 'not-covered' ? (
                      <EmptyState title="לא נבדק">
                        <span>{a.result.coverage[a.activity]?.source ?? 'המקור'} לא מכסה את השטח או את הטווח שנבחרו, ולכן אין תוצאה. זה לא אומר שאין אירועים.</span>
                      </EmptyState>
                    ) : a.status === 'ready' && count === 0 ? (
                      <EmptyState title="אין אירועים בשטח ובטווח">
                        <span>{activityById(a.activity)?.label}: לא נמצאו אירועים. נסה להרחיב את הטווח או את השטח.</span>
                      </EmptyState>
                    ) : a.status === 'ready' ? (
                      <EventsTable analysis={a} now={now} onSelect={onSelectEvent} />
                    ) : null}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </>
    );
  }

  // שלב 5ג: בלי "העתק". מצב ריק (אין נקודות): בלי שורת פעולות בכלל. אחרי שיש שרטוט: "ייצוא CSV" (מושבת כשהספירה 0 או "לא נבדק") ו"נקה"
  const clearLink = <Button variant="text" size="sm" className="mt-clear-link" onClick={onClear}>נקה</Button>;
  const footer = !committed ? null : a.tab === 'now' && !edit ? (
    <>
      <TerrainControls hits={hits} watch={watch} onAddToList={onAddToList} />
      <div className="mt-actions">{clearLink}</div>
    </>
  ) : (
    <div className="mt-actions">
      <Button size="sm" disabled={!canExport} onClick={() => downloadCsv(buildAreaCsv({ polygon, range: a.range, activity: a.activity, events: a.list }), 'area-activities.csv')}>ייצוא CSV</Button>
      {clearLink}
    </div>
  );

  return (
    <Panel id="mt-panel" title="חקירת שטח" className={`mt-panel area-panel${wide ? ' wide' : ''}`} actions={<Button variant="icon" size="sm" aria-label="סגירת הכלי" onClick={onClose} icon={<X size={16} aria-hidden="true" />} />} footer={footer}>
      {body}
    </Panel>
  );
}
