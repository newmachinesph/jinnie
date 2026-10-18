import type {ComponentType} from 'react';
import {Platform} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getInstance,
  loadRemote,
  registerRemotes,
  type ModuleFederationRuntimePlugin,
} from '@module-federation/enhanced/runtime';
import {SDK_VERSION, getApp, parseAppsManifest, preferences, setApps, type MiniAppManifest} from '@jinnie/sdk';
import bundled from '../cdn/apps.json';

/*
 * The app registry.
 *
 * The list of apps lives on the CDN as `apps.json`, not in this binary. On
 * launch the host takes the copy it cached last time (or the one bundled at
 * build time, on a first run), registers each app's federation container from
 * it, then refreshes from the CDN in the background. A new app is therefore a
 * new row in that file; the host ships again only for a native dependency or
 * an SDK upgrade, and rows built for a newer SDK stay hidden on older hosts.
 */

declare const __JINNIE_CDN__: string;

const CACHE_KEY = 'apps';
const FETCH_TIMEOUT_MS = 8_000;
/** Outside the `jinnie.` prefix on purpose: backups must not carry these. */
const MANIFEST_CACHE_PREFIX = 'jinnie-cache.mf.';
const WARM_AFTER_MS = 5_000;

/**
 * The runtime fetches an app's `mf-manifest.json` on every load and, unlike
 * the bundle it names, never caches it. Offline that request failed first, so
 * no app opened even with its bundle already on disk. This answers from the
 * last copy and refreshes it in the background: an app opens without waiting
 * on the network, and a new deploy applies on the next launch. Re.Pack keeps
 * the bundles themselves (see index.js). Chunks named by an old manifest must
 * stay on the CDN for a while after a deploy.
 */
const manifestCache: ModuleFederationRuntimePlugin = {
  name: 'jinnie-manifest-cache',
  fetch(url, options) {
    const key = MANIFEST_CACHE_PREFIX + url;
    return AsyncStorage.getItem(key)
      .catch(() => null)
      .then(async cached => {
        if (cached) {
          void fetchManifest(url, options, key);
          return jsonResponse(cached);
        }
        const fresh = await fetchManifest(url, options, key);
        if (!fresh) throw new Error(`Could not download ${url}`);
        return jsonResponse(fresh);
      });
  },
};

async function fetchManifest(url: string, options: RequestInit, key: string): Promise<string | null> {
  try {
    const response = await fetch(url, options);
    if (!response.ok) return null;
    const text = await response.text();
    JSON.parse(text);
    await AsyncStorage.setItem(key, text);
    return text;
  } catch {
    return null;
  }
}

const jsonResponse = (text: string) =>
  new Response(text, {status: 200, headers: {'content-type': 'application/json'}});

/**
 * Load every app once, in the background, so each opens at once afterwards
 * and works offline. Release only: in development the bundles change and
 * the dev servers would rebuild all fourteen at every launch.
 */
async function warmRemotes(): Promise<void> {
  for (const app of apps) {
    try {
      await loadRemote(`${app.id}/App`);
    } catch {
      // Offline or a bad deploy: the app reports it when opened.
    }
  }
}

let apps: MiniAppManifest[] = [];

function parse(text: string): MiniAppManifest[] {
  return parseAppsManifest(text, {
    sdkVersion: SDK_VERSION,
    platform: Platform.OS,
    origin: __JINNIE_CDN__,
  });
}

/**
 * Swap in a list and tell the federation runtime where each container is.
 * Only new or moved containers are registered: re-registering one that is
 * already loaded would drop its instance and warn.
 */
function apply(next: MiniAppManifest[]): void {
  if (next.length === 0) return;
  apps = next;
  const registered = new Map(
    (getInstance()?.options.remotes ?? []).map(remote => [remote.name, (remote as {entry?: string}).entry]),
  );
  const changed = next.filter(app => registered.get(app.id) !== app.remote);
  if (changed.length > 0) {
    registerRemotes(
      changed.map(app => ({name: app.id, entry: app.remote})),
      {force: true},
    );
  }
  setApps(next);
}

/**
 * Resolves once a usable list is registered, so the shell can mount its tabs.
 * The CDN refresh continues after that and re-renders the launcher if the
 * list changed; offline it is simply skipped.
 */
export async function loadApps(): Promise<void> {
  getInstance()?.registerPlugins([manifestCache]);
  let current = parse(JSON.stringify(bundled));
  const cached = await preferences.get(CACHE_KEY);
  if (cached) {
    try {
      current = parse(cached);
    } catch {
      await preferences.remove(CACHE_KEY);
    }
  }
  apply(current);
  void refresh();
  if (!__DEV__) setTimeout(() => void warmRemotes(), WARM_AFTER_MS);
}

async function refresh(): Promise<void> {
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(`${__JINNIE_CDN__}/apps.json`, {signal: abort.signal, cache: 'no-store'});
    if (!response.ok) return;
    const text = await response.text();
    const next = parse(text);
    if (JSON.stringify(next) === JSON.stringify(apps)) return;
    apply(next);
    await preferences.set(CACHE_KEY, text);
  } catch (error) {
    if (__DEV__) console.warn('Apps manifest refresh failed', error);
  } finally {
    clearTimeout(timer);
  }
}

type RemoteLoader = () => Promise<{default: ComponentType}>;

/**
 * The federation runtime remembers a failed load — manifest, entry promise,
 * module instance — so a retry would replay the same rejection. Re-registering
 * the remote with `force` is the runtime's own reset.
 */
function forgetFailedRemote(id: string): void {
  const remote = getInstance()?.options.remotes.find(entry => entry.name === id);
  if (remote) registerRemotes([remote], {force: true});
}

/**
 * Remotes are loaded through the federation runtime, not a static
 * `import('accounts/App')`. The bundler compiles that import into a module
 * whose export is a one-shot promise; once it rejects, the bundler's module
 * cache replays the rejection on every retry, and nothing in the runtime can
 * clear it. `loadRemote` resolves the name against the remotes registered by
 * `loadApps` at request time, so a failed fetch leaves nothing behind.
 */
export function getRemote(id: string): RemoteLoader | undefined {
  if (!getApp(id)) return undefined;
  return () =>
    loadRemote<{default: ComponentType}>(`${id}/App`)
      .then(module => {
        if (typeof module?.default !== 'function') {
          throw new Error(`The ${id} bundle could not be downloaded.`);
        }
        return module;
      })
      .catch((error: unknown) => {
        forgetFailedRemote(id);
        const app = getApp(id);
        if (app) void AsyncStorage.removeItem(MANIFEST_CACHE_PREFIX + app.remote).catch(() => undefined);
        throw error;
      });
}
