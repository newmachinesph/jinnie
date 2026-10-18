import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, rmSync, writeFileSync} from 'node:fs';
import {createServer} from 'node:http';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {after, before, test} from 'node:test';
import {byteRange, contained, createCdnHandler} from './cdn.mjs';

let folder, server, origin;
before(async () => {
  folder = mkdtempSync(join(tmpdir(), 'jinnie-cdn-test-'));
  mkdirSync(join(folder, 'fixtures'));
  writeFileSync(join(folder, 'fixtures/index.html'), '<!doctype html><title>Static fixture</title>');
  writeFileSync(join(folder, 'fixtures/clip.mp4'), '0123456789');
  writeFileSync(join(folder, 'fixtures/clip.mp3'), 'narration');
  writeFileSync(join(folder, 'fixtures/clip.vtt'), 'WEBVTT');
  server = createServer(createCdnHandler({cdnRoot: folder}));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  await new Promise(resolve => server.close(resolve));
  rmSync(folder, {recursive: true, force: true});
});

test('serves generic static files with correct MIME and HEAD semantics', async () => {
  assert.equal(await (await fetch(`${origin}/fixtures/`)).text(), '<!doctype html><title>Static fixture</title>');
  for (const [file, mime] of [['index.html', 'text/html'], ['clip.mp4', 'video/mp4'], ['clip.mp3', 'audio/mpeg'], ['clip.vtt', 'text/vtt']]) {
    const response = await fetch(`${origin}/fixtures/${file}`, {method: 'HEAD'});
    assert.equal(response.status, 200);
    assert.ok(response.headers.get('content-type').startsWith(mime));
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(await response.text(), '');
  }
});

test('supports video seeking with normal, open and suffix byte ranges', async () => {
  for (const [range, expected] of [['bytes=2-5', '2345'], ['bytes=7-', '789'], ['bytes=-3', '789']]) {
    const response = await fetch(`${origin}/fixtures/clip.mp4`, {headers: {Range: range}});
    assert.equal(response.status, 206);
    assert.equal(response.headers.get('content-length'), String(expected.length));
    assert.equal(await response.text(), expected);
  }
  for (const range of ['bytes=99-', 'bytes=8-2', 'bytes=0-1,3-4', 'bytes=-0']) {
    const response = await fetch(`${origin}/fixtures/clip.mp4`, {headers: {Range: range}});
    assert.equal(response.status, 416);
    assert.equal(response.headers.get('content-range'), 'bytes */10');
  }
  assert.equal(byteRange('bytes=-0', 10), false);
});

test('contains requests within the static root, including Windows traversal', async () => {
  assert.equal(contained(folder, folder + '-sibling/secret.txt'), false);
  for (const path of ['/fixtures/..%5csecret.txt', '/fixtures/%2e%2e%2fsecret.txt', '/fixtures/%00index.html', '/learn/android/%2e%2e%2fsecret']) {
    assert.equal((await fetch(origin + path)).status, 404);
  }
  assert.equal((await fetch(`${origin}/fixtures/index.html`, {method: 'POST'})).status, 405);
});
