# Architecture

Jinnie is a super app: a native host shell that loads independently built,
independently deployed mini apps at runtime.

## The three layers

| Layer | Package | Owns |
|---|---|---|
| **Host shell** | `packages/host` | The binary, every native dependency, navigation, the launcher, and the Module Federation remote wiring |
| **SDK / bridge** | `packages/sdk` | The bridge contract, the platform stores, catalogs, the UI kit, and the icon set |
| **Mini apps** | `packages/{accounts,wallet,…}` | One screen each. No native modules. |

```
                     ┌────────────────────────────┐
                     │ host (8081)                │
                     │  binary · navigation       │
   ┌─────────────────│  launcher · MF remotes     │──────────────┐
   │                 └────────────┬───────────────┘              │
   │                              │                              │
   │                 ┌────────────┴───────────────┐              │
   │                 │ @jinnie/sdk  (singleton)   │              │
   │                 │  useHost() · Wallet ledger │              │
   │                 │  catalogs · UI · icons     │              │
   │                 └────────────────────────────┘              │
   │                                                             │
 core: accounts 9001 · wallet 9002 · bills 9003                  │
       budget 9004 · insights 9005 · settings 9006               │
       subscriptions 9011 · credit 9012 · learn 9014             │
       security 9015 · settings 9006 (shell gear, unlisted)       │
 community: goals 9007 · debts 9008 · circles 9009 · remit 9010 ──┘
            shared 9013
```

## How federation is wired

No remote is compiled into the host. The list of apps is `apps.json`, served
from the CDN next to the bundles (`packages/host/cdn/apps.json` in this repo,
served on port 9020 in development):

```json
{"id": "accounts", "icon": "IconBank", "sdk": "1.0.0",
 "remote": "{origin}/accounts/{platform}/mf-manifest.json", ...}
```

On launch `packages/host/src/registry.ts` takes the copy cached from the last
run (or the copy bundled at build time on a first run), registers each row
with the federation runtime, and then refreshes from the CDN; offline, the
refresh is skipped. Rows whose `sdk` is newer than the host's are hidden, so
an old install degrades to the apps it can run. Publishing a new app is a new
row in that file: the host binary ships again only for a native dependency or
an SDK upgrade.

Offline: Re.Pack's `ScriptManager` keeps each downloaded bundle on disk in
release builds (`index.js`), and the host caches every app's
`mf-manifest.json` itself (`registry.ts`), because the runtime refetches that
file on every load and would fail first. After launch the host also loads
every app once in the background, so each opens at once afterwards and the
whole launcher works with no network. A new deploy applies on the next launch;
keep an old deploy's chunks on the CDN for a while.

Each app is then loaded by name through the runtime — `loadRemote('accounts/App')`
— rather than a static `import()`. The bundler compiles a static remote import
into a one-shot promise that caches its rejection, so a remote that failed once
could never be retried; the runtime call leaves nothing behind.

Each mini app exposes exactly one thing:

```js
exposes: {'./App': './src/App'}
```

`JINNIE_CDN` is the federation origin, and fills `{origin}` in every remote:
`http://localhost:9020` in development (the local CDN server proxies each
app path to that app's dev server, or serves release bundles with
`--release`), a LAN IP for a device on Wi-Fi alone, the real static origin
for release. The layout is the same everywhere: `apps.json` at the root and
`<app>/<platform>/mf-manifest.json` plus chunks beside it.

Learn's federated container is a native WebView wrapper. Its course is hosted
separately at `https://learn.jinnie.ph/`, with Next.js routes and React components
in `jinnie-web` sharing the authored data/media in `learn`. `JINNIE_LEARN_URL`
overrides that course route base independently
of `JINNIE_CDN`. The native CDN never copies or packages the course. The website
build publishes only canonical media to `public/learn-assets`; Next.js
renders and bundles the application. The former static application is retired.
Offline course availability depends on the WebView cache and saved media packs;
its progress remains in native SDK storage. See [LEARN.md](LEARN.md).

### Why `@jinnie/sdk` must be a singleton

Every entry in `packages/sdk/lib/dependencies.json` is shared with
`singleton: true`. For `react` and `react-native` that is the usual reason —
two copies of React crash. For `@jinnie/sdk` the reason is the product: the
Wallet ledger *is* a module-level Zustand store inside the SDK. A second copy
of the SDK would mean a second ledger, and Bills would post payments that
Wallet never sees.

