import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Copy, FileDown, X } from 'lucide-react';
import Button from '../ui/Button';
import Popover from '../ui/Popover';
import { Shape, Tooltip } from '../ui/Badges';
import { SEVERITY_LABEL } from '../ui/severity';
import { EmptyState, ErrorState } from '../ui/States';
import { Ltr, Num } from '../ui/Ltr';
import { goSection } from '../ui/Entity';
import useAsync from '../ui/useAsync';
import { getSnapshotApi } from '../data/api';
import { snapshotToText } from '../snapshot/compose';
import { showSeverity } from '../snapshot/thresholds';

const STATE_WORD = { unchecked: 'לא נבדק', nodata: 'אין נתונים במקור' };
const WIDTH = 600;      // min(600px, 100vw - 48px)
const GAP = 8;          // בין הכפתור לכרטיס
const MARGIN = 24;      // מהקצה התחתון והצדדי של החלון

/** מעבר למקטע בדף והדגשה קצרה שלו */
function jumpTo(id) {
  goSection(id);
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('snap-flash');
  window.setTimeout(() => el.classList.remove('snap-flash'), 1800);
}

/** גלילה פנימית של גוף הכרטיס למשפט והדגשה ברקע עדין ל-2 שניות (בלי לגלול את הדף) */
function jumpToSentence(id) {
  const el = document.getElementById(id);
  const body = el?.closest('.snap-card-body');
  if (!el || !body) return;
  const top = el.getBoundingClientRect().top - body.getBoundingClientRect().top + body.scrollTop - body.clientHeight / 3;
  body.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  el.classList.add('snap-hl');
  window.setTimeout(() => el.classList.remove('snap-hl'), 2000);
}

/** משפט סיכום. כל המשפטים נראים אחיד: אין סמן (נקודות לתשומת לב רק בשורת התוויות ב"במבט אחד"). חומרה רק כש-showSeverity (מדרגה ב׳) */
function Sentence({ x, severity }) {
  return (
    <li className="snap-sentence" id={x.id}>
      {showSeverity && severity && <Shape risk={severity} />}
      <span>{showSeverity && severity && <strong>{SEVERITY_LABEL[severity]}: </strong>}{x.text}</span>
    </li>
  );
}

function Topic({ t, findings, onNavigate }) {
  const sevOf = (x) => findings.find((f) => x.rules.includes(f.id))?.severity;
  return (
    <section className={`snap-topic ${t.state}`} aria-label={t.label}>
      <h3>
        <span>{t.label}</span>
        {t.state === 'data' && (
          <a href={`#${t.link}`} className="link snap-details" onClick={(e) => { e.preventDefault(); onNavigate(t.link); }}>לפרטים</a>
        )}
      </h3>
      {t.summary.length > 0 && (
        <ul className="plain-list snap-sentences">
          {t.summary.map((x) => <Sentence key={x.id} x={x} severity={sevOf(x)} />)}
        </ul>
      )}
      {t.note && <p className="snap-note">{t.note}</p>}
    </section>
  );
}

/**
 * כיסוי המקורות, בשורה אחת של טקסט רגיל שנפתחת ל-Popover: כל מקור שנבדק עם תאריך העדכון שלו (שם אחד פעם אחת)
 * וקישור לסעיף בדף, ואחריו המקורות החסרים. זה המקום היחיד בכרטיס שמציג מקור וזמן (אין שורת מקורות בנושאים).
 */
function Coverage({ cov, generatedAt, onNavigate }) {
  const [open, setOpen] = useState(false);
  const text = `נתונים מ-${cov.available} מתוך ${cov.total} מקורות`;
  return (
    <div className="snap-foot-meta">
      <Popover open={open} onClose={() => setOpen(false)} anchor={
        <button type="button" className="snap-cov" aria-expanded={open} aria-haspopup="dialog" onClick={() => setOpen(!open)}>{text}</button>}>
        <strong>מקורות ותאריכי עדכון</strong>
        <ul className="plain-list snap-sources">
          {cov.included.map((m) => (
            <li key={m.name}>
              <a href={`#${m.link}`} className="link" onClick={(e) => { e.preventDefault(); setOpen(false); onNavigate(m.link); }}>{m.name}</a>
              <span>עודכן <Num>{m.asOf}</Num></span>
            </li>
          ))}
        </ul>
        {cov.missing.length > 0 && (
          <>
            <strong>מקורות שלא נכללו</strong>
            <ul className="plain-list snap-sources">{cov.missing.map((m) => <li key={m.label}><span>{m.label}</span><span>{STATE_WORD[m.state]}</span></li>)}</ul>
          </>
        )}
      </Popover>
      <span aria-hidden="true">·</span>
      <span>הופק <Num>{generatedAt}</Num></span>
    </div>
  );
}

