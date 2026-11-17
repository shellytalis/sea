import { useState } from 'react';
import { Search } from 'lucide-react';
import Button from '../ui/Button';
import Chip from '../ui/Chip';
import Combobox from '../ui/Combobox';
import Popover from '../ui/Popover';
import { Ltr, Mono, Num } from '../ui/Ltr';
import { Autocomplete, CheckGroup, MultiSelect, RangeField, Select, TextField } from '../ui/Fields';
import { SeverityBadge, Shape, Tooltip } from '../ui/Badges';
import { SEVERITIES } from '../ui/severity';
import DataTable from '../ui/DataTable';
import Drawer from '../ui/Drawer';
import { Facts, StaticTable } from '../ui/Entity';
import { EmptyState, ErrorState, ForbiddenState, TableSkeleton } from '../ui/States';
import { EntityStatus } from '../ui/Entity';
import { useSpecNotes } from '../ui/prefs';
import SpecNote from '../ui/SpecNote';
import { Calendar, ChevronDown, Hexagon, Mountain, Navigation, Route, Ruler, Target, X } from 'lucide-react';
import { COMPANIES, COMPANY_TYPES, getCompany } from '../data/companies';
import { MismatchTag, ModelOutputsDetail, ModelSummary, ProfileTag } from '../components/ModelOutputs';
import { RelationKind, RelationLegend, StrengthMeter } from '../components/RelationParts';
import RelationsSection from '../components/RelationsSection';
import Panel from '../ui/Panel';
import Tabs from '../ui/Tabs';

const COLORS = ['bg-base', 'surface', 'surface-raised', 'border', 'border-strong', 'text-primary', 'text-secondary', 'text-tertiary', 'accent', 'accent-text', 'focus'];
const SEV_TOKENS = ['sev-low', 'sev-medium', 'sev-high', 'sev-critical', 'sev-unassessed', 'sev-none'];

const cols = [
  { id: 'name', label: 'שם חברה', locked: true, sort: (c) => c.name, render: (c) => <Ltr>{c.name}</Ltr> },
  { id: 'country', label: 'מדינה', sort: (c) => c.country, render: (c) => c.country },
  { id: 'fleet', label: 'גודל צי', align: 'end', sort: (c) => c.fleetSize, render: (c) => <Num>{c.fleetSize}</Num> },
];

const GROUPED = [
  { id: 'vessels', label: 'כלי שיט', items: [{ key: 'v1', text: 'SEA FALCON', render: () => <><Ltr className="cell-name">SEA FALCON</Ltr><span className="sub"><Mono>IMO 9198364</Mono></span></> }] },
  { id: 'companies', label: 'חברות', items: [{ key: 'c1', text: 'Falcon Maritime', render: () => <Ltr className="cell-name">Falcon Maritime</Ltr> }] },
];

const c13 = getCompany('c13');
const c12 = getCompany('c12');

