import { useEffect, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';

/**
 * סמנים (maplibregl.Marker) לידיות ולתוויות. specs: [{ key, lngLat, className, text?, draggable?, onDrag?, anchor?, offset? }].
 * הגרירה ממומשת כאן (לא ב-Marker) כדי לעצור את האירוע לפני גרירת המפה ולפני click על המפה.
 */
function attachDrag(map, el, getHandler, getDouble, getClick, getEnd) {
  let moved = false;
  // לחיצה (בלי גרירה) על ידית מפעילה onClick אם יש (למשל סגירת פוליגון בלחיצה על הקודקוד הראשון)
  el.addEventListener('click', (e) => { e.stopPropagation(); if (!moved) getClick()?.(); });
  // הידית החדשה נוצרת מתחת לסמן אחרי הלחיצה הראשונה, ולכן לחיצה כפולה (סיום) נוחתת עליה ולא על המפה
  el.addEventListener('dblclick', (e) => { e.stopPropagation(); getDouble()?.(); });
  el.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    moved = false;
    const rect = map.getCanvas().getBoundingClientRect();
    const x0 = e.clientX;
    const y0 = e.clientY;
    const move = (ev) => {
      if (Math.hypot(ev.clientX - x0, ev.clientY - y0) > 3) moved = true;
      const ll = map.unproject([ev.clientX - rect.left, ev.clientY - rect.top]);
      getHandler()?.([ll.lng, ll.lat]);
    };
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      if (moved) getEnd()?.(); // סיום גרירה (ניתוח אזור רץ מחדש רק אז)
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  });
}

export default function useMarkers(map, specs) {
  const store = useRef(new Map());
  const latest = useRef(specs);
  latest.current = specs;
  useEffect(() => {
    if (!map) return;
    const cur = store.current;
    const keys = new Set(specs.map((s) => s.key));
    for (const [k, e] of cur) {
      if (!keys.has(k)) { e.marker.remove(); cur.delete(k); }
    }
    for (const s of specs) {
      let e = cur.get(s.key);
      if (!e) {
        const el = document.createElement('div');
        el.dir = 'ltr';
        const marker = new maplibregl.Marker({ element: el, anchor: s.anchor ?? 'center', offset: s.offset ?? [0, 0], rotation: s.rotation ?? 0, rotationAlignment: 'map' }).setLngLat(s.lngLat).addTo(map);
        e = { marker, el, cls: '' };
        cur.set(s.key, e);
        const get = (name) => () => latest.current.find((x) => x.key === s.key)?.[name];
        if (s.draggable) attachDrag(map, el, get('onDrag'), get('onDouble'), get('onClick'), get('onDragEnd'));
        else if (s.onClick) {
          // סמן לחיץ (נקודות אירוע וקבוצות בניתוח אזור): לחיצה, Enter ו-Space, ועצירת הלחיצה לפני המפה
          el.setAttribute('role', 'button');
          el.tabIndex = 0;
          el.addEventListener('click', (e) => { e.stopPropagation(); get('onClick')()?.(); });
          el.addEventListener('mousedown', (e) => e.stopPropagation());
          el.addEventListener('dblclick', (e) => e.stopPropagation());
          el.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); ev.stopPropagation(); get('onClick')()?.(); } });
        } else el.style.pointerEvents = 'none';
      }
      if (s.html !== undefined && e.html !== s.html) { e.el.innerHTML = s.html; e.html = s.html; } // תוכן SVG סטטי (סמל פעילות בנקודת אירוע)
      if (s.label !== undefined && e.el.getAttribute('aria-label') !== s.label) e.el.setAttribute('aria-label', s.label);
      if (e.cls !== s.className) {
        if (e.cls) e.el.classList.remove(...e.cls.split(' '));
        e.el.classList.add(...s.className.split(' '));
        e.cls = s.className;
      }
      if (s.text !== undefined && e.el.textContent !== s.text) e.el.textContent = s.text;
      e.marker.setLngLat(s.lngLat);
      if (s.rotation !== undefined) e.marker.setRotation(s.rotation);
    }
  });
  useEffect(() => () => {
    for (const e of store.current.values()) e.marker.remove();
    store.current.clear();
  }, [map]);
}
