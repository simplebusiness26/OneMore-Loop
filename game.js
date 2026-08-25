import { WORLD, ACTS, LEVELS, getDailyLevel, getRushLevel, dateKey } from './levels.js';
import {
  TAU, clamp, circleTouchesCircle, gateIsOpen, moveCircle, samplePath,
  hazardTouchesPlayer, laserIsActive, orbPosition, sweepSegment,
  requirementsMet, starsForLoops, formatClock
} from './game-core.js';
import { LoopAudio } from './audio.js';
import {
  loadSave, persistSave, campaignStars, recordCampaignResult, recordDailyResult,
  recordRushBest, addRecordedLoop, clearSave
} from './storage.js';

const $ = (id) => document.getElementById(id);
const STEP = 1 / 60;
const PLAYER_SPEED = 148;
const ECHO_COLORS = ['#45f4ff', '#5d72ff', '#a46bff', '#ff4fd8', '#ffd166', '#64ffb4', '#ff7b72', '#75a7ff'];
const MAX_CAMPAIGN_ECHOES = 9;

const ui = {
  screens: {
    home: $('homeScreen'), campaign: $('campaignScreen'), help: $('helpScreen'), game: $('gameScreen')
  },
  settingsButton: $('settingsButton'), settingsDialog: $('settingsDialog'), soundToggle: $('soundToggle'),
  hapticsToggle: $('hapticsToggle'), motionToggle: $('motionToggle'), resetProgressButton: $('resetProgressButton'),
  confirmReset: $('confirmReset'), confirmResetButton: $('confirmResetButton'), cancelResetButton: $('cancelResetButton'),
  continueButton: $('continueButton'), continueLabel: $('continueLabel'), campaignButton: $('campaignButton'),
  campaignProgress: $('campaignProgress'), dailyButton: $('dailyButton'), dailyStatus: $('dailyStatus'),
  rushButton: $('rushButton'), rushBest: $('rushBest'), howButton: $('howButton'), helpPlayButton: $('helpPlayButton'),
  starTotal: $('starTotal'), completionPercent: $('completionPercent'), nextLevelText: $('nextLevelText'), levelList: $('levelList'),
  gameBackButton: $('gameBackButton'), soundButton: $('soundButton'), modeLabel: $('modeLabel'), levelName: $('levelName'),
  loopNumber: $('loopNumber'), timeFill: $('timeFill'), timeValue: $('timeValue'), timeTrack: document.querySelector('.time-track'),
  arenaFrame: $('arenaFrame'), canvas: $('gameCanvas'), arenaMessage: $('arenaMessage'), rewindFlash: $('rewindFlash'),
  thumbHint: $('thumbHint'), echoPips: $('echoPips'), objectiveText: $('objectiveText'),
  undoButton: $('undoButton'), retryLoopButton: $('retryLoopButton'), restartButton: $('restartButton'),
  briefingOverlay: $('briefingOverlay'), briefingAct: $('briefingAct'), briefingTitle: $('briefingTitle'), briefingHint: $('briefingHint'),
  briefingTime: $('briefingTime'), briefingPar: $('briefingPar'), startLevelButton: $('startLevelButton'),
  pauseOverlay: $('pauseOverlay'), resumeButton: $('resumeButton'), pauseRestartButton: $('pauseRestartButton'), exitButton: $('exitButton'),
  completeOverlay: $('completeOverlay'), completeTitle: $('completeTitle'), resultStars: $('resultStars'), resultLine: $('resultLine'),
  resultLoops: $('resultLoops'), resultBest: $('resultBest'), resultTotal: $('resultTotal'), nextButton: $('nextButton'),
  nextButtonLabel: $('nextButtonLabel'), nextButtonText: $('nextButtonText'), replayButton: $('replayButton'),
  rushOverOverlay: $('rushOverOverlay'), rushOverLine: $('rushOverLine'), rushScore: $('rushScore'),
  rushRecord: $('rushRecord'), rushCombo: $('rushCombo'), rushRetryButton: $('rushRetryButton'), rushExitButton: $('rushExitButton'),
  toast: $('toast'), liveStatus: $('liveStatus')
};

const ctx = ui.canvas.getContext('2d', { alpha: false, desynchronized: true });
const audio = new LoopAudio();
let save = loadSave();
let currentScreen = 'home';
let toastTimer = 0;
let messageTimer = 0;

const game = {
  level: null,
  mode: 'campaign',
  status: 'idle',
  returnScreen: 'home',
  elapsed: 0,
  visualTime: 0,
  player: { x: 0, y: 0 },
  path: [],
  echoes: [],
  echoPositions: [],
  nodesActive: new Set(),
  platesActive: new Set(),
  activeIds: new Set(),
  gateStates: new Map(),
  plateHistory: new Set(),
  particles: [],
  ambientDots: [],
  input: {
    pointerId: null,
    active: false,
    originX: 0,
    originY: 0,
    clientX: 0,
    clientY: 0,
    x: 0,
    y: 0,
    keys: new Set()
  },
  accumulator: 0,
  lastTimestamp: 0,
  transitionAt: 0,
  shake: 0,
  flash: 0,
  firstInput: false,
  result: null,
  rush: {
    stage: 1,
    rooms: 0,
    combo: 0,
    seed: 1
  }
};

function showScreen(name) {
  currentScreen = name;
  for (const [screenName, element] of Object.entries(ui.screens)) {
    element.classList.toggle('active', screenName === name);
  }
  if (name !== 'game') releaseInput();
  if (name === 'home') refreshHome();
  if (name === 'campaign') renderCampaign();
}

function setOverlay(element, visible) {
  element.classList.toggle('visible', visible);
}

function closeGameOverlays() {
  [ui.briefingOverlay, ui.pauseOverlay, ui.completeOverlay, ui.rushOverOverlay].forEach((overlay) => setOverlay(overlay, false));
}

