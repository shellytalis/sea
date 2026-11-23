import test from 'node:test';
import assert from 'node:assert/strict';
import { isSelfIntersecting, pointInPolygon } from './geo.js';

const SQ = [[0, 0], [10, 0], [10, 10], [0, 10]];

test('pointInPolygon: בפנים, בחוץ ועל הגבול (BR-01)', () => {
  assert.equal(pointInPolygon([5, 5], SQ), true);
  assert.equal(pointInPolygon([11, 5], SQ), false);
  assert.equal(pointInPolygon([-0.0001, 5], SQ), false);
  // על צלע, על קודקוד
  assert.equal(pointInPolygon([10, 5], SQ), true);
  assert.equal(pointInPolygon([5, 0], SQ), true);
  assert.equal(pointInPolygon([0, 0], SQ), true);
  assert.equal(pointInPolygon([10, 10], SQ), true);
});

test('pointInPolygon: פוליגון קעור; פחות מ-3 קודקודים אינו מכיל כלום', () => {
  const L = [[0, 0], [10, 0], [10, 4], [4, 4], [4, 10], [0, 10]];
  assert.equal(pointInPolygon([2, 8], L), true);
  assert.equal(pointInPolygon([8, 8], L), false);
  assert.equal(pointInPolygon([4, 7], L), true); // על הצלע הפנימית
  assert.equal(pointInPolygon([1, 1], [[0, 0], [2, 2]]), false);
});

test('isSelfIntersecting: ריבוע תקין לא, פרפר כן', () => {
  assert.equal(isSelfIntersecting(SQ), false);
  assert.equal(isSelfIntersecting([[0, 0], [10, 10], [10, 0], [0, 10]]), true);
});

test('isSelfIntersecting: צלעות נוגעות או חופפות נחשבות חיתוך; משולש ופוליגון קעור תקינים', () => {
  assert.equal(isSelfIntersecting([[0, 0], [10, 0], [5, 5]]), false);
  assert.equal(isSelfIntersecting([[0, 0], [10, 0], [10, 4], [4, 4], [4, 10], [0, 10]]), false);
  // קודקוד שנוגע בצלע שאינה סמוכה לו
  assert.equal(isSelfIntersecting([[0, 0], [10, 0], [10, 10], [5, 0], [0, 10]]), true);
});
