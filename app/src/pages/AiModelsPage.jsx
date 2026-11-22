import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import MapView from '../components/MapView';
import VesselDrawer from '../components/VesselDrawer';
import { ASSIGNMENTS, getAssignment, getCustomer, getModel, getRun, runsOf } from '../data/aiModels';
import { getVessel } from '../data/vessels';
import { ModelTag, SeverityBadge, Shape } from '../ui/Badges';
import Button from '../ui/Button';
import Chip from '../ui/Chip';
import { Ltr, Mono, Num } from '../ui/Ltr';
import Panel from '../ui/Panel';
import SpecNote from '../ui/SpecNote';
import { EmptyState } from '../ui/States';
import TableCore, { sortRows } from '../ui/Table';
import { mapRisk, severityRank } from '../ui/severity';

/*
 * דף "מודלי בינה מלאכותית" (שלב 3, הצעה): פאנל בצד ה-start עם שלוש רמות (מודל × לקוח, הרצות, כלים) והמפה בצד ה-end.
 * המצב ב-URL: ?model=&customer=&run= (הרמה), ובטבלה q, reason, sort, page, sel. המפה היא MapView כמו שהוא.
 * המודל מסמן "שווה לבדוק", לא קובע; הרצה שנכשלה אינה "אין ממצאים".
 */

const PAGE = 50;
const STATUS = {
  complete: { sev: 'low', label: 'הושלמה' },
  partial: { sev: 'medium', label: 'חלקית' },
  failed: { sev: 'critical', label: 'נכשלה' },
  unassessed: { sev: 'unassessed', label: 'לא הוערכה' },
};
const OPENABLE = ['complete', 'partial'];
const shortDate = (d) => `${d.slice(8, 10)}.${d.slice(5, 7)}`;
const lowerIncludes = (s, q) => s.toLowerCase().includes(q);

/** סמל סטטוס בלבד (צורה + צבע, בלי מילה); המשמעות ב-tooltip (title) ובתווית לקורא מסך */
function StatusMark({ status }) {
  return (
    <span className="ai-status" title={STATUS[status].label} role="img" aria-label={STATUS[status].label}>
      <Shape risk={STATUS[status].sev} />
    </span>
  );
}

/** שדה חיפוש עם ערך מקומי: העדכון ל-URL מתעכב קצת, כדי שהקלדה מהירה לא תאבד תווים */
function SearchField({ value, onChange, label, placeholder }) {
  const [text, setText] = useState(value);
  useEffect(() => { setText(value); }, [value]);
  useEffect(() => {
    if (text === value) return undefined;
    const t = setTimeout(() => onChange(text), 250);
    return () => clearTimeout(t);
  }, [text]); // eslint-disable-line react-hooks/exhaustive-deps
  return <input type="search" className="ui-input ai-search" aria-label={label} placeholder={placeholder} value={text} onChange={(e) => setText(e.target.value)} />;
}

/** רמה 1: שורה לכל זוג מודל + לקוח */
function Level1({ open }) {
  return (
    <ul className="ai-list" aria-label="מודלים ולקוחות">
      {ASSIGNMENTS.map((a) => (
        <li key={a.id}>
          <button type="button" className="ai-row" onClick={() => open(a)}>
            <span className="ai-row-main"><strong>{getModel(a.modelId).name}</strong><Chip tag>{getCustomer(a.customerId).name}<SpecNote>דמה</SpecNote></Chip></span>
            <ChevronLeft size={16} aria-hidden="true" className="ai-row-go" />
          </button>
        </li>
      ))}
    </ul>
  );
}

