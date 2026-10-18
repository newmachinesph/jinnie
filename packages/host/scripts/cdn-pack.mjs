import {cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

/*
 * Assemble the folder a static host serves: `apps.json` at the root and each
 * app's release container under `<app>/<platform>/`. Source maps, stats, and
 * the standalone dev entry stay out. Deploy this directory to the jinnie-cdn
 * Vercel project at sdk.jinnie.ph. Cloudflare R2 is reserved for assets.
 */
const here = dirname(fileURLToPath(import.meta.url));
const packages = resolve(here, '../..');
const out = resolve(packages, '../.build/jinnie-cdn');
const platforms = ['android', 'ios'];

if (dirname(out) !== resolve(packages, '../.build')) {
  throw new Error('Refusing to replace a CDN output outside this workspace build directory.');
}
rmSync(out, {recursive: true, force: true});
mkdirSync(out, {recursive: true});
cpSync(resolve(here, '../cdn/apps.json'), join(out, 'apps.json'));
cpSync(resolve(here, '../cdn/vercel.json'), join(out, 'vercel.json'));

const apps = JSON.parse(readFileSync(resolve(here, '../cdn/apps.json'), 'utf8'));

let copied = 0;
for (const app of apps.apps) {
  for (const platform of platforms) {
    const source = resolve(packages, app.id, 'build/generated', platform);
    if (!existsSync(source)) continue;
    const target = join(out, app.id, platform);
    mkdirSync(target, {recursive: true});
    for (const file of readdirSync(source)) {
      if (file.endsWith('.map') || file === 'mf-stats.json' || file === 'index.bundle') continue;
      cpSync(join(source, file), join(target, file));
      copied += 1;
    }
  }
}

console.log(`packed ${copied} files into ${out}`);
