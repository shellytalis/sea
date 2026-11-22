import { useState } from 'react';
import { ChevronDown, ChevronLeft, Copy, FileDown } from 'lucide-react';
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

const STATE_WORD = { unchecked: 'לא נבדק', nodata: 'אין נתונים במקור' };
const HAS_LABEL = new Set(['critical', 'high', 'medium', 'low']);
const TOPIC_MARK = { 'has-data': null, 'no-findings': 'none', unchecked: 'unassessed', 'no-data': null };

/** מעבר למקטע בדף והדגשה קצרה שלו (המגירה נשארת פתוחה) */
function jumpTo(id) {
  goSection(id);
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('snap-flash');
  window.setTimeout(() => el.classList.remove('snap-flash'), 1800);
}

function Finding({ f }) {
  return (
    <li className="snap-finding">
      <div className="snap-finding-sev"><Shape risk={f.severity} /><span>{SEVERITY_LABEL[f.severity]}</span></div>
      <p>{f.text}</p>
      <div className="snap-finding-meta">
        {f.evidence.map((e) => <span key={e.source}><Source source={e.source} updated={e.asOf} /></span>)}
        <a href={`#${f.link}`} className="link" onClick={(e) => { e.preventDefault(); jumpTo(f.link); }}>לפרטים</a>
      </div>
    </li>
  );
}

function Topic({ t }) {
  const [open, setOpen] = useState(t.state === 'has-data');
  const mark = TOPIC_MARK[t.state];
  return (
    <section className={`snap-topic ${t.state}`}>
      <h3>
        <button type="button" aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? <ChevronDown size={16} aria-hidden="true" /> : <ChevronLeft size={16} aria-hidden="true" />}
          <span>{t.label}</span>
          {mark && <Shape risk={mark} />}
        </button>
      </h3>
      {open && (
        <div className="snap-topic-body">
          <p>{t.text}</p>
          <a href={`#${t.link}`} className="link" onClick={(e) => { e.preventDefault(); jumpTo(t.link); }}>למקטע בדף</a>
        </div>
      )}
    </section>
  );
}

function Coverage({ cov }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onClose={() => setOpen(false)} className="snap-cov-pop" anchor={
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

/** גוף התמונה (מסקנה, ממצאים, נושאים); מיוצא גם להדגמה ב-/design */
export function SnapshotBody({ s }) {
  const c = s.conclusion;
  return (
    <>
      <section className={`snap-conclusion ${c.severity}`} aria-label="מסקנה">
        <Shape risk={c.severity} />
        <div>
          {HAS_LABEL.has(c.severity) && <strong>{SEVERITY_LABEL[c.severity]}</strong>}
          <span>{c.text}</span>
        </div>
      </section>
      {s.findings.length > 0 && (
        <section className="ui-drawer-group">
          <h3>ממצאים</h3>
          <ul className="plain-list snap-findings">{s.findings.map((f) => <Finding key={f.id} f={f} />)}</ul>
        </section>
      )}
      <section className="ui-drawer-group">
        <h3>סיכום לפי נושא</h3>
        <div className="snap-topics">{s.topics.map((t) => <Topic key={t.id} t={t} />)}</div>
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
        <Tooltip focusable text="המסקנה נבנתה מכללי תצפית על נתוני המערכת, לא ממודל"><span className="ui-model">מבוסס כללים</span></Tooltip></span>}
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
