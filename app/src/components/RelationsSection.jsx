import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronLeft, ChevronRight, Info, X } from 'lucide-react';
import { EVIDENCE_TYPES, STRENGTHS, relationRows } from '../data/companies';
import { getRelationsApi } from '../data/api';
import { SeverityBadge, Shape } from '../ui/Badges';
import Button from '../ui/Button';
import { Ltr } from '../ui/Ltr';
import Panel from '../ui/Panel';
import Popover from '../ui/Popover';
import { ErrorState, TableSkeleton } from '../ui/States';
import TableCore from '../ui/Table';
import useAsync from '../ui/useAsync';
import { modelMeta } from './ModelOutputs';
import { RelationKind, RelationLegend, StrengthBars, StrengthMeter } from './RelationParts';
import RelationsView, { MAX_NODES } from './RelationsView';

/*
 * מקטע "קשרים בין חברות" (שלב 2, הצעה): תוצר מודל קבוצת השליטה. טבלה עם סינון (חוזק, סוג ראיה; במצב ב-URL),
 * שורת ראיה נפוצה, אשכולות נפתחים, פאנל ראיות עם משוב "נכון / שגוי" (בסשן בלבד) וגרף של עד 15 הקשרים החזקים.
 * מצבים: לא הוערך, לא נמצאו קשרים, טעינה, שגיאה, ואין קשרים שתואמים לסינון.
 */

const PAGE = 10;
const STRENGTH_FILTER = [{ id: 'strong', label: 'חזקים בלבד' }, { id: 'all', label: 'גם בינוניים וחלשים' }];
const EVIDENCE_FILTER = [
  { id: 'all', label: 'הכול' }, { id: 'beneficiary', label: 'מוטב משותף' }, { id: 'transfer', label: 'מעבר כלים' },
  { id: 'address', label: 'כתובת' }, { id: 'exclusive', label: 'ניהול בלעדי' },
];
/** משוב האנליסט לפי מזהה קשר, בזיכרון הסשן בלבד (לא נשמר ברענון) */
const FEEDBACK = {};

const evidenceSummary = (r) => r.summary ?? (r.evidence.length === 1 ? r.evidence[0].text : r.evidence.map((e) => EVIDENCE_TYPES[e.type]).join(' · '));
const kindText = (r) => `${r.declared ? 'קשר מוצהר' : 'קשר שהוסק'}, חוזק ${STRENGTHS[r.strength].label}`;

/** ראיה נפוצה: שורת עובדה אחת מעל הטבלה, לא קשר. "הצג רשימה" מסביר שהרשימה תגיע מהשרת */
function CommonEvidence({ item }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rel2-common">
      <Info size={16} aria-hidden="true" />
      <span>ראיה נפוצה, לא נכללת בקבוצה: {item.text}.</span>
      <Popover open={open} onClose={() => setOpen(false)} panelProps={{ role: 'dialog', 'aria-label': 'רשימת החברות' }}
        anchor={<button type="button" className="link rel2-link" aria-expanded={open} onClick={() => setOpen(!open)}>הצג רשימה</button>}>
        <p className="rel2-pop">רשימת <Ltr>{item.count}</Ltr> החברות תגיע מהשרת. באב-טיפוס מוצגת רק הספירה.</p>
      </Popover>
    </div>
  );
}

