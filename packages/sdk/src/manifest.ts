import type {ComponentType} from 'react';
import type * as icons from './icons';
import type {Tone} from './theme';

export interface IconProps {
  size?: number;
  color?: string;
}

/** Any `Icon*` export of the SDK icon set, by name. */
export type IconName = Extract<keyof typeof icons, `Icon${string}`>;

/**
 * How a mini app describes itself to the platform.
 *
 * The list of apps is not compiled into the host: it is a JSON file served
 * next to the bundles (`apps.json`), fetched on launch and cached. So every
 * field here is plain data. The icon is a name looked up in the SDK set, and
 * the bundle location is a URL, both of which a JSON file can carry.
 */
export interface MiniAppManifest {
  /** Unique id. Also the Module Federation container name and the route param. */
  id: string;
  name: string;
  /** One sentence, shown on the launcher and in the directory. */
  description: string;
  /** Name of an icon in the SDK set. No emoji anywhere in the product. */
  icon: IconName;
  /** Accent for the launcher tile and app bar mark. */
  tone: Tone;
  /**
   * 'core' — first-party app; receives the shared finance context.
   * 'community' — sandboxed to its own namespaced storage.
   * 'system' — first-party, opened from the shell (the gear) rather than listed in the launcher.
   */
  kind: 'core' | 'community' | 'system';
  author: string;
  version: string;
  /** Lowest `@jinnie/sdk` the bundle runs against. Newer than the host: hidden. */
  sdk: string;
  /** The container's `mf-manifest.json`, with `{origin}` and `{platform}` filled in. */
  remote: string;
  /** Extra access a community app is given. Core apps have the ledger already. */
  grants: Grant[];
}

/**
 * What a community app may do beyond its own storage. Declared in the
 * manifest, so it is visible before the bundle is fetched. Today there is one:
 * post an income or expense entry to Wallet. Reading the ledger stays core-only.
 */
export type Grant = 'wallet:post';
const GRANTS: readonly Grant[] = ['wallet:post'];

export const APPS_MANIFEST_VERSION = 1;

const TONES: readonly Tone[] = ['indigo', 'gold', 'emerald', 'blue', 'sky', 'violet', 'amber', 'rose', 'slate'];

/** `a` < `b` → negative. Dotted numerics only; anything else counts as 0. */
export function compareVersions(a: string, b: string): number {
  const left = a.split('.').map(Number);
  const right = b.split('.').map(Number);
  for (let i = 0; i < Math.max(left.length, right.length); i += 1) {
    const diff = (left[i] || 0) - (right[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/**
 * Validate an `apps.json` body. A CDN response is untrusted input: every row
 * is checked field by field, bad rows are dropped rather than crashing the
 * launcher, and apps built for a newer SDK than this host are hidden. Throws
 * only when the document itself is not an apps manifest.
 */
export function parseAppsManifest(
  text: string,
  {sdkVersion, platform, origin}: {sdkVersion: string; platform: string; origin: string},
): MiniAppManifest[] {
  const document: unknown = JSON.parse(text);
  if (
    typeof document !== 'object' ||
    document === null ||
    (document as {version?: unknown}).version !== APPS_MANIFEST_VERSION ||
    !Array.isArray((document as {apps?: unknown}).apps)
  ) {
    throw new Error('Not a Jinnie apps manifest');
  }

  const seen = new Set<string>();
  const apps: MiniAppManifest[] = [];
  for (const row of (document as {apps: unknown[]}).apps) {
    const app = readApp(row);
    if (!app || seen.has(app.id)) continue;
    if (compareVersions(app.sdk, sdkVersion) > 0) continue;
    seen.add(app.id);
    apps.push({
      ...app,
      remote: app.remote.replace('{origin}', origin).replace('{platform}', platform),
    });
  }
  return apps;
}

function readApp(row: unknown): MiniAppManifest | null {
  if (typeof row !== 'object' || row === null) return null;
  const r = row as Record<string, unknown>;
  const text = (key: string) => (typeof r[key] === 'string' && r[key] !== '' ? (r[key] as string) : null);
  const id = text('id');
  const name = text('name');
  const description = text('description');
  const icon = text('icon');
  const author = text('author');
  const version = text('version');
  const sdk = text('sdk');
  const remote = text('remote');
  const tone = r.tone;
  const kind = r.kind;
  if (!id || !name || !description || !icon || !author || !version || !sdk || !remote) return null;
  if (!/^[a-z][a-z0-9-]*$/.test(id) || !icon.startsWith('Icon')) return null;
  if (!TONES.includes(tone as Tone) || (kind !== 'core' && kind !== 'community' && kind !== 'system')) return null;
  if (r.grants !== undefined && !Array.isArray(r.grants)) return null;
  // Unknown grants are ignored rather than fatal: an older host can still show
  // an app that asks for something it does not know about.
  const grants = ((r.grants ?? []) as unknown[]).filter((grant): grant is Grant =>
    GRANTS.includes(grant as Grant),
  );
  return {id, name, description, icon: icon as IconName, tone: tone as Tone, kind, author, version, sdk, remote, grants};
}
