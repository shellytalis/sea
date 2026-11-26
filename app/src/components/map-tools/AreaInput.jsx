import { useEffect, useRef, useState } from 'react';
import { Keyboard, MousePointerClick, Trash2 } from 'lucide-react';
import Button from '../../ui/Button';
import { Num } from '../../ui/Ltr';
import { parseCoordinateList } from '../../area/coords';
import { MAX_INPUT_POINTS } from '../../area/thresholds';
import { canShow, filledCount, parseRow, pointsOf } from '../../area/terrainRows';

/** אופני הקלט של חקירת שטח (שלב 5ג). רשימת הנקודות משותפת: מעבר בין האופנים לא מוחק כלום */
const MODES = [
  { id: 'click', label: 'דקירה במפה', icon: MousePointerClick },
  { id: 'manual', label: 'הזנה ידנית', icon: Keyboard },
];

/** בורר אופן קלט: radiogroup, חיצים ו-Enter. ברירת מחדל: דקירה */
export function ModeSwitch({ mode, onChange }) {
  const move = (e) => {
    const step = { ArrowRight: -1, ArrowUp: -1, ArrowLeft: 1, ArrowDown: 1 }[e.key];
    if (!step) return;
    e.preventDefault();
    const next = MODES[(MODES.findIndex((m) => m.id === mode) + step + MODES.length) % MODES.length];
    onChange(next.id);
    e.currentTarget.querySelector(`[data-mode=${next.id}]`)?.focus();
  };
  return (
    <div className="mt-seg area-modeseg" role="radiogroup" aria-label="אופן קלט" onKeyDown={move}>
      {MODES.map((m) => {
        const Icon = m.icon;
        return (
          <button key={m.id} type="button" role="radio" data-mode={m.id} aria-checked={mode === m.id} tabIndex={mode === m.id ? 0 : -1} className={mode === m.id ? 'active' : ''}
            onClick={() => onChange(m.id)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onChange(m.id); } }}>
            <Icon size={16} aria-hidden="true" />{m.label}
          </button>
        );
      })}
    </div>
  );
}


const fieldError = (res) => (res?.ok === false ? (res.empty ? 'חסר ערך.' : res.error) : null);

