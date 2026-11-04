import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Clock, History, PanelLeftOpen, Pencil, Search } from 'lucide-react';
import { COMPANIES, COMPANY_COUNTRIES, COMPANY_TYPES, EMPTY_QUERY, citiesOf, getCompany } from '../data/companies';
import { searchCompaniesApi } from '../data/api';
import { hasParams, parseQuery, parseView, queryToParams } from '../data/companyQuery';
import { Tooltip } from '../ui/Badges';
import Button from '../ui/Button';
import Chip from '../ui/Chip';
import { Ltr, Mono } from '../ui/Ltr';
import { Autocomplete, MultiSelect, RangeField, Select } from '../ui/Fields';
import DataTable from '../ui/DataTable';
import Drawer from '../ui/Drawer';
import { Facts } from '../ui/Entity';
import { ErrorState, NoResults, TableSkeleton } from '../ui/States';
import useAsync from '../ui/useAsync';
import { SIGNAL_COLUMNS, SignalDetail, SignalsHeading } from '../components/Signals';

const fleetText = ([lo, hi]) => (lo === null && hi === null ? '' : `גודל צי ${lo ?? ''}–${hi ?? ''}`);
const describe = (q) => [q.name.trim(), q.country, q.city, ...q.types, fleetText(q.fleet)].filter(Boolean).join(' · ');

/** דמה: חיפושים וחברות שנצפו לאחרונה (אין עדיין שכבת היסטוריית משתמש) */
const DEMO_RECENT = [
  { ...EMPTY_QUERY, types: ['בעלים רשום'], country: 'יוון' },
  { ...EMPTY_QUERY, city: 'Hong Kong', country: 'הונג קונג', fleet: [50, null] },
  { ...EMPTY_QUERY, types: ['מפעיל'] },
];
const DEMO_VIEWED = ['c4', 'c13', 'c2', 'c10'];

const plural = (n) => (n === 1 ? 'חברה אחת' : `${n} חברות`);
const NAME_SUGGESTIONS = COMPANIES.map((c) => c.name);
const SCROLL_KEY = 'sea-cs-scroll';
const scroller = () => document.querySelector('.cs-body .ui-table-scroll');

/** תפקידים: עד שניים + "+N" */
const Roles = ({ list }) => (
  <span className="roles">
    {list.slice(0, 2).join(', ')}
    {list.length > 2 && <span className="roles-more" title={list.slice(2).join(', ')}><Ltr>+{list.length - 2}</Ltr></span>}
  </span>
);

