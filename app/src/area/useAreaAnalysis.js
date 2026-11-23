import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { validateRange } from '../map/range.js';
import { fetchAreaActivities, pointCap } from './api.js';
import { areaKm2, defaultActivity, defaultRange, limitEvents } from './query.js';
import { DEFAULT_RANGE_DAYS, MAX_AREA_KM2, MAX_RANGE_DAYS } from './thresholds.js';

/**
 * מצב ניתוח האזור של כלי "חקירת שטח": טווח, ריצה, פעילות נבחרת ואירוע נבחר. הריצה אוטומטית (FR-04):
 * בסגירת פוליגון (polygonKey חדש), בסיום גרירת קודקוד (rev עולה) ובאישור טווח; ריצה חדשה מבטלת את הקודמת.
 * החלפת פעילות או לשונית לא מריצה שוב: הספירות והאירועים של כל שש הפעילויות חוזרים ברצה אחת.
 * @param {{polygon: number[][]|null, polygonKey: string|null, rev: number}} p  polygon: הפוליגון הסגור (או null); polygonKey: מזהה השרטוט
 */
export function useAreaAnalysis({ polygon, polygonKey, rev }) {
  const [range, setRange] = useState(() => defaultRange(Date.now(), DEFAULT_RANGE_DAYS));
  const [status, setStatus] = useState('idle'); // idle | loading | ready | error | too-large
  const [result, setResult] = useState(null);
  const [activity, setActivity] = useState(null);
  const [picked, setPicked] = useState(false);
  const [selId, setSelId] = useState(null);
  const [tab, setTab] = useState('range');
  const [attempt, setAttempt] = useState(0);
  const poly = useRef(polygon);
  poly.current = polygon;
  const keep = useRef({ picked });
  keep.current.picked = picked;

  // שרטוט חדש (או נקה): חוזרים לטווח ברירת המחדל ולבחירה אוטומטית
  useEffect(() => {
    setRange(defaultRange(Date.now(), DEFAULT_RANGE_DAYS));
    setPicked(false);
    setActivity(null);
    setSelId(null);
    setResult(null);
    setTab('range');
    setStatus(polygonKey ? 'loading' : 'idle');
  }, [polygonKey]);

  const rangeError = validateRange(range.from, range.to, Date.now() + 1000, MAX_RANGE_DAYS);

  useEffect(() => {
    const pts = poly.current;
    if (!polygonKey || !pts || rangeError) return undefined;
    if (areaKm2(pts) > MAX_AREA_KM2) { setResult(null); setStatus('too-large'); return undefined; }
    const ctl = new AbortController();
    setStatus('loading');
    fetchAreaActivities(pts, range, { signal: ctl.signal })
      .then((r) => {
        setResult(r);
        setStatus('ready');
        if (!keep.current.picked) setActivity(defaultActivity(r.counts));
        setSelId(null);
      })
      .catch((e) => { if (e?.name !== 'AbortError') { setResult(null); setStatus('error'); } });
    return () => ctl.abort(); // רצה חדשה מבטלת קודמת: תוצאה ישנה לא מוצגת
  }, [polygonKey, rev, range, rangeError, attempt]);

  const applyRange = useCallback((r) => {
    const now = Date.now();
    setRange(r.preset ? { from: now - r.preset * 3600e3, to: now } : { from: r.from, to: r.to });
  }, []);
  const pickActivity = useCallback((id) => { setActivity(id); setPicked(true); setSelId(null); }, []);
  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  const list = useMemo(() => (result && activity ? result.events[activity] ?? [] : []), [result, activity]);
  const shown = useMemo(() => limitEvents(list, pointCap()), [list]);

  return { maxAreaKm2: MAX_AREA_KM2, range, rangeError, applyRange, status, result, activity, pickActivity, retry, selId, setSelId, tab, setTab, list, shown };
}