/** שלד טעינה בדמות המבנה האמיתי: "במבט אחד" ואחריו נושאים (כותרת ושורות טקסט) */
function SnapshotSkeleton() {
  const bars = (n) => Array.from({ length: n }, (_, i) => <span key={i} className="snap-skel-line" style={{ inlineSize: `${i % 2 ? 72 : 94}%` }} />);
  return (
    <div className="snap-skel" role="status" aria-label="טוען תמונת מצב" aria-busy="true">
      <div className="snap-skel-block"><span className="snap-skel-head" />{bars(3)}</div>
      {[0, 1, 2, 3, 4].map((i) => <div key={i} className="snap-skel-block"><span className="snap-skel-head" />{bars(i % 2 ? 2 : 3)}</div>)}
    </div>
  );
}

/**
 * גוף התמונה: "במבט אחד" (המסקנה) ואז סיכום לפי נושא; מיוצא גם להדגמה ב-/design.
 * onNavigate(id): "לפרטים" וקישורי המקורות (בכרטיס: סוגר את הכרטיס וגולל לסעיף בדף).
 */
export function SnapshotBody({ s, onNavigate = jumpTo }) {
  return (
    <>
      <section className="ui-drawer-group snap-glance" aria-label="במבט אחד">
        <h3>במבט אחד</h3>
        <ul className="plain-list">
          {s.overview.map((x) => <li key={x}>{x}</li>)}
        </ul>
        {s.attentionLabels.length > 0 && (
          <div className="snap-labels">
            <span>לתשומת לב:</span>
            {s.attentionLabels.map((a) => (
              <button key={a.label} type="button" className="snap-label" onClick={() => jumpToSentence(a.target)}>{a.label}</button>
            ))}
          </div>
        )}
      </section>
      <section className="ui-drawer-group">
        <h3>סיכום לפי נושא</h3>
        <div className="snap-topics">{s.topics.map((t) => <Topic key={t.id} t={t} findings={s.findings} onNavigate={onNavigate} />)}</div>
      </section>
      {/* כיסוי המקורות (Coverage) מוצג בתחתית הכרטיס */}
    </>
  );
}

/**
 * כרטיס "תמונת מצב": כרטיס צף non-modal שמעוגן לכפתור "תמונת מצב" (anchorRef). נבנה מכללי תצפית (לא ממודל), ולכן תג "מבוסס כללים".
 * - לא נוגע בפריסת הדף: position fixed, בלי רקע מעומעם ובלי שינוי רוחב/גלילה. הדף נשאר במקומו.
 * - מיקום: מתחת לכפתור (GAP), קצה הכרטיס מיושר לקצה הכפתור וצמוד בתוך החלון. רוחב min(600px, 100vw - 48px), גובה עד תחתית החלון פחות 24px, גלילה פנימית אחת.
 * - דף גלול למטה: הכפתור נמצא בכותרת הדביקה של הדף ולכן תמיד נגיש; הכרטיס נשאר במקום הפתיחה ביחס לחלון (לא נע עם הגלילה).
 * - סגירה: Escape (אם Popover פתוח, הוא נסגר קודם), לחיצה מחוץ לכרטיס ולכפתור, X, ו"לפרטים". המיקוד חוזר לכפתור.
 * - נגישות: role="dialog" בלי aria-modal; המיקוד נכנס לכרטיס בפתיחה.
 */
