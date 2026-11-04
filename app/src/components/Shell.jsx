import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Map, Ship, Building2, ListChecks, Route, Bell, Search, Sun, Moon, Anchor } from "lucide-react";
import { searchVessels } from "../data/vessels";
import { useTheme } from "../ui/prefs";
const NAV = [
  {
    to: "/",
    icon: Map,
    label: "מפה",
    end: true
  },
  {
    to: "/vessels",
    icon: Ship,
    label: "כלי שיט"
  },
  {
    to: "/companies",
    icon: Building2,
    label: "חברות"
  },
  {
    to: "/tracking",
    icon: ListChecks,
    label: "אוניות למעקב"
  },
  {
    to: "/od",
    icon: Route,
    label: "ניתוח מקור–יעד"
  },
  {
    to: "/ports",
    icon: Anchor,
    label: "נמלים"
  }
];
function GlobalSearch() {
  const [q, setQ] = useState("");
  const nav = useNavigate();
  const res = searchVessels(q);
  const go = (id) => {
    setQ("");
    nav(`/vessels/${id}`);
  };
  return <div className="search" role="search">
      <Search size={16} aria-hidden="true" />
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="חפש שם, IMO, MMSI" aria-label="חיפוש כלי" onKeyDown={(e) => {
    if (e.key === "Escape") setQ("");
    if (e.key === "Enter" && res[0]) go(res[0].id);
  }} />
      {q.trim() && <div className="search-results" role="listbox" aria-label="תוצאות חיפוש">
          {res.length === 0 && <div className="search-empty">לא נמצאו תוצאות</div>}
          {res.map((v) => <button key={v.id} type="button" role="option" aria-selected="false" onClick={() => go(v.id)}>
              <bdi dir="ltr" className="cell-name">{v.name}</bdi>
              <span className="sub mono" dir="ltr">IMO {v.imo}</span>
              <span className="sub" style={{ marginInlineStart: "auto" }}>{v.type}</span>
            </button>)}
        </div>}
    </div>;
}
export default function Shell() {
  const { theme, toggle } = useTheme();
  const light = theme === "light";
  return <div className="shell">
      <nav className="nav" aria-label="ניווט ראשי">
        <div className="nav-logo" aria-hidden="true">SEA</div>
        {NAV.map((n) => <NavLink key={n.to} to={n.to} end={n.end} title={n.label} aria-label={n.label}>
            <n.icon size={20} aria-hidden="true" />
          </NavLink>)}
        <div className="nav-spacer" />
        <button type="button" className="nav-item" title="התראות" aria-label="התראות"><Bell size={20} aria-hidden="true" /></button>
      </nav>
      <div className="main">
        <header className="topbar">
          <GlobalSearch />
          <div className="spacer" />
          <button type="button" className="ui-icon-btn" onClick={toggle} title={light ? "מצב כהה" : "מצב בהיר"} aria-label="החלפת ערכת נושא">
            {light ? <Moon size={18} aria-hidden="true" /> : <Sun size={18} aria-hidden="true" />}
          </button>
        </header>
        <Outlet />
      </div>
    </div>;
}
