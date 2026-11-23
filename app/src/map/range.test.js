import test from 'node:test';
import assert from 'node:assert/strict';
import { DAY, HOUR, PRESETS, combine, monthCells, rangeLabel, resolveRange, spanLabel, validateRange } from './range.js';

const NOW = new Date(2026, 10, 9, 12, 0).getTime();

test('resolveRange: קיצור 24 שעות אחורה מעכשיו; טווח מוחלט כמות שהוא', () => {
  const r = resolveRange({ preset: 24 }, NOW);
  assert.equal(r.to, NOW);
  assert.equal(r.from, NOW - 24 * HOUR);
  assert.equal(r.hours, 24);
  const c = resolveRange({ from: NOW - 3 * HOUR, to: NOW - HOUR }, NOW);
  assert.equal(c.hours, 2);
});

test('validateRange: from<to, לא בעתיד, עד 30 יום', () => {
  assert.equal(validateRange(NOW - HOUR, NOW, NOW), null);
  assert.match(validateRange(NOW, NOW - HOUR, NOW), /לפני/);
  assert.match(validateRange(NOW, NOW, NOW), /לפני/);
  assert.match(validateRange(NOW - HOUR, NOW + HOUR, NOW), /עתידי/);
  assert.match(validateRange(NOW - 31 * DAY, NOW, NOW), /30 יום/);
  assert.equal(validateRange(NOW - 30 * DAY, NOW, NOW), null);
  assert.match(validateRange(NaN, NOW, NOW), /תאריך/);
});

test('PRESETS: שש אפשרויות כולל 7 ו-30 יום, כולן עוברות אימות', () => {
  assert.deepEqual(PRESETS.map((p) => p.hours), [6, 12, 24, 48, 168, 720]);
  for (const p of PRESETS) assert.equal(validateRange(NOW - p.hours * HOUR, NOW, NOW), null);
});

test('rangeLabel: שני ימים וחצייה, או יום אחד', () => {
  assert.equal(rangeLabel(new Date(2026, 10, 8, 12).getTime(), new Date(2026, 10, 9, 12).getTime()), '08.11 – 09.11.2026');
  assert.equal(rangeLabel(new Date(2026, 10, 9, 1).getTime(), new Date(2026, 10, 9, 5).getTime()), '09.11.2026');
});

test('spanLabel', () => {
  assert.equal(spanLabel(24), '24 שעות');
  assert.equal(spanLabel(1), '1 שעה');
  assert.equal(spanLabel(168), '7 ימים');
  assert.equal(spanLabel(720), '30 ימים');
});

test('monthCells: שבוע מתחיל ביום ראשון (נובמבר 2026 מתחיל ביום ראשון)', () => {
  const cells = monthCells(2026, 10);
  assert.equal(cells[0], new Date(2026, 10, 1).getTime());
  assert.equal(cells.length % 7, 0);
  const feb = monthCells(2026, 1); // 1.2.2026 = יום ראשון
  assert.equal(feb[0], new Date(2026, 1, 1).getTime());
  const dec = monthCells(2026, 11); // 1.12.2026 = יום שלישי: שני תאים ריקים לפני
  assert.equal(dec[0], null);
  assert.equal(dec[1], null);
  assert.equal(dec[2], new Date(2026, 11, 1).getTime());
});

test('combine: תאריך ושעה', () => {
  const d = combine(new Date(2026, 10, 9).getTime(), '13:45');
  assert.equal(new Date(d).getHours(), 13);
  assert.equal(new Date(d).getMinutes(), 45);
});

test('validateRange: תקרה ניתנת להתאמה (ניתוח אזור: 90 יום)', () => {
  assert.equal(validateRange(NOW - 90 * DAY, NOW, NOW, 90), null);
  assert.match(validateRange(NOW - 91 * DAY, NOW, NOW, 90), /90 יום/);
  assert.match(validateRange(NOW - 31 * DAY, NOW, NOW), /30 יום/); // ברירת המחדל לא השתנתה
});
