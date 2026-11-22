import { useState } from 'react';
import { Copy, FileDown, Info } from 'lucide-react';
import Drawer from '../ui/Drawer';
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

/** מעבר למקטע בדף והדגשה קצרה שלו (המגירה נשארת פתוחה) */
function jumpTo(id) {
  goSection(id);
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('snap-flash');
  window.setTimeout(() => el.classList.remove('snap-flash'), 1800);
}

/** גלילה למשפט מסומן בתוך המגירה והדגשה קצרה שלו */
function jumpToSentence(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  el.classList.add('snap-flash');
  window.setTimeout(() => el.classList.remove('snap-flash'), 1800);
}

/** משפט סיכום. משפט שכלל תצפית הופעל עליו נושא את הסמן הניטרלי (חומרה רק כש-showSeverity, מדרגה ב׳) */
function Sentence({ x, severity }) {
  return (
    <li className={`snap-sentence${x.marked ? ' marked' : ''}`} id={x.id}>
      <span className="snap-gutter">
        {x.marked && (showSeverity && severity ? <Shape risk={severity} /> : <Tooltip focusable text="לתשומת לב"><Info size={14} aria-label="לתשומת לב" role="img" className="snap-mark" /></Tooltip>)}
      </span>
      <span>{showSeverity && severity && <strong>{SEVERITY_LABEL[severity]}: </strong>}{x.text}</span>
    </li>
  );
}

function Topic({ t, findings }) {
  const sevOf = (x) => findings.find((f) => x.rules.includes(f.id))?.severity;
  return (
    <section className={`snap-topic ${t.state}`} aria-label={t.label}>
      <h3>
        <span>{t.label}</span>
        {t.state === 'data' && (
          <a href={`#${t.link}`} className="link snap-details" onClick={(e) => { e.preventDefault(); jumpTo(t.link); }}>לפרטים</a>
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
 * וקישור לסעיף בדף, ואחריו המקורות החסרים. זה המקום היחיד במגירה שמציג מקור וזמן (אין שורת מקורות בנושאים).
 */
function Coverage({ cov, generatedAt }) {
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
              <a href={`#${m.link}`} className="link" onClick={(e) => { e.preventDefault(); setOpen(false); jumpTo(m.link); }}>{m.name}</a>
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

/** גוף התמונה: "במבט אחד" (המסקנה) ואז סיכום לפי נושא; מיוצא גם להדגמה ב-/design */
export function SnapshotBody({ s }) {
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
        <div className="snap-topics">{s.topics.map((t) => <Topic key={t.id} t={t} findings={s.findings} />)}</div>
      </section>
    </>
  );
}

/**
 * מגירת "תמונת מצב": נבנית מכללי תצפית (לא ממודל), לכן תג "מבוסס כללים" ולא "מודל".
 * המגירה דוחפת את תוכן הדף (VesselPage עוטף אותה ב-workspace.with-drawer) ולא מכסה אותו; ראו הסבר שם.
 */
export default function SnapshotDrawer({ vessel, onClose }) {
  const { status, data, reload } = useAsync(() => getSnapshotApi(vessel.id), [vessel.id]);
  const [copied, setCopied] = useState(false);
  const s = data?.snapshot;
  const copy = async () => {
    try { await navigator.clipboard.writeText(snapshotToText(s, vessel.name)); setCopied(true); window.setTimeout(() => setCopied(false), 2000); } catch { /* ללא הרשאת לוח */ }
  };
  return (
    <Drawer side="start" className="snapshot" label="תמונת מצב" onClose={onClose}
      title={<span className="snap-title">תמונת מצב · <Ltr>{vessel.name}</Ltr>
        <Tooltip focusable text="התמונה נבנתה מכללי תצפית על נתוני המערכת, לא ממודל"><span className="ui-model">מבוסס כללים</span></Tooltip></span>}
      footer={status === 'done' && s && (
        <div className="snap-foot">
          <Coverage cov={s.coverage} generatedAt={s.generatedAt} />
          <div className="snap-foot-actions">
            <Button size="sm" icon={<Copy size={14} aria-hidden="true" />} onClick={copy}>{copied ? 'הועתק' : 'העתק טקסט'}</Button>
            <Button size="sm" icon={<FileDown size={14} aria-hidden="true" />} onClick={() => window.print()}>ייצא PDF</Button>
          </div>
        </div>
      )}>
      {status === 'loading' && <SnapshotSkeleton />}
      {status === 'error' && <ErrorState title="הפקת תמונת המצב נכשלה" onRetry={reload} />}
      {status === 'done' && !data && <EmptyState title="הכלי לא נמצא" />}
      {status === 'done' && s && <SnapshotBody s={s} />}
    </Drawer>
  );
}