function refreshHome() {
  const stars = campaignStars(save);
  const completed = Object.keys(save.results).length;
  const current = Math.min(LEVELS.length, Math.max(1, save.stats.currentLevel || save.unlocked || 1));
  ui.campaignProgress.textContent = `${stars} / ${LEVELS.length * 3} STARS`;
  ui.continueLabel.textContent = completed > 0 ? `CONTINUE · LEVEL ${String(current).padStart(2, '0')}` : 'BEGIN THE SIGNAL';
  ui.rushBest.textContent = `ENDLESS BEST: ${save.rushBest}`;
  const today = save.daily[dateKey()];
  ui.dailyStatus.textContent = today ? `BEST: ${today.bestLoops} LOOP${today.bestLoops === 1 ? '' : 'S'}` : 'NEW SIGNAL';
  syncSettingsUI();
}

function renderCampaign() {
  ui.levelList.replaceChildren();
  const stars = campaignStars(save);
  const completed = Object.keys(save.results).length;
  ui.starTotal.innerHTML = `${stars} <span>◆</span>`;
  ui.completionPercent.textContent = `${Math.round((completed / LEVELS.length) * 100)}%`;
  const next = LEVELS[Math.min(LEVELS.length - 1, Math.max(0, save.unlocked - 1))];
  ui.nextLevelText.textContent = completed >= LEVELS.length ? 'The full chorus is complete' : `Level ${String(next.id).padStart(2, '0')} · ${next.name}`;

  for (const act of ACTS) {
    const block = document.createElement('section');
    block.className = 'act-block';
    const levels = LEVELS.filter((entry) => entry.act === act.id);
    const actStars = levels.reduce((total, entry) => total + (save.results[String(entry.id)]?.stars || 0), 0);
    const heading = document.createElement('div');
    heading.className = 'act-heading';
    heading.innerHTML = `<div><p>ACT ${roman(act.id)}</p><strong>${act.title}</strong></div><small>${actStars} / ${levels.length * 3} ◆</small>`;
    block.append(heading);

    const grid = document.createElement('div');
    grid.className = 'levels-grid';
    for (const level of levels) {
      const result = save.results[String(level.id)];
      const unlocked = level.id <= save.unlocked;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `level-button${result ? ' completed' : ''}${unlocked && !result && level.id === save.unlocked ? ' current' : ''}`;
      button.disabled = !unlocked;
      button.setAttribute('aria-label', unlocked ? `Level ${level.id}, ${level.name}, ${result?.stars || 0} stars` : `Level ${level.id} locked`);
      const starMarkup = [1, 2, 3].map((star) => `<i class="${(result?.stars || 0) >= star ? 'on' : ''}">◆</i>`).join('');
      button.innerHTML = `<span>${String(level.id).padStart(2, '0')}</span><strong>${level.name}</strong><span class="level-stars">${starMarkup}</span>${unlocked ? '' : '<i class="level-lock">◇</i>'}`;
      if (unlocked) button.addEventListener('click', () => openLevel(level, 'campaign'));
      grid.append(button);
    }
    block.append(grid);
    ui.levelList.append(block);
  }
}

function roman(value) {
  return ['I', 'II', 'III', 'IV'][value - 1] || String(value);
}

function modeDescription() {
  if (game.mode === 'daily') return `DAILY · ${game.level.dailyKey}`;
  if (game.mode === 'rush') return `SYNC RUSH · ${String(game.rush.stage).padStart(2, '0')}`;
  return `CAMPAIGN · ${String(game.level.id).padStart(2, '0')}`;
}

function openLevel(level, mode = 'campaign', options = {}) {
  game.level = level;
  game.mode = mode;
  game.returnScreen = mode === 'campaign' ? 'campaign' : 'home';
  game.status = 'briefing';
  game.result = null;
  game.echoes = [];
  game.visualTime = 0;
  closeGameOverlays();
  initialiseRoom();
  populateBriefing();
  showScreen('game');
  setOverlay(ui.briefingOverlay, options.skipBriefing !== true);
  if (options.skipBriefing) beginLevel();
  else ui.startLevelButton.focus({ preventScroll: true });
}

function populateBriefing() {
  const act = ACTS[(game.level.act || 1) - 1];
  ui.briefingAct.textContent = game.mode === 'daily'
    ? `DAILY SIGNAL · ${game.level.dailyKey}`
    : game.mode === 'rush'
      ? `SYNC RUSH · ROOM ${String(game.rush.stage).padStart(2, '0')}`
      : `ACT ${roman(game.level.act)} · ${act.title}`;
  ui.briefingTitle.textContent = game.level.name;
  ui.briefingHint.textContent = game.level.hint;
  ui.briefingTime.textContent = `${game.level.loopSeconds.toFixed(game.level.loopSeconds % 1 ? 1 : 0)} SEC`;
  ui.briefingPar.textContent = game.mode === 'rush'
    ? `${game.level.maxLoops} MAX`
    : `${game.level.par} LOOP${game.level.par === 1 ? '' : 'S'}`;
  ui.modeLabel.textContent = modeDescription();
  ui.levelName.textContent = game.level.name;
  ui.objectiveText.textContent = game.level.objective;
}

function initialiseRoom() {
  game.echoes = [];
  game.nodesActive = new Set();
  game.platesActive = new Set();
  game.activeIds = new Set();
  game.gateStates = new Map(game.level.gates.map((gate) => [gate.id, false]));
  game.plateHistory = new Set();
  game.particles = [];
  game.shake = 0;
  game.flash = 0;
  seedAmbientDots();
  resetCurrentLoop(true);
  updateEchoPips();
  syncHud();
}

function seedAmbientDots() {
  game.ambientDots = Array.from({ length: 30 }, (_, index) => ({
    x: ((index * 97 + 23) % 347) + 6,
    y: ((index * 163 + 41) % 580) + 10,
    size: .5 + ((index * 13) % 7) / 7,
    phase: (index * .73) % TAU
  }));
}

function beginLevel() {
  closeGameOverlays();
  game.status = 'playing';
  resetCurrentLoop(true);
  game.lastTimestamp = performance.now();
  game.accumulator = 0;
  audio.ensure();
  audio.resetSequence();
  audio.sfx('start');
  vibrate(18);
  announce(`${game.level.name}. Loop one started.`);
}

