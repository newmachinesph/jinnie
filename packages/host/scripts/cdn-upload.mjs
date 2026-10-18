import {readdirSync, readFileSync, statSync} from 'node:fs';
import {dirname, extname, join, relative, resolve, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {PutObjectCommand, S3Client} from '@aws-sdk/client-s3';
import {MIME} from './cdn.mjs';

/*
 * Publish the folder `cdn-pack.mjs` assembled to the Cloudflare R2 bucket that
 * serves the app catalog. Credentials come from the workspace `.env`
 * (see `.env.example`). Objects keep their relative path as the key, so the
 * bucket's public origin serves `apps.json` and `<app>/<platform>/...` as-is.
 * Old hashed bundles are left in place: an app that fetched the previous
 * catalog may still request them.
 */
const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../../..');
const out = resolve(root, '.build/jinnie-cdn');
process.loadEnvFile(resolve(root, '.env'));

const missing = ['R2_ENDPOINT', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET'].filter(name => !process.env[name]);
if (missing.length) throw new Error(`Missing in .env: ${missing.join(', ')}`);

const client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY},
});

const walk = dir => readdirSync(dir).flatMap(name => {
  const path = join(dir, name);
  return statSync(path).isDirectory() ? walk(path) : [path];
});
const files = walk(out);
if (!files.some(file => relative(out, file) === 'apps.json')) throw new Error(`No apps.json in ${out}; run cdn:pack first.`);

// The catalog and manifests change on every publish; hashed bundles never do.
const cacheControl = key => (key.endsWith('.bundle') ? 'public, max-age=31536000, immutable' : 'public, max-age=60');

const upload = async file => {
  const key = relative(out, file).split(sep).join('/');
  await client.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET,
    Key: key,
    Body: readFileSync(file),
    ContentType: MIME[extname(file)] ?? 'application/octet-stream',
    CacheControl: cacheControl(key),
  }));
  return key;
};

// Manifests go last so a client never sees a catalog whose bundles are not there yet.
const bundles = files.filter(file => !file.endsWith('.json'));
const manifests = files.filter(file => file.endsWith('.json'));
let done = 0;
for (const batch of [bundles, manifests]) {
  for (let i = 0; i < batch.length; i += 8) {
    const keys = await Promise.all(batch.slice(i, i + 8).map(upload));
    done += keys.length;
    console.log(keys.join('\n'));
  }
}
console.log(`uploaded ${done} files to ${process.env.R2_BUCKET}`);
