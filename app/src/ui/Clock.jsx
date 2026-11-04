import { useEffect, useState } from 'react';
import { Ltr } from './Ltr';

const fmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Jerusalem', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
});

/** "04.11.2026 · 12:24" לפי Asia/Jerusalem */
export const formatNow = (d = new Date()) => {
  const p = Object.fromEntries(fmt.formatToParts(d).map((x) => [x.type, x.value]));
  return `${p.day}.${p.month}.${p.year} · ${p.hour === '24' ? '00' : p.hour}:${p.minute}`;
};

/** שעון חי: מתעדכן בתחילת כל דקה */
export default function Clock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let timer;
    const tick = () => {
      setNow(new Date());
      timer = setTimeout(tick, 60000 - (Date.now() % 60000) + 50);
    };
    timer = setTimeout(tick, 60000 - (Date.now() % 60000) + 50);
    return () => clearTimeout(timer);
  }, []);
  return <time className="clock" dateTime={now.toISOString()}><Ltr>{formatNow(now)}</Ltr></time>;
}
