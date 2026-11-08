import { useEffect, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';

/**
 * סמנים (maplibregl.Marker) לידיות ולתוויות. specs: [{ key, lngLat, className, text?, draggable?, onDrag?, anchor?, offset? }].
 * הגרירה ממומשת כאן (לא ב-Marker) כדי לעצור את האירוע לפני גרירת המפה ולפני click על המפה.
 */
function attachDrag(map, el, getHandler, getDouble) {
  const stop = (e) => e.stopPropagation();
  el.addEventListener('click', stop);
  // הידית החדשה נוצרת מתחת לסמן אחרי הלחיצה הראשונה, ולכן לחיצה כפולה (סיום) נוחתת עליה ולא על המפה
  el.addEventListener('dblclick', (e) => { e.stopPropagation(); getDouble()?.(); });
  el.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    const rect = map.getCanvas().getBoundingClientRect();
    const move = (ev) => {
      const ll = map.unproject([ev.clientX - rect.left, ev.clientY - rect.top]);
      getHandler()?.([ll.lng, ll.lat]);
    };
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
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
        if (s.draggable) attachDrag(map, el, () => latest.current.find((x) => x.key === s.key)?.onDrag, () => latest.current.find((x) => x.key === s.key)?.onDouble);
        else el.style.pointerEvents = 'none';
      }
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
