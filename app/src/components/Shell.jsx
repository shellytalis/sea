import { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Map, Building2, ListChecks, Route, Bell, Search, Sun, Moon, Anchor, FlaskConical } from 'lucide-react';
import { searchEntities } from '../data/api';
import { useTheme } from '../ui/prefs';
import Button from '../ui/Button';
import Combobox from '../ui/Combobox';
import Drawer from '../ui/Drawer';
import { Ltr, Mono } from '../ui/Ltr';

/** match: מתי הפריט פעיל; דפי כלי שייכים ל"מפה", דפי חברה ל"חברות" */
const NAV = [
  { to: '/', icon: Map, label: 'מפה', match: (p) => p === '/' || p.startsWith('/vessels') },
  { to: '/companies', icon: Building2, label: 'חברות', match: (p) => p.startsWith('/companies') },
  { to: '/tracking', icon: ListChecks, label: 'אוניות למעקב', match: (p) => p.startsWith('/tracking') },
  { to: '/od', icon: Route, label: 'ניתוח מקור–יעד', match: (p) => p.startsWith('/od') },
  { to: '/models', icon: FlaskConical, label: 'מודלים', match: (p) => p.startsWith('/models') },
  { to: '/ports', icon: Anchor, label: 'נמלים', match: (p) => p.startsWith('/ports') },
];

/** חיפוש גלובלי: כלים (שם, IMO, MMSI) וחברות (שם), מקובצים, בלי עמוד תוצאות */
function GlobalSearch() {
  const [q, setQ] = useState('');
  const nav = useNavigate();
  const { vessels, companies } = searchEntities(q);
  const groups = [
    {
      id: 'vessels', label: 'כלי שיט',
      items: vessels.map((v) => ({
        key: v.id, text: v.name, to: `/vessels/${v.id}`,
        render: () => (
          <span className="search-hit">
            <Ltr className="cell-name">{v.name}</Ltr>
            <span className="sub"><Mono>IMO {v.imo}</Mono></span>
            <span className="sub grow">{v.type}</span>
          </span>
        ),
      })),
    },
    {
      id: 'companies', label: 'חברות',
      items: companies.map((c) => ({
        key: c.id, text: c.name, to: `/companies/${c.id}`,
        render: () => (
          <span className="search-hit">
            <Ltr className="cell-name">{c.name}</Ltr>
            <span className="sub grow">{c.type} · {c.country}</span>
          </span>
        ),
      })),
    },
  ];
  const go = (to) => { setQ(''); nav(to); };
  const first = groups.flatMap((g) => g.items)[0];
  return (
    <div className="search" role="search">
      <Search size={16} aria-hidden="true" />
      <Combobox value={q} onChange={setQ} ariaLabel="חיפוש כלי שיט וחברות" placeholder="חפש שם, IMO, MMSI" inputClassName=""
        emptyText="לא נמצאו תוצאות" groups={groups} onSelect={(it) => go(it.to)} onEnter={() => { if (first) go(first.to); }} />
    </div>
  );
}

export default function Shell() {
  const { theme, toggle } = useTheme();
  const { pathname } = useLocation();
  const [alerts, setAlerts] = useState(false);
  const light = theme === 'light';
  return (
    <div className="shell">
      <nav className="nav" aria-label="ניווט ראשי">
        <div className="nav-logo" aria-hidden="true">SEA</div>
        {NAV.map((n) => {
          const on = n.match(pathname);
          return (
            <Button key={n.to} as={Link} to={n.to} variant="nav" active={on} aria-current={on ? 'page' : undefined}
              title={n.label} aria-label={n.label} icon={<n.icon size={20} aria-hidden="true" />} />
          );
        })}
        <div className="nav-spacer" />
        <Button variant="nav" active={alerts} aria-expanded={alerts} aria-haspopup="dialog" title="התראות" aria-label="התראות"
          onClick={() => setAlerts(!alerts)} icon={<Bell size={20} aria-hidden="true" />} />
      </nav>
      <div className="main">
        <header className="topbar">
          <GlobalSearch />
          <div className="spacer" />
          <Button variant="icon" onClick={toggle} title={light ? 'מצב כהה' : 'מצב בהיר'} aria-label="החלפת ערכת נושא"
            icon={light ? <Moon size={18} aria-hidden="true" /> : <Sun size={18} aria-hidden="true" />} />
        </header>
        <Outlet />
        {alerts && (
          <Drawer overlay side="start" label="התראות" title="התראות" onClose={() => setAlerts(false)}>
            <div className="alerts-empty">
              <strong>אין התראות</strong>
              <p>כשיוגדרו כללים והתראות, הן יופיעו כאן.</p>
            </div>
          </Drawer>
        )}
      </div>
    </div>
  );
}
