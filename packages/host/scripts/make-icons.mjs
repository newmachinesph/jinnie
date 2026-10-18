import {mkdirSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';

/*
 * Rasterises the launcher, adaptive, and splash icons from the lamp mark.
 *
 * Run after changing the mark or the brand colours:
 *   npm i -D sharp && node scripts/make-icons.mjs
 *
 * `sharp` is deliberately not a dependency of the app — this runs by hand and
 * the PNGs it writes are committed.
 *
 * The geometry below is copied from @jinnie/sdk's icons module (LAMP_PATHS /
 * LAMP_PLATES / JIN_PATH), which in turn mirrors the Learn course's artwork.
 * It is duplicated rather than imported because this script runs in plain
 * Node, outside the React Native resolver. Keep them in step; the mark is the
 * one thing in the product that must look identical everywhere.
 */

const require = createRequire(import.meta.url);
let sharp;
try {
  sharp = require('sharp');
} catch {
  console.error('This script needs sharp:  npm i -D sharp');
  process.exit(1);
}

const ASSETS = join(dirname(fileURLToPath(import.meta.url)), '../assets');
mkdirSync(ASSETS, {recursive: true});

// The course's own app icon: indigo-900 ground, pale lines, lamp gold for 金.
const NIGHT = '#312E81';
const LINES = '#EEF2FF';
const GOLD = '#F2C86B';

const LAMP = [
  'M27 67h59c5 0 10-5 18-16l-4 21-14 7c-4 12-15 19-30 19-17 0-28-11-29-31Z',
  'M28 72C7 73 9 51 22 54c6 1 7 6 6 10',
  'M34 66c3-10 11-15 22-15s19 5 23 15',
  'M52 51v-5a4 4 0 0 1 8 0v5',
  'M45 99l-3 6h29l-4-6',
  'M54 33c-8-9 10-10 3-20M72 37c-4-6 7-8 5-14',
];
const PLATES = [LAMP[0], 'M34 66c3-20 38-20 45 0Z'];
const JIN = 'm47 78 10-7 10 7M51 79h12M49 84h16M57 79v14M50 87l2 3m12-3-2 3M47 94h20';

function mark(color, gold) {
  return `
  <g fill="${color}" opacity="0.12">
    ${PLATES.map(d => `<path d="${d}"/>`).join('\n    ')}
  </g>
  <g fill="none" stroke="${color}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
    ${LAMP.map(d => `<path d="${d}"/>`).join('\n    ')}
    <path d="${JIN}" stroke="${gold}" stroke-width="2.6"/>
  </g>`;
}

/**
 * @param inset fraction of the canvas left empty around the mark. Android masks
 *   adaptive icons aggressively, so its foreground needs a much wider margin.
 */
function icon({size, background, inset}) {
  const box = 120 / (1 - inset * 2);
  const offset = (box - 120) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${box} ${box}">
  ${background ? `<rect width="${box}" height="${box}" fill="${background}"/>` : ''}
  <g transform="translate(${offset} ${offset})">${mark(LINES, GOLD)}</g>
</svg>`;
}

const targets = [
  // Opaque: iOS rejects launcher icons that carry an alpha channel.
  {name: 'icon.png', size: 1024, background: NIGHT, inset: 0.12},
  // Foreground only; app.json supplies the background colour behind it.
  {name: 'adaptive-icon.png', size: 1024, background: null, inset: 0.28},
  {name: 'splash-icon.png', size: 512, background: null, inset: 0.04},
  {name: 'favicon.png', size: 96, background: NIGHT, inset: 0.1},
];

for (const target of targets) {
  const png = await sharp(Buffer.from(icon(target))).png().toBuffer();
  writeFileSync(join(ASSETS, target.name), png);
  console.log(`${target.name}  ${target.size}x${target.size}  ${png.length} bytes`);
}
