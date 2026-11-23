import { Anchor, ArrowLeftRight, IdCard, Orbit, Warehouse, WifiOff } from 'lucide-react';

// סמלי הפעילויות (BR-06): אייקוני lucide בלבד. אסור צורות סולם החומרה (● ▲ ◆ ■ ◌ ✓) וצבעיו; הצבע בא מהטקסט שסביב.
const ICONS = { ArrowLeftRight, Anchor, Warehouse, WifiOff, Orbit, IdCard };

export default function ActivityIcon({ name, size = 16 }) {
  const Icon = ICONS[name];
  return Icon ? <Icon size={size} aria-hidden="true" /> : null;
}
