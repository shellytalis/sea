import { useState } from 'react';
import { CONFIDENCE_LABEL } from '../data/companies';
import { ModelTag, SeverityBadge, Shape } from '../ui/Badges';
import { Ltr, Num } from '../ui/Ltr';
import Panel from '../ui/Panel';
import Popover from '../ui/Popover';
import SpecNote from '../ui/SpecNote';

/*
 * תוצרי המודלים של שלב א׳ בדף החברה, בטבלת החיפוש ובמגירה (הצעה: הערכים והגורמים הם דמה).
 * קבוצת שליטה: ערך מורכב ("55 חברות · 140 כלים"). פרופיל חברה: ערך מתוך רשימה סגורה.
 * "לא הוערך" (חסר מידע) ו"לא נמצאו קשרים" (נבדק ונקי) הם שני מצבים נפרדים, ולא "נמוך".
 */

/** ערך קבוצת השליטה כטקסט קצר */
export function GroupValue({ group }) {
  if (group.state === 'assessed') return <><Ltr>{group.companies}</Ltr> חברות · <Ltr>{group.vessels}</Ltr> כלים</>;
  if (group.state === 'none') return <>לא נמצאו קשרים</>;
  return <>לא הוערך</>;
}

/** תג הפרופיל ליד שם החברה. הסימון "מודל" מבדיל אותו מנתוני הרישום */
export function ProfileTag({ profile }) {
  return (
    <span className="ui-chip tag mo-tag">
      {profile.state === 'assessed' ? profile.value : <><Shape risk="unassessed" />פרופיל: לא הוערך</>}
      <ModelTag />
    </span>
  );
}

/** תג אי-ההתאמה בין הפרופיל לרישום (משולש). מוסתר בכותרת המכווצת */
export function MismatchTag({ text }) {
  return <span className="ui-chip tag mo-tag entity-title-optional"><Shape risk="medium" />{text}</span>;
}

/** מטא של הכותרת: עודכן · גרסה, פעם אחת */
export const modelMeta = (m) => <>עודכן <Num>{m.updated}</Num> · גרסה <Num>{m.modelVersion}</Num></>;

/** "עוד N גורמים": כל הגורמים בפופאובר */
function MoreReasons({ reasons }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onClose={() => setOpen(false)} panelProps={{ role: 'dialog', 'aria-label': 'כל הגורמים' }}
      anchor={<button type="button" className="mo-more" aria-expanded={open} onClick={() => setOpen(!open)}>עוד <Ltr>{reasons.length - 1}</Ltr> גורמים</button>}>
      <ul className="plain-list bulleted">{reasons.map((r) => <li key={r}>{r}</li>)}</ul>
    </Popover>
  );
}

/** תא סיכום של מודל: שם, ערך, רמת ביטחון, הגורם הראשון ו"עוד N". כשיש href כל התא לחיץ (הקישור על השם נמתח על פניו) */
function ModelCell({ name, href, onGo, value, confidence, reasons }) {
  return (
    <div className={`mo-cell${href ? ' clickable' : ''}`}>
      {href
        ? <a className="mo-name" href={href} onClick={(e) => { e.preventDefault(); onGo(); }}>{name}</a>
        : <span className="mo-name">{name}</span>}
      <div className="mo-value">{value}</div>
      {confidence && <div className="mo-conf">{CONFIDENCE_LABEL[confidence]}</div>}
      <div className="mo-reason">{reasons[0]}</div>
      {reasons.length > 1 ? <MoreReasons reasons={reasons} /> : <span />}
    </div>
  );
}

/** תא של מודל שעוד לא קיים: עיגול מקווקו ושורת הסבר */
function PlannedCell({ name, stage, text }) {
  return (
    <div className="mo-cell">
      <span className="mo-name">{name}</span>
      <div className="mo-planned"><Shape risk="unassessed" />בתכנון</div>
      <div className="mo-reason sec">{stage}: {text}</div>
    </div>
  );
}

/**
 * Panel יחיד בכותרת "תוצרי מודל" (מחליף את שורת האותות): ארבעה תאים שווים, מטא "עודכן · גרסה" פעם אחת.
 * כשקבוצת השליטה והפרופיל "לא הוערך": רצועה אחת. onGo: גלילה למקטע (הקבוצה מובילה ל"קשרים בין חברות").
 */
