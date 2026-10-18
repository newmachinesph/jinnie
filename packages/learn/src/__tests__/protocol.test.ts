import assert from 'node:assert/strict';
import {test} from 'node:test';
import vm from 'node:vm';
import {courseUrl, externalUrl, isCourseUrl, isTrustedMessageUrl, LEARN_APPS, parseLearnRequest, responseScript, validateFile, validateState} from '../protocol';

test('Learn embeds the configured hosted document and preserves its query and route', () => {
  assert.equal(courseUrl('https://learn.jinnie.ph/'), 'https://learn.jinnie.ph/?embed=native');
  assert.equal(courseUrl('https://learn.jinnie.ph?lang=tl&embed=web#/path/kids'),
    'https://learn.jinnie.ph/?lang=tl&embed=native#/path/kids');
  assert.equal(courseUrl('http://localhost:3010/learn?lang=en'),
    'http://localhost:3010/learn?lang=en&embed=native');
  for (const url of ['file:///tmp', 'javascript:alert(1)', 'https://user:pass@learn.jinnie.ph/']) {
    assert.throws(() => courseUrl(url));
  }
});

test('Learn only trusts known Next routes beneath its configured course base', () => {
  for (const base of ['https://learn.jinnie.ph', 'http://localhost:3010/learn']) {
    const entry = courseUrl(base);
    for (const route of ['', '/', '/onboard', '/placement', '/placement/age', '/paths', '/path/kids',
      '/lesson/first.sweldo', '/bite/first.sweldo.1', '/bite/%66irst%2Esweldo%2E1', '/practice', '/me/']) {
      assert.ok(isCourseUrl(base + route + '?embed=native', entry), route);
    }
    for (const route of ['/unknown', '/index.html', '/placement/other', '/path/', '/bite/a/b', '/bite/a%2fb',
      '/bite/a%5cb', '/bite/a%252fb', '/bite/%00', '/bite/%zz', '/path/.hidden', '/me/settings']) {
      assert.equal(isCourseUrl(base + route, entry), false, route);
    }
    assert.equal(isCourseUrl('https://evil.example/me?embed=native', entry), false);
    assert.equal(isCourseUrl('javascript:alert(1)', entry), false);
  }
  const local = courseUrl('http://localhost:3010/learn');
  assert.equal(isCourseUrl('http://localhost:3010/me', local), false);
  assert.equal(isCourseUrl('http://localhost:3010/learn-evil/me', local), false);
  assert.equal(isCourseUrl('https://user:pass@learn.jinnie.ph/me', courseUrl('https://learn.jinnie.ph/')), false);
});

test('bridge rejects malformed, oversized and foreign messages', () => {
  const good = {source: 'jinnie-learn', id: 'learn_123-4', type: 'saveState', payload: {state: '{}'}};
  assert.deepEqual(parseLearnRequest(JSON.stringify(good)), good);
  const scroll = {source: 'jinnie-learn', id: 'scroll_1', type: 'scroll', payload: {direction: 'down', atTop: false}};
  assert.deepEqual(parseLearnRequest(JSON.stringify(scroll)), scroll);
  for (const input of ['not json', '{}', JSON.stringify({...good, source: 'other'}),
    JSON.stringify({...good, id: "');alert(1)"}), JSON.stringify({...good, type: 'postMoney'}),
    JSON.stringify({...good, payload: []}), 'x'.repeat(6 * 1024 * 1024)]) {
    assert.equal(parseLearnRequest(input), null);
  }
  assert.equal(validateState('{"bites":{}}'), '{"bites":{}}');
  for (const state of ['null', '[]', 'bad', 'x'.repeat(5 * 1024 * 1024)]) assert.throws(() => validateState(state));
});

test('accepts Android sourceOrigin only while a trusted Next course route is loaded', () => {
  const entry = courseUrl('https://cdn.example.com/learn');
  assert.equal(isTrustedMessageUrl('https://cdn.example.com', entry, 'https://cdn.example.com/learn/onboard?embed=native'), true);
  assert.equal(isTrustedMessageUrl(entry, entry, entry), true);
  assert.equal(isTrustedMessageUrl('https://evil.example.com', entry, entry), false);
  assert.equal(isTrustedMessageUrl('https://cdn.example.com/other', entry, entry), false);
  assert.equal(isTrustedMessageUrl('https://cdn.example.com', entry, 'https://cdn.example.com/other'), false);
  assert.equal(isTrustedMessageUrl(entry, entry, 'about:blank'), false);
  assert.equal(isTrustedMessageUrl('https://cdn.example.com/?fake=1', entry, entry), false);
  const root = courseUrl('https://learn.jinnie.ph/');
  assert.equal(isTrustedMessageUrl('https://learn.jinnie.ph', root, 'https://learn.jinnie.ph/me?embed=native'), true);
  assert.equal(isTrustedMessageUrl('https://learn.jinnie.ph', root, 'https://learn.jinnie.ph/other'), false);
  assert.equal(isTrustedMessageUrl('https://evil.example', root, root), false);
});

test('file exports allow bounded JSON/SVG names and valid base64 only', () => {
  assert.deepEqual(validateFile({name: 'jinnie-progress.json', mime: 'application/json', base64: 'e30='}),
    {name: 'jinnie-progress.json', mime: 'application/json', base64: 'e30='});
  assert.ok(validateFile({name: 'certificate.svg', mime: 'image/svg+xml', base64: 'PHN2Zz4='}));
  for (const item of [
    {name: '../secret.json', mime: 'application/json', base64: 'e30='},
    {name: 'test.html', mime: 'text/html', base64: 'e30='},
    {name: 'test.json', mime: 'application/json', base64: 'bad!'},
    {name: 'test.svg', mime: 'application/json', base64: 'e30='},
    {name: 'test.json', mime: 'application/json', base64: 'e30='.repeat(1500000)},
  ]) assert.throws(() => validateFile(item));
});

test('reply values remain data and deliver the matching response event', () => {
  const received: unknown[] = [];
  class CustomEvent { type: string; options: unknown; constructor(type: string, options: unknown) { this.type = type; this.options = options; } }
  const value = '</script>\";globalThis.compromised=true;//';
  const context = {CustomEvent, window: {dispatchEvent: (event: unknown) => received.push(event)}};
  vm.runInNewContext(responseScript('request-1', true, value), context);
  assert.equal((context as Record<string, unknown>).compromised, undefined);
  assert.deepEqual(JSON.parse(JSON.stringify(received)), [{type: 'jinnie-learn-response', options: {detail: {id: 'request-1', ok: true, value}}}]);
});

test('external navigation permits secure web, telephone and email links', () => {
  assert.equal(externalUrl('https://bsp.gov.ph/'), 'https://bsp.gov.ph/');
  assert.equal(externalUrl('tel:123'), 'tel:123');
  for (const url of ['javascript:alert(1)', 'file:///etc/passwd', 'intent://test', 'http://insecure.test', 'https://user:pass@example.com']) {
    assert.equal(externalUrl(url), null);
  }
  assert.deepEqual([...LEARN_APPS].sort(), ['accounts', 'bills', 'budget', 'circles', 'credit', 'debts', 'goals', 'remit', 'wallet']);
});