function resetCurrentLoop(silent = false) {
  game.elapsed = 0;
  game.player = { x: game.level.start.x, y: game.level.start.y };
  game.path = [{ ...game.player }];
  game.nodesActive = new Set();
  game.platesActive = new Set();
  game.activeIds = new Set();
  game.plateHistory = new Set();
  game.echoPositions = game.echoes.map(() => ({ ...game.level.start }));
  game.firstInput = false;
  game.flash = 0;
  game.gateStates = new Map(game.level.gates.map((gate) => [gate.id, false]));
  releaseInput();
  audio.resetSequence();
  if (!silent) {
    audio.sfx('retry');
    showArenaMessage('CURRENT LOOP RETRIED');
    vibrate(10);
  }
  syncHud();
}

function retryCurrentLoop() {
  if (!['playing', 'fault'].includes(game.status)) return;
  game.status = 'playing';
  resetCurrentLoop();
}

function recordCurrentLoop() {
  if (game.status !== 'playing') return;
  if (game.mode === 'rush' && game.echoes.length + 1 >= game.level.maxLoops) {
    finishRush();
    return;
  }
  if (game.mode !== 'rush' && game.echoes.length >= MAX_CAMPAIGN_ECHOES) {
    resetCurrentLoop(true);
    showArenaMessage('ECHO LIMIT · UNDO A ROUTE');
    toast('UNDO AN ECHO TO KEEP BUILDING');
    return;
  }
  const finalPoint = game.path[game.path.length - 1] || game.level.start;
  const expectedFrames = Math.ceil(game.level.loopSeconds / STEP) + 1;
  while (game.path.length < expectedFrames) game.path.push({ ...finalPoint });
  game.echoes.push({
    path: game.path.map((point) => ({ x: Math.round(point.x * 10) / 10, y: Math.round(point.y * 10) / 10 })),
    color: ECHO_COLORS[game.echoes.length % ECHO_COLORS.length]
  });
  addRecordedLoop(save);
  persistSave(save);
  game.status = 'rewinding';
  game.transitionAt = performance.now() + (save.settings.reducedMotion ? 170 : 470);
  ui.rewindFlash.classList.remove('show');
  void ui.rewindFlash.offsetWidth;
  ui.rewindFlash.classList.add('show');
  audio.sfx('rewind', game.level.theme);
  vibrate([18, 22, 32]);
  updateEchoPips();
  announce(`Loop recorded. ${game.echoes.length} echo${game.echoes.length === 1 ? '' : 'es'} active.`);
}

function finishRewind() {
  ui.rewindFlash.classList.remove('show');
  game.status = 'playing';
  resetCurrentLoop(true);
  showArenaMessage(`ECHO ${String(game.echoes.length).padStart(2, '0')} ONLINE`);
}

function undoEcho() {
  if (game.status !== 'playing' || game.echoes.length === 0) return;
  game.echoes.pop();
  audio.sfx('undo');
  vibrate(12);
  resetCurrentLoop(true);
  updateEchoPips();
  showArenaMessage('NEWEST ECHO REMOVED');
  announce('Newest echo removed.');
}

function restartRoom() {
  if (!game.level) return;
  initialiseRoom();
  game.status = 'playing';
  audio.sfx('retry');
  showArenaMessage('ROOM RESET');
  announce('Room reset. Loop one started.');
}

function pauseGame() {
  if (game.status !== 'playing') return;
  game.status = 'paused';
  releaseInput();
  setOverlay(ui.pauseOverlay, true);
  ui.resumeButton.focus({ preventScroll: true });
}

function resumeGame() {
  if (game.status !== 'paused') return;
  setOverlay(ui.pauseOverlay, false);
  game.status = 'playing';
  game.lastTimestamp = performance.now();
  game.accumulator = 0;
  audio.ensure();
}

function exitGame() {
  closeGameOverlays();
  game.status = 'idle';
  game.level = null;
  releaseInput();
  showScreen(game.returnScreen || 'home');
}

function update(deltaSeconds) {
  if (game.status !== 'playing' || !game.level) return;
  game.visualTime += deltaSeconds;
  game.elapsed = Math.min(game.level.loopSeconds, game.elapsed + deltaSeconds);

  const velocity = inputVelocity();
  if (Math.abs(velocity.x) + Math.abs(velocity.y) > .05) {
    game.firstInput = true;
    ui.thumbHint.style.display = 'none';
  }

  const closedGates = game.level.gates.filter((gate) => !game.gateStates.get(gate.id));
  const solids = [...game.level.walls, ...closedGates];
  game.player = moveCircle(
    game.player,
    { x: velocity.x * PLAYER_SPEED, y: velocity.y * PLAYER_SPEED },
    deltaSeconds,
    WORLD.playerRadius,
    solids,
    WORLD
  );
  game.path.push({ ...game.player });

  game.echoPositions = game.echoes
    .map((echo) => samplePath(echo.path, game.elapsed, STEP))
    .filter(Boolean);

  evaluateObjectives();
  updateParticles(deltaSeconds);
  maybeEmitTrail();

  if (game.elapsed > .32) {
    const contact = game.level.hazards.some((hazard) => hazardTouchesPlayer(hazard, game.player, WORLD.playerRadius, game.elapsed));
    if (contact) {
      faultCurrentLoop();
      return;
    }
  }

  const portalReady = requirementsMet(game.level.requires, game.activeIds);
  if (portalReady && circleTouchesCircle(game.player, WORLD.playerRadius, game.level.exit, game.level.exit.r - 2)) {
    beginCompletion();
    return;
  }

  const beatIndex = Math.floor(game.elapsed / .5);
  audio.beat(beatIndex, game.echoes.length, 1 - (game.level.loopSeconds - game.elapsed) / game.level.loopSeconds);

  if (game.elapsed >= game.level.loopSeconds - STEP * .5) recordCurrentLoop();
  syncHud();
}

