# ONE MORE LOOP

**Seven seconds. Every run becomes your next teammate.**

ONE MORE LOOP is a one-thumb time-loop action puzzler in the **ONE MORE** series. A room resets every seven seconds, but the route you just recorded returns as an echo and performs the same movements again. Use those echoes to hold stations, activate signals, open gates and assemble a perfectly synchronised route to the portal.

This is a complete offline-first web game and Android app. It has no backend, ads, paid service, licensed music or external runtime assets.

## The core loop

1. Drag anywhere inside the arena to steer the live runner.
2. Complete one job before the seven-second clock expires.
3. Time rewinds and the recorded runner becomes an echo.
4. The echo repeats its exact path while a new live runner performs the next job.
5. Coordinate the full team, satisfy the room objective and enter the portal.

Hazard contact is deliberately fair: it restarts only the current route and preserves every completed echo. **Retry Loop** immediately re-records the current route, while **Undo Echo** removes only the newest echo. A campaign room never rewards passive survival; every room has a concrete objective.

## Game content

- **24 handcrafted campaign levels** across four six-level acts
- **72 campaign stars** based on efficient loop counts
- **Daily Loop** generated deterministically from the player's local date
- **Sync Rush** endless mode with shrinking clocks and a persistent best score
- Pressure stations, latched signals, dependency gates and multi-echo objectives
- Timed beam, moving spark and rotating sweep hazards with forgiving collision margins
- Drag joystick, WASD and arrow-key controls
- Procedural soundtrack that adds percussion, bass, melody and harmony as echoes accumulate
- Procedural effects, particles, haptics, screen feedback and animated echo trails
- Sound, haptic and reduced-motion settings
- Local campaign, daily and endless-mode saves
- Responsive portrait layout, offline service worker and installable PWA

## Campaign

| Act | Theme | What it introduces |
|---|---|---|
| I — Awakening | Learn to become two | Signals, pressure stations, gates and three-runner solutions |
| II — Interference | Move between pulses | Timed beam patterns combined with echo timing |
| III — Momentum | Every path has a rhythm | Moving sparks and rotating sweeps |
| IV — Symphony | Build the perfect machine | Four-runner compositions combining every mechanic |

## Run locally

Node.js 22 or newer is required.

```bash
npm install
npm run check
npm run dev
```

Open `http://localhost:4173`. The game is designed for portrait mobile screens but supports desktop input for development and testing.

## Quality checks

```bash
npm run check
npm run build
```

The check command validates JavaScript syntax, all 24 level schemas, DOM bindings, application metadata and the automated test suite. The web build is written to `dist/`.

## Android APK

Every push to `main` runs the **Build Android APK** GitHub Actions workflow. It:

1. installs locked Node dependencies;
2. runs the complete validation and test suite;
3. builds the offline web bundle;
4. creates and synchronises the Capacitor Android project;
5. applies the ONE MORE LOOP Android branding;
6. creates a development signing key inside the protected workflow (or uses the optional `ONE_MORE_LOOP_DEBUG_KEYSTORE_B64` repository secret for stable update signing);
7. verifies and uploads the APK;
8. publishes or replaces the APK on the rolling `android-latest` release.

After the workflow is green, download **one-more-loop-debug.apk** from the [latest Android release](https://github.com/simplebusiness26/OneMore-Loop/releases/tag/android-latest).

The Android package id is `com.simplebusiness.onemoreloop`, so it installs separately from every other ONE MORE game.

## Project structure

```text
game.js                 UI, game state, input, simulation and renderer
game-core.js            Pure collision, replay and scoring functions
levels.js               Campaign, Daily Loop and Sync Rush level data
audio.js                Original procedural Web Audio soundtrack and effects
storage.js              Versioned local progress and settings
styles.css              Responsive mobile interface
scripts/                Build, validation and Android-branding scripts
tests/                  Node test suite for core systems
.github/workflows/      Reproducible APK and rolling release pipeline
```

## ONE MORE rules

1. The mechanic is understandable immediately.
2. Controls stay minimal and mobile-first.
3. Failure is fast and restart is faster.
4. Correct play must never be punished by unfair collision or impossible timing.
5. Every challenge requires an objective; waiting safely is not a solution.
6. The final temptation is always **ONE MORE LOOP?**