export default function SnapshotCard({ vessel, anchorRef, onClose }) {
  const { status, data, reload } = useAsync(() => getSnapshotApi(vessel.id), [vessel.id]);
  const [copied, setCopied] = useState(false);
  const [pos, setPos] = useState(null);
  const cardRef = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const s = data?.snapshot;

  // מיקום ביחס לכפתור (ומחדש בשינוי גודל החלון)
  useLayoutEffect(() => {
    const place = () => {
      const r = anchorRef.current?.getBoundingClientRect();
      if (!r) return;
      const width = Math.min(WIDTH, window.innerWidth - 2 * MARGIN);
      const left = Math.min(Math.max(r.right - width, MARGIN), window.innerWidth - MARGIN - width);
      const top = r.bottom + GAP;
      setPos({ top, left, width, maxHeight: Math.max(240, window.innerHeight - top - MARGIN) });
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [anchorRef]);

  // מיקוד פנימה בפתיחה (אחרי שהכרטיס מוצג ומוקם; אלמנט מוסתר אינו מקבל מיקוד)
  const placed = pos !== null;
  useEffect(() => { if (placed) cardRef.current?.focus({ preventScroll: true }); }, [placed]);

  // חזרה לכפתור בסגירה; Escape ולחיצה בחוץ
  useEffect(() => {
    const anchor = anchorRef.current;
    const key = (e) => { if (e.key === 'Escape' && !cardRef.current?.querySelector('.ui-pop')) closeRef.current(); };
    // לחיצה בחוץ: המיקוד חוזר לכפתור, אלא אם הלחיצה הניחה אותו על פקד אחר (אחרת ברירת המחדל של הדפדפן מאפסת אותו ל-body)
    const down = (e) => {
      if (cardRef.current?.contains(e.target) || anchor?.contains(e.target)) return;
      closeRef.current();
      window.setTimeout(() => { if (document.activeElement === document.body) anchor?.focus({ preventScroll: true }); }, 0);
    };
    document.addEventListener('keydown', key);
    document.addEventListener('pointerdown', down);
    return () => { document.removeEventListener('keydown', key); document.removeEventListener('pointerdown', down); anchor?.focus?.({ preventScroll: true }); };
  }, [anchorRef]);

  const navigate = (id) => { closeRef.current(); window.setTimeout(() => jumpTo(id), 0); };
  const copy = async () => {
    try { await navigator.clipboard.writeText(snapshotToText(s, vessel.name)); setCopied(true); window.setTimeout(() => setCopied(false), 2000); } catch { /* ללא הרשאת לוח */ }
  };

  return (
    <aside ref={cardRef} className="snap-card" role="dialog" aria-label="תמונת מצב" tabIndex={-1}
      style={pos ? { top: pos.top, left: pos.left, width: pos.width, maxHeight: pos.maxHeight } : { visibility: 'hidden' }}>
      <header>
        <h2 className="snap-title">תמונת מצב · <Ltr>{vessel.name}</Ltr>
          <Tooltip focusable text="התמונה נבנתה מכללי תצפית על נתוני המערכת, לא ממודל"><span className="ui-model">מבוסס כללים</span></Tooltip></h2>
        <Button variant="icon" onClick={onClose} aria-label="סגור"><X size={16} aria-hidden="true" /></Button>
      </header>
      <div className="snap-card-body">
        {status === 'loading' && <SnapshotSkeleton />}
        {status === 'error' && <ErrorState title="הפקת תמונת המצב נכשלה" onRetry={reload} />}
        {status === 'done' && !data && <EmptyState title="הכלי לא נמצא" />}
        {status === 'done' && s && <SnapshotBody s={s} onNavigate={navigate} />}
      </div>
      {status === 'done' && s && (
        <footer>
          <div className="snap-foot">
            <Coverage cov={s.coverage} generatedAt={s.generatedAt} onNavigate={navigate} />
            <div className="snap-foot-actions">
              <Button size="sm" icon={<Copy size={14} aria-hidden="true" />} onClick={copy}>{copied ? 'הועתק' : 'העתק טקסט'}</Button>
              <Button size="sm" icon={<FileDown size={14} aria-hidden="true" />} onClick={() => window.print()}>ייצא PDF</Button>
            </div>
          </div>
        </footer>
      )}
    </aside>
  );
}