/** הראיות המלאות לקשר שנבחר, ומשוב "הקשר הזה נכון?" */
function EvidencePanel({ row, answer, onAnswer, onClose }) {
  const missing = ['address', 'officer'].filter((t) => !row.evidence.some((e) => e.type === t));
  return (
    <div className="rel2-evidence" role="region" aria-label="ראיות לקשר" data-testid="rel-evidence">
      <div className="rel2-ev-head">
        <span className="rel2-ev-title">
          ראיות לקשר עם {row.kind === 'cluster' ? <>אשכול של <Ltr>{row.count}</Ltr> חברות</> : <Ltr>{row.name}</Ltr>}
        </span>
        <span className="sub">· {kindText(row)}</span>
        <Button variant="icon" size="sm" className="rel2-ev-close" aria-label="סגור את פאנל הראיות" icon={<X size={16} aria-hidden="true" />} onClick={onClose} />
      </div>
      <ul className="rel2-ev-list">
        {row.evidence.map((e) => (
          <li key={e.text}>
            <span className="ui-chip tag">{EVIDENCE_TYPES[e.type]}</span>
            <span>{e.text}</span>
            <span className="sub">· {e.prevalence > 1 ? <>משותפת ל-<Ltr>{e.prevalence}</Ltr> חברות במאגר</> : 'ייחודית לקשר הזה'}</span>
          </li>
        ))}
        {!row.declared && missing.length > 0 && (
          <li className="sub">אין {missing.map((t) => EVIDENCE_TYPES[t]).join(' ואין ')}</li>
        )}
      </ul>
      <div className="rel2-feedback">
        {answer ? (
          <>
            <p className="ui-success" role="status"><Shape risk="none" />המשוב נשמר: הקשר סומן כ{answer === 'correct' ? 'נכון' : 'שגוי'}</p>
            <Button variant="text" size="sm" onClick={() => onAnswer(null)}>שינוי</Button>
          </>
        ) : (
          <>
            <span className="rel2-fb-q">הקשר הזה נכון?</span>
            <Button size="sm" onClick={() => onAnswer('correct')}>נכון</Button>
            <Button size="sm" onClick={() => onAnswer('wrong')}>שגוי</Button>
          </>
        )}
      </div>
    </div>
  );
}

