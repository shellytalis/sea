import { useState } from 'react';
import { Link, Outlet, useLocation, useMatch, useNavigate } from 'react-router-dom';
import { Map, Building2, ListChecks, Route, Bell, Search, Sun, Moon, Anchor, FlaskConical, Ship, BookUser, MessageSquare } from 'lucide-react';
import { searchEntities } from '../data/api';
import { getCompany } from '../data/companies';
import { getVessel } from '../data/vessels';
import { useTheme } from '../ui/prefs';
import { Tooltip } from '../ui/Badges';
import Brand from '../ui/Brand';
import Button from '../ui/Button';
import Clock from '../ui/Clock';
import Combobox from '../ui/Combobox';
import CompanyLogo from '../ui/CompanyLogo';
import Drawer from '../ui/Drawer';
import { Ltr, Mono } from '../ui/Ltr';
import SpecNote from '../ui/SpecNote';
import { EmptyState } from '../ui/States';

/** match: מתי הפריט פעיל; דפי כלי שייכים ל"מפה", דפי חברה ל"חברות" */
const NAV = [
  { to: '/', icon: Map, label: 'מפה', match: (p) => p === '/' || p.startsWith('/vessels') },
  { to: '/companies', icon: Building2, label: 'חברות', match: (p) => p.startsWith('/companies') },
  { to: '/tracking', icon: ListChecks, label: 'מעקב', match: (p) => p.startsWith('/tracking') },
  { to: '/od', icon: Route, label: 'ניתוח', match: (p) => p.startsWith('/od') },
  { to: '/models', icon: FlaskConical, label: 'מודלים', match: (p) => p.startsWith('/models') },
  { to: '/ports', icon: Anchor, label: 'נמלים', match: (p) => p.startsWith('/ports') },
];

/** שמות דפים בסרגל העליון (לדפים ללא ישות) */
const TITLES = { '/': 'מפה', '/companies': 'חברות', '/tracking': 'אוניות למעקב', '/od': 'ניתוח מקור–יעד', '/models': 'מודלים', '/ports': 'נמלים', '/design': 'מערכת עיצוב' };

/** משתמש לדוגמה (נתוני דמה) */
const USER = { name: 'דנה כהן', initials: 'דכ' };

/** פאנלים צדדיים שטרם הוגדרו (הצעה): מצב ריק מכוון */
const PANELS = {
  alerts: { title: 'התראות', empty: 'אין התראות', hint: 'כשיוגדרו כללים והתראות, הן יופיעו כאן.' },
  phonebook: { title: 'ספר טלפונים', empty: 'ספר הטלפונים טרם הוגדר', hint: 'אנשי קשר ומספרי חירום יופיעו כאן.', proposal: true },
  chat: { title: 'צ\'אט תמיכה', empty: 'צ\'אט תמיכה טרם הוגדר', hint: 'שיחות עם התמיכה יופיעו כאן.', proposal: true },
};

/**
 * שם הדף: בדפי חיפוש ובדפים ריקים שם בלבד; בדף ישות breadcrumb ("חברות › שם")
 * שהחלק הראשון בו מחזיר לחיפוש עם המצב השמור ב-URL.
 */
function PageTitle() {
  const { pathname, state } = useLocation();
  const company = useMatch('/companies/:id');
  const vessel = useMatch('/vessels/:id');
  const crumb = (parent, to, name) => (
    <nav aria-label="מיקום בדף" className="breadcrumb">
      <Link to={to} className="breadcrumb-link">{parent}</Link>
      <span className="breadcrumb-sep" aria-hidden="true">›</span>
      <span className="breadcrumb-current" aria-current="page"><Ltr>{name}</Ltr></span>
    </nav>
  );
  if (company) {
    const c = getCompany(company.params.id);
    return crumb('חברות', `/companies${state?.back ?? ''}`, c?.name ?? company.params.id);
  }
  if (vessel) {
    const v = getVessel(vessel.params.id);
    return crumb('מפה', '/', v?.name ?? vessel.params.id);
  }
  return <h1 className="page-title">{TITLES[pathname] ?? 'מסך בפיתוח'}</h1>;
}

/** חיפוש גלובלי: כלים (שם, IMO, MMSI) וחברות (שם), מקובצים, בלי עמוד תוצאות */
function GlobalSearch() {
  const [q, setQ] = useState('');
  const nav = useNavigate();
  const { vessels, companies } = searchEntities(q);
  const groups = [
    {
      id: 'vessels', label: 'כלי שיט', icon: <Ship size={12} aria-hidden="true" />,
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
      id: 'companies', label: 'חברות', icon: <Building2 size={12} aria-hidden="true" />,
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

/** כפתור אייקון בסרגל העליון: 32x32, אייקון 20px, tooltip ו-aria-label */
function ToolbarButton({ icon: Icon, label, active, onClick, expanded }) {
  return (
    <Tooltip text={label}>
      <Button variant="icon" size="sm" active={active} aria-label={label} aria-expanded={expanded} onClick={onClick}
        icon={<Icon size={20} aria-hidden="true" />} />
    </Tooltip>
  );
}

export default function Shell() {
  const { theme, toggle } = useTheme();
  const { pathname } = useLocation();
  const [panel, setPanel] = useState(null);
  const light = theme === 'light';
  const togglePanel = (id) => setPanel((p) => (p === id ? null : id));
  const cfg = panel ? PANELS[panel] : null;
  return (
    <div className="shell">
      <header className="toolbar">
        <Brand />
        <span className="tb-sep" aria-hidden="true" />
        <PageTitle />
        <div className="tb-search"><GlobalSearch /></div>
        <div className="tb-end">
          <Clock />
          <ToolbarButton icon={BookUser} label="ספר טלפונים" active={panel === 'phonebook'} expanded={panel === 'phonebook'} onClick={() => togglePanel('phonebook')} />
          <ToolbarButton icon={MessageSquare} label="צ'אט תמיכה" active={panel === 'chat'} expanded={panel === 'chat'} onClick={() => togglePanel('chat')} />
          <ToolbarButton icon={Bell} label="התראות" active={panel === 'alerts'} expanded={panel === 'alerts'} onClick={() => togglePanel('alerts')} />
          <ToolbarButton icon={light ? Moon : Sun} label={light ? 'מצב כהה' : 'מצב בהיר'} onClick={toggle} />
          <span className="tb-sep" aria-hidden="true" />
          <span className="user"><span className="avatar" aria-hidden="true">{USER.initials}</span><span className="user-name">{USER.name}</span></span>
          <CompanyLogo />
        </div>
      </header>
      <nav className="rail" aria-label="ניווט ראשי">
        {NAV.map((n) => {
          const on = n.match(pathname);
          return (
            <Button key={n.to} as={Link} to={n.to} variant="rail" active={on} aria-current={on ? 'page' : undefined} aria-label={n.label}
              icon={<n.icon size={20} aria-hidden="true" />}><span className="rail-label">{n.label}</span></Button>
          );
        })}
      </nav>
      <div className="main">
        <Outlet />
        {cfg && (
          <Drawer overlay label={cfg.title} title={cfg.title} onClose={() => setPanel(null)}>
            <EmptyState title={cfg.empty}>
              <span>{cfg.hint}</span>
              {cfg.proposal && <SpecNote tag>הצעה</SpecNote>}
            </EmptyState>
          </Drawer>
        )}
      </div>
    </div>
  );
}
