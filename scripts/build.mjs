import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const output = resolve(root, 'dist');
const files = [
  'index.html',
  'styles.css',
  'game.js',
  'game-core.js',
  'levels.js',
  'audio.js',
  'storage.js',
  'manifest.webmanifest',
  'sw.js'
];

await rm(output, { recursive: true, force: true });
await mkdir(resolve(output, 'icons'), { recursive: true });
await Promise.all(files.map((file) => cp(resolve(root, file), resolve(output, file))));
await cp(resolve(root, 'icons'), resolve(output, 'icons'), { recursive: true });
await writeFile(resolve(output, 'build.json'), `${JSON.stringify({ name: 'ONE MORE LOOP', version: '1.0.0' }, null, 2)}\n`);

console.log(`Built ${files.length + 2} web assets in dist/.`);