export default function CompaniesPage() {
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const applied = useMemo(() => parseQuery(params), [params]);
  const view = useMemo(() => parseView(params), [params]);
  const isApplied = hasParams(applied);
  const filterKey = JSON.stringify(applied);

  const [draft, setDraft] = useState(applied);
  const [editing, setEditing] = useState(false);
  const [recent, setRecent] = useState(DEMO_RECENT);

  // חזרה/קדימה בדפדפן מעדכנות את הטופס
  useEffect(() => { setDraft(applied); }, [filterKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const { status, data, reload } = useAsync(
    () => (isApplied ? searchCompaniesApi(applied) : Promise.resolve([])),
    [filterKey, isApplied],
  );
  const results = data ?? [];

  /** חזרה מהפרופיל: משחזר את מיקום הגלילה של הטבלה כפי שהיה (ה-URL כבר משחזר את החיפוש) */
  useEffect(() => {
    if (status !== 'done') return;
    try {
      const saved = JSON.parse(sessionStorage.getItem(SCROLL_KEY) ?? 'null');
      if (saved && saved.search === location.search && scroller()) { scroller().scrollTop = saved.top; }
      sessionStorage.removeItem(SCROLL_KEY);
    } catch { /* אין sessionStorage */ }
  }, [status]); // eslint-disable-line react-hooks/exhaustive-deps
  const rememberScroll = () => {
    try { sessionStorage.setItem(SCROLL_KEY, JSON.stringify({ search: location.search, top: scroller()?.scrollTop ?? 0 })); } catch { /* אין sessionStorage */ }
  };

  /** עדכון פרמטרי תצוגה (מיון/עימוד/עמודות/בחירה) בלי להוסיף רשומת היסטוריה */
  const patch = (changes) => setParams((prev) => {
    const next = new URLSearchParams(prev);
    for (const [k, v] of Object.entries(changes)) { if (v === null || v === '') next.delete(k); else next.set(k, v); }
    return next;
  }, { replace: true });

  /** חיפוש חדש: מסננים חדשים, שומר מיון/גודל עמוד/עמודות, מאפס עימוד ובחירה */
  const apply = (q) => {
    const next = new URLSearchParams(queryToParams(q));
    for (const k of ['sort', 'size', 'hide']) if (params.get(k)) next.set(k, params.get(k));
    setParams(next);
    setEditing(false);
  };
  const draftHasParams = hasParams(draft);
  const submit = (e) => {
    e.preventDefault();
    if (!draftHasParams) return;
    setRecent((r) => [draft, ...r.filter((x) => describe(x) !== describe(draft))].slice(0, 4));
    apply(draft);
  };
  const reset = () => { setDraft(EMPTY_QUERY); setParams(new URLSearchParams()); setEditing(false); };

  const chips = useMemo(() => {
    const q = applied;
    const out = [];
    if (q.name.trim()) out.push({ key: 'name', label: `שם: ${q.name.trim()}`, next: { ...q, name: '' } });
    if (q.country) out.push({ key: 'country', label: `מדינה: ${q.country}`, next: { ...q, country: '', city: '' } });
    if (q.city) out.push({ key: 'city', label: `עיר: ${q.city}`, next: { ...q, city: '' } });
    q.types.forEach((t) => out.push({ key: `t${t}`, label: `סוג: ${t}`, next: { ...q, types: q.types.filter((x) => x !== t) } }));
    if (q.fleet[0] !== null || q.fleet[1] !== null) out.push({ key: 'fleet', label: fleetText(q.fleet), next: { ...q, fleet: [null, null] } });
    return out;
  }, [applied]);

  /** weight: משקל רוחב יחסי; שם ועמודות אותות רחבות, עמודות מספריות צרות */
  const columns = useMemo(() => [
    {
      id: 'name', label: 'שם', locked: true, weight: 17, sort: (c) => c.name.toLowerCase(),
      render: (c) => <Link to={`/companies/${c.id}`} state={{ back: location.search }} className="cell-link" onClick={rememberScroll}><Ltr>{c.name}</Ltr></Link>,
    },
    { id: 'country', label: 'מדינה', weight: 10, sort: (c) => c.country, render: (c) => c.country },
    { id: 'city', label: 'עיר', weight: 9, sort: (c) => c.city, render: (c) => <Ltr>{c.city}</Ltr> },
    { id: 'type', label: 'סוג', weight: 9, sort: (c) => c.type, render: (c) => c.type },
    { id: 'fleet', label: 'גודל צי', weight: 6, align: 'end', sort: (c) => c.fleetSize, render: (c) => <Mono>{c.fleetSize}</Mono> },
    { id: 'roles', label: 'תפקידים', weight: 12, render: (c) => <Roles list={c.roleList} /> },
    ...SIGNAL_COLUMNS,
    { id: 'updated', label: 'עדכון אחרון', weight: 9, sort: (c) => c.updated, render: (c) => <Mono>{c.updated}</Mono> },
    {
      id: 'actions', label: '', srLabel: 'תצוגה מהירה', noManage: true, weight: 4, align: 'end',
      render: (c) => (
        <Tooltip text="תצוגה מהירה">
          <Button variant="icon" size="sm" className="row-action" aria-label={`תצוגה מהירה: ${c.name}`}
            icon={<PanelLeftOpen size={16} aria-hidden="true" />} onClick={() => patch({ sel: c.id })} />
        </Tooltip>
      ),
    },
  ], [location.search]); // eslint-disable-line react-hooks/exhaustive-deps

  const sel = view.selected ? getCompany(view.selected) : null;
  const showForm = !isApplied || editing;

  return (
    <div className="cs">
      <header className="cs-head">
        <div className="cs-title-row">
          <h1>חיפוש חברות</h1>
          {isApplied && !editing && <span className="cs-count" aria-live="polite">{status === 'done' ? plural(results.length) : 'מחפש…'}</span>}
          {isApplied && !editing && (
            <Button className="cs-edit" icon={<Pencil size={16} aria-hidden="true" />} onClick={() => setEditing(true)}>ערוך חיפוש</Button>
          )}
        </div>
        {showForm ? (
          <form className="cs-form" onSubmit={submit} aria-label="חיפוש חברות">
            <Autocomplete className="span-4" label="שם חברה" value={draft.name} onChange={(name) => setDraft({ ...draft, name })}
              suggestions={NAME_SUGGESTIONS} placeholder="הקלד שם או חלק משם" onEnter={() => submit({ preventDefault() {} })} />
            <Select className="span-2" label="מדינה" value={draft.country} options={COMPANY_COUNTRIES} onChange={(e) => setDraft({ ...draft, country: e.target.value, city: '' })} />
            <Select className="span-2" label="עיר" value={draft.city} options={draft.country ? citiesOf(draft.country) : []} disabled={!draft.country}
              placeholder={draft.country ? 'הכל' : 'בחר מדינה'} onChange={(e) => setDraft({ ...draft, city: e.target.value })} />
            <MultiSelect className="span-4" label="סוג חברה" options={COMPANY_TYPES} value={draft.types} onChange={(types) => setDraft({ ...draft, types })} />
            <RangeField className="span-4" label="גודל צי" min={0} value={draft.fleet} onChange={(fleet) => setDraft({ ...draft, fleet })} />
            {!draftHasParams && <p className="cs-help">הזן פרמטר אחד לפחות</p>}
            <div className="cs-actions">
              <Button type="submit" variant="primary" disabled={!draftHasParams} loading={status === 'loading' && isApplied}
                icon={<Search size={18} aria-hidden="true" />}>חיפוש</Button>
              <Button onClick={reset} disabled={!draftHasParams && !isApplied}>נקה</Button>
            </div>
          </form>
        ) : (
          <div className="cs-summary" aria-label="מסננים פעילים">
            {chips.map((c) => <Chip key={c.key} label={c.label} removeLabel={`הסר ${c.label}`} onRemove={() => apply(c.next)} />)}
            <Button variant="text" className="cs-clear" onClick={reset}>נקה הכול</Button>
          </div>
        )}
      </header>

      <div className="cs-body">
        {!isApplied && (
          <div className="cs-scroll">
            <div className="cs-lists">
              <section>
                <h2><History size={16} aria-hidden="true" />חיפושים אחרונים</h2>
                <ul className="cs-list">
                  {recent.map((q) => (
                    <li key={describe(q)}><button type="button" onClick={() => { setDraft(q); apply(q); }}><span>{describe(q)}</span><ArrowLeft size={16} aria-hidden="true" /></button></li>
                  ))}
                </ul>
              </section>
              <section>
                <h2><Clock size={16} aria-hidden="true" />חברות שנצפו לאחרונה</h2>
                <ul className="cs-list">
                  {DEMO_VIEWED.map(getCompany).map((c) => c && (
                    <li key={c.id}><Link to={`/companies/${c.id}`} state={{ back: location.search }}><Ltr>{c.name}</Ltr><span className="sub">{c.country}</span></Link></li>
                  ))}
                </ul>
              </section>
            </div>
          </div>
        )}
        {isApplied && status === 'loading' && <TableSkeleton cols={8} />}
        {isApplied && status === 'error' && <ErrorState title="החיפוש נכשל" onRetry={reload}>אירעה שגיאה בטעינת התוצאות. הפרמטרים נשמרו.</ErrorState>}
        {isApplied && status === 'done' && results.length === 0 && <NoResults onClear={reset} />}
        {isApplied && status === 'done' && results.length > 0 && (
          <DataTable rows={results} columns={columns} rowKey={(c) => c.id} caption="תוצאות חיפוש חברות"
            selectedKey={view.selected}
            sort={view.sort} onSortChange={(s) => patch({ sort: s ? `${s.id}.${s.dir}` : null, page: null })}
            page={view.page} onPageChange={(p) => patch({ page: p > 0 ? String(p + 1) : null })}
            size={view.size} onSizeChange={(n) => patch({ size: n === 25 ? null : String(n), page: null })}
            hidden={view.hidden} onHiddenChange={(h) => patch({ hide: h.join(',') })} />
        )}

        {sel && (
          <Drawer overlay title={<><Ltr>{sel.name}</Ltr><div className="ui-drawer-sub">{sel.type} · {sel.country}</div></>}
            onClose={() => patch({ sel: null })}
            footer={<Button to={`/companies/${sel.id}`} state={{ back: location.search }} variant="primary" icon={<ArrowLeft size={18} aria-hidden="true" />}>פתח פרופיל מלא</Button>}>
            <section className="ui-drawer-group">
              <SignalsHeading signals={sel.signals} />
              <div className="signal-list">{sel.signals.map((sg) => <SignalDetail key={sg.kind} signal={sg} />)}</div>
            </section>
            <section className="ui-drawer-group">
              <h3>נתוני מפתח</h3>
              <Facts layout="list" items={[
                ['מיקום', <>{sel.country}, <Ltr>{sel.city}</Ltr></>],
                ['גודל צי', <Mono>{sel.fleetSize}</Mono>],
                ['תפקידים', sel.roleList.join(', ')],
                ['עדכון אחרון', <Mono>{sel.updated}</Mono>],
              ]} />
            </section>
          </Drawer>
        )}
      </div>
    </div>
  );
}