The host loads them eagerly (`eager: true`); mini apps do not (`eager: false`),
so they resolve the host's copies instead of bundling their own.

## Core vs community

Every manifest declares a `kind`:

- **`core`** — first-party. The bridge grants `host.finance`: read the shared
  accounts and Wallet ledger, and post changes to it. This is how a paid bill
  appears in the Wallet instantly.
- **`community`** — sandboxed. `host.finance` is `undefined`, and the app gets
  key–value storage namespaced to its own id.

The check lives in one place — `HostProvider` in `packages/sdk/src/bridge.tsx`.

## Data

- **Offline-first.** Every store persists to AsyncStorage under
  `jinnie.<name>`. The shell holds the splash until `useStoresHydrated()`
  reports every store read, so no screen renders a zero balance that then
  jumps.
- **One money context.** `stores/wallet.ts` is the platform ledger. Only the
  SDK bridge exposes it, and only to core apps. Transfers carry source and
  destination account ids without changing cash-flow totals. Bill payments
  carry bill and period ids so Wallet edits and deletions reconcile Bills.
  Reversal is exact: asset overdrafts and liability credits are represented as
  negative balances rather than silently clamped.
- **Account lifecycle.** Only active accounts cross the bridge; archived
  accounts stay in local history and can be restored.
- **Portable backup.** Settings exports every `jinnie.*` key as JSON through
  `expo-file-system` + `expo-sharing`, and restores through
  `expo-document-picker`. Restore validates product, schema version, key
  namespace, file size, dates, and value types, and snapshots the current data
  first so a failed write can be rolled back. A backup can be sealed with a
  passphrase: `backup.ts` derives a key with PBKDF2-SHA256 in the platform's
  own crypto (`packages/host/modules/jinnie-crypto`, 600,000 rounds; a slower
  JavaScript fallback with the round count written into the file) and encrypts the payload
  with AES-GCM (`@noble/ciphers`, randomness from `expo-crypto`), so a wrong
  passphrase or an altered file simply fails to open. The onboarding's first
  slide offers a restore, so a new phone starts from the old one's backup.
- **App lock.** `app-lock.ts` keeps a salted SHA-256 of the PIN in the
  device keystore (`expo-secure-store`), never in AsyncStorage, so no backup
  or mini app can read it. The host swaps the whole tree for the lock screen on
  launch and after a minute in the background; fingerprint or face
  (`expo-local-authentication`) is a shortcut, never the only factor.
- **First run.** The shell owns the splash and the replayable walkthrough. The
  tour can be skipped; the name step cannot — Home greets by it, and it lives in
  `stores/profile.ts` like every other record. New profiles start clean; the
  sample profile is loaded, reset, or removed from the Sample data row in
  Settings.

### One deliberate change from the web build

On the web, each mini app owned its own store folder and the shell reached
across folder boundaries to seed and back them up. That does not survive
federation — the host cannot statically import a module that lives in a remote.

So every store lives in the SDK (`packages/sdk/src/stores`). The sandbox
guarantee is unaffected: it was never enforced by folder layout, but by the
bridge withholding `host.finance` and by per-app storage namespacing. Both
still hold.

## Where the host is not federated

Three screens are the shell's own, not remotes: Home, the launcher, and the
tab bar. They render totals from the SDK stores directly. Everything else the
user can reach is a mini app — including the three that have permanent tabs
(Wallet, Accounts, Bills), which mount the same remotes the launcher opens,
minus the back affordance.

## Failure is a normal state

A mini app is fetched over the network, so "did not load" is expected, not
exceptional. Each one renders inside its own `ErrorBoundary` (host
`src/components/ErrorBoundary.tsx`) with a retry: an unreachable dev server or
a bad bundle degrades to one broken tab, never a broken shell.

## Directory map

```
packages/
  host/        binary, navigation, launcher, Home, MF remotes, app icons
  sdk/         bridge, stores, catalogs, analytics, UI kit, icons, tests
  accounts/ wallet/ bills/ budget/ insights/ settings/     core mini apps
  subscriptions/ credit/ security/                         core mini apps
  goals/ debts/ circles/ remit/ shared/                    community mini apps
mprocs/        dev-server dashboard
docs/          this documentation
```
