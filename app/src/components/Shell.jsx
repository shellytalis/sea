import { useState } from 'react';
import { Link, Outlet, useLocation, useMatch } from 'react-router-dom';
import { Map, Building2, ListChecks, Route, Bell, Sun, Moon, Anchor, FlaskConical, BookUser, MessageSquare, ChevronLeft } from 'lucide-react';
import { getCompany } from '../data/companies';
import { getVessel } from '../data/vessels';
import { useTheme } from '../ui/prefs';
import { Tooltip } from '../ui/Badges';
import Brand from '../ui/Brand';
import Button from '../ui/Button';
import Clock from '../ui/Clock';
import CompanyLogo from '../ui/CompanyLogo';
import Drawer from '../ui/Drawer';
import { Ltr } from '../ui/Ltr';
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

/** משתמש לדוגמה (נתוני דמה): טקסט סטטי בסרגל העליון */
const USER_NAME = 'דנה כהן';

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
      <ChevronLeft size={16} className="breadcrumb-sep" aria-hidden="true" />
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
        <div className="tb-brand"><Brand /></div>
        <PageTitle />
        <div className="tb-spacer" />
        <div className="tb-end">
          <Clock />
          <div className="tb-icons">
            <ToolbarButton icon={BookUser} label="ספר טלפונים" active={panel === 'phonebook'} expanded={panel === 'phonebook'} onClick={() => togglePanel('phonebook')} />
            <ToolbarButton icon={MessageSquare} label="צ'אט תמיכה" active={panel === 'chat'} expanded={panel === 'chat'} onClick={() => togglePanel('chat')} />
            <ToolbarButton icon={Bell} label="התראות" active={panel === 'alerts'} expanded={panel === 'alerts'} onClick={() => togglePanel('alerts')} />
            <ToolbarButton icon={light ? Moon : Sun} label={light ? 'מצב כהה' : 'מצב בהיר'} onClick={toggle} />
          </div>
          <span className="tb-sep" aria-hidden="true" />
          <span className="greeting">שלום, <strong>{USER_NAME}</strong></span>
          <span className="tb-sep" aria-hidden="true" />
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
