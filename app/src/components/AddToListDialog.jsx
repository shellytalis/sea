import { useState } from "react";
import { CircleCheck } from "lucide-react";
import { LISTS } from "../data/vessels";
import Dialog from "../ui/Dialog";
import Button from "../ui/Button";
import { TextField } from "../ui/Fields";
/** הוספה לרשימה: רשימה שהכלי כבר בה מוצגת מושבתת עם הסבר, ולא נדרסת רשומה קיימת */
export default function AddToListDialog({ vessel, onClose }) {
  const [sel, setSel] = useState(null);
  const [note, setNote] = useState("");
  const [done, setDone] = useState(null);
  if (done) {
    return <Dialog title="הוספה לרשימה" onClose={onClose} footer={<Button variant="primary" onClick={onClose}>סגור</Button>}>
        <p className="ui-success" role="status"><CircleCheck size={18} aria-hidden="true" />הכלי נוסף לרשימה "{done}"</p>
      </Dialog>;
  }
  return <Dialog title="הוספה לרשימה" onClose={onClose} footer={<>
        <Button variant="primary" disabled={!sel} onClick={() => setDone(sel)}>הוסף</Button>
        <Button onClick={onClose}>ביטול</Button>
      </>}>
      <fieldset className="ui-checks">
        <legend>בחר רשימה</legend>
        {LISTS.map((l) => {
    const has = vessel.lists.includes(l);
    return <label key={l} className="ui-check">
              <input type="radio" name="list" disabled={has} checked={sel === l} onChange={() => setSel(l)} />
              <span>{l}{has && <span className="ui-hint"> · הכלי כבר קיים ברשימה זו</span>}</span>
            </label>;
  })}
      </fieldset>
      <TextField label="הערה (אופציונלי)" value={note} onChange={(e) => setNote(e.target.value)} />
    </Dialog>;
}