function RelationsBody({ company, data }) {
  const group = company.modelOutputs.controlGroup;
  const { pathname, search, hash } = useLocation();
  const navigate = useNavigate();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const strength = params.get('rs') === 'all' ? 'all' : 'strong';
  const evidence = EVIDENCE_FILTER.some((f) => f.id === params.get('re')) ? params.get('re') : 'all';

  const [page, setPage] = useState(0);
  const [selId, setSelId] = useState(null);
  const [open, setOpen] = useState([]);
  const [answers, setAnswers] = useState(() => ({ ...FEEDBACK }));

  const all = useMemo(() => relationRows(data), [data]);
  const rows = useMemo(
    () => all.filter((r) => (strength === 'all' || r.strength === 'strong') && (evidence === 'all' || r.evidence.some((e) => e.type === evidence))),
    [all, strength, evidence],
  );
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const cur = Math.min(page, pages - 1);
  const slice = rows.slice(cur * PAGE, cur * PAGE + PAGE);
  const sel = rows.find((r) => r.id === selId) ?? null;
  const graphItems = rows.slice(0, MAX_NODES);
  const shown = graphItems.reduce((n, r) => n + (r.kind === 'cluster' ? r.count : 1), 0);
  const rest = Math.max(0, group.companies - 1 - shown);

  // מצב הסינון ב-URL: ערכי ברירת מחדל לא נכתבים, וה-hash (המקטע הנוכחי) נשמר
  const setFilter = (key, value, def) => {
    const next = new URLSearchParams(search);
    if (value === def) next.delete(key); else next.set(key, value);
    const s = next.toString();
    navigate({ pathname, search: s ? `?${s}` : '', hash }, { replace: true });
    setPage(0);
  };
  const resetFilters = () => {
    const next = new URLSearchParams(search);
    next.set('rs', 'all'); next.delete('re');
    navigate({ pathname, search: `?${next}`, hash }, { replace: true });
    setPage(0);
  };

  const answer = (id, value) => {
    if (value) FEEDBACK[id] = value; else delete FEEDBACK[id];
    setAnswers({ ...FEEDBACK });
  };
  const toggleCluster = (id) => setOpen((o) => (o.includes(id) ? o.filter((x) => x !== id) : [...o, id]));
  /** לחיצה בטבלה: בחירת הקשר; שורת אשכול גם נפתחת/נסגרת */
  const clickRow = (r) => { setSelId(r.id); if (r.kind === 'cluster') toggleCluster(r.id); };
  /** לחיצה בגרף: בחירה, מעבר לעמוד של השורה, ופתיחת אשכול */
  const clickNode = (r) => {
    setSelId(r.id);
    setPage(Math.floor(rows.indexOf(r) / PAGE));
    if (r.kind === 'cluster') setOpen((o) => (o.includes(r.id) ? o : [...o, r.id]));
  };

  const columns = [
    {
      id: 'company', label: 'חברה', weight: 26,
      render: (r) => (r.kind === 'cluster'
        ? <span className="rel-toggle">{open.includes(r.id) ? <ChevronDown size={16} aria-hidden="true" /> : <ChevronLeft size={16} aria-hidden="true" />}אשכול: <Ltr>{r.count}</Ltr> חברות</span>
        : r.companyId
          ? <Link to={`/companies/${r.companyId}`} className="link" onClick={(e) => e.stopPropagation()}><Ltr>{r.name}</Ltr></Link>
          : <Ltr>{r.name}</Ltr>),
    },
    { id: 'profile', label: 'פרופיל', weight: 15, render: (r) => r.profile },
    { id: 'strength', label: 'חוזק הקשר', weight: 13, render: (r) => <StrengthMeter strength={r.strength} /> },
    { id: 'evidence', label: 'ראיות', weight: 31, render: (r) => <span className="sub">{evidenceSummary(r)}</span> },
    { id: 'kind', label: 'סוג', weight: 12, render: (r) => <RelationKind declared={r.declared} /> },
  ];

  const from = rows.length ? cur * PAGE + 1 : 0;
  const to = Math.min(rows.length, cur * PAGE + PAGE);

  return (
    <div className={`rel2${rows.length === 0 ? ' no-graph' : ''}`}>
      <div className="rel2-main">
        <div className="rel2-bar">
          <span className="rel2-lab" id="rel-str-l">חוזק:</span>
          <div role="group" aria-labelledby="rel-str-l" className="rel2-seg">
            {STRENGTH_FILTER.map((f) => <Button key={f.id} variant="seg" size="sm" active={strength === f.id} aria-pressed={strength === f.id} onClick={() => setFilter('rs', f.id, 'strong')}>{f.label}</Button>)}
          </div>
          <span className="rel2-lab rel2-lab-2" id="rel-ev-l">ראיה:</span>
          <div role="group" aria-labelledby="rel-ev-l" className="rel2-seg">
            {EVIDENCE_FILTER.map((f) => <Button key={f.id} variant="seg" size="sm" active={evidence === f.id} aria-pressed={evidence === f.id} onClick={() => setFilter('re', f.id, 'all')}>{f.label}</Button>)}
          </div>
        </div>
        {data.commonEvidence.map((c) => <CommonEvidence key={c.text} item={c} />)}

        {rows.length === 0 ? (
          <div className="ui-state" role="status">
            <strong>אין קשרים שתואמים לסינון</strong>
            <span>בקבוצה יש {all.length} שורות. הרחב את הסינון כדי לראות אותן.</span>
            <Button size="sm" onClick={resetFilters}>הצג את כל הקשרים</Button>
          </div>
        ) : (
          <>
            <div className="ui-table-scroll">
              <TableCore caption="קשרים בין חברות" columns={columns} rows={slice} rowKey={(r) => r.id} stickyHead={false} className="rel2-table"
                onRowClick={clickRow} selectedKey={sel?.id} expandedKeys={open}
                renderDetail={(r) => (
                  <div className="rel2-cluster">
                    <p className="sub">אותן ראיות לכל <Ltr>{r.members.length}</Ltr> החברות: {r.summary}</p>
                    <ul className="rel2-members" aria-label="חברות באשכול">{r.members.map((m) => <li key={m}><Ltr>{m}</Ltr></li>)}</ul>
                  </div>
                )} />
            </div>
            <div className="ui-pager rel2-pager">
              <span className="ui-pager-range">
                <Ltr>{from}–{to}</Ltr> מתוך <Ltr>{rows.length}</Ltr> שורות{rows.length !== all.length && <> (מסוננות מתוך <Ltr>{all.length}</Ltr>)</>} · <Ltr>{group.companies - 1}</Ltr> חברות קשורות
              </span>
              <div className="ui-pager-nav">
                <Button variant="icon" size="sm" aria-label="העמוד הקודם" disabled={cur === 0} onClick={() => setPage(cur - 1)}><ChevronRight size={16} aria-hidden="true" /></Button>
                <Button variant="icon" size="sm" aria-label="העמוד הבא" disabled={cur >= pages - 1} onClick={() => setPage(cur + 1)}><ChevronLeft size={16} aria-hidden="true" /></Button>
              </div>
            </div>
          </>
        )}
        {sel && <EvidencePanel row={sel} answer={answers[sel.id]} onAnswer={(v) => answer(sel.id, v)} onClose={() => setSelId(null)} />}
      </div>

      {rows.length > 0 && (
        <div className="rel2-graph">
          <RelationsView center={company} items={graphItems} selectedId={sel?.id} onSelect={clickNode} />
          <p className="rel2-caption">
            מוצגים <Ltr>{graphItems.length}</Ltr> הקשרים החזקים ביותר (עד <Ltr>{MAX_NODES}</Ltr>)
            {rest > 0 && <> · ועוד <Ltr>{rest}</Ltr> חברות בקבוצה, בטבלה</>}
          </p>
          <ul className="rel-legend" aria-label="מקרא חוזק הקשר">
            <li>חוזק:</li>
            {Object.keys(STRENGTHS).map((k) => <li key={k}><StrengthBars strength={k} />{STRENGTHS[k].label}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

/** שורת מצב בתוך הפאנל: חיווי + הסבר */
function PanelState({ children, badge, text }) {
  return (
    <div className="ui-state" role="status">
      <strong>{badge}</strong>
      <span>{text}</span>
      {children}
    </div>
  );
}

/** המקטע כולו: כותרת (שם, מטא, מקרא) ובגוף המצב המתאים לתוצר המודל */
export default function RelationsSection({ company, id = 'relations' }) {
  const group = company.modelOutputs.controlGroup;
  const assessed = group.state === 'assessed';
  const { status, data, reload } = useAsync(() => (assessed ? getRelationsApi(company.id) : Promise.resolve(null)), [company.id, assessed]);
  const meta = <>תוצר מודל{assessed && <> · קבוצת שליטה של <Ltr>{group.companies}</Ltr> חברות</>} · {modelMeta(group)}</>;

  let body;
  if (group.state === 'unassessed') {
    body = <PanelState badge={<SeverityBadge severity="unassessed" />} text={group.reasons[0]} />;
  } else if (group.state === 'none') {
    body = <PanelState badge={<span className="ui-sev none mo-ok"><Shape risk="none" />לא נמצאו קשרים</span>} text="נבדקו בעלות, ניהול, כתובת ובעלי תפקידים, ולחברה אין קשרים עם חברות אחרות." />;
  } else if (status === 'error') {
    body = <ErrorState onRetry={reload} title="טעינת הקשרים נכשלה">אירעה שגיאה בטעינת הקשרים. הסינון נשמר.</ErrorState>;
  } else if (status !== 'done' || !data) {
    body = <div className="rel2-loading" aria-busy="true"><TableSkeleton rows={5} cols={5} /></div>;
  } else {
    body = <RelationsBody key={company.id} company={company} data={data} />;
  }

  return (
    <Panel id={id} title="קשרים בין חברות" meta={meta} actions={assessed ? <RelationLegend /> : null} flush>
      {body}
    </Panel>
  );
}
