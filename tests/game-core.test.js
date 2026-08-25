import test from 'node:test';
import assert from 'node:assert/strict';
import {
  circleTouchesRect, gateIsOpen, moveCircle, samplePath, laserIsActive,
  orbPosition, hazardTouchesPlayer, starsForLoops, pathLength
} from '../game-core.js';

test('circle and rectangle collision uses the actual nearest point', () => {
  assert.equal(circleTouchesRect({ x: 15, y: 15 }, 6, { x: 20, y: 10, w: 12, h: 10 }), true);
  assert.equal(circleTouchesRect({ x: 5, y: 5 }, 4, { x: 20, y: 10, w: 12, h: 10 }), false);
});

test('gates require all objectives unless marked as any', () => {
  const active = new Set(['a']);
  assert.equal(gateIsOpen({ requires: ['a', 'b'] }, active), false);
  assert.equal(gateIsOpen({ requires: ['a', 'b'], any: true }, active), true);
});

test('player movement stops at closed geometry and arena bounds', () => {
  const world = { width: 100, height: 100 };
  const result = moveCircle({ x: 35, y: 50 }, { x: 100, y: 0 }, .2, 5, [{ x: 50, y: 0, w: 10, h: 100 }], world);
  assert.equal(result.x, 45);
  assert.equal(result.y, 50);
  const bounded = moveCircle({ x: 8, y: 8 }, { x: -100, y: -100 }, 1, 5, [], world);
  assert.deepEqual(bounded, { x: 5, y: 5 });
});

test('echo path sampling interpolates and holds the final recorded position', () => {
  const path = [{ x: 0, y: 0 }, { x: 10, y: 20 }, { x: 20, y: 40 }];
  assert.deepEqual(samplePath(path, .5, 1), { x: 5, y: 10 });
  assert.deepEqual(samplePath(path, 99, 1), { x: 20, y: 40 });
});

test('hazards follow deterministic timing', () => {
  const laser = { type: 'laser', x: 0, y: 0, w: 100, h: 5, period: 2, on: .5, phase: 0 };
  assert.equal(laserIsActive(laser, .2), true);
  assert.equal(laserIsActive(laser, .8), false);
  assert.equal(hazardTouchesPlayer(laser, { x: 40, y: 2 }, 10, .2), true);
  assert.equal(hazardTouchesPlayer(laser, { x: 40, y: 2 }, 10, .8), false);
  const moving = { type: 'orb', x: 0, y: 0, toX: 100, toY: 0, period: 2, phase: 0, r: 10 };
  assert.deepEqual(orbPosition(moving, 0), { x: 0, y: 0 });
  assert.deepEqual(orbPosition(moving, 1), { x: 100, y: 0 });
});

test('loop ratings and path length are stable', () => {
  assert.equal(starsForLoops(2, 2), 3);
  assert.equal(starsForLoops(3, 2), 2);
  assert.equal(starsForLoops(6, 2), 1);
  assert.equal(pathLength([{ x: 0, y: 0 }, { x: 3, y: 4 }, { x: 6, y: 8 }]), 10);
});

