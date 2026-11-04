import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowLeft, Clock, History, ListFilter, Search } from 'lucide-react';
import {
  COMPANIES, COMPANY_COUNTRIES, COMPANY_TYPES, EMPTY_QUERY, FLEET_MAX, citiesOf, getCompany, hasParams, searchCompanies,
  type Company, type CompanyQuery,
} from '../data/companies';
import Button, { LinkButton } from '../ui/Button';
import { Autocomplete, CheckGroup, RangeField, Select } from '../ui/Fields';
import { Chip, ModelTag, RISKS, RISK_LABEL, RiskBadge } from '../ui/Badges';
import DataTable, { type Column } from '../ui/DataTable';
import Drawer from '../ui/Drawer';
import { ErrorState, ForbiddenState, NoResults, TableSkeleton } from '../ui/States';

type Status = 'idle' | 'loading' | 'done' | 'error' | 'forbidden';

const describe = (q: CompanyQuery) => [
  q.name.trim(), q.country, q.city, ...q.types, ...q.risks.map(r => `סיכון ${RISK_LABEL[r]}`),
  q.fleet[0] > 0 || q.fleet[1] < FLEET_MAX ? `צי ${q.fleet[0]}–${q.fleet[1]}` : '',
].filter(Boolean).join(' · ');

const DEMO_RECENT: CompanyQuery[] = [
  { ...EMPTY_QUERY, types: ['בעלים רשום'], country: 'יוון' },
  { ...EMPTY_QUERY, city: 'Hong Kong', country: 'הונג קונג', fleet: [50, FLEET_MAX] },
  { ...EMPTY_QUERY, risks: ['high'] },
];
const DEMO_VIEWED = ['c4', 'c13', 'c2', 'c10'];

const plural = (n: number) => (n === 1 ? 'חברה אחת' : `${n} חברות`);