function evaluateObjectives() {
  const actors = [game.player, ...game.echoPositions];
  const previousPlates = game.platesActive;
  game.platesActive = new Set();

  for (const plate of game.level.plates) {
    if (actors.some((actor) => circleTouchesCircle(actor, WORLD.playerRadius, plate, plate.r - 2))) {
      game.platesActive.add(plate.id);
      if (!game.plateHistory.has(plate.id)) {
        game.plateHistory.add(plate.id);
        audio.sfx('plate', plate.color);
        burst(plate.x, plate.y, plate.color, 11, 45);
        vibrate(7);
      }
    }
  }

  for (const signal of game.level.nodes) {
    if (game.nodesActive.has(signal.id)) continue;
    if (actors.some((actor) => circleTouchesCircle(actor, WORLD.playerRadius, signal, signal.r + 2))) {
      game.nodesActive.add(signal.id);
      audio.sfx('node', signal.color);
      burst(signal.x, signal.y, signal.color, 18, 68);
      game.flash = Math.max(game.flash, .24);
      vibrate(13);
      showArenaMessage('SIGNAL LOCKED');
    }
  }

  game.activeIds = new Set([...game.platesActive, ...game.nodesActive]);
  for (const gate of game.level.gates) {
    const wasOpen = game.gateStates.get(gate.id) === true;
    const isOpen = gateIsOpen(gate, game.activeIds);
    game.gateStates.set(gate.id, isOpen);
    if (!wasOpen && isOpen) {
      audio.sfx('gate', gate.color);
      burst(gate.x + gate.w / 2, gate.y + gate.h / 2, gate.color, 12, 36);
    }
  }

  if (previousPlates.size > game.platesActive.size && game.platesActive.size === 0) {
    // The visual fade communicates release without adding another sound on every crossing.
    game.flash = Math.max(game.flash, .03);
  }
}

function faultCurrentLoop() {
  if (game.mode === 'rush') {
    finishRush();
    return;
  }
  game.status = 'fault';
  game.transitionAt = performance.now() + (save.settings.reducedMotion ? 180 : 390);
  game.shake = save.settings.reducedMotion ? 0 : 8;
  game.flash = .8;
  releaseInput();
  audio.sfx('fault');
  vibrate([35, 30, 25]);
  showArenaMessage('CURRENT LOOP RETRIED');
  announce('Hazard touched. Only the current loop will restart.');
}

function finishFault() {
  game.status = 'playing';
  resetCurrentLoop(true);
}

function beginCompletion() {
  if (game.status !== 'playing') return;
  game.status = 'completing';
  game.transitionAt = performance.now() + (save.settings.reducedMotion ? 220 : 690);
  game.flash = .55;
  burst(game.level.exit.x, game.level.exit.y, game.level.theme, 42, 100);
  audio.sfx('complete', game.level.theme);
  vibrate([24, 35, 24, 35, 55]);
  releaseInput();
}

function finishCompletion() {
  const loops = game.echoes.length + 1;
  if (game.mode === 'rush') {
    game.rush.rooms += 1;
    game.rush.combo += Math.max(0, game.level.maxLoops - loops);
    recordRushBest(save, game.rush.rooms);
    save.stats.roomsCompleted += 1;
    persistSave(save);
    game.rush.stage += 1;
    const next = getRushLevel(game.rush.stage, game.rush.seed);
    openLevel(next, 'rush', { skipBriefing: true });
    showArenaMessage(`ROOM ${String(game.rush.rooms).padStart(2, '0')} SYNCED · KEEP MOVING`);
    return;
  }

  const stars = starsForLoops(loops, game.level.par);
  let bestLoops = loops;
  if (game.mode === 'daily') {
    const result = recordDailyResult(save, game.level.dailyKey, loops, stars);
    bestLoops = result.bestLoops;
  } else {
    const result = recordCampaignResult(save, game.level.id, loops, stars, LEVELS.length);
    bestLoops = result.bestLoops;
  }
  persistSave(save);
  game.result = { loops, stars, bestLoops };
  game.status = 'complete';
  populateResults();
  setOverlay(ui.completeOverlay, true);
  ui.nextButton.focus({ preventScroll: true });
  announce(`Room complete in ${loops} loop${loops === 1 ? '' : 's'}. ${stars} stars earned.`);
}

function populateResults() {
  const { loops, stars, bestLoops } = game.result;
  const labels = ['SIGNAL FOUND', 'SYNC ESTABLISHED', 'PERFECT CHORUS'];
  ui.completeTitle.textContent = labels[stars - 1];
  [...ui.resultStars.children].forEach((star, index) => star.classList.toggle('on', index < stars));
  ui.resultLine.textContent = loops <= game.level.par
    ? `Perfect target reached in ${loops} loop${loops === 1 ? '' : 's'}.`
    : `Completed in ${loops} loops. Perfect target: ${game.level.par}.`;
  ui.resultLoops.textContent = String(loops);
  ui.resultBest.textContent = String(bestLoops);
  ui.resultTotal.textContent = game.mode === 'daily' ? `${stars}◆` : `${campaignStars(save)}◆`;
  if (game.mode === 'daily') {
    ui.nextButtonLabel.textContent = 'DAILY COMPLETE';
    ui.nextButtonText.textContent = 'BACK TO MENU';
  } else if (Number(game.level.id) >= LEVELS.length) {
    ui.nextButtonLabel.textContent = 'CAMPAIGN COMPLETE';
    ui.nextButtonText.textContent = 'LEVEL SELECT';
  } else {
    ui.nextButtonLabel.textContent = 'NEXT SIGNAL';
    ui.nextButtonText.textContent = `LEVEL ${String(Number(game.level.id) + 1).padStart(2, '0')}`;
  }
}

function goNext() {
  if (game.mode === 'daily') {
    game.status = 'idle';
    showScreen('home');
    return;
  }
  const next = LEVELS[Number(game.level.id)];
  if (!next) {
    game.status = 'idle';
    showScreen('campaign');
    return;
  }
  openLevel(next, 'campaign');
}

function replayRoom() {
  const replayLevel = game.level;
  const replayMode = game.mode;
  openLevel(replayLevel, replayMode);
}

function startDaily() {
  openLevel(getDailyLevel(), 'daily');
}

function startRush() {
  game.rush = {
    stage: 1,
    rooms: 0,
    combo: 0,
    seed: Math.floor(Date.now() / 1000) % 1000000
  };
  openLevel(getRushLevel(1, game.rush.seed), 'rush');
}

function finishRush() {
  if (game.status === 'rush-over') return;
  game.status = 'rush-over';
  releaseInput();
  audio.sfx('fault');
  vibrate([40, 35, 50]);
  const best = recordRushBest(save, game.rush.rooms);
  persistSave(save);
  ui.rushOverLine.textContent = game.rush.rooms === 0
    ? 'The first room held the signal. Read it, then go again.'
    : `You synchronised ${game.rush.rooms} room${game.rush.rooms === 1 ? '' : 's'} before the signal broke.`;
  ui.rushScore.textContent = String(game.rush.rooms);
  ui.rushRecord.textContent = String(best);
  ui.rushCombo.textContent = String(game.rush.combo);
  setOverlay(ui.rushOverOverlay, true);
  ui.rushRetryButton.focus({ preventScroll: true });
}