/** הזנה ידנית: רשימת נקודות (קו רוחב, קו אורך), הדבקת רשימה, "הצגה על המפה" עם הסיבה שהיא מושבתת */
export function ManualList({ ts, dispatch, onShow }) {
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [pasteInfo, setPasteInfo] = useState(null); // { errors, note }
  const refs = useRef({});
  const [focusKey, setFocusKey] = useState(null);
  const parsed = ts.rows.map(parseRow);
  const n = pointsOf(ts).length;
  const gate = canShow(ts);
  useEffect(() => { if (focusKey) { refs.current[focusKey]?.focus(); setFocusKey(null); } }, [focusKey, ts.rows]);

  const addPasted = (text) => {
    const room = MAX_INPUT_POINTS - filledCount(ts);
    const r = parseCoordinateList(text, Math.max(0, room));
    dispatch({ type: 'paste', points: r.points });
    const note = r.truncated || room <= 0 ? `נקלטו ${r.points.length} מתוך ${r.total} נקודות` : r.points.length ? `נוספו ${r.points.length} נקודות.` : '';
    setPasteInfo({ errors: r.errors, note });
    setPasteText(r.errors.map((e) => e.text).join('\n'));
    if (r.errors.length) setPasteOpen(true);
  };

  return (
    <div className="area-manual">
      <div className="area-points" role="group" aria-label="רשימת נקודות">
        <span />
        <span className="mt-readout-label">קו רוחב</span>
        <span className="mt-readout-label">קו אורך</span>
        <span />
        {ts.rows.map((r, i) => {
          const p = parsed[i];
          const touched = r.touched.lat || r.touched.lon;
          const eLat = !p.blank && (r.touched.lat || touched) ? fieldError(p.lat) : null;
          const eLon = !p.blank && (r.touched.lon || touched) ? fieldError(p.lon) : null;
          const num = i + 1;
          const input = (field, err, onEnter) => (
            <input ref={(el) => { refs.current[`${r.id}-${field}`] = el; }} className="ui-input sm mt-field area-coord" dir="ltr" inputMode="text" autoComplete="off" spellCheck="false"
              aria-label={`${field === 'lat' ? 'קו רוחב' : 'קו אורך'}, נקודה ${num}`} aria-invalid={err ? true : undefined} placeholder={field === 'lat' ? '32.800' : '34.900'}
              value={r[field]} onChange={(e) => dispatch({ type: 'setCell', id: r.id, field, text: e.target.value })} onBlur={() => dispatch({ type: 'blurCell', id: r.id, field })}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onEnter(); } }}
              onPaste={field === 'lat' && p.blank ? (e) => {
                const text = e.clipboardData.getData('text');
                if (/\r?\n/.test(text.trim())) { e.preventDefault(); addPasted(text); } // הדבקת כמה שורות לשדה הרוחב של השורה הריקה = הדבקת רשימה
              } : undefined} />
          );
          return (
            <div className="area-point-row" key={r.id}>
              <span className="area-point-n num">{p.blank ? '' : num}</span>
              {input('lat', eLat, () => refs.current[`${r.id}-lon`]?.focus())}
              {input('lon', eLon, () => { const next = ts.rows[i + 1]; if (next) refs.current[`${next.id}-lat`]?.focus(); })}
              {p.blank ? <span /> : (
                <Button variant="icon" size="sm" aria-label={`מחק נקודה ${num}`} onClick={() => dispatch({ type: 'removeRow', id: r.id })} icon={<Trash2 size={16} aria-hidden="true" />} />
              )}
              {(eLat || eLon) && <p className="mt-field-error area-point-err" role="alert">{[eLat, eLon].filter(Boolean).join(' ')}</p>}
            </div>
          );
        })}
      </div>
      <div className="area-manual-links">
        <Button variant="text" size="sm" disabled={filledCount(ts) >= MAX_INPUT_POINTS} onClick={() => { const blank = ts.rows[ts.rows.length - 1]; if (blank) setFocusKey(`${blank.id}-lat`); }}>הוספת נקודה</Button>
        <Button variant="text" size="sm" aria-expanded={pasteOpen} onClick={() => setPasteOpen(!pasteOpen)}>הדבקת רשימה</Button>
      </div>
      {pasteOpen && (
        <div className="area-paste">
          <textarea className="ui-input area-paste-text" dir="ltr" rows={5} aria-label="הדבקת רשימת נקודות" placeholder={'הדבק נקודות, אחת בכל שורה: קו רוחב, קו אורך\n35.512, 23.874'}
            value={pasteText} onChange={(e) => setPasteText(e.target.value)} />
          <Button size="sm" disabled={!pasteText.trim()} onClick={() => addPasted(pasteText)}>הוסף לרשימה</Button>
        </div>
      )}
      {pasteInfo?.note && <p className="mt-note" role="status">{pasteInfo.note}</p>}
      {pasteInfo?.errors.length > 0 && (
        <ul className="area-paste-errors" role="alert">
          {pasteInfo.errors.map((e) => <li key={e.line} className="mt-field-error">שורה <Num>{e.line}</Num>: {e.message}</li>)}
        </ul>
      )}
      <p className="mt-note area-points-status">{n >= 3 ? <><Num>{n}</Num> נקודות</> : <><Num>{n}</Num> נקודות · נדרשות לפחות 3</>}</p>
      <div className="area-show">
        <Button variant="primary" size="sm" disabled={!gate.ok} onClick={onShow}>הצגה על המפה</Button>
        {!gate.ok && <span className="mt-note" role="status">{gate.reason}</span>}
      </div>
    </div>
  );
}