export default function CompaniesPage() {
  const [params] = useSearchParams();
  const demoState = params.get('state'); // ?state=error | forbidden : הדגמת מצבי מערכת
  const [draft, setDraft] = useState<CompanyQuery>(EMPTY_QUERY);
  const [applied, setApplied] = useState<CompanyQuery | null>(null);
  const [status, setStatus] = useState<Status>(demoState === 'forbidden' ? 'forbidden' : 'idle');
  const [results, setResults] = useState<Company[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [recent, setRecent] = useState<CompanyQuery[]>(DEMO_RECENT);

  const run = useCallback((q: CompanyQuery) => {
    setApplied(q);
    setFiltersOpen(false);
    setStatus('loading');
    window.setTimeout(() => {
      if (demoState === 'error') { setStatus('error'); return; }
      setResults(searchCompanies(q));
      setStatus('done');
    }, 450);
  }, [demoState]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasParams(draft)) return;
    setRecent(r => [draft, ...r.filter(x => describe(x) !== describe(draft))].slice(0, 4));
    run(draft);
  };
  const reset = () => { setDraft(EMPTY_QUERY); setApplied(null); setStatus('idle'); setResults([]); };
  const applyQuery = (q: CompanyQuery) => { setDraft(q); run(q); };

  const chips = useMemo(() => {
    if (!applied) return [];
    const out: { key: string; label: string; next: CompanyQuery }[] = [];
    const q = applied;
    if (q.name.trim()) out.push({ key: 'name', label: `שם: ${q.name.trim()}`, next: { ...q, name: '' } });
    if (q.country) out.push({ key: 'country', label: `מדינה: ${q.country}`, next: { ...q, country: '', city: '' } });
    if (q.city) out.push({ key: 'city', label: `עיר: ${q.city}`, next: { ...q, city: '' } });
    q.types.forEach(t => out.push({ key: 't' + t, label: `סוג: ${t}`, next: { ...q, types: q.types.filter(x => x !== t) } }));
    if (q.fleet[0] > 0 || q.fleet[1] < FLEET_MAX) out.push({ key: 'fleet', label: `גודל צי: ${q.fleet[0]}–${q.fleet[1]}`, next: { ...q, fleet: [0, FLEET_MAX] } });
    q.risks.forEach(r => out.push({ key: 'r' + r, label: `סיכון: ${RISK_LABEL[r]}`, next: { ...q, risks: q.risks.filter(x => x !== r) } }));
    return out;
  }, [applied]);

  const removeChip = (next: CompanyQuery) => { if (hasParams(next)) applyQuery(next); else reset(); };

  const columns: Column<Company>[] = useMemo(() => [
    { id: 'name', label: 'שם חברה', locked: true, sort: c => c.name.toLowerCase(), render: c => <bdi dir="ltr" className="cell-name">{c.name}</bdi> },
    { id: 'risk', label: 'סיכון', badge: <ModelTag />, sort: c => c.riskScore ?? -1, render: c => (
      <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
        <RiskBadge risk={c.risk} />{c.riskScore !== null && <span className="mono" dir="ltr">{c.riskScore}</span>}
      </span>) },
    { id: 'country', label: 'מדינה', sort: c => c.country, render: c => c.country },
    { id: 'city', label: 'עיר', sort: c => c.city, render: c => <bdi dir="ltr">{c.city}</bdi> },
    { id: 'type', label: 'סוג', sort: c => c.type, render: c => c.type },
    { id: 'fleet', label: 'גודל צי', align: 'end', sort: c => c.fleetSize, render: c => <span className="mono" dir="ltr">{c.fleetSize}</span> },
    { id: 'roles', label: 'תפקידים', render: c => c.roleList.join(', ') },
    { id: 'anomalies', label: 'חריגות פעילות', badge: <ModelTag />, align: 'end', sort: c => c.anomalies ?? -1,
      render: c => (c.anomalies === null ? <span className="ui-hint">לא נבדק</span> : <span className="mono" dir="ltr">{c.anomalies}</span>) },
    { id: 'updated', label: 'עדכון אחרון', sort: c => c.updated, render: c => <span className="mono" dir="ltr">{c.updated}</span> },
  ], []);

  const sel = getCompany(selected);
  const draftHasParams = hasParams(draft);

  return (
    <div className="cs" style={{ gridTemplateColumns: `var(--filters-w) minmax(0,1fr)${sel ? ' var(--drawer-w)' : ''}` }}>
      <div className={`cs-backdrop${filtersOpen ? ' open' : ''}`} onClick={() => setFiltersOpen(false)} />
      <form className={`cs-filters${filtersOpen ? ' open' : ''}`} onSubmit={submit} aria-label="מסנני חיפוש חברות">
        <header><h2>מסננים</h2></header>
        <div className="cs-filters-body">
          <fieldset className="cs-group">
            <Autocomplete label="שם חברה" value={draft.name} onChange={name => setDraft({ ...draft, name })}
              suggestions={COMPANIES.map(c => c.name)} placeholder="הקלד שם או חלק משם" />
          </fieldset>
          <fieldset className="cs-group">
            <h3>מיקום</h3>
            <Select label="מדינה" value={draft.country} options={COMPANY_COUNTRIES} onChange={e => setDraft({ ...draft, country: e.target.value, city: '' })} />
            <Select label="עיר" value={draft.city} options={draft.country ? citiesOf(draft.country) : []} disabled={!draft.country}
              placeholder={draft.country ? 'הכל' : 'בחר מדינה תחילה'} onChange={e => setDraft({ ...draft, city: e.target.value })} />
          </fieldset>
          <fieldset className="cs-group">
            <CheckGroup legend="סוג חברה" options={COMPANY_TYPES} value={draft.types} onChange={types => setDraft({ ...draft, types })} />
          </fieldset>
          <fieldset className="cs-group">
            <RangeField label="מספר כלים" min={0} max={FLEET_MAX} value={draft.fleet} onChange={fleet => setDraft({ ...draft, fleet })} />
          </fieldset>
          <details className="cs-group cs-adv" open={draft.risks.length > 0}>
            <summary>סינון מתקדם</summary>
            <CheckGroup legend="רמת סיכון (מודל)" options={RISKS} value={draft.risks} onChange={risks => setDraft({ ...draft, risks })}
              render={r => <RiskBadge risk={r} />} />
          </details>
        </div>
        <footer>
          <Button type="submit" variant="primary" block disabled={!draftHasParams} loading={status === 'loading'} icon={<Search size={18} aria-hidden="true" />}>חיפוש</Button>
          <div className="cs-footer-row">
            <Button variant="text" onClick={reset} disabled={!draftHasParams && status === 'idle'}>נקה</Button>
          </div>
          {!draftHasParams && <span className="ui-hint" style={{ textAlign: 'center' }}>הזן פרמטר אחד לפחות כדי לחפש</span>}
        </footer>
      </form>

      <main className="cs-main">
        <div className="cs-head">
          <div className="cs-head-top">
            <h1>חיפוש חברות</h1>
            {status === 'done' && <span className="cs-count" aria-live="polite">{plural(results.length)}</span>}
            <Button className="cs-filters-btn" icon={<ListFilter size={16} aria-hidden="true" />} onClick={() => setFiltersOpen(true)}>
              מסננים{chips.length ? ` (${chips.length})` : ''}
            </Button>
          </div>
          {chips.length > 0 && (
            <div className="cs-chips" aria-label="מסננים פעילים">
              {chips.map(c => <Chip key={c.key} label={c.label} onRemove={() => removeChip(c.next)} />)}
              <Button variant="text" onClick={reset}>נקה הכול</Button>
            </div>
          )}
        </div>

        {status === 'idle' && (
          <div className="cs-scroll">
            <p className="cs-hint">הגדר פרמטר אחד או יותר בפאנל ולחץ על "חיפוש". אפשר גם לחזור לחיפוש קודם או לחברה שנצפתה.</p>
            <div className="cs-lists">
              <section>
                <h2><History size={16} aria-hidden="true" style={{ verticalAlign: '-2px' }} /> חיפושים אחרונים</h2>
                <ul className="cs-list">
                  {recent.map(q => (
                    <li key={describe(q)}><button type="button" onClick={() => applyQuery(q)}><span>{describe(q)}</span><ArrowLeft size={16} aria-hidden="true" /></button></li>
                  ))}
                </ul>
              </section>
              <section>
                <h2><Clock size={16} aria-hidden="true" style={{ verticalAlign: '-2px' }} /> חברות שנצפו לאחרונה</h2>
                <ul className="cs-list">
                  {DEMO_VIEWED.map(getCompany).map(c => c && (
                    <li key={c.id}><button type="button" onClick={() => setSelected(c.id)}><bdi dir="ltr">{c.name}</bdi><RiskBadge risk={c.risk} /></button></li>
                  ))}
                </ul>
              </section>
            </div>
          </div>
        )}
        {status === 'loading' && <TableSkeleton cols={7} />}
        {status === 'error' && applied && <ErrorState onRetry={() => run(applied)} />}
        {status === 'forbidden' && <ForbiddenState />}
        {status === 'done' && results.length === 0 && <NoResults onClear={reset} />}
        {status === 'done' && results.length > 0 && (
          <DataTable rows={results} columns={columns} rowKey={c => c.id} selectedKey={selected} onRowClick={c => setSelected(c.id)}
            caption="תוצאות חיפוש חברות" resetKey={results} />
        )}
      </main>

      {sel && (
        <Drawer
          title={<><bdi dir="ltr">{sel.name}</bdi></>}
          onClose={() => setSelected(null)}
          footer={<LinkButton to={`/companies/${sel.id}`} variant="primary" block icon={<ArrowLeft size={18} aria-hidden="true" />}>פתח פרופיל מלא</LinkButton>}
        >
          <div style={{ display: 'grid', gap: 8 }}>
            <span className="ui-hint">רמת סיכון <ModelTag /></span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
              <span style={{ fontSize: 16 }}><RiskBadge risk={sel.risk} /></span>
              {sel.riskScore !== null && <span className="mono" dir="ltr" style={{ fontSize: 24 }}>{sel.riskScore}<span className="ui-hint">/100</span></span>}
            </div>
          </div>
          <dl className="ui-facts">
            <dt>סוג</dt><dd>{sel.type}</dd>
            <dt>מיקום</dt><dd>{sel.country}, <bdi dir="ltr">{sel.city}</bdi></dd>
            <dt>גודל צי</dt><dd><span className="mono" dir="ltr">{sel.fleetSize}</span></dd>
            <dt>חריגות פעילות <ModelTag /></dt><dd>{sel.anomalies === null ? 'לא נבדק' : <span className="mono" dir="ltr">{sel.anomalies}</span>}</dd>
            <dt>עדכון אחרון</dt><dd><span className="mono" dir="ltr">{sel.updated}</span></dd>
            <dt>D&amp;B</dt><dd><span className="mono" dir="ltr">{sel.dnb}</span></dd>
          </dl>
        </Drawer>
      )}
    </div>
  );
}
