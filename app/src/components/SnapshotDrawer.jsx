import { useState } from 'react';
import { Copy, FileDown, Info } from 'lucide-react';
import Drawer from '../ui/Drawer';
import Button from '../ui/Button';
import Popover from '../ui/Popover';
import { Shape, Tooltip } from '../ui/Badges';
import { SEVERITY_LABEL } from '../ui/severity';
import { EmptyState, ErrorState, TableSkeleton } from '../ui/States';
import { Ltr, Num } from '../ui/Ltr';
import { Source, goSection } from '../ui/Entity';
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

const Evidence = ({ list }) => (
  <span className="snap-src">{list.map((e, i) => <span key={e.source}>{i > 0 && ' · '}<Source source={e.source} updated={e.asOf} /></span>)}</span>
);

const DetailsLink = ({ id }) => (
  <a href={`#${id}`} className="link snap-details" onClick={(e) => { e.preventDefault(); jumpTo(id); }}>לפרטים</a>
);

/** נקודת תשומת לב: סמן ניטרלי יחיד. חומרה רק כש-showSeverity (מדרגה ב׳) */
function Attention({ a, first }) {
  return (
    <li className="snap-attn" id={first ? 'snap-first-attention' : undefined}>
      {showSeverity ? <Shape risk={a.severity} /> : <Info size={14} aria-hidden="true" className="snap-mark" />}
      <div>
        <p>{showSeverity && <strong>{SEVERITY_LABEL[a.severity]}: </strong>}{a.text}</p>
        <Evidence list={a.evidence} />
        <DetailsLink id={a.link} />
      </div>
    </li>
  );
}

function Topic({ t, firstAttentionId }) {
  return (
    <section className={`snap-topic ${t.state}`} aria-label={t.label}>
      <h3>{t.label}{t.attention.length > 0 && <span className="snap-count"><Num>{t.attention.length}</Num> לתשומת לב</span>}</h3>
      {t.summary.map((x) => <p key={x.text} className="snap-sentence">{x.text}</p>)}
      {t.summary.length > 0 && <Evidence list={[...new Map(t.summary.flatMap((x) => x.evidence).map((e) => [e.source, e])).values()]} />}
      {t.note && <p className="snap-note">{t.note}</p>}
      {t.state === 'data' && t.attention.length === 0 && <p className="snap-note">נבדק ולא נמצאו נקודות לתשומת לב.</p>}
      {t.attention.length > 0 && (
        <ul className="plain-list snap-attn-list">
          {t.attention.map((a) => <Attention key={a.id} a={a} first={a.id === firstAttentionId} />)}
        </ul>
      )}
      {t.state === 'data' && <DetailsLink id={t.link} />}
    </section>
  );
}

function Coverage({ cov }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onClose={() => setOpen(false)} anchor={
      <Button variant="text" size="sm" aria-expanded={open} onClick={() => setOpen(!open)}>
        נתונים מ-<Num>{cov.available}</Num> מתוך <Num>{cov.total}</Num> מקורות
      </Button>
    }>
      {cov.missing.length === 0
        ? <p>כל המקורות נבדקו.</p>
        : <><strong>מקורות שלא נכללו</strong>
          <ul className="plain-list">{cov.missing.map((m) => <li key={m.label}>{m.label}: {STATE_WORD[m.state]}</li>)}</ul></>}
    </Popover>
  );
}

/** גוף התמונה: "במבט אחד" (המסקנה) ואז סיכום לפי נושא; מיוצא גם להדגמה ב-/design */
export function SnapshotBody({ s }) {
  const firstAttention = s.topics.flatMap((t) => t.attention)[0];
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
        <div className="snap-topics">{s.topics.map((t) => <Topic key={t.id} t={t} firstAttentionId={firstAttention?.id} />)}</div>
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
          <div className="snap-foot-meta"><Coverage cov={s.coverage} /><span>הופק <Num>{s.generatedAt}</Num></span></div>
          <div className="snap-foot-actions">
            <Button icon={<Copy size={16} aria-hidden="true" />} onClick={copy}>{copied ? 'הועתק' : 'העתק טקסט'}</Button>
            <Button icon={<FileDown size={16} aria-hidden="true" />} onClick={() => window.print()}>ייצא PDF</Button>
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
