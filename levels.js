export const WORLD = Object.freeze({ width: 360, height: 600, playerRadius: 10 });

export const ACTS = Object.freeze([
  { id: 1, title: 'AWAKENING', subtitle: 'LEARN TO BECOME TWO', color: '#45f4ff' },
  { id: 2, title: 'INTERFERENCE', subtitle: 'MOVE BETWEEN THE PULSES', color: '#5d72ff' },
  { id: 3, title: 'MOMENTUM', subtitle: 'EVERY PATH HAS A RHYTHM', color: '#a46bff' },
  { id: 4, title: 'SYMPHONY', subtitle: 'BUILD THE PERFECT MACHINE', color: '#ff4fd8' }
]);

const spawn = (x = 50, y = 535) => ({ x, y });
const exit = (x = 305, y = 64, r = 22) => ({ x, y, r });
const wall = (x, y, w, h) => ({ x, y, w, h });
const plate = (id, x, y, color = '#45f4ff', r = 19) => ({ id, x, y, r, color });
const node = (id, x, y, color = '#a46bff', r = 15) => ({ id, x, y, r, color });
const gate = (id, x, y, w, h, requires, color = '#45f4ff', any = false) => ({ id, x, y, w, h, requires, color, any });
const laser = (x, y, w, h, period = 2.1, on = .72, phase = 0, color = '#ff5470') => ({ type: 'laser', x, y, w, h, period, on, phase, color });
const orb = (x, y, toX, toY, r = 12, period = 3, phase = 0, color = '#ff4fd8') => ({ type: 'orb', x, y, toX, toY, r, period, phase, color });
const sweep = (cx, cy, length = 115, width = 8, period = 4, phase = 0, color = '#ff5470') => ({ type: 'sweep', cx, cy, length, width, period, phase, color });

const level = ({
  id, act, name, hint, objective, par, loopSeconds = 7,
  start = spawn(), portal = exit(), walls = [], plates = [], nodes = [], gates = [], hazards = [], requires = [], theme
}) => ({
  id, act, name, hint, objective, par, loopSeconds, start, exit: portal,
  walls, plates, nodes, gates, hazards, requires,
  theme: theme || ACTS[act - 1].color
});

