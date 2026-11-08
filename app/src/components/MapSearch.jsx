import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Search, Ship } from 'lucide-react';
import { searchEntities } from '../data/api';
import Combobox from '../ui/Combobox';
import { Ltr, Mono } from '../ui/Ltr';

const MAX_ROWS = 8;

/**
 * חיפוש ככלי מפה (רכיב אחי מעל המפה, לא בתוך קוד המפה): כלים וחברות, מקובצים, עד 8 שורות.
 * בחירת כלי מעדכנת ?v=<id> (המנגנון הקיים), בחירת חברה מנווטת לדף החברה.
 */
export default function MapSearch({ onPickVessel }) {
  const [q, setQ] = useState('');
  const nav = useNavigate();
  const { vessels, companies } = searchEntities(q);
  const shownVessels = vessels.slice(0, MAX_ROWS);
  const shownCompanies = companies.slice(0, MAX_ROWS - shownVessels.length);
  const groups = [
    {
      id: 'vessels', label: 'כלי שיט', icon: <Ship size={16} aria-hidden="true" />,
      items: shownVessels.map((v) => ({
        key: v.id, text: v.name, kind: 'vessel', id: v.id,
        render: () => (
          <span className="search-hit">
            <Ltr className="cell-name">{v.name}</Ltr>
            <span className="sub grow"><Mono>IMO {v.imo}</Mono></span>
          </span>
        ),
      })),
    },
    {
      id: 'companies', label: 'חברות', icon: <Building2 size={16} aria-hidden="true" />,
      items: shownCompanies.map((c) => ({
        key: c.id, text: c.name, kind: 'company', id: c.id,
        render: () => (
          <span className="search-hit">
            <Ltr className="cell-name">{c.name}</Ltr>
            <span className="sub grow">{c.type} · {c.country}</span>
          </span>
        ),
      })),
    },
  ];
  const go = (it) => {
    setQ('');
    if (it.kind === 'vessel') onPickVessel(it.id); else nav(`/companies/${it.id}`);
  };
  const first = groups.flatMap((g) => g.items)[0];
  return (
    <div className="map-search search" role="search">
      <Search size={16} aria-hidden="true" />
      {q === '' && <span className="search-ph" aria-hidden="true">חפש לפי שם, <bdi dir="ltr">IMO</bdi> או <bdi dir="ltr">MMSI</bdi></span>}
      <Combobox value={q} onChange={setQ} ariaLabel="חיפוש לפי שם, IMO או MMSI" placeholder="" inputClassName=""
        emptyText="לא נמצאו תוצאות" groups={groups} onSelect={go} onEnter={() => { if (first) go(first); }} />
    </div>
  );
}
