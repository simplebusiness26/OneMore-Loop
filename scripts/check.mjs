import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { LEVELS, validateLevel } from '../levels.js';

const root = resolve(import.meta.dirname, '..');
const scripts = ['game.js', 'game-core.js', 'levels.js', 'audio.js', 'storage.js', 'sw.js', 'scripts/build.mjs', 'scripts/android-brand.mjs'];
for (const script of scripts) {
  const result = spawnSync(process.execPath, ['--check', resolve(root, script)], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`Syntax check failed for ${script}:\n${result.stderr}`);
}

if (LEVELS.length !== 24) throw new Error(`Expected 24 campaign levels, found ${LEVELS.length}.`);
for (const level of LEVELS) {
  const errors = validateLevel(level);
  if (errors.length) throw new Error(`Level ${level.id} (${level.name}) is invalid:\n- ${errors.join('\n- ')}`);
}

const [html, manifestText, capacitorText] = await Promise.all([
  readFile(resolve(root, 'index.html'), 'utf8'),
  readFile(resolve(root, 'manifest.webmanifest'), 'utf8'),
  readFile(resolve(root, 'capacitor.config.json'), 'utf8')
]);
const gameSource = await readFile(resolve(root, 'game.js'), 'utf8');
const referencedIds = [...gameSource.matchAll(/\$\('([^']+)'\)/g)].map((match) => match[1]);
const missingIds = [...new Set(referencedIds)].filter((id) => !html.includes(`id="${id}"`));
if (missingIds.length) throw new Error(`game.js references missing DOM ids: ${missingIds.join(', ')}`);

const manifest = JSON.parse(manifestText);
const capacitor = JSON.parse(capacitorText);
if (manifest.orientation !== 'portrait') throw new Error('The PWA must lock to portrait orientation.');
if (capacitor.appId !== 'com.simplebusiness.onemoreloop') throw new Error('Unexpected Android application id.');

console.log(`Static checks passed: ${LEVELS.length} levels, ${referencedIds.length} UI bindings, ${scripts.length} scripts.`);

