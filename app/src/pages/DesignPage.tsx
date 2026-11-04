import { useState } from 'react';
import { Search } from 'lucide-react';
import Button from '../ui/Button';
import { Autocomplete, CheckGroup, RangeField, Select, TextField } from '../ui/Fields';
import { Chip, ModelTag, RISKS, RiskBadge, Tooltip } from '../ui/Badges';
import DataTable, { type Column } from '../ui/DataTable';
import Drawer from '../ui/Drawer';
import { EmptyState, ErrorState, ForbiddenState, NoResults, TableSkeleton } from '../ui/States';
import { COMPANIES, type Company } from '../data/companies';

const TOKENS = ['bg-base', 'surface', 'surface-raised', 'border', 'border-strong', 'text-primary', 'text-secondary', 'text-tertiary', 'accent', 'accent-text', 'risk-low', 'risk-med', 'risk-high', 'focus'];

const cols: Column<Company>[] = [
  { id: 'name', label: 'שם חברה', locked: true, sort: c => c.name, render: c => <bdi dir="ltr">{c.name}</bdi> },
  { id: 'risk', label: 'סיכון', badge: <ModelTag />, sort: c => c.riskScore ?? -1, render: c => <RiskBadge risk={c.risk} /> },
  { id: 'fleet', label: 'גודל צי', align: 'end', sort: c => c.fleetSize, render: c => <span className="mono" dir="ltr">{c.fleetSize}</span> },
];

export default function DesignPage() {
  const [name, setName] = useState('');
  const [range, setRange] = useState<[number, number]>([10, 60]);
  const [checks, setChecks] = useState<string[]>(['a']);
  const [drawer, setDrawer] = useState(false);
  return (
    <div className="page-scroll">
      <div className="ds">
        <h1>מערכת עיצוב Sea</h1>
        <section>
          <h2>צבעים (מתחלפים עם ערכת הנושא)</h2>
          <div className="ds-swatches">
            {TOKENS.map(t => <div key={t} className="ds-sw"><i style={{ background: `var(--${t})` }} /><span dir="ltr">--{t}</span></div>)}
          </div>
        </section>
        <section>
          <h2>טיפוגרפיה</h2>
          <div style={{ display: 'grid', gap: 8 }}>
            <div style={{ fontSize: 24, lineHeight: '32px', fontWeight: 600 }}>כותרת עמוד · 24</div>
            <div style={{ fontSize: 18, lineHeight: '24px', fontWeight: 600 }}>כותרת קטע · 18</div>
            <div>גוף · 14 · <bdi dir="ltr" className="mono">IMO 9487231 · MMSI 257184000</bdi></div>
            <div className="sub">גוף קטן · 13</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>תווית · 12</div>
          </div>
        </section>
        <section>
          <h2>כפתורים</h2>
          <div className="ds-row">
            <Button variant="primary">ראשי</Button><Button>משני</Button><Button variant="text">טקסט</Button>
            <Button variant="primary" disabled>מושבת</Button><Button disabled>מושבת</Button>
            <Button variant="primary" loading>טוען</Button>
            <Button variant="primary" icon={<Search size={16} aria-hidden="true" />}>עם אייקון</Button>
          </div>
        </section>
        <section>
          <h2>שדות</h2>
          <div className="ds-row" style={{ alignItems: 'start' }}>
            <div style={{ width: 240 }}><TextField label="שדה טקסט" placeholder="הקלד כאן" /></div>
            <div style={{ width: 240 }}><Autocomplete label="Autocomplete" value={name} onChange={setName} suggestions={COMPANIES.map(c => c.name)} placeholder="נסה: Lotus" /></div>
            <div style={{ width: 240 }}><Select label="Select" options={['אפשרות א', 'אפשרות ב']} /></div>
            <div style={{ width: 280 }}><RangeField label="שדה טווח" min={0} max={100} value={range} onChange={setRange} /></div>
            <div style={{ width: 200 }}><CheckGroup legend="בחירה מרובה" options={['a', 'b']} value={checks} onChange={setChecks} render={o => `אפשרות ${o}`} /></div>
          </div>
        </section>
        <section>
          <h2>צ'יפים, תגי סיכון ותג מודל</h2>
          <div className="ds-row">
            <Chip label="מדינה: יוון" onRemove={() => {}} /><Chip label="ללא הסרה" />
            {RISKS.map(r => <RiskBadge key={r} risk={r} />)}
            <span>ציון סיכון <ModelTag /></span>
            <Tooltip text="טולטיפ מופיע גם בפוקוס מקלדת" focusable><span className="ui-chip">רחף או הקש Tab</span></Tooltip>
          </div>
        </section>
        <section>
          <h2>טבלה</h2>
          <div style={{ height: 420, display: 'flex' }}><DataTable rows={COMPANIES} columns={cols} rowKey={c => c.id} caption="דוגמת טבלה" /></div>
        </section>
        <section>
          <h2>מגירה</h2>
          <Button onClick={() => setDrawer(true)}>פתח מגירה</Button>
          {drawer && <div style={{ position: 'fixed', inset: 'var(--top-h) auto 0 0', zIndex: 70, display: 'flex' }}><Drawer title="דוגמת מגירה" onClose={() => setDrawer(false)}><p>תוכן המגירה. Esc או כפתור הסגירה סוגרים, והפוקוס חוזר לפותח.</p></Drawer></div>}
        </section>
        <section>
          <h2>מצבי מערכת</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 16 }}>
            <div className="panel"><EmptyState title="אין נתונים להצגה"><span>הנתונים יופיעו כאן לאחר ההוספה.</span></EmptyState></div>
            <div className="panel"><NoResults onClear={() => {}} /></div>
            <div className="panel"><ErrorState onRetry={() => {}} /></div>
            <div className="panel"><ForbiddenState /></div>
            <div className="panel" style={{ paddingBlock: 16 }}><TableSkeleton rows={4} cols={4} /></div>
          </div>
        </section>
      </div>
    </div>
  );
}
