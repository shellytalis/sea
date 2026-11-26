import { Anchor, ArrowLeftRight, IdCard, Orbit, Warehouse, WifiOff } from 'lucide-react';

// סמל קטן בתוך נקודת הפעילות במפה (שלב 5ד): הצבע לא נושא משמעות לבדו, אז כל פעילות נושאת גם צורה. אייקוני lucide בלבד (BR-06).
const ICONS = { sts: ArrowLeftRight, anchorage: Anchor, 'port-visit': Warehouse, 'ais-gap': WifiOff, loitering: Orbit, identity: IdCard };

export default function ActivityIcon({ id, size = 12 }) {
  const Icon = ICONS[id];
  return Icon ? <Icon size={size} aria-hidden="true" /> : null;
}
