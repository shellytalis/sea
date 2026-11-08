import test from 'node:test';
import assert from 'node:assert/strict';
import { bearing, distance } from './geodesy.js';
import { demoTrack, markStep, trackStats } from './route.js';
import { NM, formatDuration, formatEta, travelHours } from './units.js';

const close = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} expected ${b} ± ${tol}, got ${a}`);

test('travelHours: 100 NM ב-10 קשר = 10 שעות; מהירות 0 = אינסוף', () => {
  close(travelHours(100 * NM, 10), 10, 1e-9);
  close(travelHours(50 * NM, 8), 6.25, 1e-9);
  assert.equal(travelHours(NM, 0), Infinity);
});

test('formatDuration', () => {
  assert.equal(formatDuration(0.5), '30 דקות');
  assert.equal(formatDuration(5.2), '5 שעות, 12 דקות');
  assert.equal(formatDuration(5), '5 שעות');
  assert.equal(formatDuration(1), '1 שעה');
  assert.equal(formatDuration(38), '1 יום, 14 שעות');
  assert.equal(formatDuration(48), '2 ימים');
  assert.equal(formatDuration(52.25), '2 ימים, 4 שעות');
  assert.equal(formatDuration(Infinity), '—');
});

test('formatEta: פורמט dd.mm.yyyy HH:mm', () => {
  assert.match(formatEta(new Date(2026, 10, 8, 9, 5).getTime()), /^08\.11\.2026 09:05$/);
});

test('markStep: עד 6 סימונים בכל חלון', () => {
  for (const h of [6, 12, 24, 48]) assert.ok(h / markStep(h) <= 6);
});

test('demoTrack: אורך המסלול = מהירות x זמן, נגמר בנקודת הכלי, והכיוון הכללי הפוך לכיוון התנועה', () => {
  const v = { id: 'vx', lon: 34, lat: 32, speed: 12, course: 90 };
  const t = demoTrack(v, 24);
  assert.deepEqual(t[0].ll, [34, 32]);
  assert.equal(t.length, 24 / 0.25 + 1);
  const { distance: d, avgKnots } = trackStats(t, 24);
  close(avgKnots, 12, 0.05);
  close(d / NM, 12 * 24, 1);
  // הכלי נע מזרחה, ולכן העבר נמצא מערבית לו
  close(Math.abs(((bearing(t[0].ll, t[t.length - 1].ll) - 270 + 540) % 360) - 180), 0, 15);
  assert.ok(distance(t[0].ll, t[t.length - 1].ll) < d + 1);
});
