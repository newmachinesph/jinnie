import {createReadStream, realpathSync, statSync} from 'node:fs';
import {createServer, request as httpRequest} from 'node:http';
import {dirname, extname, isAbsolute, relative, resolve, sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const DEV_PORTS = {
  accounts: 9001, wallet: 9002, bills: 9003, budget: 9004, insights: 9005,
  settings: 9006, goals: 9007, debts: 9008, circles: 9009, remit: 9010,
  subscriptions: 9011, credit: 9012, shared: 9013, learn: 9014, security: 9015,
};
export const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8', '.mjs': 'application/javascript; charset=utf-8',
  '.bundle': 'application/javascript', '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.vtt': 'text/vtt; charset=utf-8',
  '.woff2': 'font/woff2', '.woff': 'font/woff',
};

export function contained(root, candidate) {
  const rel = relative(root, candidate);
  return rel !== '..' && !rel.startsWith('..' + sep) && !isAbsolute(rel);
}

export function byteRange(header, size) {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header);
  if (!match || (!match[1] && !match[2]) || size === 0) return false;
  const start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
  const end = match[1] && match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= size) return false;
  return {start, end};
}

function sendFile(file, root, request, response) {
  if (!contained(root, file)) return response.writeHead(404).end();
  let stat = statSync(file, {throwIfNoEntry: false});
  if (stat?.isDirectory()) {
    file = resolve(file, 'index.html');
    stat = statSync(file, {throwIfNoEntry: false});
  }
  if (!stat?.isFile() || !contained(realpathSync(root), realpathSync(file))) return response.writeHead(404).end();
  const headers = {
    'content-type': MIME[extname(file)] ?? 'application/octet-stream',
    'cache-control': 'no-store', 'accept-ranges': 'bytes', 'x-content-type-options': 'nosniff',
  };
  const range = byteRange(request.headers.range, stat.size);
  if (range === false) return response.writeHead(416, {...headers, 'content-range': 'bytes */' + stat.size}).end();
  if (range) {
    headers['content-range'] = 'bytes ' + range.start + '-' + range.end + '/' + stat.size;
    headers['content-length'] = range.end - range.start + 1;
  } else headers['content-length'] = stat.size;
  response.writeHead(range ? 206 : 200, headers);
  if (request.method === 'HEAD') return response.end();
  const stream = createReadStream(file, range || undefined);
  stream.on('error', () => response.destroy());
  stream.pipe(response);
}

/** CDN layout: apps.json plus federated /app/platform containers. */
export function createCdnHandler({release = false, cdnRoot = resolve(here, '../cdn'), packagesRoot = resolve(here, '../..')} = {}) {
  return (request, response) => {
    if (!['GET', 'HEAD'].includes(request.method)) return response.writeHead(405, {allow: 'GET, HEAD'}).end();
    let pathname;
    try { pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://x').pathname); }
    catch { return response.writeHead(400).end(); }
    // Decoding before checking catches encoded slashes and Windows separators.
    if (pathname.includes('\0') || pathname.includes('\\') || pathname.split('/').includes('..')) return response.writeHead(404).end();
    const [, app, platform, ...rest] = pathname.split('/');
    const port = DEV_PORTS[app];
    if (!port || !platform || rest.length === 0) {
      return sendFile(resolve(cdnRoot, '.' + pathname), cdnRoot, request, response);
    }
    if (!['android', 'ios'].includes(platform) || rest.some(part => !part)) return response.writeHead(404).end();
    if (release) {
      const root = resolve(packagesRoot, app, 'build/generated', platform);
      return sendFile(resolve(root, ...rest), root, request, response);
    }
    const upstream = httpRequest(
      {host: 'localhost', port, path: '/' + platform + '/' + rest.map(encodeURIComponent).join('/'), method: request.method,
        headers: request.headers.range ? {range: request.headers.range} : {}},
      proxied => {
        response.writeHead(proxied.statusCode ?? 502, proxied.headers);
        proxied.pipe(response);
      },
    );
    upstream.on('error', () => { if (!response.headersSent) response.writeHead(502); response.end(); });
    upstream.end();
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.JINNIE_CDN_PORT ?? 9020);
  const release = process.argv.includes('--release');
  createServer(createCdnHandler({release})).listen(port, () => {
    console.log('cdn: ' + (release ? 'release bundles' : 'dev servers') + ' behind http://localhost:' + port);
  });
}