export default function DesignPage() {
  const [name, setName] = useState('');
  const [range, setRange] = useState([null, null]);
  const [checks, setChecks] = useState(['a']);
  const [types, setTypes] = useState(['מפעיל']);
  const [drawer, setDrawer] = useState(false);
  const [pop, setPop] = useState(false);
  const [q, setQ] = useState('fal');
  const [picked, setPicked] = useState('');
  const specNotes = useSpecNotes();

  return (
    <div className="page-scroll">
      <div className="ds">
        <h1>מערכת עיצוב Sea</h1>
        <label className="ui-check ds-spec-toggle">
          <input type="checkbox" checked={specNotes.on} onChange={(e) => specNotes.setOn(e.target.checked)} />
          <span>הערות מפרט (הצג הערות פיתוח ותגי "הצעה" בממשק; נשמר בדפדפן)</span>
        </label>

        <section>
          <h2>צבעים (מתחלפים עם ערכת הנושא)</h2>
          <div className="ds-swatches">
            {COLORS.map((t) => <div key={t} className="ds-sw"><i className={`sw-${t}`} /><Ltr>--{t}</Ltr></div>)}
          </div>
        </section>

        <section>
          <h2>סולם חומרה אחד</h2>
          <p className="entity-note">ארבע רמות חומרה ושני מצבים שאינם חומרה. כל חיווי: טקסט, צורה וצבע יחד. היעדר נתון אינו "נמוך".</p>
          <div className="ds-swatches">
            {SEV_TOKENS.map((t) => <div key={t} className="ds-sw"><i className={`sw-${t}`} /><Ltr>--{t}</Ltr></div>)}
          </div>
          <div className="ds-row">
            {SEVERITIES.map((s) => <SeverityBadge key={s} severity={s} />)}
          </div>
        </section>

        <section>
          <h2>טיפוגרפיה, צבע טקסט וריווח</h2>
          <div className="ds-type">
            <div className="t-2xl">24 · כותרת דף ישות (600)</div>
            <div className="t-lg">16 · כותרת פאנל (600)</div>
            <div>14 · ערכים ושמות (ראשי)</div>
            <div className="sub">13 · משני: תוויות שדות, טקסט עזר, תאריכים ומספרים (tabular-nums)</div>
            <div className="t-xs">12 · כותרת טבלה (600, משני) ומטא: מקור · עודכן · גרסה</div>
            <div>mono רק למזהים: <Mono>IMO 9487231 · MMSI 257184000 · D&amp;B 044937043</Mono></div>
          </div>
          <p className="entity-note">צבע טקסט: ראשי לערכים ושמות; משני לתוויות ומטא; tertiary ל-✓ ול-placeholder. ריווח על סולם 4px; רדיוס 2px/4px. סולם הגופנים: 12/13/14/16/20/24.</p>
        </section>

        <section>
          <h2>Panel</h2>
          <p className="entity-note">הקומפוננטה היחידה לקבוצת תוכן: רקע surface, גבול 1px, radius 4px. כותרת 48px (שם 16/600 · מטא 12 משני · פעולות בקצה ה-end). טבלאות flush לקצוות. מרווח 24px בין פאנלים ו-32px שוליים לדף. שלוש שכבות רקע בלבד: base &lt; surface &lt; raised.</p>
          <Panel title="דוגמה" meta="מקור א · עודכן 2026-10-31" actions={<Button size="sm">פעולה</Button>}>
            <Facts items={[['שם', 'Fjord Marine AS'], ['IMO', <Mono key="i">9487231</Mono>], ['דגל', 'נורווגיה'], ['חברת אם', '']]} />
          </Panel>
        </section>

        <section>
          <h2>מעטפת<SpecNote tag>הצעה</SpecNote></h2>
          <p className="entity-note">סרגל עליון 56px: תא מותג 72px · breadcrumb · בלוק שעה (לועזי + עברי) · אייקונים (32px, אייקון 20) | שלום, שם | לוגו. מפרידים: אחרי המותג, לפני "שלום", לפני הלוגו. החיפוש הוא כלי מפה בפינת ה-start של המפה. סרגל ניווט 72px, פריט 64px.</p>
        </section>

        <section>
          <h2>כפתורים</h2>
          <div className="ds-row">
            <Button variant="primary">ראשי</Button><Button>משני</Button><Button variant="text">טקסט</Button>
            <Button variant="primary" disabled>מושבת</Button><Button disabled>מושבת</Button>
            <Button variant="primary" loading>טוען</Button>
            <Button variant="primary" icon={<Search size={16} aria-hidden="true" />}>עם אייקון</Button>
            <Button variant="icon" aria-label="חיפוש" icon={<Search size={16} aria-hidden="true" />} />
          </div>
        </section>

        <section>
          <h2>שדות</h2>
          <div className="ds-row start">
            <div className="ds-w-sm"><TextField label="שדה טקסט" placeholder="הקלד כאן" /></div>
            <div className="ds-w-sm"><Autocomplete label="Autocomplete" value={name} onChange={setName} suggestions={COMPANIES.map((c) => c.name)} placeholder="נסה: Lotus" /></div>
            <div className="ds-w-sm"><Select label="Select" options={['אפשרות א', 'אפשרות ב']} /></div>
            <div className="ds-w-sm"><MultiSelect label="בחירה מרובה (dropdown)" options={COMPANY_TYPES} value={types} onChange={setTypes} /></div>
            <div className="ds-w-xs"><RangeField label="שדה טווח" min={0} max={100} value={range} onChange={setRange} /></div>
            <div className="ds-w-xs"><CheckGroup legend="קבוצת סימון" options={['a', 'b']} value={checks} onChange={setChecks} render={(o) => `אפשרות ${o}`} /></div>
          </div>
        </section>

        <section>
          <h2>Combobox מקובץ ו-Popover</h2>
          <div className="ds-row start">
            <div className="ds-w-md">
              <Combobox value={q} onChange={setQ} ariaLabel="דוגמת combobox מקובץ" placeholder="חפש שם, IMO, MMSI"
                emptyText="לא נמצאו תוצאות" groups={q.trim() ? GROUPED : []} onSelect={(it) => setPicked(it.text)} />
              {picked && <p className="ui-hint">נבחר: <Ltr>{picked}</Ltr></p>}
            </div>
            <Popover open={pop} onClose={() => setPop(false)} panelProps={{ role: 'dialog', 'aria-label': 'דוגמת popover' }}
              anchor={<Button aria-expanded={pop} onClick={() => setPop(!pop)}>פתח popover</Button>}>
              <p>נסגר בלחיצה מחוץ לחלונית או ב-Esc.</p>
            </Popover>
          </div>
        </section>

        <section>
          <h2>צ'יפים, תגים וטולטיפ</h2>
          <div className="ds-row">
            <Chip label="מדינה: יוון" onRemove={() => {}} /><Chip label="צ'יפ סטטי" />
            <Tooltip text="טולטיפ מופיע גם בפוקוס מקלדת" focusable><span className="ui-chip">רחף או הקש Tab</span></Tooltip>
          </div>
        </section>

        <section>
          <h2>שדה-ערך (Facts)</h2>
          <Facts items={[['שם', 'Fjord Marine AS'], ['IMO', <Mono key="i">9487231</Mono>], ['דגל', 'נורווגיה'], ['סוג', 'מפעיל']]} />
        </section>

        <section>
          <h2>טבלאות: ליבה אחת</h2>
          <div className="ds-table-demo"><DataTable rows={COMPANIES} columns={cols} rowKey={(c) => c.id} caption="דוגמת טבלה" /></div>
          <StaticTable caption="דוגמת טבלה סטטית" columns={cols} rows={COMPANIES.slice(0, 3)} rowKey={(c) => c.id} />
        </section>

        <section>
          <h2>מגירה</h2>
          <Button onClick={() => setDrawer(true)}>פתח מגירה</Button>
          {drawer && (
            <div className="ds-drawer-demo">
              <Drawer title="דוגמת מגירה" overlay onClose={() => setDrawer(false)}>
                <p>שכבה מעל התוכן. Esc או כפתור הסגירה סוגרים, והפוקוס חוזר לפותח.</p>
              </Drawer>
            </div>
          )}
        </section>

        <section>
          <h2>תג פרופיל ואי-התאמה<SpecNote tag>הצעה</SpecNote></h2>
          <p className="entity-note">ליד שם החברה: תג הפרופיל עם סימון "מודל" (ModelTag), ואם יש אי-התאמה לרישום, תג נוסף עם משולש וטקסט. בכותרת המכווצת (56px) נשאר רק תג הפרופיל. "לא הוערך" מוצג כעיגול מקווקו.</p>
          <div className="ds-row">
            <ProfileTag profile={c13.modelOutputs.profile} />
            <MismatchTag text={c13.modelOutputs.profile.mismatch} />
            <ProfileTag profile={c12.modelOutputs.profile} />
          </div>
        </section>

        <section>
          <h2>תוצרי מודל: שורת הסיכום<SpecNote tag>הצעה</SpecNote></h2>
          <p className="entity-note">Panel אחד (מחליף את ארבעת האותות), מטא "עודכן · גרסה" פעם אחת. ארבעה תאים שווים: קבוצת שליטה ופרופיל חברה (ערך, רמת ביטחון, הגורם הראשון, "עוד N גורמים" בפופאובר), ושני תאים "בתכנון" (שלב ב׳ ושלב ג׳). תא קבוצת השליטה לחיץ וגולל ל"קשרים בין חברות". מצבים: קבוצה גדולה, קבוצה קטנה, לא נמצאו קשרים, חלקי (הקבוצה לא הוערכה והפרופיל כן), ולא הוערך (רצועה אחת).</p>
          <div className="ds-stack">
            <ModelSummary id="ds-mo-large" outputs={c13.modelOutputs} onGo={() => {}} />
            <ModelSummary id="ds-mo-small" outputs={getCompany('c5').modelOutputs} onGo={() => {}} />
            <ModelSummary id="ds-mo-none" outputs={getCompany('c1').modelOutputs} onGo={() => {}} />
            <ModelSummary id="ds-mo-partial" outputs={getCompany('c24').modelOutputs} onGo={() => {}} />
            <ModelSummary id="ds-mo-unassessed" outputs={c12.modelOutputs} onGo={() => {}} />
          </div>
        </section>

        <section>
          <h2>חוזק וסוג הקשר<SpecNote tag>הצעה</SpecNote></h2>
          <p className="entity-note">חוזק: שלושה פסים בגבהים עולים + תווית (חזק / בינוני / חלש). סוג: קו רציף "מוצהר" (ברישום) או קו מקווקו "הוסק" (המודל). לעולם לא צבע בלבד; מקרא הקווים בכותרת המקטע.</p>
          <div className="ds-row">
            <StrengthMeter strength="strong" /><StrengthMeter strength="medium" /><StrengthMeter strength="weak" />
            <RelationKind declared /><RelationKind declared={false} /><RelationLegend />
          </div>
        </section>

        <section>
          <h2>קשרים בין חברות<SpecNote tag>הצעה</SpecNote></h2>
          <p className="entity-note">טבלה עם סינון חוזק וסוג ראיה (במצב ב-URL), שורת ראיה נפוצה, אשכול שנפתח בלחיצה, פאנל ראיות עם "נכון / שגוי" (בסשן בלבד) וגרף של עד 15 הקשרים החזקים (SVG בפריסה סטטית, ללא ספרייה). בקבוצה גדולה: הגרף מציג את הקשרים החזקים והשאר בטבלה.</p>
          <div className="ds-stack">
            <RelationsSection id="ds-rel-large" company={c13} />
            <RelationsSection id="ds-rel-small" company={getCompany('c5')} />
          </div>
          <h3 className="ds-sub">מצבי המקטע: לא נמצאו קשרים, לא הוערך, טעינה, שגיאה</h3>
          <div className="ds-stack">
            <RelationsSection id="ds-rel-none" company={getCompany('c1')} />
            <RelationsSection id="ds-rel-unassessed" company={c12} />
            <Panel title="קשרים בין חברות" meta="טעינה" flush><div className="rel2-loading" aria-busy="true"><TableSkeleton rows={4} cols={5} /></div></Panel>
            <Panel title="קשרים בין חברות" meta="שגיאה" flush><ErrorState onRetry={() => {}} title="טעינת הקשרים נכשלה">אירעה שגיאה בטעינת הקשרים. הסינון נשמר.</ErrorState></Panel>
          </div>
        </section>

        <section>
          <h2>תוצרי מודל במגירת התצוגה המהירה<SpecNote tag>הצעה</SpecNote></h2>
          <p className="entity-note">במגירה יש מקום, ולכן מוצגים כל הגורמים של כל מודל, ואי-ההתאמה לרישום.</p>
          <div className="ds-drawer-box"><ModelOutputsDetail outputs={c13.modelOutputs} /></div>
        </section>

        <section>
          <h2>לשוניות ופס אינדיקטורים</h2>
          <Tabs label="דוגמת לשוניות" tabs={[
            { id: 'a', label: 'מקור א', content: <p className="entity-note">תוכן מקור א.</p> },
            { id: 'b', label: 'מקור ב', content: <p className="entity-note">תוכן מקור ב.</p> },
            { id: 'c', label: 'מקור ג', content: <p className="entity-note">תוכן מקור ג.</p> },
          ]} />
          <div className="indicator-strip">
            <SeverityBadge severity="high" label="אינדיקטור פעילות חריגה · גבוה" />
            <span><Num>2</Num> אינדיקטורים:</span><Chip>מפגש ship-to-ship</Chip><Chip>שינוי זהות</Chip>
          </div>
        </section>

        <section>
          <h2>מצבי דף ישות</h2>
          <p className="entity-note">טעינה, שגיאה ואין הרשאה של דף חברה/כלי. מקטע בלי הרשאה (למשל שרטוטים) מוסתר בדף עצמו, ופריט הניווט שלו איתו.</p>
          <div className="ds-states">
            <div className="ds-panel" data-testid="ds-entity-loading"><EntityStatus status="loading" /></div>
            <div className="ds-panel" data-testid="ds-entity-error"><EntityStatus status="error" onRetry={() => {}} /></div>
            <div className="ds-panel" data-testid="ds-entity-forbidden"><EntityStatus status="forbidden" /></div>
            <div className="ds-panel"><ForbiddenState title="אין הרשאה לצפייה בשרטוטים">נדרשת הרשאה ייעודית. פנה למנהל המערכת.</ForbiddenState></div>
          </div>
        </section>

        <section>
          <h2>כלי מפה<SpecNote tag>הצעה</SpecNote></h2>
          <p className="ds-note">שתי משפחות, מצב יחיד <bdi dir="ltr">{'{ family, id, vesselId? }'}</bdi> ופאנל אחד בכל רגע. זום וסרגל הכלים הכללי על אותו ציר (קצה 16px, רוחב 56px), סרגל הכלים מ-96px מלמעלה, פריט 64px קבוע. סרגל כלי שיט רק כשכלי נבחר, בצד הנגדי למקרא. פאנל 320px: גובה מרבי עד 88px מתחתית המפה (פנוי לסרגל כלי שיט), גוף עם גלילה פנימית ושורת פעולות דביקה.</p>
          <div className="ds-row" style={{ alignItems: 'flex-start', gap: 24, flexWrap: 'wrap' }}>
            <nav className="mt-bar" aria-label="כלי מפה (דוגמה)">
              <button type="button" className="mt-tool active"><Ruler size={20} aria-hidden="true" /><span className="mt-tool-label">מרחק</span></button>
              <button type="button" className="mt-tool"><Hexagon size={20} aria-hidden="true" /><span className="mt-tool-label">רדיוס חופשי</span></button>
              <button type="button" className="mt-tool"><Mountain size={20} aria-hidden="true" /><span className="mt-tool-label">גובה</span></button>
            </nav>
            <section className="mt-vbar" style={{ position: 'static', maxWidth: 'none' }} aria-label="סרגל כלי שיט (דוגמה)">
              <div className="mt-vrow">
                <span className="mt-setdd"><span className="mt-setbtn"><span className="mt-swatch vi-0" aria-hidden="true" /><Shape risk="critical" /><span className="mt-setname" dir="ltr">GULF PIONEER</span><span className="mt-setcount">3</span><ChevronDown size={16} aria-hidden="true" /></span></span>
                <div className="mt-seg mt-modeseg"><button type="button" className="active">כלי בודד</button><button type="button">כל הסט (3)</button></div>
                <span className="mt-daterange"><span className="mt-datebtn"><Calendar size={16} aria-hidden="true" /><span dir="ltr">07.11 – 08.11.2026</span></span></span>
              </div>
              <div className="mt-vrow">
                <div className="mt-vtools">
                  <span className="mt-vtool active on on"><Target size={20} aria-hidden="true" /><span>מעגלי קרבה</span><span className="mt-ondot" aria-hidden="true" /></span>
                  <span className="mt-vtool"><Route size={20} aria-hidden="true" /><span>מסלול</span></span>
                  <span className="mt-vtool"><Navigation size={20} aria-hidden="true" /><span>חישוב הגעה</span></span>
                </div>
                <span className="mt-vclose"><X size={16} aria-hidden="true" /></span>
              </div>
            </section>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span className="map-chip">12.4 NM</span><span className="map-chip strong">30,171.16 NM²</span><span className="map-chip vessel vi-0">GULF PIONEER · 20 NM</span><span className="map-chip vessel vi-1 dim">−4 ש׳</span><span className="map-handle" />
            </div>
          </div>
          <div className="ds-row" style={{ alignItems: 'flex-start', gap: 24, flexWrap: 'wrap', marginTop: 16 }}>
            <div className="mt-readout"><span className="mt-readout-label">מרחק כולל</span><span className="mt-readout-value"><bdi dir="ltr" className="mt-val"><span className="num mt-num">716.92</span><span className="mt-readout-unit">NM</span></bdi></span></div>
            <div className="mt-readout"><span className="mt-readout-label">מהירות</span><span className="mt-readout-value"><bdi dir="ltr" className="mt-val"><span className="num mt-num">11.2</span><span className="mt-readout-unit">קשר</span></bdi></span></div>
            <div className="mt-readout"><span className="mt-readout-label">משך</span><span className="mt-readout-value"><bdi className="num mt-num">1 יום, 14 שעות</bdi></span></div>
            <span className="mt-unit"><select className="ui-input sm" aria-label="יחידת מידה (דוגמה)" defaultValue="nm"><option value="nm">מייל ימי</option><option value="km">ק"מ</option></select><ChevronDown size={16} aria-hidden="true" /></span>
            <label className="ui-check"><input type="checkbox" defaultChecked /><span>סימוני זמן</span></label>
            <span className="ui-chip tag">נתוני דמה</span>
          </div>
          <div className="ds-row" style={{ gap: 8, marginTop: 16 }} aria-label="צבעי כלים בסט">{[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <span key={i} className={'mt-swatch vi-' + i} style={{ width: 32, height: 16 }} />)}</div>
          <p className="ds-note">קריאה: ערך 16/600 ואחריו יחידה 12 משנית, בתוך bdi ltr ("716.92 NM"); משך בעברית בלי אפסים. בקרת יחידות אחת (select 32px) בכותרת הפאנל. תיבת סימון של מערכת העיצוב (16px, מסגרת 2px). סט כלי שיט: עד 10 כלים בזיכרון האפליקציה (לא ב-URL); dropdown סט, מתג כלי בודד / כל הסט, טווח תאריכים למסלול; מעגלי קרבה, מסלול והגעה הם שכבות מקבילות (הפעיל באטימות מלאה, האחרים 70%). צבעים (Dark): <bdi dir="ltr">--map-draw #4dd3ff</bdi>, <bdi dir="ltr">--map-vessel-1..8</bdi> (ΔE של לפחות 35 זה מזה ולפחות 33 מצבעי החומרה, draw והסמלים; ניגודיות לפחות 5:1), בנוסף תווית שם ודפוס קו לכל כלי, הילה <bdi dir="ltr">--map-halo</bdi> 3px, ידית 8px לבנה עם טבעת accent. ניגודיות מול היבשה #13263f והמים #0a1a30: 8.8 ו-10.0 (draw), 6.6 ו-7.5 (vessel). Light: TODO.</p>
        </section>

        <section>
          <h2>מצבי מערכת</h2>
          <div className="ds-states">
            <div className="ds-panel"><EmptyState title="אין נתונים להצגה"><span>הנתונים יופיעו כאן לאחר ההוספה.</span></EmptyState></div>
            <div className="ds-panel cs-noresults"><Panel><p className="cs-nr-title">לא נמצאו חברות</p><p className="cs-nr-sub">אף חברה לא עונה על כל התנאים</p></Panel></div>
            <div className="ds-panel"><ErrorState onRetry={() => {}} /></div>
            <div className="ds-panel"><ForbiddenState /></div>
            <div className="ds-panel pad"><TableSkeleton rows={4} cols={4} /></div>
          </div>
        </section>
      </div>
    </div>
  );
}
