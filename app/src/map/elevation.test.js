import test from 'node:test';
import assert from 'node:assert/strict';
import { distance, pathLength } from './geodesy.js';
import { elevationAt, profileSamples, profileStats } from './elevation.js';

const close = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} expected ${b} ± ${tol}, got ${a}`);

test('elevationAt: דטרמיניסטי, שלם, ובטווח סביר', () => {
  assert.equal(elevationAt(34, 32), elevationAt(34, 32));
  assert.ok(Number.isInteger(elevationAt(10.5, 40.2)));
  for (let lon = -10; lon <= 60; lon += 7) for (let lat = 10; lat <= 45; lat += 5) assert.ok(Math.abs(elevationAt(lon, lat)) < 2000);
});

test('profileSamples: n+1 דגימות, d עולה מ-0 לאורך הקו, קצוות נכונים', () => {
  const pts = [[30, 31], [33, 33], [36, 32]];
  const s = profileSamples(pts, 50);
  assert.equal(s.length, 51);
  assert.equal(s[0].d, 0);
  close(s[50].d, pathLength(pts), 1e-6);
  for (let i = 1; i < s.length; i++) assert.ok(s[i].d >= s[i - 1].d);
  close(distance(s[0].ll, pts[0]), 0, 1e-6);
  close(distance(s[50].ll, pts[2]), 0, 1);
  assert.equal(s[0].h, elevationAt(30, 31));
});

test('profileSamples: נקודה אחת = דגימה אחת; ללא נקודות = ריק', () => {
  assert.equal(profileSamples([[34, 32]]).length, 1);
  assert.equal(profileSamples([]).length, 0);
});

test('profileStats: מינימום, מקסימום ועלייה מצטברת', () => {
  const st = profileStats(profileSamples([[30, 31], [36, 32]], 40));
  assert.ok(st.max.h >= st.min.h);
  assert.ok(st.ascent >= 0);
  close(st.length, distance([30, 31], [36, 32]), 1);
});