/** רמה 2: הרצות של המודל והלקוח שנבחרו. הרצה בלי תוצרים אינה נפתחת, ומוסבר למה */
function Level2({ assignment, open }) {
  const runs = runsOf(assignment.id);
  if (runs.length === 0) {
    return <EmptyState title="למודל אין הרצות עבור הלקוח"><span>עדיין לא בוצעה הרצה.</span></EmptyState>;
  }
  return (
    <ul className="ai-list" aria-label="הרצות">
      {runs.map((r) => {
        const can = OPENABLE.includes(r.status);
        return (
          <li key={r.id}>
            <button type="button" className="ai-row ai-run" aria-disabled={!can || undefined} onClick={() => can && open(r)}>
              <span className="ai-row-main">
                <Num className="ai-run-date">{r.date.slice(0, 10)}</Num>
                <StatusMark status={r.status} />
              </span>
              {can && <ChevronLeft size={16} aria-hidden="true" className="ai-row-go" />}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

const reasonChips = (reasons) => (
  <span className="ai-reasons">
    {reasons.slice(0, 2).map((x) => <Chip key={x} tag>{x}</Chip>)}
    {reasons.length > 2 && <span className="roles-more" title={reasons.slice(2).join(', ')}><Ltr>+{reasons.length - 2}</Ltr></span>}
  </span>
);

/** רמה 3: טבלת הכלים של ההרצה, עם חיפוש (כלי או סיבה), סינון מהיר לפי סיבה, מיון ועימוד */
function Level3({ model, run, view, patch, selectVessel, rows, filtered, sorted, counts }) {
  const { q, reason, page } = view;
  const pages = Math.max(1, Math.ceil(sorted.length / PAGE));
  const cur = Math.min(page, pages - 1);
  const slice = sorted.slice(cur * PAGE, cur * PAGE + PAGE);
  const sort = view.sort;
  const columns = [
    { id: 'name', label: 'כלי', weight: 20, render: (r) => <Link to={`/vessels/${r.vesselId}`} className="cell-link" onClick={(e) => e.stopPropagation()}><Ltr>{r.vessel.name}</Ltr></Link> },
    { id: 'imo', label: 'IMO', weight: 11, render: (r) => <Mono>{r.vessel.imo}</Mono> },
    { id: 'flag', label: 'דגל', weight: 11, render: (r) => r.vessel.flag },
    { id: 'type', label: 'סוג כלי', weight: 14, render: (r) => <Ltr>{r.vessel.type}</Ltr> },
    { id: 'reasons', label: 'סיבה', weight: 24, render: (r) => reasonChips(r.reasons) },
    { id: 'severity', label: 'חומרה', weight: 12, sort: (r) => severityRank(r.severity), render: (r) => <SeverityBadge severity={r.severity} /> },
    { id: 'confidence', label: 'ביטחון המודל', weight: 9, align: 'end', render: (r) => <Num>{Math.round(r.confidence * 100)}%</Num> },
    { id: 'detected', label: 'זוהה', weight: 15, sort: (r) => r.detectedAt, render: (r) => <Num className="sec">{r.detectedAt}</Num> },
  ];
  const toggleSort = (id) => {
    const same = sort.id === id;
    patch({ sort: same && sort.dir === 'desc' ? `${id}.asc` : same && sort.dir === 'asc' ? null : `${id}.desc`, page: null });
  };

  return (
    <>
      <div className="ai-source">
        <ModelTag />
        <span>מקור: {model.name} · גרסה <Num>{run.modelVersion}</Num> · הרצה <Num>{run.date}</Num></span>
      </div>
      <p className="ai-note">הכלים מסומנים כ"שווה לבדוק". זו הערכה של המודל, לא קביעה.</p>
      {run.status === 'partial' && <p className="ai-warn"><SeverityBadge severity="medium" label="הרצה חלקית" /><span>{run.note}</span></p>}
      {rows.length === 0 ? (
        <EmptyState title="המודל רץ ולא סימן כלים"><span>זה תוצר תקין של ההרצה, לא כשל.</span></EmptyState>
      ) : (
        <>
          <div className="ai-tools">
            <SearchField value={q} onChange={(v) => patch({ q: v || null, page: null, sel: null })} label="חיפוש כלי או סיבה" placeholder="שם כלי, IMO, MMSI או סיבה" />
            <span className="ai-count" aria-live="polite"><Num>{filtered.length}</Num> מתוך <Num>{rows.length}</Num></span>
          </div>
          <div className="ai-chips" role="group" aria-label="סינון לפי סיבה">
            <Button variant="seg" size="sm" active={!reason} aria-pressed={!reason} onClick={() => patch({ reason: null, page: null, sel: null })}>הכול</Button>
            {counts.map(([x, n]) => (
              <Button key={x} variant="seg" size="sm" active={reason === x} aria-pressed={reason === x} onClick={() => patch({ reason: reason === x ? null : x, page: null, sel: null })}>{x} <Num>{n}</Num></Button>
            ))}
          </div>
          {filtered.length === 0 ? (
            <EmptyState title="לא נמצאו כלים. נסה שם, IMO או סיבה אחרת"><span>הסר את החיפוש או את הסינון כדי לראות את כל הכלים.</span></EmptyState>
          ) : (
            <>
              <div className="ui-table-scroll ai-table-scroll">
                <TableCore caption="כלים שסומנו בהרצה" columns={columns} rows={slice} rowKey={(r) => r.vesselId} stickyHead={false} className="ai-table"
                  sort={sort} onSort={toggleSort} onRowClick={(r) => selectVessel(r.vesselId)} selectedKey={view.sel} />
              </div>
              <div className="ui-pager ai-pager">
                <span className="ui-pager-range"><Ltr>{cur * PAGE + 1}–{Math.min(sorted.length, cur * PAGE + PAGE)}</Ltr> מתוך <Ltr>{sorted.length}</Ltr></span>
                <div className="ui-pager-nav">
                  <Button variant="icon" size="sm" aria-label="העמוד הקודם" disabled={cur === 0} onClick={() => patch({ page: cur > 1 ? String(cur) : null, sel: null })}><ChevronRight size={16} aria-hidden="true" /></Button>
                  <Button variant="icon" size="sm" aria-label="העמוד הבא" disabled={cur >= pages - 1} onClick={() => patch({ page: String(cur + 2), sel: null })}><ChevronLeft size={16} aria-hidden="true" /></Button>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </>
  );
}

export default function AiModelsPage() {
  const [params, setParams] = useSearchParams();
  const [map, setMap] = useState(null);

  const assignment = getAssignment(params.get('model'), params.get('customer')) ?? null;
  const rawRun = assignment ? getRun(assignment.id, params.get('run')) : null;
  const run = rawRun && OPENABLE.includes(rawRun.status) ? rawRun : null;
  const model = assignment ? getModel(assignment.modelId) : null;
  const level = run ? 3 : assignment ? 2 : 1;

  const [sp, dir] = (params.get('sort') ?? '').split('.');
  const view = {
    q: params.get('q') ?? '',
    reason: params.get('reason') ?? '',
    page: Math.max(0, (parseInt(params.get('page') ?? '1', 10) || 1) - 1),
    sel: params.get('sel') ?? '',
    sort: ['severity', 'detected'].includes(sp) && ['asc', 'desc'].includes(dir) ? { id: sp, dir } : { id: 'severity', dir: 'desc' },
  };

  /** ניווט בין רמות: רשומת היסטוריה חדשה (חזרה בדפדפן עובדת); מנקה את מצב הטבלה */
  const go = (next) => setParams(new URLSearchParams(next));
  /** עדכון מצב הטבלה בתוך רמה 3, בלי רשומת היסטוריה */
  const patch = (changes) => setParams((prev) => {
    const next = new URLSearchParams(prev);
    for (const [k, v] of Object.entries(changes)) { if (v === null || v === '') next.delete(k); else next.set(k, v); }
    return next;
  }, { replace: true });

  const rows = useMemo(() => (run ? run.vessels.map((f) => ({ ...f, vessel: getVessel(f.vesselId) })).filter((r) => r.vessel) : []), [run]);
  const s = view.q.trim().toLowerCase();
  const byQ = useMemo(() => rows.filter((r) => !s || lowerIncludes(r.vessel.name, s) || r.vessel.imo.includes(s) || r.vessel.mmsi.includes(s) || r.reasons.some((x) => lowerIncludes(x, s))), [rows, s]);
  const counts = useMemo(() => {
    const m = new Map();
    byQ.forEach((r) => r.reasons.forEach((x) => m.set(x, (m.get(x) ?? 0) + 1)));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [byQ]);
  const filtered = useMemo(() => byQ.filter((r) => !view.reason || r.reasons.includes(view.reason)), [byQ, view.reason]);
  const sortCols = useMemo(() => [
    { id: 'severity', sort: (r) => severityRank(r.severity) },
    { id: 'detected', sort: (r) => r.detectedAt },
  ], []);
  const sorted = useMemo(() => sortRows(filtered, sortCols, view.sort), [filtered, sortCols, view.sort.id, view.sort.dir]); // eslint-disable-line react-hooks/exhaustive-deps

  const selRow = filtered.find((r) => r.vesselId === view.sel) ?? null;
  /** בחירת כלי (מהטבלה או מהמפה): מדגיש, עובר לעמוד שלו, ופותח את VesselDrawer */
  const selectVessel = (id) => {
    const idx = sorted.findIndex((r) => r.vesselId === id);
    if (idx < 0) return;
    patch({ sel: id, page: Math.floor(idx / PAGE) > 0 ? String(Math.floor(idx / PAGE) + 1) : null });
  };

  // המפה: רק הכלים שבטבלה (אחרי סינון), בסימון לפי חומרה. ברמות 1 ו-2: בלי סימון
  const mapVessels = useMemo(() => filtered.map((r) => ({ ...r.vessel, risk: mapRisk(r.severity) })), [filtered]);
  const fitKey = filtered.map((r) => r.vesselId).join();
  useEffect(() => {
    if (!map || mapVessels.length === 0) return;
    const lats = mapVessels.map((v) => v.lat), lons = mapVessels.map((v) => v.lon);
    map.fitBounds([[Math.min(...lons), Math.min(...lats)], [Math.max(...lons), Math.max(...lats)]], { padding: 80, maxZoom: 6, duration: 600 });
  }, [map, fitKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // גלילה לשורה הנבחרת (למשל אחרי לחיצה על כלי במפה)
  useEffect(() => {
    if (view.sel) document.querySelector('.ai-table tr.selected')?.scrollIntoView({ block: 'nearest' });
  }, [view.sel, view.page]);

  const crumb = (label, onClick, current) => (current
    ? <span className="ai-crumb current" aria-current="page">{label}</span>
    : <button type="button" className="ai-crumb" onClick={onClick}>{label}</button>);
  const sep = <ChevronLeft size={16} aria-hidden="true" className="ai-crumb-sep" />;
  const customerName = assignment ? getCustomer(assignment.customerId).name : '';
  const pairParams = assignment ? { model: assignment.modelId, customer: assignment.customerId } : {};

  const title = (
    <nav className={`ai-crumbs${level === 3 ? ' deep' : ''}`} aria-label="מיקום בדף">
      {crumb('מודלים', () => go({}), level === 1)}
      {assignment && <>{sep}{crumb(`${model.name} · ${customerName}`, () => go(pairParams), level === 2)}</>}
      {run && <>{sep}{crumb(`הרצה ${shortDate(run.date)}`, null, true)}</>}
    </nav>
  );
  const back = level > 1 ? (
    <Button variant="icon" size="sm" aria-label="חזרה" icon={<ChevronRight size={16} aria-hidden="true" />} onClick={() => go(level === 3 ? pairParams : {})} />
  ) : null;

  return (
    <div className={`workspace ai${selRow ? ' with-vessel' : ''}`}>
      <Panel className="ai-panel" title={title} actions={back} flush>
        {level === 1 && <Level1 open={(a) => go({ model: a.modelId, customer: a.customerId })} />}
        {level === 2 && <Level2 assignment={assignment} open={(r) => go({ ...pairParams, run: r.id })} />}
        {level === 3 && <Level3 model={model} run={run} view={view} patch={patch} selectVessel={selectVessel} rows={rows} filtered={filtered} sorted={sorted} counts={counts} />}
      </Panel>
      {selRow && <VesselDrawer v={selRow.vessel} onClose={() => patch({ sel: null })} />}
      <div className="map-col">
        <MapView vessels={mapVessels} selectedId={selRow?.vesselId} onMapReady={setMap} onSelect={selectVessel} />
      </div>
    </div>
  );
}
