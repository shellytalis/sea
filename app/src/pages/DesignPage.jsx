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
import { SnapshotBody } from '../components/SnapshotCard';
import ActivityDot from '../components/map-tools/ActivityDot';
import { formatCoordinate, parseCoordinate, parseCoordinateList } from '../area/coords';
import { collectFacts } from '../snapshot/collect';
import { peerStats } from '../snapshot/peers';
import { buildSnapshot } from '../snapshot/compose';
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
// שלב 5ג: דוגמאות קלט לפורמטים של הזנה ידנית. הערכים מחושבים בפועל מ-area/coords.js
const COORD_EXAMPLES = [
  ['35.512', 'lon', 'מעלות עשרוניות'], ['35.512 N', 'lat', 'עם אות כיוון'], ['-23.874', 'lat', 'עם סימן'], ['23.874 W', 'lon', 'אות כיוון (W = שלילי)'],
  ["34°42.6' N", 'lat', 'מעלות ודקות'], ['34 42.6 N', 'lat', 'מעלות ודקות, בלי סימנים'], ['34°42\'36" N', 'lat', 'מעלות, דקות ושניות'],
  ['-23.874 N', 'lat', 'אות כיוון גוברת על סימן'], ['35,512', 'lon', 'פסיק עשרוני אירופי'], ['90', 'lat', 'ערך גבול'], ['95', 'lat', 'שגיאת טווח'], ['abc', 'lat', 'לא מזוהה'],
];
const PASTE_SAMPLE = Array.from({ length: 12 }, (_, i) => `${(32.6 + i * 0.04).toFixed(2)}, ${(34.5 + i * 0.04).toFixed(2)}`).map((l, i) => (i === 3 ? 'לא קואורדינטה' : i === 9 ? '100, 34.5' : l)).join('\n');
const pasteDemo = parseCoordinateList(PASTE_SAMPLE);
const pasteBig = parseCoordinateList(Array.from({ length: 63 }, (_, i) => `${20 + (i % 40) * 0.5}, ${10 + i * 0.5}`).join('\n'));
const snapshotDemo = (() => { const f = collectFacts('v4'); return buildSnapshot(f, peerStats(f.vessel, f.now)); })();
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
          <h2>דף "מודלי בינה מלאכותית": שלוש רמות בפאנל אחד<SpecNote tag>הצעה</SpecNote></h2>
          <p className="entity-note">נתיב <bdi dir="ltr">/ai-models</bdi>: פאנל בצד ה-start ברוחב פאנלי הצד והמפה בצד ה-end. פירורי לחם בכותרת הפאנל (48px) ולחצן חזרה; המצב ב-URL (<bdi dir="ltr">?model=&amp;customer=&amp;run=</bdi>, ובטבלה q, reason, sort, page, sel).</p>
          <ul className="plain-list bulleted">
            <li><strong>רמה 1 (מינימלית):</strong> שורה בודדת (44px) לכל זוג מודל + לקוח: שם המודל, Chip של הלקוח וחץ. בלי תיאור, בלי "הרצה אחרונה" ובלי חיפוש. מודל משוכפל מופיע בשורה לכל לקוח.</li>
            <li><strong>רמה 2 (מינימלית):</strong> הרצות, החדשה למעלה: תאריך בלבד (<bdi dir="ltr">2026-11-16</bdi>, בלי שעה) וחץ. ליד התאריך סמל סטטוס בלבד (● הושלמה, ▲ חלקית, ■ נכשלה, ◌ לא הוערכה; הצורה והצבע מהסולם, בלי מילה, והמשמעות ב-tooltip). הרצה שנכשלה או שלא הוערכה: שורה עמומה בלי חץ ובלי פתיחה. שם המודל והלקוח רק בפירורי הלחם.</li>
            <li><strong>רמה 3:</strong> טבלת הכלים (חיפוש כלי או סיבה, מונה "12 מתוך 87", סינון לפי סיבה עם ספירה, מיון חומרה / זמן, עימוד 50). המפה מציגה רק את הכלים שבטבלה; לחיצה על שורה או על כלי במפה מדגישה, וה-VesselDrawer נפתח כעמודה.</li>
            <li><strong>מצבים:</strong> מודל בלי הרצות; הרצה שלא סימנה כלים ("המודל רץ ולא סימן כלים": תקין, לא כשל); הרצה שנכשלה / לא הוערכה; אין תוצאות חיפוש.</li>
          </ul>
          <div className="ds-row start">
            <div className="ds-panel ds-w-lg"><EmptyState title="המודל רץ ולא סימן כלים"><span>זה תוצר תקין של ההרצה, לא כשל.</span></EmptyState></div>
            <div className="ds-panel ds-w-lg"><EmptyState title="לא נמצאו כלים. נסה שם, IMO או סיבה אחרת"><span>הסר את החיפוש או את הסינון כדי לראות את כל הכלים.</span></EmptyState></div>
            <div className="ds-panel ds-w-lg"><EmptyState title="למודל אין הרצות עבור הלקוח"><span>עדיין לא בוצעה הרצה.</span></EmptyState></div>
          </div>
        </section>

        <section>
          <h2>תמונת מצב בדף כלי שיט<SpecNote tag>הצעה</SpecNote></h2>
          <p className="entity-note">כפתור "תמונת מצב" בכותרת דף הכלי פותח כרטיס צף (non-modal) מעוגן לכפתור: מתחת לכל גוש כותרת הדף (לא מכסה צ'יפים, שם, MMSI/IMO), קצה ההתחלה שלו מיושר לקצה ההתחלה של הכפתור והוא גדל לכיוון הסוף (כמו תפריט נפתח), מעל התוכן, כותרת 48px. הדף לא זז ולא משנה רוחב, ללא רקע מעומעם. <strong>התמונה נבנית מכללי תצפית הצהרתיים ולא ממודל</strong>, ולכן בכותרת תג "מבוסס כללים" ולא תג "מודל". כללי התצפית (12 בשלב זה) והספים שלהם (<bdi dir="ltr">snapshot/thresholds.js</bdi>) הם הצעה, לא מהאפיון.</p>
          <ul className="plain-list bulleted">
            <li><strong>מבנה מלמעלה למטה (שלבים 4ב, 4ג):</strong> "במבט אחד" (עד 3 משפטי עובדה, ואחריהם שורת "לתשומת לב:" של תוויות קצרות מהכללים שהופעלו, בסדר קבוע ולא לפי חומרה, כל אחת ניתנת ללחיצה וגוללת למשפט המסומן; אין נקודות: אין שורה); סיכום לפי נושא בסדר קבוע (זהות, בעלות וניהול, פעילות ונמלים, ניצולת, רשימות ואירועים). <strong>בכל נושא רשימה אחת של משפטי סיכום</strong>: משפט שכלל תצפית הופעל עליו נושא את הסמן הניטרלי (אייקון מידע) ועולה ראשון, בלי רשימת "נקודות" נפרדת ובלי משפט כפול; כמה כללים על אותה עובדה נותנים משפט אחד. עובדות רגילות (גיל, נמל חוזר) אינן מסומנות.</li>
            <li><strong>קישור ומקורות (שלב 4ה):</strong> בכותרת הנושא רק שם הנושא ו"לפרטים" אחד, בלי ספירה (שורת התוויות ב"במבט אחד" מחליפה אותה). אין שורת מקורות בנושאים: בתחתית (שורה אחת נמוכה) "נתונים מ-7 מתוך 7 מקורות · הופק ..." בטקסט רגיל, שנפתח ל-Popover עם כל מקור, תאריך העדכון שלו וקישור לסעיף בדף, ואחריו מקורות חסרים (כך נשמר "כל נתון נושא מקור וזמן"). בהעתקה וב-PDF בלוק "מקורות" אחד בסוף. נתוני `evidence` נשארים בכל משפט.</li>
            <li><strong>פעילות ונמלים בלי סמן היא נכונה:</strong> הסמן מופיע רק על משפט שהופעל עליו כלל. הפסקת AIS של 30 שעות מתחת לסף 48 שעות (כלל 8), והקריאות הן עובדות. שינוי הסמן שם הוא החלטה על הסף, לא על התצוגה.</li>
            <li><strong>חומרה לא מוצגת עכשיו:</strong> אין קופסת "קריטי...", אין צורות או תוויות חומרה ואין מיון לפיה. השדה <bdi dir="ltr">severity</bdi> נשאר בכל כלל ובנתונים, והדגל <bdi dir="ltr">showSeverity</bdi> ב-<bdi dir="ltr">thresholds.js</bdi> (כבוי) מחכה למתג "הצג חומרה" במדרגה ב׳.</li>
            <li><strong>שלושה מצבים נפרדים:</strong> "לא הוערך" (המקור לא נבדק) ו"אין נתונים בנושא זה" (אין נתונים במקור). אלה מצבי כיסוי, לא חומרה; אין משפט "נבדק ולא נמצאו", ונושא עם עובדות ובלי סימונים פשוט מציג אותן. אין "לא נמצאו" כשהמקור לא נבדק.</li>
            <li><strong>ניסוח:</strong> משפט אחד לממצא: מה נמצא, מתי, ומול מה (בסיס ההשוואה תמיד מצוין). אין שיפוט ("חשוד", "פלילי").</li>
            <li><strong>מצבי ממשק:</strong> טעינה (שלד בדמות המבנה האמיתי: כותרות ושורות טקסט), שגיאה עם "נסה שוב", כלי בלי נתונים. להדגמה בדף הכלי: <bdi dir="ltr">?snapshot=slow</bdi>, <bdi dir="ltr">?snapshot=error</bdi> ו-<bdi dir="ltr">?snapshot=error-once</bdi> (נכשל פעם אחת, "נסה שוב" מצליח).</li>
            <li><strong>כרטיס צף במקום מגירה (שלב 4ו, מחליף את הדחיפה של 4ד):</strong> רוחב <bdi dir="ltr">min(600px, 100vw - 48px)</bdi>, גובה עד תחתית החלון פחות 24px עם גלילה פנימית אחת (כותרת ותחתית קבועות), צל עדין מהטוקנים. הדף לא זז: אותו רוחב ומיקום ואותה גלילה לפני ואחרי. סגירה: Escape (אם Popover פתוח הוא נסגר קודם), לחיצה מחוץ לכרטיס, X, הכפתור עצמו ו"לפרטים" (סוגר, גולל לסעיף בדף ומדגיש אותו); המיקוד חוזר לכפתור. נגישות: <bdi dir="ltr">role="dialog"</bdi> בלי <bdi dir="ltr">aria-modal</bdi>, המיקוד נכנס לכרטיס בפתיחה. דף גלול למטה: הכפתור בכותרת הדביקה נשאר נגיש והכרטיס נשאר במקום הפתיחה ביחס לחלון.</li>
            <li><strong>בלי סמן במשפטים:</strong> כל המשפטים נראים אחיד. נקודות לתשומת לב מוצגות רק בשורת התוויות ב"במבט אחד"; לחיצה על תווית גוללת בתוך הכרטיס למשפט ומדגישה אותו ברקע עדין ל-2 שניות. השדה <bdi dir="ltr">marked</bdi> נשאר בנתונים (מזין את התוויות ואת מדרגה ב׳).</li>
            <li><strong>שלב 4ז:</strong> תוויות "לתשומת לב" הן קישורי ניווט בתוך הכרטיס (צבע הקישור, בלי מסגרת, מופרדות ב-"·") ולא צ'יפים, כדי שלא יתבלבלו עם צ'יפי האינדיקטורים בדף. פעולות ההעתקה והייצוא עברו לכותרת הכרטיס ככפתורי אייקון עם tooltip ו-aria-label (מימין לשמאל: העתקה, PDF, סגירה); אחרי העתקה האייקון הופך ל-✓ ל-1.5 שניות והכרטיס נשאר פתוח.</li>
          </ul>
          <div className="ds-drawer-box"><SnapshotBody s={snapshotDemo} /></div>
        </section>

        <section>
          <h2>ניתוח אזור (חקירת שטח)<SpecNote tag>הצעה</SpecNote></h2>
          <p className="entity-note">הכלי הכללי "חקירת שטח" משרטט <strong>פוליגון</strong> (אותו מנגנון כמו "שטח": לחיצה מוסיפה קודקוד, סגירה בלחיצה על הקודקוד הראשון, בלחיצה כפולה או ב-Enter, גרירת ידיות לעריכה) ומנתח את הפעילויות שהתרחשו בו בטווח תאריכים. התוצאה מיידית (לא ריצה ברקע) והגרפים (מדרגה ב׳) לא נכללים. הספים, הסמלים ורוחב הפאנל הם הצעה לאימות מול הפיתוח.</p>
          <ul className="plain-list bulleted">
            <li><strong>שתי לשוניות בפאנל:</strong> "פעילויות בטווח" (ברירת מחדל אחרי סגירת הפוליגון) ו"כלים בשטח כעת" (הרשימה הקיימת, "הוסף לרשימה" וייצוא CSV, עם שיוך לפי point-in-polygon; בלי עמודת מרחק מהמרכז). מעבר בין לשוניות שומר את הפעילות הנבחרת ואת הטווח.<SpecNote tag>הצעה</SpecNote> רוחב הפאנל: <bdi dir="ltr">--mt-panel-w</bdi> 320px, ובלשונית הפעילויות <bdi dir="ltr">--mt-panel-w-wide</bdi> 480px (שאלה פתוחה 4 ב-PRD). כותרת הפאנל: שם הכלי וסגירה בלבד (בלי בקרת יחידות ובלי שטח והיקף).</li>
            <li><strong>טווח תאריכים:</strong> אותו רכיב בורר כמו בסרגל כלי השיט (קיצורים 7 / 30 / 90 יום, תאריך ושעה), מוצג בתוך הפאנל. ברירת מחדל: 30 הימים שהסתיימו בסגירת הפוליגון; מקסימום 90. טווח מעל 90 יום, סוף לפני התחלה או תאריך עתידי לא מתקבל, עם הודעה. אין קשר לטווח המסלול של סט כלי השיט.</li>
            <li><strong>הרצה:</strong> אוטומטית בסגירת פוליגון, בסיום גרירת קודקוד ובאישור טווח; ריצה חדשה מבטלת קודמת. ריצה אחת מחזירה את שש הפעילויות, והחלפת פעילות במקרא לא מריצה שוב. להדגמה: <bdi dir="ltr">?area=slow</bdi> (3 שניות), <bdi dir="ltr">?area=error</bdi> ו-<bdi dir="ltr">?area=cap</bdi> (תקרת הנקודות יורדת ל-20).</li>
            <li><strong>מקרא (radiogroup):</strong> שש פעילויות בסדר קבוע, שורה = סמל + שם + ספירה, בחירה יחידה, חיצים ו-Enter. ברירת מחדל: הראשונה שיש בה אירוע. שלושה מצבי ספירה: מספר; 0 (עם "אין אירועים בשטח ובטווח" כשנבחרת); <strong>"לא נבדק"</strong> כשהמקור לא מכסה את השטח או הטווח (זה לא 0). בטעינה: שלד.</li>
            <li><strong>צבע לכל פעילות (במקום אייקונים; מחליף את BR-06 בחלקו):</strong><SpecNote tag>הצעה</SpecNote> לכל פעילות צבע משלה, והוא מופיע במקרא, בכותרת המקטע, בכרטיס האירוע ובנקודות הפעילות הנבחרת במפה: מפגש <bdi dir="ltr">--area-sts</bdi> (כחול), עגינה <bdi dir="ltr">--area-anchorage</bdi> (סגול), ביקור בנמל <bdi dir="ltr">--area-port-visit</bdi> (ורוד), הפסקת AIS <bdi dir="ltr">--area-ais-gap</bdi> (תכלת), שיטוט <bdi dir="ltr">--area-loitering</bdi> (צהוב-ליים), שינוי זהות <bdi dir="ltr">--area-identity</bdi> (לבן-כחלחל). עדיין אסור: צורות סולם החומרה (● ▲ ◆ ■ ◌ ✓) וצבעיו (ירוק, ענבר, כתום, אדום), והציאן של <bdi dir="ltr">--map-draw</bdi>. הצבע אינו הנושא היחיד: תמיד מתלווה אליו שם הפעילות.</li>
            <li><strong>נקודות וקבוצות:</strong> רק הפעילות הנבחרת, רק אירועים שנקודת העיגון שלהם בתוך הפוליגון או על הגבול (BR-01) ושזמן ההתחלה שלהם בטווח (BR-02). קיבוץ נקודות קרובות לסמל עם מספר (<bdi dir="ltr">CLUSTER_CELL_PX</bdi> 36px, בלי קיבוץ מזום 13) ופירוק בהתקרבות; סכום הנקודות והקבוצות שווה לספירה במקרא. מפגש STS הוא אירוע אחד עם שני כלים (נקודה ושורה אחת). הפוליגון נשאר מתחת לנקודות.</li>
            <li><strong>כרטיס אירוע:</strong> צף ליד הנקודה (או השורה): פעילות, כלי (קישור לדף הכלי, IMO ו-MMSI כטקסט, דגל), התחלה, סיום ("ממשיך" ומשך עד עכשיו), משך, קואורדינטות, מקור וזמן עדכון, ושדות ייחודיים (הכלי השני, נמל ומדינה, מיקום חזרה ומרחק, השדה שהשתנה לפני ואחרי). שדה חסר: "לא ידוע". נסגר ב-Esc (קודם לסגירת הכלי), בלחיצה מחוץ לכרטיס ובכפתור X.</li>
            <li><strong>טבלה:</strong> התחלה, כלי, משך, מקור; מהחדש לישן וניתנת למיון בכל עמודה. לחיצה על שורה מדגישה את הנקודה, ממרכזת את המפה (ומתקרבת אם היא בקבוצה) ופותחת כרטיס; לחיצה על נקודה מדגישה וגוללת לשורה. <SpecNote tag>הצעה</SpecNote> תקרת <bdi dir="ltr">MAX_POINTS</bdi> 500 נקודות: המפה והטבלה מציגות את החדשים עד התקרה עם "מוצגים X מתוך N", והמקרא והייצוא תמיד מלאים.</li>
            <li><strong>מצבים:</strong> טעינה (שלד במקרא ובטבלה, המפה פעילה), שגיאה ("לא הצלחנו לטעון את הפעילויות" ו"נסה שוב", הפוליגון נשמר), אין אירועים, לא נבדק, מעל תקרת נקודות, מעל תקרת שטח (<SpecNote tag>הצעה</SpecNote> <bdi dir="ltr">MAX_AREA_KM2</bdi> 250,000 קמ״ר: הניתוח לא רץ ומוצג השטח המרבי). "נקה" מסיר יחד פוליגון, נקודות, מקרא וטבלה. Esc בשרטוט מוחק את הטיוטה, וב-Esc נוסף נסגר הכלי.</li>
            <li><strong>כותרת מקטע דביקה (שלב 5ב):</strong> מעל הטבלה שורה עם צבע הפעילות, שמה, מספר האירועים וטווח מקוצר ("מפגש ship-to-ship · 3 אירועים · 24.10–23.11"; מעל התקרה "מוצגים 500 מתוך 812"). היא ושורת כותרות העמודות דביקות בראש גוף הפאנל (גלילה אחת בלבד), עם רקע אטום וקו תחתון. לחיצה או Enter גוללת למקרא להחלפת פעילות. שורות המקרא בגובה <bdi dir="ltr">--row-h</bdi> (44px); ב-1366×768 אחרי סגירת פוליגון רואים בלי גלילה את הטווח, את שש השורות ואת השורה הראשונה בטבלה.</li>
            <li><strong>שורת סיכום:</strong> מתחת למקרא: "סה״כ N פעילויות · M כלי שיט ייחודיים". כלי שמופיע בכמה אירועים נספר פעם אחת, במפגש STS נספרים שני הכלים, ופעילות "לא נבדק" לא נכללת (מצוין בסוגריים).</li>
            <li><strong>מצב חקירת שטח (שלב 5ב):</strong> כשיש פוליגון סגור מוצג רק השטח: מסכה כהה (<bdi dir="ltr">--map-mask</bdi>) מחוץ לפוליגון והבסיס נשאר מתחתיה; סמלי כלי השיט, מדידות שמורות ושכבות הסט מוסתרים (וחוזרים ביציאה בלי לאבד מצב). בלשונית "פעילויות בטווח" רק נקודות הפעילות הנבחרת; ב"כלים בשטח כעת" רק הכלים שבפוליגון. תווית השטח במרכז לא מוצגת; השטח בכותרת הפאנל בלבד. יציאה: "נקה", Esc או ×, או מעבר לכלי אחר. בלי כפתור "העתק" (שלב 5ג): במצב ריק אין שורת פעולות כלל, ואחרי שרטוט יש "ייצוא CSV" (מושבת כשהספירה 0 או "לא נבדק") ו"נקה". מפגש STS בטבלה, בכרטיס ובייצוא: שני כלים שווים ב-" ↔ " לפי סדר אלפביתי.</li>
            <li><strong>שני אופני קלט (שלב 5ג):</strong> בורר בראש הפאנל (<bdi dir="ltr">radiogroup</bdi>, חיצים ו-Enter): "דקירה במפה" (ברירת מחדל) ו"הזנה ידנית". <strong>רשימת נקודות אחת משותפת</strong>: נקודה שנדקרה במפה מופיעה ברשימה, ונקודה שהוקלדה מופיעה במפה; מעבר בין האופנים והחלפת לשונית לא מוחקים כלום, ואין שני פוליגונים. סדר הרשימה הוא סדר הפוליגון (בלי מיון), עד 50 נקודות. הכלי תמיד פעיל על המפה: גם בהזנה ידנית אפשר לדקור. שטח, היקף ובקרת יחידות בכותרת הפאנל הוסרו (לבקשה), בניגוד לקובץ השלב.</li>
            <li><strong>הנחיה בדקירה:</strong> הטקסט משתנה לפי מספר הנקודות ואומר מה לעשות עכשיו ומה יקרה אחר כך. מתחתיו שורה קבועה "נקודות: N" ו"בטל נקודה אחרונה" (גם Backspace או Ctrl+Z). הנקודה הראשונה מודגשת מ-3 נקודות. אחרי סגירה ההנחיה נעלמת. הבר הצף שבמפה קצר: "דקירה: הוספת פינה · Esc: סגירת הכלי", ובפוליגון סגור "גרירת פינה: עריכה · Esc: סגירת הכלי".
              <table className="ds-table"><thead><tr><th>מצב</th><th>טקסט</th></tr></thead><tbody>
                <tr><td>0 נקודות</td><td>לחץ על המפה בפינה הראשונה של האזור.</td></tr>
                <tr><td>1–2 נקודות</td><td>המשך ללחוץ על פינות האזור לפי הסדר. נדרשות לפחות 3 נקודות.</td></tr>
                <tr><td>3+ נקודות, פוליגון פתוח</td><td>כדי לסיים, לחץ שוב על הנקודה הראשונה או לחץ פעמיים על הנקודה האחרונה.</td></tr>
              </tbody></table></li>
            <li><strong>הזנה ידנית:</strong> שורה לכל נקודה (קו רוחב, קו אורך; שדות <bdi dir="ltr">ltr</bdi> בגופן monospace, יישור לשמאל), מספר שורה, מחיקה (<bdi dir="ltr">Trash2</bdi>) ושורה ריקה אחת בסוף. Enter בשדה האורך עובר לשורה הבאה. ערך תקין מוצג אחרי עזיבת השדה כמעלות עשרוניות עם 3 ספרות (<bdi dir="ltr">35.512° N</bdi>; הפורמט ערך תצורה אחד, <bdi dir="ltr">COORD_DISPLAY</bdi> ב-<bdi dir="ltr">thresholds.js</bdi>, הצעה). שגיאה בשורה מתחת לשדה, והשדה התקין נשאר. עם 3 נקודות תקינות הפוליגון מצטייר בתצוגה מקדימה, <strong>והניתוח לא רץ</strong> עד "הצגה על המפה" (מושבת עד 3 נקודות תקינות, עם הסיבה בטקסט צמוד: "נדרשות עוד 2 נקודות" או "תקן את הנקודות המסומנות"; אחרי סגירה הוא "עדכון"). גרירת קודקוד במפה ממשיכה להריץ מחדש אוטומטית; עריכת שדה ברשימה מחכה ל"עדכון". "הדבקת רשימה": אזור טקסט באותו פאנל, שורות שלא זוהו מוצגות עם מספר שורה והשאר נשמר, ההדבקה <strong>מוסיפה</strong> ולא מחליפה, ומעל 50 נקודות נקלטות 50 הראשונות. הדבקה מרובת שורות לשדה הרוחב של השורה הריקה פועלת אותו דבר. לא בשלב זה: קובץ (CSV/KML), שמירת פוליגונים, WKT.</li>
            <li><strong>פורמטים מתקבלים בשדה</strong> (מזוהים לבד, בלי בורר). הטבלה מחושבת בפועל מ-<bdi dir="ltr">parseCoordinate</bdi>:
              <table className="ds-table"><thead><tr><th>קלט</th><th>ציר</th><th>הסבר</th><th>תוצאה</th></tr></thead><tbody>
                {COORD_EXAMPLES.map(([t, axis, note]) => { const r = parseCoordinate(t, axis); return (
                  <tr key={t}><td><bdi dir="ltr">{t}</bdi></td><td>{axis === 'lat' ? 'רוחב' : 'אורך'}</td><td>{note}</td><td>{r.ok ? <bdi dir="ltr">{formatCoordinate(r.value, axis)}</bdi> : r.error}</td></tr>
                ); })}
              </tbody></table>
              מקרי קצה: נקודה אחת תקינה ואחת שגויה (<bdi dir="ltr">95</bdi> ברוחב מסומנת, והתקינה נשארת); הדבקה של 12 שורות מתוכן 2 שגויות: נקלטו <bdi>{pasteDemo.points.length}</bdi>, שגיאות בשורות <bdi>{pasteDemo.errors.map((e) => e.line).join(', ')}</bdi>; הדבקה של 63 שורות: נקלטו <bdi>{pasteBig.points.length}</bdi> מתוך <bdi>{pasteBig.total}</bdi> נקודות; פוליגון עם צלעות חוצות לא נסגר, באותה הודעה כמו בדקירה.</li>            <li><strong>ייצוא CSV:</strong> כל אירועי הפעילות הנבחרת (גם מעל התקרה), UTF-8 עם BOM; שתי שורות בראש (קודקודי הפוליגון והטווח), MMSI עם אפסים מובילים; לא פעיל כשהספירה 0 או "לא נבדק".</li>
          </ul>
          <div className="ds-drawer-box">
            <div className="area-legend" aria-label="דוגמה למקרא פעילויות" style={{ maxWidth: 'var(--mt-panel-w-wide)' }}>
              {[['sts', 'מפגש ship-to-ship', '3', true], ['anchorage', 'עגינה והמתנה', '31'], ['port-visit', 'ביקור בנמל', '0'], ['ais-gap', 'הפסקת שידור AIS', '9'], ['loitering', 'שיטוט', 'לא נבדק'], ['identity', 'שינוי זהות', '3']].map(([id, label, n, on]) => (
                <div key={label} className={`area-act${on ? ' on' : ''}`}>
                  <ActivityDot id={id} />
                  <span className="area-act-name">{label}</span>
                  <span className={`area-act-count${n === 'לא נבדק' ? ' unchecked' : ''}`}>{n}</span>
                </div>
              ))}
            </div>
            <p className="entity-note" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              נקודה, קבוצה ונקודה נבחרת (בצבע הפעילות, כאן עגינה):
              <span className="map-event act-anchorage" style={{ position: 'relative' }} /><span className="map-cluster act-anchorage" style={{ position: 'relative' }}>12</span><span className="map-event act-anchorage sel" style={{ position: 'relative' }} />
            </p>
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
