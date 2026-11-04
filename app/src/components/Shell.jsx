import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Map, Ship, Building2, ListChecks, Route, Bell, Search, Sun, Moon, Anchor } from 'lucide-react';
import { searchVessels } from '../data/vessels';
import { useTheme } from '../ui/prefs';
import Button from '../ui/Button';
import Combobox from '../ui/Combobox';
import { Ltr, Mono } from '../ui/Ltr';

const NAV = [
  { to: '/', icon: Map, label: 'מפה', end: true },
  { to: '/vessels', icon: Ship, label: 'כלי שיט' },
  { to: '/companies', icon: Building2, label: 'חברות' },
  { to: '/tracking', icon: ListChecks, label: 'אוניות למעקב' },
  { to: '/od', icon: Route, label: 'ניתוח מקור–יעד' },
  { to: '/ports', icon: Anchor, label: 'נמלים' },
];

function GlobalSearch() {
  const [q, setQ] = useState('');
  const nav = useNavigate();
  const items = searchVessels(q).map((v) => ({
    key: v.id, text: v.name, id: v.id,
    render: () => (
      <span className="search-hit">
        <Ltr className="cell-name">{v.name}</Ltr>
        <span className="sub"><Mono>IMO {v.imo}</Mono></span>
        <span className="sub grow">{v.type}</span>
      </span>
    ),
  }));
  const go = (id) => { setQ(''); nav(`/vessels/${id}`); };
  return (
    <div className="search" role="search">
      <Search size={16} aria-hidden="true" />
      <Combobox value={q} onChange={setQ} ariaLabel="חיפוש כלי" placeholder="חפש שם, IMO, MMSI" inputClassName=""
        emptyText="לא נמצאו תוצאות" groups={[{ id: 'vessels', items }]} onSelect={(it) => go(it.id)}
        onEnter={() => { if (items[0]) go(items[0].id); }} />
    </div>
  );
}

export default function Shell() {
  const { theme, toggle } = useTheme();
  const light = theme === 'light';
  return (
    <div className="shell">
      <nav className="nav" aria-label="ניווט ראשי">
        <div className="nav-logo" aria-hidden="true">SEA</div>
        {NAV.map((n) => (
          <Button key={n.to} as={NavLink} to={n.to} end={n.end} variant="nav" title={n.label} aria-label={n.label}
            icon={<n.icon size={20} aria-hidden="true" />} />
        ))}
        <div className="nav-spacer" />
        <Button variant="nav" title="התראות" aria-label="התראות" icon={<Bell size={20} aria-hidden="true" />} />
      </nav>
      <div className="main">
        <header className="topbar">
          <GlobalSearch />
          <div className="spacer" />
          <Button variant="icon" onClick={toggle} title={light ? 'מצב כהה' : 'מצב בהיר'} aria-label="החלפת ערכת נושא"
            icon={light ? <Moon size={18} aria-hidden="true" /> : <Sun size={18} aria-hidden="true" />} />
        </header>
        <Outlet />
      </div>
    </div>
  );
}
