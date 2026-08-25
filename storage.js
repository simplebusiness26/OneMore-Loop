const STORAGE_KEY = 'one-more-loop-save-v1';

export function freshSave() {
  return {
    version: 1,
    unlocked: 1,
    results: {},
    daily: {},
    rushBest: 0,
    settings: {
      sound: true,
      haptics: true,
      reducedMotion: false
    },
    stats: {
      loopsRecorded: 0,
      roomsCompleted: 0,
      currentLevel: 1
    }
  };
}

function normalise(raw) {
  const defaults = freshSave();
  if (!raw || typeof raw !== 'object') return defaults;
  return {
    version: 1,
    unlocked: Math.max(1, Math.min(24, Number(raw.unlocked) || 1)),
    results: raw.results && typeof raw.results === 'object' ? raw.results : {},
    daily: raw.daily && typeof raw.daily === 'object' ? raw.daily : {},
    rushBest: Math.max(0, Number(raw.rushBest) || 0),
    settings: {
      sound: raw.settings?.sound !== false,
      haptics: raw.settings?.haptics !== false,
      reducedMotion: raw.settings?.reducedMotion === true
    },
    stats: {
      loopsRecorded: Math.max(0, Number(raw.stats?.loopsRecorded) || 0),
      roomsCompleted: Math.max(0, Number(raw.stats?.roomsCompleted) || 0),
      currentLevel: Math.max(1, Math.min(24, Number(raw.stats?.currentLevel) || 1))
    }
  };
}

export function loadSave(storage = globalThis.localStorage) {
  if (!storage) return freshSave();
  try {
    return normalise(JSON.parse(storage.getItem(STORAGE_KEY) || 'null'));
  } catch {
    return freshSave();
  }
}

export function persistSave(save, storage = globalThis.localStorage) {
  if (!storage) return false;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(normalise(save)));
    return true;
  } catch {
    return false;
  }
}

export function campaignStars(save) {
  return Object.values(save.results || {}).reduce((total, result) => total + Math.max(0, Math.min(3, Number(result?.stars) || 0)), 0);
}

export function recordCampaignResult(save, levelId, loops, stars, totalLevels = 24) {
  const id = String(levelId);
  const previous = save.results[id] || {};
  save.results[id] = {
    stars: Math.max(Number(previous.stars) || 0, stars),
    bestLoops: previous.bestLoops ? Math.min(previous.bestLoops, loops) : loops,
    plays: (Number(previous.plays) || 0) + 1
  };
  save.unlocked = Math.max(save.unlocked, Math.min(totalLevels, Number(levelId) + 1));
  save.stats.currentLevel = Math.min(totalLevels, Number(levelId) + 1);
  save.stats.roomsCompleted += 1;
  return save.results[id];
}

export function recordDailyResult(save, dailyKey, loops, stars) {
  const previous = save.daily[dailyKey] || {};
  save.daily[dailyKey] = {
    stars: Math.max(Number(previous.stars) || 0, stars),
    bestLoops: previous.bestLoops ? Math.min(previous.bestLoops, loops) : loops,
    plays: (Number(previous.plays) || 0) + 1
  };
  save.stats.roomsCompleted += 1;
  return save.daily[dailyKey];
}

export function recordRushBest(save, rooms) {
  save.rushBest = Math.max(save.rushBest, Math.max(0, Number(rooms) || 0));
  return save.rushBest;
}

export function addRecordedLoop(save) {
  save.stats.loopsRecorded += 1;
}

export function clearSave(storage = globalThis.localStorage) {
  if (!storage) return freshSave();
  try { storage.removeItem(STORAGE_KEY); } catch { /* Storage can be unavailable in private contexts. */ }
  return freshSave();
}

export const _test = Object.freeze({ STORAGE_KEY, normalise });