function inputVelocity() {
  let x = game.input.x;
  let y = game.input.y;
  if (game.input.keys.has('ArrowLeft') || game.input.keys.has('KeyA')) x -= 1;
  if (game.input.keys.has('ArrowRight') || game.input.keys.has('KeyD')) x += 1;
  if (game.input.keys.has('ArrowUp') || game.input.keys.has('KeyW')) y -= 1;
  if (game.input.keys.has('ArrowDown') || game.input.keys.has('KeyS')) y += 1;
  const magnitude = Math.hypot(x, y);
  if (magnitude > 1) return { x: x / magnitude, y: y / magnitude };
  return { x, y };
}

function pointerDown(event) {
  if (game.status !== 'playing' || game.input.pointerId !== null) return;
  event.preventDefault();
  game.input.pointerId = event.pointerId;
  game.input.active = true;
  game.input.originX = event.clientX;
  game.input.originY = event.clientY;
  game.input.clientX = event.clientX;
  game.input.clientY = event.clientY;
  game.input.x = 0;
  game.input.y = 0;
  ui.canvas.setPointerCapture?.(event.pointerId);
  audio.ensure();
}

function pointerMove(event) {
  if (event.pointerId !== game.input.pointerId) return;
  event.preventDefault();
  game.input.clientX = event.clientX;
  game.input.clientY = event.clientY;
  const dx = event.clientX - game.input.originX;
  const dy = event.clientY - game.input.originY;
  const magnitude = Math.hypot(dx, dy);
  const deadZone = 5;
  if (magnitude <= deadZone) {
    game.input.x = 0;
    game.input.y = 0;
    return;
  }
  const strength = clamp((magnitude - deadZone) / 35, 0, 1);
  game.input.x = (dx / magnitude) * strength;
  game.input.y = (dy / magnitude) * strength;
}

function pointerUp(event) {
  if (event.pointerId !== game.input.pointerId) return;
  event.preventDefault();
  releaseInput();
}

function releaseInput() {
  game.input.pointerId = null;
  game.input.active = false;
  game.input.x = 0;
  game.input.y = 0;
}

function updateEchoPips() {
  ui.echoPips.replaceChildren();
  game.echoes.forEach((echo, index) => {
    const pip = document.createElement('i');
    pip.style.color = echo.color || ECHO_COLORS[index % ECHO_COLORS.length];
    ui.echoPips.append(pip);
  });
  const live = document.createElement('i');
  live.style.color = '#ffffff';
  ui.echoPips.append(live);
  ui.undoButton.disabled = game.echoes.length === 0;
}

function syncHud() {
  if (!game.level) return;
  const remaining = Math.max(0, game.level.loopSeconds - game.elapsed);
  const progress = clamp(remaining / game.level.loopSeconds, 0, 1);
  ui.loopNumber.textContent = String(game.echoes.length + 1).padStart(2, '0');
  ui.timeValue.textContent = formatClock(remaining);
  ui.timeFill.style.transform = `scaleX(${progress})`;
  ui.timeTrack.classList.toggle('danger', remaining <= 1.5);
  document.body.classList.toggle('high-danger', currentScreen === 'game' && game.status === 'playing' && remaining <= 1.5);
}

function showArenaMessage(message, duration = 1250) {
  ui.arenaMessage.textContent = message;
  ui.arenaMessage.classList.add('show');
  clearTimeout(messageTimer);
  messageTimer = setTimeout(() => ui.arenaMessage.classList.remove('show'), duration);
}

function toast(message, duration = 1800) {
  ui.toast.textContent = message;
  ui.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ui.toast.classList.remove('show'), duration);
}

function announce(message) {
  ui.liveStatus.textContent = '';
  requestAnimationFrame(() => { ui.liveStatus.textContent = message; });
}

function vibrate(pattern) {
  if (!save.settings.haptics) return;
  navigator.vibrate?.(pattern);
}

function burst(x, y, color, count = 10, speed = 45) {
  const limitedCount = save.settings.reducedMotion ? Math.ceil(count * .35) : count;
  for (let index = 0; index < limitedCount; index += 1) {
    const angle = (index / limitedCount) * TAU + Math.random() * .35;
    const velocity = speed * (.45 + Math.random() * .72);
    game.particles.push({
      x, y,
      vx: Math.cos(angle) * velocity,
      vy: Math.sin(angle) * velocity,
      life: .4 + Math.random() * .45,
      maxLife: .85,
      size: 1.2 + Math.random() * 2.4,
      color
    });
  }
}

function maybeEmitTrail() {
  if (save.settings.reducedMotion || game.path.length % 4 !== 0) return;
  game.particles.push({
    x: game.player.x,
    y: game.player.y,
    vx: 0,
    vy: 4,
    life: .23,
    maxLife: .23,
    size: 2.4,
    color: '#ffffff'
  });
}

function updateParticles(deltaSeconds) {
  for (const particle of game.particles) {
    particle.x += particle.vx * deltaSeconds;
    particle.y += particle.vy * deltaSeconds;
    particle.vx *= .96;
    particle.vy *= .96;
    particle.life -= deltaSeconds;
  }
  game.particles = game.particles.filter((particle) => particle.life > 0).slice(-220);
  game.shake *= .86;
  game.flash *= .9;
}

