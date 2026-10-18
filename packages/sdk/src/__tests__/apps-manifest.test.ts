import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe, it} from 'node:test';
import {compareVersions, parseAppsManifest} from '../manifest';

/*
 * `apps.json` is what the launcher shows and where every bundle is fetched
 * from. It is served from a CDN, so a bad row must be dropped, not crash the
 * host, and the shipped file must be valid on its own.
 */

const read = (path: string) => readFileSync(join(import.meta.dirname, path), 'utf8');
const shipped = read('../../../host/cdn/apps.json');
const sdkVersion = (JSON.parse(read('../../lib/dependencies.json')) as Record<string, {version: string}>)['@jinnie/sdk'].version;
const options = {sdkVersion, platform: 'android', origin: 'http://localhost:9020'};

describe('Apps manifest', () => {
  it('ships a manifest every row of which the current SDK accepts', () => {
    const apps = parseAppsManifest(shipped, options);
    const raw = JSON.parse(shipped) as {apps: unknown[]};
    assert.equal(apps.length, raw.apps.length);
    assert.equal(
      apps.find(app => app.id === 'accounts')?.remote,
      'http://localhost:9020/accounts/android/mf-manifest.json',
    );
  });

  it('hides apps built for a newer SDK and drops malformed rows', () => {
    const rows = JSON.parse(shipped) as {version: number; apps: Record<string, unknown>[]};
    const [good] = rows.apps;
    const text = JSON.stringify({
      version: 1,
      apps: [
        good,
        {...good, id: 'future', sdk: '9.0.0'},
        {...good, id: 'Bad Id'},
        {...good, id: 'no-tone', tone: 'neon'},
        {...good, id: 'emoji', icon: '💸'},
        {...good, id: 'grants-not-a-list', grants: 'wallet:post'},
        {...good, id: good.id},
        'not an object',
      ],
    });
    assert.deepEqual(
      parseAppsManifest(text, options).map(app => app.id),
      [good.id],
    );
  });

  it('offers first-party Learn only to binaries with its WebView and bridge SDK', () => {
    const learn = parseAppsManifest(shipped, options).find(app => app.id === 'learn');
    assert.equal(learn?.kind, 'core');
    assert.equal(learn?.author, 'Jinnie');
    assert.equal(learn?.icon, 'IconEducation');
    assert.equal(learn?.remote, 'http://localhost:9020/learn/android/mf-manifest.json');
    assert.equal(parseAppsManifest(shipped, {...options, sdkVersion: '1.0.0'}).some(app => app.id === 'learn'), false);
  });

  it('keeps known grants and ignores unknown ones', () => {
    const rows = JSON.parse(shipped) as {apps: Record<string, unknown>[]};
    const [good] = rows.apps;
    const text = JSON.stringify({
      version: 1,
      apps: [{...good, grants: ['wallet:post', 'ledger:read']}, {...good, id: 'plain'}],
    });
    const [granted, plain] = parseAppsManifest(text, options);
    assert.deepEqual(granted.grants, ['wallet:post']);
    assert.deepEqual(plain.grants, []);
    assert.deepEqual(
      parseAppsManifest(shipped, options).filter(app => app.grants.length > 0).map(app => app.id),
      ['debts', 'remit'],
    );
  });

  it('refuses a document that is not an apps manifest', () => {
    assert.throws(() => parseAppsManifest('{"version":2,"apps":[]}', options));
    assert.throws(() => parseAppsManifest('[]', options));
    assert.throws(() => parseAppsManifest('not json', options));
  });

  it('orders versions numerically', () => {
    assert.ok(compareVersions('1.10.0', '1.9.0') > 0);
    assert.equal(compareVersions('1.0', '1.0.0'), 0);
    assert.ok(compareVersions('0.9.9', '1.0.0') < 0);
  });
});
