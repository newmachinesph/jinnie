import {readFile, readdir, lstat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {dirname, extname, relative, resolve, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {PutObjectCommand, S3Client} from '@aws-sdk/client-s3';
import {MIME} from './cdn.mjs';

// Publish only the website's public media; never SDK bundles or source files.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
process.loadEnvFile(resolve(root, '.env'));
const publicRoot = resolve(process.argv[2] ?? resolve(root, '../jinnie-web/public'));
const required = ['R2_ENDPOINT', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET'];
if (required.some(key => !process.env[key])) throw new Error('Missing R2 configuration in the app workspace .env');
const client = new S3Client({region: 'auto', endpoint: process.env.R2_ENDPOINT,
  credentials: {accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY}});
const allowed = new Set(['.png', '.jpg', '.jpeg', '.webp', '.avif', '.svg', '.mp3', '.mp4', '.vtt', '.json', '.webmanifest']);
async function walk(dir) {
  if ((await lstat(dir)).isSymbolicLink()) throw new Error('Refusing linked asset directory');
  const files = [];
  for (const entry of await readdir(dir, {withFileTypes: true})) {
    if (entry.isSymbolicLink()) throw new Error('Refusing linked asset');
    const file = resolve(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(file));
    else if (entry.isFile() && allowed.has(extname(file))) files.push(file);
  }
  return files;
}
const files = [...await walk(resolve(publicRoot, 'learn-assets')), ...await walk(resolve(publicRoot, 'screens'))];
// Publish media before indexes. Do not delete old objects used by cached pages.
files.sort((a, b) => Number(a.endsWith('.json')) - Number(b.endsWith('.json')));
for (let offset = 0; offset < files.length; offset += 8) {
  await Promise.all(files.slice(offset, offset + 8).map(async file => {
    const key = relative(publicRoot, file).split(sep).join('/');
    const body = await readFile(file);
    const extension = extname(file);
    const type = MIME[extension] ?? ({'.avif': 'image/avif', '.webp': 'image/webp'}[extension]);
    await client.send(new PutObjectCommand({Bucket: process.env.R2_BUCKET, Key: key, Body: body,
      ContentType: type, CacheControl: 'public, max-age=60, must-revalidate',
      Metadata: {sha256: createHash('sha256').update(body).digest('hex')}}));
  }));
  if (offset % 160 === 0) console.log(`Uploaded ${Math.min(offset + 8, files.length)}/${files.length} assets`);
}
console.log(`Published ${files.length} assets at ${process.env.R2_PUBLIC_URL ?? 'https://cdn.jinnie.ph'}`);
