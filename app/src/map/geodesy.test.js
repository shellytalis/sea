import test from 'node:test';
import assert from 'node:assert/strict';
import { EARTH_R, bearing, centroid, circleArea, circlePolygon, destination, distance, greatCircle, pathLength, polygonArea, polygonPerimeter } from './geodesy.js';

const NM = 1852;
const close = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} expected ${b} ± ${tol}, got ${a}`);
const DEG_M = (2 * Math.PI * EARTH_R) / 360;

test('distance: מעלה אחת = 2πR/360', () => {
  close(distance([0, 0], [0, 1]), DEG_M, 1);
  close(distance([0, 0], [1, 0]), DEG_M, 1);
  assert.equal(distance([10, 20], [10, 20]), 0);
});

test('distance: JFK-LHR, כ-5,540 ק"מ', () => {
  close(distance([-73.7781, 40.6413], [-0.4543, 51.47]) / 1000, 5540, 28);
});

test('distance: מעלת אורך ב-60° רוחב = חצי ממעלה במשווה', () => {
  close(distance([0, 60], [1, 60]) / distance([0, 0], [1, 0]), 0.5, 0.002);
});

test('bearing: ארבע רוחות', () => {
  close(bearing([0, 0], [0, 1]), 0, 1e-9);
  close(bearing([0, 0], [1, 0]), 90, 1e-9);
  close(bearing([0, 0], [0, -1]), 180, 1e-9);
  close(bearing([0, 0], [-1, 0]), 270, 1e-9);
});

test('destination: הלוך וחזור שומר מרחק וכיוון', () => {
  const o = [34.5, 31.2];
  for (const [brg, dist] of [[0, 10 * NM], [90, 50 * NM], [215, 123456], [300, 2000000]]) {
    const p = destination(o, brg, dist);
    close(distance(o, p), dist, 0.01, `dist @${brg}`);
    close(bearing(o, p), brg, 1e-6, `brg @${brg}`);
  }
});

test('destination: מעלה מזרחה ממשווה', () => {
  const p = destination([0, 0], 90, DEG_M);
  close(p[0], 1, 1e-9);
  close(p[1], 0, 1e-9);
});

test('greatCircle: קצוות, ואורך מצטבר שווה למרחק הישיר', () => {
  const a = [-73.7781, 40.6413];
  const b = [-0.4543, 51.47];
  const pts = greatCircle(a, b, 64);
  assert.equal(pts.length, 65);
  close(pts[0][0], a[0], 1e-9);
  close(pts[64][1], b[1], 1e-9);
  close(pathLength(pts), distance(a, b), 5);
});

test('polygonArea: 1°x1° במשווה, כ-12,364 קמ"ר', () => {
  close(polygonArea([[0, 0], [1, 0], [1, 1], [0, 1]]) / 1e6, 12364, 40);
});

test('polygonArea: סדר, פתוח/סגור, פחות מ-3 נקודות', () => {
  const sq = [[10, 10], [11, 10], [11, 11], [10, 11]];
  close(polygonArea(sq), polygonArea([...sq].reverse()), 1);
  close(polygonArea(sq), polygonArea([...sq, sq[0]]), 1);
  assert.equal(polygonArea([[0, 0], [1, 1]]), 0);
});

test('polygonPerimeter: ריבוע 1°x1° במשווה, כ-4 מעלות', () => {
  close(polygonPerimeter([[0, 0], [1, 0], [1, 1], [0, 1]]) / 1000, (4 * DEG_M) / 1000, 0.7);
});

test('circlePolygon: רדיוס קבוע, שטח כ-πr², היקף כ-2πr', () => {
  const c = [34.8, 32.1];
  const r = 10 * NM;
  const ring = circlePolygon(c, r, 180);
  assert.deepEqual(ring[0], ring[ring.length - 1]);
  for (const p of ring) close(distance(c, p), r, 0.05);
  const open = ring.slice(0, -1);
  close(polygonArea(open) / circleArea(r), 1, 0.003);
  close(polygonPerimeter(open) / (2 * Math.PI * r), 1, 0.001);
});

test('centroid: ממוצע נקודות', () => {
  assert.deepEqual(centroid([[0, 0], [2, 0], [2, 2], [0, 2]]), [1, 1]);
});
