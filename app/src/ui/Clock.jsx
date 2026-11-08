import { useEffect, useState } from 'react';
import { Ltr } from './Ltr';
import { hebrewDate } from './hebrewDate';

const fmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Jerusalem', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
});

/** "11:20 · 08.11.2026" לפי Asia/Jerusalem */
export const formatNow = (d = new Date()) => {
  const p = Object.fromEntries(fmt.formatToParts(d).map((x) => [x.type, x.value]));
  return `${p.hour === '24' ? '00' : p.hour}:${p.minute} · ${p.day}.${p.month}.${p.year}`;
};

/** בלוק שעה: שורה 1 שעה ותאריך לועזי (14/500), שורה 2 תאריך עברי (12 משני). מתעדכן בתחילת כל דקה. */
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
  return (
    <time className="clock" dateTime={now.toISOString()}>
      <span className="clock-time"><Ltr>{formatNow(now)}</Ltr></span>
      <span className="clock-heb">{hebrewDate(now)}</span>
    </time>
  );
}
