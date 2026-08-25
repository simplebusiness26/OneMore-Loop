import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS, getDailyLevel, getRushLevel, validateLevel, _test } from '../levels.js';

test('campaign contains four complete six-level acts', () => {
  assert.equal(LEVELS.length, 24);
  for (let act = 1; act <= 4; act += 1) assert.equal(LEVELS.filter((level) => level.act === act).length, 6);
});

test('every campaign level passes schema validation', () => {
  for (const level of LEVELS) assert.deepEqual(validateLevel(level), [], `${level.id}: ${level.name}`);
});

test('daily challenge is deterministic for a given local date', () => {
  const date = new Date(2026, 7, 25, 12, 0, 0);
  assert.deepEqual(getDailyLevel(date), getDailyLevel(date));
  assert.match(getDailyLevel(date).id, /^daily-2026-08-25$/);
  assert.deepEqual(validateLevel(getDailyLevel(date)), []);
});

test('rush rooms scale down time but remain valid', () => {
  const first = getRushLevel(1, 42);
  const late = getRushLevel(30, 42);
  assert.ok(first.maxLoops >= first.par);
  assert.ok(late.loopSeconds <= first.loopSeconds);
  assert.ok(late.loopSeconds >= 5.75);
  assert.deepEqual(validateLevel(first), []);
  assert.deepEqual(validateLevel(late), []);
});

test('horizontal level mirroring is reversible', () => {
  const original = LEVELS[11];
  const mirroredTwice = _test.mirrorLevelX(_test.mirrorLevelX(original));
  assert.deepEqual(mirroredTwice, original);
});

