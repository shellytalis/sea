import { useEffect } from 'react';

/**
 * פס הגלילה (דק) יושב בתוך השוליים הקבועים: --sbw = רוחבו, ו-CSS מפחית אותו
 * מהשוליים בצד שלו, כך שהשוליים נראים סימטריים (32px) עד קצה האזור.
 */
export default function useScrollbarGap(ref, deps = []) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const sync = () => el.style.setProperty('--sbw', `${el.offsetWidth - el.clientWidth}px`);
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    if (el.lastElementChild) ro.observe(el.lastElementChild);
    return () => ro.disconnect();
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
}
