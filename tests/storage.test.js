import test from 'node:test';
import assert from 'node:assert/strict';
import {
  freshSave, loadSave, persistSave, campaignStars, recordCampaignResult,
  recordDailyResult, recordRushBest, clearSave
} from '../storage.js';

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key)
  };
}

test('save data survives a storage round trip', () => {
  const storage = memoryStorage();
  const save = freshSave();
  save.settings.sound = false;
  save.unlocked = 8;
  assert.equal(persistSave(save, storage), true);
  assert.equal(loadSave(storage).settings.sound, false);
  assert.equal(loadSave(storage).unlocked, 8);
});

test('campaign records preserve the best result and unlock sequentially', () => {
  const save = freshSave();
  recordCampaignResult(save, 1, 4, 1);
  recordCampaignResult(save, 1, 2, 3);
  recordCampaignResult(save, 1, 3, 2);
  assert.equal(save.results['1'].bestLoops, 2);
  assert.equal(save.results['1'].stars, 3);
  assert.equal(save.results['1'].plays, 3);
  assert.equal(save.unlocked, 2);
  assert.equal(campaignStars(save), 3);
});

test('daily and rush records only improve', () => {
  const save = freshSave();
  recordDailyResult(save, '2026-08-25', 5, 1);
  recordDailyResult(save, '2026-08-25', 3, 3);
  assert.equal(save.daily['2026-08-25'].bestLoops, 3);
  assert.equal(recordRushBest(save, 7), 7);
  assert.equal(recordRushBest(save, 2), 7);
});

test('clear save returns fresh progress', () => {
  const storage = memoryStorage();
  const save = freshSave();
  save.unlocked = 12;
  persistSave(save, storage);
  const cleared = clearSave(storage);
  assert.equal(cleared.unlocked, 1);
  assert.equal(loadSave(storage).unlocked, 1);
});