function resizeCanvas() {
  const dpr = clamp(window.devicePixelRatio || 1, 1, 2.5);
  ui.canvas.width = Math.round(WORLD.width * dpr);
  ui.canvas.height = Math.round(WORLD.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function render() {
  if (!game.level || currentScreen !== 'game') return;
  ctx.save();
  const shakeX = save.settings.reducedMotion ? 0 : (Math.random() - .5) * game.shake;
  const shakeY = save.settings.reducedMotion ? 0 : (Math.random() - .5) * game.shake;
  ctx.translate(shakeX, shakeY);
  drawArenaBackground();
  drawHazards();
  drawWalls();
  drawGates();
  drawObjectives();
  drawPortal();
  drawEchoes();
  drawPlayer();
  drawParticles();
  drawJoystick();
  if (game.flash > .01) {
    ctx.fillStyle = rgba(game.level.theme, Math.min(.12, game.flash * .12));
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);
  }
  ctx.restore();
}

function drawArenaBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, WORLD.height);
  gradient.addColorStop(0, '#080a1b');
  gradient.addColorStop(.56, '#060817');
  gradient.addColorStop(1, '#050611');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);

  ctx.save();
  ctx.strokeStyle = rgba('#6b80b4', .07);
  ctx.lineWidth = .7;
  const drift = (game.visualTime * 5) % 30;
  for (let x = -30 + drift; x <= WORLD.width + 30; x += 30) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, WORLD.height); ctx.stroke();
  }
  for (let y = 0; y <= WORLD.height; y += 30) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(WORLD.width, y); ctx.stroke();
  }
  ctx.restore();

  for (const dot of game.ambientDots) {
    const alpha = .08 + (Math.sin(game.visualTime * 1.3 + dot.phase) + 1) * .035;
    ctx.fillStyle = rgba(game.level.theme, alpha);
    ctx.fillRect(dot.x, dot.y, dot.size, dot.size);
  }

  const edge = ctx.createRadialGradient(WORLD.width / 2, WORLD.height / 2, 90, WORLD.width / 2, WORLD.height / 2, 360);
  edge.addColorStop(0, 'rgba(0,0,0,0)');
  edge.addColorStop(1, 'rgba(0,0,0,.46)');
  ctx.fillStyle = edge;
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);
}

function drawWalls() {
  for (const wall of game.level.walls) {
    ctx.save();
    roundedRect(wall.x, wall.y, wall.w, wall.h, Math.min(5, wall.h / 2));
    ctx.fillStyle = '#151b32';
    ctx.fill();
    ctx.strokeStyle = 'rgba(129,151,205,.25)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.045)';
    ctx.fillRect(wall.x + 4, wall.y + 2, Math.max(0, wall.w - 8), 1);
    ctx.restore();
  }
}

function drawGates() {
  for (const gate of game.level.gates) {
    const open = game.gateStates.get(gate.id) === true;
    ctx.save();
    if (open) {
      ctx.strokeStyle = rgba(gate.color, .23);
      ctx.setLineDash([5, 7]);
      ctx.strokeRect(gate.x + .5, gate.y + .5, gate.w - 1, gate.h - 1);
    } else {
      ctx.shadowColor = gate.color;
      ctx.shadowBlur = 12;
      const gradient = ctx.createLinearGradient(gate.x, gate.y, gate.x + gate.w, gate.y + gate.h);
      gradient.addColorStop(0, rgba(gate.color, .18));
      gradient.addColorStop(.5, rgba(gate.color, .62));
      gradient.addColorStop(1, rgba(gate.color, .18));
      ctx.fillStyle = gradient;
      ctx.fillRect(gate.x, gate.y, gate.w, gate.h);
      ctx.shadowBlur = 0;
      ctx.strokeStyle = rgba(gate.color, .9);
      ctx.lineWidth = 1;
      for (let x = gate.x + 8; x < gate.x + gate.w; x += 18) {
        ctx.beginPath(); ctx.moveTo(x, gate.y + 2); ctx.lineTo(x + 6, gate.y + gate.h - 2); ctx.stroke();
      }
    }
    ctx.restore();
  }
}

