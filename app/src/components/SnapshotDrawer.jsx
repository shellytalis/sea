import { useState } from 'react';
import { Copy, FileDown, Info } from 'lucide-react';
import Drawer from '../ui/Drawer';
import Button from '../ui/Button';
import Popover from '../ui/Popover';
import { Shape, Tooltip } from '../ui/Badges';
import { SEVERITY_LABEL } from '../ui/severity';
import { EmptyState, ErrorState, TableSkeleton } from '../ui/States';
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

/** שורת מקורות אחת לנושא: "מקורות: א · עודכן ...; ב · עודכן ...". כל מקור ביחידה אחת שלא נשברת באמצע */
function Sources({ list }) {
  if (!list.length) return null;
  return (
    <p className="snap-src">
      מקורות: {list.map((e, i) => <span key={e.source}>{e.source} · עודכן <Num>{e.asOf}</Num>{i < list.length - 1 ? ';' : ''}</span>)}
    </p>
  );
}

/** משפט סיכום. משפט שכלל תצפית הופעל עליו נושא את הסמן הניטרלי (חומרה רק כש-showSeverity, מדרגה ב׳) */
function Sentence({ x, first, severity }) {
  return (
    <li className={`snap-sentence${x.marked ? ' marked' : ''}`} id={first ? 'snap-first-attention' : undefined}>
      <span className="snap-gutter">
        {x.marked && (showSeverity && severity ? <Shape risk={severity} /> : <Info size={14} aria-label="לתשומת לב" role="img" className="snap-mark" />)}
      </span>
      <span>{showSeverity && severity && <strong>{SEVERITY_LABEL[severity]}: </strong>}{x.text}</span>
    </li>
  );
}

function Topic({ t, firstId, findings }) {
  const sevOf = (x) => findings.find((f) => x.rules.includes(f.id))?.severity;
  return (
    <section className={`snap-topic ${t.state}`} aria-label={t.label}>
      <h3>
        <span>{t.label}</span>
        {t.markedCount > 0 && <span className="snap-count"><Num>{t.markedCount}</Num> לתשומת לב</span>}
        {t.state === 'data' && (
          <a href={`#${t.link}`} className="link snap-details" onClick={(e) => { e.preventDefault(); jumpTo(t.link); }}>לפרטים</a>
        )}
      </h3>
      {t.summary.length > 0 && (
        <ul className="plain-list snap-sentences">
          {t.summary.map((x) => <Sentence key={x.key + x.text} x={x} first={x === firstId} severity={sevOf(x)} />)}
        </ul>
      )}
      {t.clear && <p className="snap-note">נבדק ולא נמצאו נקודות לתשומת לב.</p>}
      {t.note && <p className="snap-note">{t.note}</p>}
      <Sources list={t.evidence} />
    </section>
  );
}

/** כיסוי המקורות, בשורה אחת של טקסט רגיל; כשיש מקורות חסרים אפשר ללחוץ לפירוט */
function Coverage({ cov, generatedAt }) {
  const [open, setOpen] = useState(false);
  const text = `נתונים מ-${cov.available} מתוך ${cov.total} מקורות`;
  return (
    <div className="snap-foot-meta">
      <Popover open={open} onClose={() => setOpen(false)} anchor={cov.missing.length
        ? <button type="button" className="snap-cov" aria-expanded={open} onClick={() => setOpen(!open)}>{text}</button>
        : <span>{text}</span>}>
        <strong>מקורות שלא נכללו</strong>
        <ul className="plain-list">{cov.missing.map((m) => <li key={m.label}>{m.label}: {STATE_WORD[m.state]}</li>)}</ul>
      </Popover>
      <span aria-hidden="true">·</span>
      <span>הופק <Num>{generatedAt}</Num></span>
    </div>
  );
}

/** גוף התמונה: "במבט אחד" (המסקנה) ואז סיכום לפי נושא; מיוצא גם להדגמה ב-/design */
export function SnapshotBody({ s }) {
  const first = s.topics.flatMap((t) => t.summary).find((x) => x.marked);
  const toAttention = () => document.getElementById('snap-first-attention')?.scrollIntoView({ block: 'center' });
  return (
    <>
      <section className="ui-drawer-group snap-glance" aria-label="במבט אחד">
        <h3>במבט אחד</h3>
        <ul className="plain-list">
          {s.overview.map((x, i) => (
            <li key={x}>{x}{i === s.overview.length - 1 && s.attentionCount > 0 && <> <a href="#snap-first-attention" className="link" onClick={(e) => { e.preventDefault(); toAttention(); }}>עבור אליהן</a></>}</li>
          ))}
        </ul>
      </section>
      <section className="ui-drawer-group">
        <h3>סיכום לפי נושא</h3>
        <div className="snap-topics">{s.topics.map((t) => <Topic key={t.id} t={t} firstId={first} findings={s.findings} />)}</div>
      </section>
    </>
  );
}

/** מגירת "תמונת מצב": נבנית מכללי תצפית (לא ממודל), לכן תג "מבוסס כללים" ולא "מודל" */
export default function SnapshotDrawer({ vessel, onClose }) {
  const { status, data, reload } = useAsync(() => getSnapshotApi(vessel.id), [vessel.id]);
  const [copied, setCopied] = useState(false);
  const s = data?.snapshot;
  const copy = async () => {
    try { await navigator.clipboard.writeText(snapshotToText(s, vessel.name)); setCopied(true); window.setTimeout(() => setCopied(false), 2000); } catch { /* ללא הרשאת לוח */ }
  };
  return (
    <Drawer overlay side="start" className="snapshot" label="תמונת מצב" onClose={onClose}
      title={<span className="snap-title">תמונת מצב · <Ltr>{vessel.name}</Ltr>
        <Tooltip focusable text="התמונה נבנתה מכללי תצפית על נתוני המערכת, לא ממודל"><span className="ui-model">מבוסס כללים</span></Tooltip></span>}
      footer={s && (
        <div className="snap-foot">
          <Coverage cov={s.coverage} generatedAt={s.generatedAt} />
          <div className="snap-foot-actions">
            <Button size="sm" icon={<Copy size={14} aria-hidden="true" />} onClick={copy}>{copied ? 'הועתק' : 'העתק טקסט'}</Button>
            <Button size="sm" icon={<FileDown size={14} aria-hidden="true" />} onClick={() => window.print()}>ייצא PDF</Button>
          </div>
        </div>
      )}>
      {status === 'loading' && <div aria-busy="true"><TableSkeleton rows={7} cols={2} /></div>}
      {status === 'error' && <ErrorState title="הפקת תמונת המצב נכשלה" onRetry={reload} />}
      {status === 'done' && !data && <EmptyState title="הכלי לא נמצא" />}
      {s && <SnapshotBody s={s} />}
    </Drawer>
  );
}