export function ModelSummary({ outputs, onGo, id = 'model-outputs' }) {
  const { controlGroup: g, profile: p } = outputs;
  const meta = modelMeta(g);
  const actions = <SpecNote tag>הצעה</SpecNote>;

  if (g.state === 'unassessed' && p.state === 'unassessed') {
    return (
      <Panel id={id} title="תוצרי מודל" meta={meta} actions={actions}>
        <div className="mo-note"><SeverityBadge severity="unassessed" /><span className="sub">{g.reasons[0]}</span></div>
      </Panel>
    );
  }

  return (
    <Panel id={id} title="תוצרי מודל" meta={meta} actions={actions} flush>
      <div className="mo-grid">
        {g.state === 'assessed' && (
          <ModelCell name="קבוצת שליטה" href="#relations" onGo={() => onGo('relations')} value={<GroupValue group={g} />}
            confidence={g.confidence} reasons={g.reasons} />
        )}
        {g.state === 'none' && (
          <ModelCell name="קבוצת שליטה" href="#relations" onGo={() => onGo('relations')}
            value={<span className="ui-sev none mo-ok"><Shape risk="none" />לא נמצאו קשרים</span>} reasons={g.reasons} />
        )}
        {g.state === 'unassessed' && (
          <ModelCell name="קבוצת שליטה" href="#relations" onGo={() => onGo('relations')} value={<SeverityBadge severity="unassessed" />} reasons={g.reasons} />
        )}
        {p.state === 'assessed'
          ? <ModelCell name="פרופיל חברה" value={p.value} confidence={p.confidence} reasons={p.reasons} />
          : <ModelCell name="פרופיל חברה" value={<SeverityBadge severity="unassessed" />} reasons={p.reasons} />}
        <PlannedCell name="מה השתנה" stage="שלב ב׳" text="שינויים אחרונים מול השגרה של החברה" />
        <PlannedCell name="רמת סיכון" stage="שלב ג׳" text="שקלול מוסבר של כל התוצרים, בסולם החומרה" />
      </div>
    </Panel>
  );
}

/** שתי עמודות "תוצרי מודל" בטבלת החיפוש (הצעה), תחת כותרת-על אחת */
export const MODEL_COLUMNS = [
  {
    id: 'm-profile', label: 'פרופיל', width: 140, group: 'תוצרי מודל',
    sort: (c) => c.modelOutputs.profile.value ?? '',
    render: (c) => (c.modelOutputs.profile.state === 'assessed'
      ? c.modelOutputs.profile.value
      : <SeverityBadge severity="unassessed" />),
  },
  {
    id: 'm-group', label: 'קבוצה', width: 120, group: 'תוצרי מודל',
    // לא הוערך נמוך מ"לא נמצאו קשרים" במיון
    sort: (c) => { const g = c.modelOutputs.controlGroup; return g.state === 'unassessed' ? -1 : g.state === 'none' ? 0 : g.companies; },
    render: (c) => {
      const g = c.modelOutputs.controlGroup;
      if (g.state === 'assessed') return <Num>{g.companies}</Num>;
      if (g.state === 'none') return <span className="ui-sev none signal-ok"><Shape risk="none" /><span className="sr-only">לא נמצאו קשרים</span></span>;
      return <SeverityBadge severity="unassessed" />;
    },
  },
];

/** תוצרי המודל במגירת התצוגה המהירה: כל הגורמים (יש מקום) */
export function ModelOutputsDetail({ outputs }) {
  const { controlGroup: g, profile: p } = outputs;
  return (
    <>
      <section className="ui-drawer-group">
        <div className="mo-drawer-head">
          <h3>תוצרי מודל</h3>
          <span className="mo-drawer-meta">{modelMeta(g)}</span>
        </div>
        <div className="mo-detail">
          <div className="mo-detail-head">
            <strong>קבוצת שליטה</strong>
            {g.state === 'assessed' && <span className="sub">{CONFIDENCE_LABEL[g.confidence]}</span>}
          </div>
          <div className="mo-detail-value">
            {g.state === 'unassessed' ? <SeverityBadge severity="unassessed" />
              : g.state === 'none' ? <span className="ui-sev none mo-ok"><Shape risk="none" />לא נמצאו קשרים</span>
                : <GroupValue group={g} />}
          </div>
          <ul className="plain-list bulleted mo-why" aria-label="גורמים">{g.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
        </div>
        <div className="mo-detail">
          <div className="mo-detail-head">
            <strong>פרופיל חברה</strong>
            {p.state === 'assessed' && <span className="sub">{CONFIDENCE_LABEL[p.confidence]}</span>}
          </div>
          <div className="mo-detail-value">{p.state === 'assessed' ? p.value : <SeverityBadge severity="unassessed" />}</div>
          {p.mismatch && <div className="mo-mismatch"><Shape risk="medium" />{p.mismatch}</div>}
          <ul className="plain-list bulleted mo-why" aria-label="גורמים">{p.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
        </div>
      </section>
    </>
  );
}