function drawObjectives() {
  for (const plate of game.level.plates) {
    const active = game.platesActive.has(plate.id);
    const pulse = 1 + Math.sin(game.visualTime * 4 + plate.x) * .05;
    ctx.save();
    ctx.translate(plate.x, plate.y);
    ctx.scale(pulse, pulse);
    ctx.beginPath(); ctx.arc(0, 0, plate.r + 5, 0, TAU);
    ctx.fillStyle = rgba(plate.color, active ? .13 : .025); ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0, plate.r, 0, TAU);
    ctx.fillStyle = active ? rgba(plate.color, .26) : 'rgba(12,17,33,.84)'; ctx.fill();
    ctx.strokeStyle = rgba(plate.color, active ? .95 : .38); ctx.lineWidth = active ? 2 : 1; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, plate.r - 7, 0, TAU);
    ctx.strokeStyle = rgba(plate.color, active ? .72 : .19); ctx.stroke();
    if (active) {
      ctx.shadowColor = plate.color; ctx.shadowBlur = 16;
      ctx.fillStyle = plate.color; ctx.beginPath(); ctx.arc(0, 0, 3, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  for (const signal of game.level.nodes) {
    const active = game.nodesActive.has(signal.id);
    ctx.save();
    ctx.translate(signal.x, signal.y);
    ctx.rotate(game.visualTime * (active ? 1.7 : .65));
    ctx.shadowColor = signal.color;
    ctx.shadowBlur = active ? 20 : 8;
    ctx.strokeStyle = rgba(signal.color, active ? 1 : .55);
    ctx.fillStyle = rgba(signal.color, active ? .3 : .055);
    polygon(6, signal.r, Math.PI / 6);
    ctx.fill(); ctx.stroke();
    ctx.rotate(-game.visualTime * 2.6);
    polygon(4, signal.r * .47, Math.PI / 4);
    ctx.fillStyle = active ? '#ffffff' : rgba(signal.color, .7);
    ctx.fill();
    ctx.restore();
  }
}

function drawPortal() {
  const portal = game.level.exit;
  const ready = requirementsMet(game.level.requires, game.activeIds);
  const color = ready ? game.level.theme : '#66708b';
  ctx.save();
  ctx.translate(portal.x, portal.y);
  ctx.rotate(game.visualTime * (ready ? 1.2 : .3));
  ctx.shadowColor = color;
  ctx.shadowBlur = ready ? 22 : 5;
  ctx.strokeStyle = rgba(color, ready ? .9 : .35);
  ctx.lineWidth = ready ? 2 : 1;
  ctx.setLineDash([7, 5]);
  ctx.beginPath(); ctx.arc(0, 0, portal.r, 0, TAU); ctx.stroke();
  ctx.rotate(-game.visualTime * 2.1);
  ctx.setLineDash([3, 7]);
  ctx.beginPath(); ctx.arc(0, 0, portal.r - 7, 0, TAU); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = rgba(color, ready ? .2 : .045);
  ctx.beginPath(); ctx.arc(0, 0, portal.r - 10, 0, TAU); ctx.fill();
  if (ready) {
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(0, 0, 3.2, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

function drawHazards() {
  for (const hazard of game.level.hazards) {
    if (hazard.type === 'laser') drawLaser(hazard);
    if (hazard.type === 'orb') drawOrb(hazard);
    if (hazard.type === 'sweep') drawSweep(hazard);
  }
}

function drawLaser(hazard) {
  const active = laserIsActive(hazard, game.elapsed);
  ctx.save();
  ctx.fillStyle = rgba(hazard.color, active ? .65 : .055);
  if (active) { ctx.shadowColor = hazard.color; ctx.shadowBlur = 14; }
  ctx.fillRect(hazard.x, hazard.y, hazard.w, hazard.h);
  ctx.shadowBlur = 0;
  ctx.strokeStyle = rgba(hazard.color, active ? .92 : .22);
  ctx.lineWidth = active ? 1.2 : .7;
  ctx.strokeRect(hazard.x, hazard.y, hazard.w, hazard.h);
  if (!active) {
    const edge = hazard.w > hazard.h ? hazard.x + hazard.w * .5 : hazard.x + hazard.w * .5;
    const centerY = hazard.y + hazard.h * .5;
    ctx.fillStyle = rgba(hazard.color, .46);
    ctx.beginPath(); ctx.arc(edge, centerY, 2, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

function drawOrb(hazard) {
  const position = orbPosition(hazard, game.elapsed);
  ctx.save();
  ctx.strokeStyle = rgba(hazard.color, .12);
  ctx.setLineDash([3, 7]);
  ctx.beginPath(); ctx.moveTo(hazard.x, hazard.y); ctx.lineTo(hazard.toX, hazard.toY); ctx.stroke();
  ctx.setLineDash([]);
  ctx.translate(position.x, position.y);
  ctx.shadowColor = hazard.color; ctx.shadowBlur = 16;
  ctx.fillStyle = rgba(hazard.color, .25);
  ctx.beginPath(); ctx.arc(0, 0, hazard.r + 4, 0, TAU); ctx.fill();
  ctx.fillStyle = hazard.color;
  ctx.beginPath(); ctx.arc(0, 0, hazard.r * .58, 0, TAU); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(0, 0, 2.5, 0, TAU); ctx.fill();
  ctx.restore();
}

function drawSweep(hazard) {
  const segment = sweepSegment(hazard, game.elapsed);
  ctx.save();
  ctx.strokeStyle = rgba(hazard.color, .12);
  ctx.beginPath(); ctx.arc(hazard.cx, hazard.cy, hazard.length, 0, TAU); ctx.stroke();
  ctx.shadowColor = hazard.color; ctx.shadowBlur = 12;
  ctx.strokeStyle = rgba(hazard.color, .72);
  ctx.lineWidth = hazard.width;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(segment.ax, segment.ay); ctx.lineTo(segment.bx, segment.by); ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(hazard.cx, hazard.cy, 4, 0, TAU); ctx.fill();
  ctx.restore();
}

function drawEchoes() {
  game.echoes.forEach((echo, echoIndex) => {
    const color = echo.color || ECHO_COLORS[echoIndex % ECHO_COLORS.length];
    const frameIndex = clamp(Math.floor(game.elapsed / STEP), 0, echo.path.length - 1);
    ctx.save();
    ctx.globalAlpha = .16 + echoIndex * .018;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    const start = Math.max(0, frameIndex - 105);
    for (let index = start; index <= frameIndex; index += 4) {
      const point = echo.path[index];
      if (!point) continue;
      if (index === start) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    }
    ctx.stroke();
    ctx.restore();
    const position = game.echoPositions[echoIndex];
    if (position) drawRunner(position, color, .46, echoIndex * .15);
  });
}

function drawPlayer() {
  drawRunner(game.player, '#ffffff', 1, 0);
}

function drawRunner(position, color, alpha, phase) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(position.x, position.y);
  ctx.rotate(game.visualTime * 1.5 + phase);
  ctx.shadowColor = color;
  ctx.shadowBlur = alpha > .8 ? 20 : 11;
  ctx.fillStyle = rgba(color, alpha > .8 ? .19 : .1);
  roundedRect(-10, -10, 20, 20, 5);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = alpha > .8 ? 1.8 : 1.1;
  ctx.stroke();
  ctx.rotate(-game.visualTime * 3);
  ctx.fillStyle = color;
  roundedRect(-3.6, -3.6, 7.2, 7.2, 2);
  ctx.fill();
  ctx.restore();
}

function drawParticles() {
  for (const particle of game.particles) {
    const alpha = clamp(particle.life / particle.maxLife, 0, 1);
    ctx.fillStyle = rgba(particle.color, alpha * .85);
    ctx.beginPath(); ctx.arc(particle.x, particle.y, particle.size * alpha, 0, TAU); ctx.fill();
  }
}

function drawJoystick() {
  if (!game.input.active || game.status !== 'playing') return;
  const rect = ui.canvas.getBoundingClientRect();
  const scaleX = WORLD.width / rect.width;
  const scaleY = WORLD.height / rect.height;
  const originX = (game.input.originX - rect.left) * scaleX;
  const originY = (game.input.originY - rect.top) * scaleY;
  const dx = clamp(game.input.clientX - game.input.originX, -42, 42) * scaleX;
  const dy = clamp(game.input.clientY - game.input.originY, -42, 42) * scaleY;
  ctx.save();
  ctx.strokeStyle = 'rgba(69,244,255,.28)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(originX, originY, 25, 0, TAU); ctx.stroke();
  ctx.fillStyle = 'rgba(69,244,255,.18)';
  ctx.beginPath(); ctx.arc(originX + dx, originY + dy, 9, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(69,244,255,.7)'; ctx.stroke();
  ctx.restore();
}

function roundedRect(x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function polygon(sides, radius, offset = 0) {
  ctx.beginPath();
  for (let index = 0; index < sides; index += 1) {
    const angle = offset + (index / sides) * TAU;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function rgba(hex, alpha) {
  if (!hex || hex[0] !== '#') return `rgba(255,255,255,${alpha})`;
  const clean = hex.slice(1);
  const value = clean.length === 3
    ? clean.split('').map((digit) => digit + digit).join('')
    : clean.padEnd(6, 'f').slice(0, 6);
  const number = Number.parseInt(value, 16);
  return `rgba(${(number >> 16) & 255},${(number >> 8) & 255},${number & 255},${alpha})`;
}

function frame(timestamp) {
  if (!game.lastTimestamp) game.lastTimestamp = timestamp;
  const realDelta = Math.min(.05, Math.max(0, (timestamp - game.lastTimestamp) / 1000));
  game.lastTimestamp = timestamp;

  if (game.status === 'rewinding' && timestamp >= game.transitionAt) finishRewind();
  if (game.status === 'fault' && timestamp >= game.transitionAt) finishFault();
  if (game.status === 'completing' && timestamp >= game.transitionAt) finishCompletion();

  if (game.status === 'playing') {
    game.accumulator = Math.min(.1, game.accumulator + realDelta);
    while (game.accumulator >= STEP && game.status === 'playing') {
      update(STEP);
      game.accumulator -= STEP;
    }
  } else if (game.level && currentScreen === 'game') {
    game.visualTime += realDelta * .35;
    updateParticles(realDelta);
  }
  render();
  requestAnimationFrame(frame);
}

function syncSettingsUI() {
  ui.soundToggle.checked = save.settings.sound;
  ui.hapticsToggle.checked = save.settings.haptics;
  ui.motionToggle.checked = save.settings.reducedMotion;
  ui.soundButton.textContent = save.settings.sound ? '♪' : '×';
  ui.soundButton.classList.toggle('muted', !save.settings.sound);
  document.body.classList.toggle('reduced-motion', save.settings.reducedMotion);
  audio.setEnabled(save.settings.sound);
}

function openSettings() {
  syncSettingsUI();
  if (typeof ui.settingsDialog.showModal === 'function') ui.settingsDialog.showModal();
  else ui.settingsDialog.setAttribute('open', '');
}

function saveSettings() {
  save.settings.sound = ui.soundToggle.checked;
  save.settings.haptics = ui.hapticsToggle.checked;
  save.settings.reducedMotion = ui.motionToggle.checked;
  persistSave(save);
  syncSettingsUI();
}

function toggleSound() {
  save.settings.sound = !save.settings.sound;
  persistSave(save);
  syncSettingsUI();
  if (save.settings.sound) audio.sfx('start');
}

function resetProgress() {
  save = clearSave();
  persistSave(save);
  syncSettingsUI();
  ui.confirmReset.classList.remove('visible');
  if (ui.settingsDialog.open) ui.settingsDialog.close();
  refreshHome();
  toast('PROGRESS RESET');
}

function bindEvents() {
  ui.continueButton.addEventListener('click', () => {
    if (save.stats.loopsRecorded === 0 && Object.keys(save.results).length === 0) showScreen('help');
    else openLevel(LEVELS[Math.max(0, Math.min(LEVELS.length - 1, (save.stats.currentLevel || 1) - 1))], 'campaign');
  });
  ui.campaignButton.addEventListener('click', () => showScreen('campaign'));
  ui.dailyButton.addEventListener('click', startDaily);
  ui.rushButton.addEventListener('click', startRush);
  ui.howButton.addEventListener('click', () => showScreen('help'));
  ui.helpPlayButton.addEventListener('click', () => openLevel(LEVELS[0], 'campaign'));
  document.querySelectorAll('[data-back="home"]').forEach((button) => button.addEventListener('click', () => showScreen('home')));

  ui.settingsButton.addEventListener('click', openSettings);
  [ui.soundToggle, ui.hapticsToggle, ui.motionToggle].forEach((input) => input.addEventListener('change', saveSettings));
  ui.resetProgressButton.addEventListener('click', () => ui.confirmReset.classList.add('visible'));
  ui.cancelResetButton.addEventListener('click', () => ui.confirmReset.classList.remove('visible'));
  ui.confirmResetButton.addEventListener('click', resetProgress);
  ui.soundButton.addEventListener('click', toggleSound);

  ui.startLevelButton.addEventListener('click', beginLevel);
  ui.gameBackButton.addEventListener('click', pauseGame);
  ui.resumeButton.addEventListener('click', resumeGame);
  ui.retryLoopButton.addEventListener('click', retryCurrentLoop);
  ui.undoButton.addEventListener('click', undoEcho);
  ui.restartButton.addEventListener('click', restartRoom);
  ui.pauseRestartButton.addEventListener('click', () => { setOverlay(ui.pauseOverlay, false); restartRoom(); });
  ui.exitButton.addEventListener('click', exitGame);
  ui.nextButton.addEventListener('click', goNext);
  ui.replayButton.addEventListener('click', replayRoom);
  ui.rushRetryButton.addEventListener('click', startRush);
  ui.rushExitButton.addEventListener('click', () => { closeGameOverlays(); game.status = 'idle'; showScreen('home'); });

  ui.canvas.addEventListener('pointerdown', pointerDown, { passive: false });
  ui.canvas.addEventListener('pointermove', pointerMove, { passive: false });
  ui.canvas.addEventListener('pointerup', pointerUp, { passive: false });
  ui.canvas.addEventListener('pointercancel', pointerUp, { passive: false });
  ui.canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  window.addEventListener('keydown', (event) => {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(event.code)) {
      event.preventDefault();
      game.input.keys.add(event.code);
    }
    if (event.code === 'Escape' && game.status === 'playing') pauseGame();
    else if (event.code === 'Escape' && game.status === 'paused') resumeGame();
    if (event.code === 'KeyR' && game.status === 'playing') retryCurrentLoop();
    if (event.code === 'KeyZ' && game.status === 'playing') undoEcho();
  });
  window.addEventListener('keyup', (event) => game.input.keys.delete(event.code));
  window.addEventListener('resize', resizeCanvas);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && game.status === 'playing') pauseGame();
    game.lastTimestamp = performance.now();
  });
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}), { once: true });
}

function boot() {
  bindEvents();
  resizeCanvas();
  refreshHome();
  showScreen('home');
  syncSettingsUI();
  registerServiceWorker();
  requestAnimationFrame(frame);
}

boot();
