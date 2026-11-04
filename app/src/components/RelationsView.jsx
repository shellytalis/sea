import { useMemo, useState } from 'react';
import { RELATION_TYPES, getCompany, relationsOf } from '../data/companies';
import { Shape } from '../ui/Badges';
import Button from '../ui/Button';
import { Ltr } from '../ui/Ltr';
import TableCore from '../ui/Table';
import { EmptyState } from '../ui/States';

/*
 * גרף קשרים: SVG עם פריסה סטטית (החברה במרכז, הקשורות על אליפסה), ללא ספרייה.
 * נבחר כי באב-טיפוס יש כמה צמתים בלבד; פריסה דינמית או ספרייה לא מוסיפות מידע.
 * סוג הקשר מובחן בדפוס הקו ובתווית קצרה על הקשר; קשר חריג מסומן ביהלום כתום בלבד.
 * לצד הגרף: טבלה לאותו מידע, ומתחתיה פאנל פרטים שמתמלא בלחיצה על צומת, קשר או שורה.
 */
const W = 640, H = 360, CX = W / 2, CY = H / 2, RX = 235, RY = 130, NODE_W = 172, NODE_H = 32;
const SHORT = { ownership: 'בעלות', management: 'ניהול', sharedVessels: 'כלים', sharedAddress: 'כתובת' };

const nodePos = (i, n) => {
  const a = (-Math.PI / 2) + (i * 2 * Math.PI) / Math.max(n, 1);
  return { x: CX + RX * Math.cos(a), y: CY + RY * Math.sin(a) };
};
const along = (p, t) => ({ x: CX + (p.x - CX) * t, y: CY + (p.y - CY) * t });

export default function RelationsView({ companyId }) {
  const center = getCompany(companyId);
  const rels = useMemo(() => relationsOf(companyId), [companyId]);
  const [sel, setSel] = useState(null); // { kind: 'node' | 'edge', id }

  if (rels.length === 0) return <EmptyState compact title="אין קשרים מתועדים לחברה זו" />;

  const otherOf = (r) => getCompany(r.from === companyId ? r.to : r.from);
  const others = rels.map(otherOf);
  const selRel = sel?.kind === 'edge' ? rels.find((r) => r.id === sel.id) : null;
  const selNode = sel?.kind === 'node' ? getCompany(sel.id) : null;
  const press = (kind, id) => (e) => {
    if (e.type === 'click' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSel({ kind, id }); }
  };

  const columns = [
    { id: 'other', label: 'חברה קשורה', render: (r) => <Ltr className="cell-name">{otherOf(r).name}</Ltr> },
    { id: 'type', label: 'סוג קשר', render: (r) => RELATION_TYPES[r.type] },
    { id: 'unusual', label: 'חריג', render: (r) => (r.unusual ? <span className="ui-sev high"><Shape risk="high" />חריג</span> : <span className="sub">—</span>) },
  ];

  return (
    <div className="rel">
      <div className="rel-graph">
        <ul className="rel-legend" aria-label="מקרא סוגי קשר">
          {Object.entries(SHORT).map(([k, label]) => (
            <li key={k}><svg width="28" height="8" aria-hidden="true"><line x1="0" y1="4" x2="28" y2="4" className={`rel-key type-${k}`} /></svg>{label}</li>
          ))}
          <li><Shape risk="high" />חריג</li>
        </ul>

        <svg viewBox={`0 0 ${W} ${H}`} role="group" aria-label={`גרף קשרים של ${center.name}`} className="rel-svg">
          {rels.map((r, i) => {
            const p = nodePos(i, rels.length);
            const label = along(p, 0.55), flag = along(p, 0.3);
            return (
              <g key={r.id} className={`rel-edge type-${r.type}${selRel?.id === r.id ? ' selected' : ''}`}
                role="button" tabIndex={0} aria-label={`קשר: ${RELATION_TYPES[r.type]} עם ${otherOf(r).name}${r.unusual ? ', חריג' : ''}`}
                onClick={press('edge', r.id)} onKeyDown={press('edge', r.id)}>
                <line x1={CX} y1={CY} x2={p.x} y2={p.y} className="hit" />
                <line x1={CX} y1={CY} x2={p.x} y2={p.y} className="stroke" />
                <text x={label.x} y={label.y + 4} textAnchor="middle" className="rel-label">{SHORT[r.type]}</text>
                {r.unusual && (
                  <g transform={`translate(${flag.x - 6} ${flag.y - 6})`} className="rel-flag"><rect x="-4" y="-4" width="20" height="20" className="bg" /><path d="M6 .5 11.5 6 6 11.5.5 6Z" /></g>
                )}
              </g>
            );
          })}
          {others.map((c, i) => {
            const p = nodePos(i, rels.length);
            return (
              <g key={c.id} className={`rel-node${selNode?.id === c.id ? ' selected' : ''}`} role="button" tabIndex={0} aria-label={`חברה: ${c.name}`}
                transform={`translate(${p.x - NODE_W / 2} ${p.y - NODE_H / 2})`}
                onClick={press('node', c.id)} onKeyDown={press('node', c.id)}>
                <rect width={NODE_W} height={NODE_H} rx="4" />
                <text x={NODE_W / 2} y={NODE_H / 2 + 4} textAnchor="middle" direction="ltr">{c.name}</text>
              </g>
            );
          })}
          <g className="rel-node center" transform={`translate(${CX - NODE_W / 2} ${CY - NODE_H / 2})`}>
            <rect width={NODE_W} height={NODE_H} rx="4" />
            <text x={NODE_W / 2} y={NODE_H / 2 + 4} textAnchor="middle" direction="ltr">{center.name}</text>
          </g>
        </svg>
      </div>
      <div className="rel-side">
        <div className="rel-table ui-table-scroll bordered">
          <TableCore caption="קשרים בין חברות" columns={columns} rows={rels} rowKey={(r) => r.id} stickyHead={false}
            onRowClick={(r) => setSel({ kind: 'edge', id: r.id })} selectedKey={selRel?.id} />
        </div>
        <div className="rel-panel" aria-live="polite" data-testid="rel-panel">
          {!sel && <p className="sub">בחר צומת או קשר כדי להציג פרטים.</p>}
          {selNode && (
            <>
              <h3><Ltr>{selNode.name}</Ltr></h3>
              <p className="sub">{selNode.type} · {selNode.country}, <Ltr>{selNode.city}</Ltr></p>
              <Button to={`/companies/${selNode.id}`} variant="text">פתח פרופיל</Button>
            </>
          )}
          {selRel && (
            <>
              <h3>{RELATION_TYPES[selRel.type]}{selRel.unusual && <span className="ui-sev high rel-unusual"><Shape risk="high" />קשר חריג</span>}</h3>
              <p><Ltr>{getCompany(selRel.from).name}</Ltr> ← → <Ltr>{getCompany(selRel.to).name}</Ltr></p>
              <p className="sub">{selRel.note}</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