export const LEVELS = Object.freeze([
  level({
    id: 1, act: 1, name: 'FIRST SIGNAL', par: 1,
    hint: 'Touch the signal, then enter the portal before time rewinds.',
    objective: 'Activate the signal and reach the portal.',
    nodes: [node('signal', 178, 304)], requires: ['signal']
  }),
  level({
    id: 2, act: 1, name: 'HOLD THE LINE', par: 2,
    hint: 'Record yourself holding the pad. Your echo will keep the gate open next loop.',
    objective: 'Leave an echo on the pad, then cross the gate.',
    plates: [plate('hold', 76, 432)],
    gates: [gate('first-gate', 0, 324, 360, 18, ['hold'])],
    walls: [wall(126, 404, 94, 16)]
  }),
  level({
    id: 3, act: 1, name: 'THREE OF YOU', par: 3,
    hint: 'One echo holds each pad. Your third runner completes the route.',
    objective: 'Coordinate two echoes to open both gates.',
    plates: [plate('lower', 74, 446), plate('upper', 286, 282, '#5d72ff')],
    gates: [
      gate('lower-gate', 0, 365, 360, 18, ['lower']),
      gate('upper-gate', 0, 196, 360, 18, ['upper'], '#5d72ff')
    ]
  }),
  level({
    id: 4, act: 1, name: 'TWO KEYS', par: 3,
    hint: 'The gate needs both pads held at the same time.',
    objective: 'Place two echoes on the paired pads.',
    start: spawn(180, 530), portal: exit(180, 72),
    plates: [plate('left', 70, 420), plate('right', 290, 420, '#5d72ff')],
    gates: [gate('pair-gate', 0, 306, 360, 18, ['left', 'right'], '#a46bff')],
    walls: [wall(145, 380, 70, 14)]
  }),
  level({
    id: 5, act: 1, name: 'RELAY', par: 2,
    hint: 'An echo opens the first gate. Signals stay active for the rest of the loop.',
    objective: 'Open the lower gate, collect the signal, then escape.',
    plates: [plate('entry', 72, 452)],
    nodes: [node('relay', 184, 250, '#5d72ff')],
    gates: [
      gate('entry-gate', 0, 358, 360, 18, ['entry']),
      gate('relay-gate', 0, 160, 360, 18, ['relay'], '#5d72ff')
    ],
    requires: ['relay']
  }),
  level({
    id: 6, act: 1, name: 'FIRST CHORUS', par: 3,
    hint: 'Build the route one job at a time: cyan pad, violet pad, final signal.',
    objective: 'Synchronise two pads and the final signal.',
    plates: [plate('cyan', 66, 462), plate('violet', 290, 294, '#a46bff')],
    nodes: [node('chorus', 178, 118, '#ff4fd8')],
    gates: [
      gate('cyan-gate', 0, 376, 360, 18, ['cyan']),
      gate('violet-gate', 0, 210, 360, 18, ['violet'], '#a46bff')
    ],
    walls: [wall(122, 420, 116, 13), wall(54, 250, 122, 13)],
    requires: ['chorus']
  }),

  level({
    id: 7, act: 2, name: 'BLINK', par: 1,
    hint: 'Red beams pulse off. Wait for the dark moment, then cross.',
    objective: 'Cross the pulse and activate the signal.',
    nodes: [node('blink', 180, 164, '#5d72ff')], requires: ['blink'],
    hazards: [laser(0, 302, 360, 9, 2.25, .76, .18)]
  }),
  level({
    id: 8, act: 2, name: 'LATE ARRIVAL', par: 2,
    hint: 'Your echo reaches the pad at the same time every loop. Time your gate approach.',
    objective: 'Meet your echo at the opening.',
    plates: [plate('late', 286, 438, '#5d72ff')],
    gates: [gate('late-gate', 0, 314, 360, 17, ['late'], '#5d72ff')],
    hazards: [laser(0, 218, 360, 8, 2.4, .64, .9)]
  }),
  level({
    id: 9, act: 2, name: 'CROSS CURRENT', par: 2,
    hint: 'Leave an echo below, then weave through alternating beams.',
    objective: 'Open the gate and cross both currents.',
    plates: [plate('current', 70, 458)],
    gates: [gate('current-gate', 0, 382, 360, 17, ['current'])],
    hazards: [
      laser(0, 284, 232, 8, 2.2, .68, .15),
      laser(128, 190, 232, 8, 2.2, .68, 1.25, '#ff4fd8')
    ]
  }),
  level({
    id: 10, act: 2, name: 'PHASE SHIFT', par: 3,
    hint: 'The two pads open a narrow phase gate while the beam sleeps.',
    objective: 'Hold both pads and cross during the safe pulse.',
    start: spawn(180, 532), portal: exit(180, 66),
    plates: [plate('phase-a', 64, 438), plate('phase-b', 296, 438, '#5d72ff')],
    gates: [gate('phase-gate', 0, 320, 360, 18, ['phase-a', 'phase-b'], '#a46bff')],
    hazards: [laser(0, 236, 360, 10, 2.6, .86, .25)]
  }),
  level({
    id: 11, act: 2, name: 'DOUBLE BLINK', par: 2,
    hint: 'A stored signal controls the final gate. Be patient between the beams.',
    objective: 'Charge the signal and escape through the upper gate.',
    plates: [plate('entry', 68, 466)],
    nodes: [node('charge', 286, 280, '#a46bff')], requires: ['charge'],
    gates: [
      gate('entry-gate', 0, 390, 360, 17, ['entry']),
      gate('charge-gate', 0, 155, 360, 17, ['charge'], '#a46bff')
    ],
    hazards: [laser(0, 330, 238, 8, 2.15, .7, .7), laser(118, 218, 242, 8, 2.15, .7, 1.76)]
  }),
  level({
    id: 12, act: 2, name: 'INTERFERENCE', par: 3,
    hint: 'Every route is safe when the timing and echoes agree.',
    objective: 'Synchronise the lower and upper stations.',
    plates: [plate('low', 69, 466), plate('high', 291, 272, '#5d72ff')],
    nodes: [node('clear', 180, 105, '#ff4fd8')], requires: ['clear'],
    gates: [gate('low-gate', 0, 384, 360, 17, ['low']), gate('high-gate', 0, 191, 360, 17, ['high'], '#5d72ff')],
    hazards: [laser(0, 326, 224, 8, 2.4, .7, .2), laser(138, 137, 222, 8, 2.25, .66, 1.2, '#ff4fd8')]
  }),

  level({
    id: 13, act: 3, name: 'DRIFT', par: 1,
    hint: 'Moving sparks repeat their route. Read the lane before committing.',
    objective: 'Slip past the drifting sparks.',
    nodes: [node('drift', 180, 124, '#a46bff')], requires: ['drift'],
    hazards: [orb(42, 342, 318, 342, 13, 3.2, .1), orb(318, 238, 42, 238, 12, 2.75, 1.4, '#5d72ff')]
  }),
  level({
    id: 14, act: 3, name: 'MOVING PARTS', par: 2,
    hint: 'Your echo handles the lock. You handle the traffic.',
    objective: 'Open the lock and cross the moving lane.',
    plates: [plate('parts', 70, 462, '#a46bff')],
    gates: [gate('parts-gate', 0, 370, 360, 17, ['parts'], '#a46bff')],
    hazards: [orb(38, 286, 322, 286, 14, 3, .3), orb(322, 194, 38, 194, 12, 2.6, 1.1, '#5d72ff')]
  }),
  level({
    id: 15, act: 3, name: 'CLOCK HAND', par: 2,
    hint: 'Move with the rotating sweep, not against it.',
    objective: 'Open the gate and pass the clock hand.',
    plates: [plate('clock', 72, 456, '#a46bff')],
    gates: [gate('clock-gate', 0, 374, 360, 17, ['clock'], '#a46bff')],
    hazards: [sweep(180, 247, 128, 9, 4.4, .3)]
  }),
  level({
    id: 16, act: 3, name: 'COUNTERPOINT', par: 3,
    hint: 'Two echoes hold the harmony while you move through the centre.',
    objective: 'Hold the side pads and cross the moving centre.',
    start: spawn(180, 532), portal: exit(180, 62),
    plates: [plate('left', 60, 438, '#a46bff'), plate('right', 300, 438, '#5d72ff')],
    gates: [gate('counter-gate', 0, 338, 360, 17, ['left', 'right'], '#ff4fd8')],
    hazards: [orb(44, 246, 316, 246, 14, 2.75, .25), orb(316, 166, 44, 166, 12, 3.15, 1.4, '#5d72ff')]
  }),
  level({
    id: 17, act: 3, name: 'PENDULUM', par: 3,
    hint: 'The upper pad opens the last gate. Follow the sweep and arrive together.',
    objective: 'Chain two echoes through the moving chamber.',
    plates: [plate('low', 66, 468, '#a46bff'), plate('high', 292, 278, '#5d72ff')],
    gates: [gate('low-gate', 0, 389, 360, 17, ['low'], '#a46bff'), gate('high-gate', 0, 189, 360, 17, ['high'], '#5d72ff')],
    hazards: [sweep(180, 286, 122, 8, 4.9, .8)]
  }),
  level({
    id: 18, act: 3, name: 'MOMENTUM', par: 3,
    hint: 'Three paths, one moving machine. Record clean routes and trust the timing.',
    objective: 'Complete the moving relay.',
    plates: [plate('start', 68, 468, '#a46bff'), plate('relay', 292, 280, '#5d72ff')],
    nodes: [node('momentum', 178, 112, '#ff4fd8')], requires: ['momentum'],
    gates: [gate('start-gate', 0, 391, 360, 17, ['start'], '#a46bff'), gate('relay-gate', 0, 198, 360, 17, ['relay'], '#5d72ff')],
    hazards: [orb(43, 332, 317, 332, 12, 2.7, .2), sweep(180, 151, 105, 7, 4.1, .5, '#ff4fd8')]
  }),

  level({
    id: 19, act: 4, name: 'OVERTURE', par: 2,
    hint: 'Combine everything: echo, pulse, movement, signal.',
    objective: 'Open the route and complete the overture.',
    plates: [plate('overture', 67, 470, '#ff4fd8')],
    nodes: [node('note', 286, 209, '#5d72ff')], requires: ['note'],
    gates: [gate('overture-gate', 0, 391, 360, 17, ['overture'], '#ff4fd8'), gate('note-gate', 0, 145, 360, 17, ['note'], '#5d72ff')],
    hazards: [laser(0, 300, 230, 8, 2.3, .7, .4), orb(319, 254, 188, 254, 11, 2.4, .6, '#a46bff')]
  }),
  level({
    id: 20, act: 4, name: 'FOUR VOICES', par: 4,
    hint: 'Three echoes hold three stations. The fourth voice reaches the portal.',
    objective: 'Synchronise all three stations.',
    start: spawn(180, 532), portal: exit(180, 62),
    plates: [plate('voice-a', 55, 456), plate('voice-b', 305, 456, '#5d72ff'), plate('voice-c', 180, 299, '#a46bff')],
    gates: [gate('voices-gate', 0, 191, 360, 18, ['voice-a', 'voice-b', 'voice-c'], '#ff4fd8')],
    walls: [wall(105, 406, 150, 14)]
  }),
  level({
    id: 21, act: 4, name: 'POLYRHYTHM', par: 3,
    hint: 'The beams disagree. Your echoes do not have to.',
    objective: 'Synchronise the paired locks between the pulses.',
    plates: [plate('poly-a', 65, 464, '#ff4fd8'), plate('poly-b', 295, 292, '#5d72ff')],
    nodes: [node('poly-note', 178, 111, '#ffd166')], requires: ['poly-note'],
    gates: [gate('poly-gate-a', 0, 387, 360, 17, ['poly-a'], '#ff4fd8'), gate('poly-gate-b', 0, 204, 360, 17, ['poly-b'], '#5d72ff')],
    hazards: [laser(0, 336, 226, 8, 2.15, .66, .1), laser(134, 153, 226, 8, 2.7, .82, 1.2, '#a46bff')]
  }),
  level({
    id: 22, act: 4, name: 'CRESCENDO', par: 3,
    hint: 'Moving sparks close in. Build the route before the room builds around you.',
    objective: 'Carry the chorus through the moving field.',
    plates: [plate('cres-a', 67, 472, '#ff4fd8'), plate('cres-b', 293, 286, '#a46bff')],
    nodes: [node('cres-note', 180, 106, '#ffd166')], requires: ['cres-note'],
    gates: [gate('cres-gate-a', 0, 394, 360, 17, ['cres-a'], '#ff4fd8'), gate('cres-gate-b', 0, 199, 360, 17, ['cres-b'], '#a46bff')],
    hazards: [orb(38, 338, 322, 338, 13, 2.65, .4), orb(322, 155, 38, 155, 13, 2.45, 1.3, '#5d72ff')]
  }),
  level({
    id: 23, act: 4, name: 'THE MACHINE', par: 4,
    hint: 'Every echo has one job. Record them in order and let the machine run.',
    objective: 'Build a four-part route through the machine.',
    start: spawn(180, 535), portal: exit(180, 58),
    plates: [
      plate('machine-a', 54, 468, '#45f4ff'),
      plate('machine-b', 306, 468, '#5d72ff'),
      plate('machine-c', 62, 280, '#a46bff')
    ],
    nodes: [node('machine-core', 291, 120, '#ffd166')], requires: ['machine-core'],
    gates: [
      gate('machine-gate-a', 0, 385, 360, 17, ['machine-a', 'machine-b'], '#ff4fd8'),
      gate('machine-gate-b', 0, 198, 360, 17, ['machine-c'], '#a46bff')
    ],
    hazards: [sweep(180, 292, 105, 7, 4.5, .2), laser(0, 155, 230, 8, 2.25, .66, .8)]
  }),
  level({
    id: 24, act: 4, name: 'PERFECT LOOP', par: 4, loopSeconds: 7.5,
    hint: 'This is the whole composition. Four runners. Three stations. One final signal.',
    objective: 'Complete the final symphony.',
    start: spawn(180, 535), portal: exit(180, 54, 24),
    plates: [
      plate('final-a', 55, 474, '#45f4ff'),
      plate('final-b', 305, 474, '#5d72ff'),
      plate('final-c', 180, 286, '#a46bff')
    ],
    nodes: [node('final-core', 180, 106, '#ffd166', 17)], requires: ['final-core'],
    gates: [
      gate('final-gate-a', 0, 397, 360, 18, ['final-a', 'final-b'], '#ff4fd8'),
      gate('final-gate-b', 0, 205, 360, 18, ['final-c'], '#a46bff'),
      gate('final-gate-c', 0, 69, 360, 15, ['final-core'], '#ffd166')
    ],
    hazards: [
      orb(40, 342, 320, 342, 12, 2.8, .3),
      sweep(180, 260, 92, 7, 4.7, .8, '#ff4fd8'),
      laser(0, 153, 226, 8, 2.5, .72, 1.1)
    ],
    theme: '#ffd166'
  })
]);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function hashString(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mirrorLevelX(source) {
  const output = clone(source);
  const mirrorPoint = (point) => { point.x = WORLD.width - point.x; };
  const mirrorRect = (rect) => { rect.x = WORLD.width - rect.x - rect.w; };
  mirrorPoint(output.start);
  mirrorPoint(output.exit);
  output.plates.forEach(mirrorPoint);
  output.nodes.forEach(mirrorPoint);
  output.walls.forEach(mirrorRect);
  output.gates.forEach(mirrorRect);
  output.hazards.forEach((hazard) => {
    if (hazard.type === 'laser') mirrorRect(hazard);
    if (hazard.type === 'orb') {
      hazard.x = WORLD.width - hazard.x;
      hazard.toX = WORLD.width - hazard.toX;
    }
    if (hazard.type === 'sweep') hazard.cx = WORLD.width - hazard.cx;
  });
  return output;
}

export function dateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getDailyLevel(date = new Date()) {
  const key = dateKey(date);
  const seed = hashString(`ONE-MORE-LOOP:${key}`);
  const poolIndex = 6 + (seed % 18);
  let daily = clone(LEVELS[poolIndex]);
  if ((seed >>> 3) % 2 === 1) daily = mirrorLevelX(daily);
  daily.id = `daily-${key}`;
  daily.name = `DAILY · ${LEVELS[poolIndex].name}`;
  daily.dailyKey = key;
  daily.theme = ACTS[(seed >>> 5) % ACTS.length].color;
  daily.hint = 'Everyone receives the same signal today. Find your cleanest solution.';
  return daily;
}

export function getRushLevel(stage, runSeed = 1) {
  const safeStage = Math.max(1, Math.floor(stage));
  const hash = hashString(`RUSH:${runSeed}:${safeStage}`);
  const difficultyBand = Math.min(3, Math.floor((safeStage - 1) / 4));
  const bandStart = difficultyBand * 6;
  const index = bandStart + (hash % 6);
  let rush = clone(LEVELS[index]);
  if ((hash >>> 4) % 2 === 1) rush = mirrorLevelX(rush);
  rush.id = `rush-${runSeed}-${safeStage}`;
  rush.name = `SYNC ROOM ${String(safeStage).padStart(2, '0')}`;
  rush.rushStage = safeStage;
  rush.theme = ACTS[difficultyBand].color;
  rush.loopSeconds = Math.max(5.75, rush.loopSeconds - Math.min(1.25, (safeStage - 1) * .045));
  rush.maxLoops = rush.par + 2;
  rush.hint = `Clear the room in ${rush.maxLoops} loops or fewer to keep the rush alive.`;
  return rush;
}

export function getLevelById(id) {
  return LEVELS.find((entry) => entry.id === Number(id)) || null;
}

export function validateLevel(levelData) {
  const errors = [];
  const ids = new Set();
  if (!levelData || typeof levelData !== 'object') return ['Level must be an object.'];
  if (!levelData.name) errors.push('Missing level name.');
  if (!(levelData.loopSeconds >= 4 && levelData.loopSeconds <= 12)) errors.push('Loop time must be between 4 and 12 seconds.');
  if (!(levelData.par >= 1 && levelData.par <= 8)) errors.push('Par must be between 1 and 8 loops.');
  for (const item of [...levelData.plates, ...levelData.nodes]) {
    if (!item.id) errors.push('An objective has no id.');
    if (ids.has(item.id)) errors.push(`Duplicate objective id: ${item.id}.`);
    ids.add(item.id);
    if (item.x < 0 || item.x > WORLD.width || item.y < 0 || item.y > WORLD.height) errors.push(`Objective ${item.id} is outside the arena.`);
  }
  for (const currentGate of levelData.gates) {
    if (!currentGate.requires?.length) errors.push(`Gate ${currentGate.id} has no requirements.`);
    for (const requirement of currentGate.requires || []) {
      if (!ids.has(requirement)) errors.push(`Gate ${currentGate.id} references missing objective ${requirement}.`);
    }
  }
  for (const requirement of levelData.requires || []) {
    if (!ids.has(requirement)) errors.push(`Exit references missing objective ${requirement}.`);
  }
  return errors;
}

export const _test = Object.freeze({ hashString, mirrorLevelX });
