# Mini-App SDK

Build an app for Jinnie: one package, one manifest entry, one exposed screen.

## 1. Create the package

Copy an existing community app — `packages/remit` is the smallest useful
template. A mini app is:

```
packages/hello/
  package.json         name: @jinnie/hello
  rspack.config.mjs    container name 'hello', exposes './App', devServer port
  babel.config.js      react-native preset
  react-native.config.js
  index.js             standalone entry (dev only)
  app.json
  src/App.tsx          the default export the host renders
```

The container name in `rspack.config.mjs` and the `id` in `apps.json` must
match — that pairing is what resolves `hello/App` at runtime.

## 2. Write the screen

```tsx
import React from 'react';
import {Card, Body, useHost} from '@jinnie/sdk';

export default function HelloApp() {
  const host = useHost();
  return (
    <Card>
      <Body>
        Hello from {host.app.name} — {host.online ? 'online' : 'offline'}.
      </Body>
    </Card>
  );
}
```

The host provides the screen's scroll container, app bar, safe area, and error
boundary. Return content, not a screen.

## 3. Register it with the host

One row in `packages/host/cdn/apps.json`, the manifest the host fetches on
launch:

```json
{
  "id": "hello",
  "name": "Hello",
  "description": "My first mini app.",
  "icon": "IconGrid",
  "tone": "violet",
  "kind": "community",
  "author": "Your Name",
  "version": "1.0.0",
  "sdk": "1.0.0",
  "remote": "{origin}/hello/{platform}/mf-manifest.json"
}
```

`icon` is the name of any icon in the SDK set, `sdk` is the lowest SDK the
bundle runs against (older hosts hide the row), and `remote` is the container's
manifest with `{origin}` and `{platform}` filled in by the host.

A community app sees only its own storage. If it settles money and should be
able to record that, add `"grants": ["wallet:post"]`: the bridge then carries
`host.wallet`, which lists the active accounts and posts one income or expense
entry. It never exposes balances or history; that stays with core apps and
`host.finance`. Debts and Remit use it. Restart the
host once so the bundled copy of the file matches, then relaunch: the launcher
shows the app and loads `hello/App` by name. Nothing else is declared.

Add it to `mprocs/host.yaml`, then `pnpm start`.

## The bridge — `useHost()`

The only way a mini app may talk to the host.

| Member | Type | Notes |
|---|---|---|
| `app` | `{id, name, version}` | Your manifest identity |
| `user` | `{id, name} \| null` | `null` until host sign-in ships |
| `online` | `boolean` | Live connectivity, from NetInfo |
| `currency` | `string` | `'PHP'` |
| `storage` | `get/set/remove` | **Async.** Namespaced to your app id |
| `finance` | `HostFinance?` | **Core apps only** — `undefined` for community apps |
| `close()` | `() => void` | Return to the launcher |

> **Changed from the web build:** `storage` is asynchronous. AsyncStorage is,
> and pretending otherwise would mean losing writes. Every method returns a
> promise.

`HostFinance` (core only) exposes `balance`, `baseCurrency`, active
`accounts`, PHP-normalised `assetTotal` / `liabilityTotal` / `netWorth`, the
read-only Wallet `transactions`, and four mutations:

- `addTransaction({type, amount, description, category, accountId?, billId?, billPeriod?})`
- `transferBetweenAccounts({amount, description, fromAccountId, toAccountId})`
- `updateTransaction(id, changes)`
- `deleteTransaction(id)`

Transfers are neutral to cash flow and move both linked balances. Linked
account balances and bill-payment status are reconciled when an entry is edited
or deleted. Mutations reject non-finite or non-positive amounts, blank
descriptions, unknown or archived account ids, and same-account transfers.

The reviewed implementation is `packages/sdk/src/finance-actions.ts` — the
bridge and the regression suite call the same code, so a test that passes is a
statement about the app, not about a copy of it.

## Public catalogs

Read-only platform metadata, safe for any app. Never a user's balances.

```tsx
import {
  catalogs, financialProviders, transactionCategories, billers, currencies,
  ProviderPicker, CategorySelect, BillerPicker, CurrencyPicker, AccountPicker,
} from '@jinnie/sdk';
```

Persist the id, not the display label, so copy and localisation can change
safely.

Every catalog picker ends with **Add new…**. A name the user types there is
saved once to `useCatalogStore` (`jinnie.catalog`) and offered in every picker
of that kind from then on — categories carry their ledger side, billers the
bill category they were created under. User entries have `user-` ids and
resolve through the same lookups as built-ins (`getTransactionCategory`,
`getProvider`, `getBiller`), so nothing downstream needs to know the
difference. Use the reactive lists — `useTransactionCategories(group)`,
`useFinancialProviders()`, `useBillers()` — when rendering a list yourself.

Every category has a glyph (`category.icon`); draw it with `CategoryMark`,
and institutions and billers with `ProviderMark`.

`ProviderMark` draws a bundled logo when `packages/sdk/src/logos.ts` has one
for the id, and the monogram otherwise. Logos come from Wikimedia Commons via
`packages/sdk/scripts/logos/`: `logo-picks.json` maps ids to Commons files,
`logo-fetch.mjs` downloads them with their licence, `logo-optimize.sh` runs
svgo, and `logo-emit.mjs` writes `logos.ts`, skipping anything
react-native-svg cannot draw (embedded rasters, CSS-only styling).

Community apps may use `ProviderPicker` — the provider list is public product
metadata. `host.finance` stays `undefined` regardless.

## Rules

1. **Import only from `@jinnie/sdk`, `react`, and `react-native`.** Never reach
   into another app's package or into the host.
2. **No native dependencies.** The host owns them. If you truly need one, it
   has to be added to the host and to `lib/dependencies.json` as a shared
   singleton, which means a host release — that is the cost the architecture is
   designed to make visible.
3. **Offline-first.** Anything you persist goes through `host.storage` or a
   store in the SDK. Any network call must degrade gracefully and disclose what
   it sends.
4. **No colour literals.** `useTheme()` or a named `Tone`. Both schemes must
   look deliberate.
5. **Every tap target is at least 44pt, and every icon-only control has a
   label.** The SDK components enforce this; do not hand-roll around them.
6. **One sheet at a time.** A `Select` inside a `Sheet` opens as a page of
   that sheet (back arrow, same scrim); anything else that needs its own
   screen from inside a sheet pushes a page through `SheetPagesContext`.
   Never render a `Sheet` while another is open, and let an `ActionSheet`
   close before the sheet it leads to opens.
7. **English copy, professional tone, no emoji.** Use the icon set.

## Testing

Finance logic lives in the SDK and is exercised by
`packages/sdk/src/__tests__/`, which runs under plain Node with in-memory
storage shims:

```powershell
pnpm test
```

Add cases there for anything that touches money. Screens are not unit-tested —
verify those on a device.

## Deploying a mini app

Build the container and serve `mf-manifest.json` plus the bundle from any
static origin:

```powershell
pnpm --filter @jinnie/hello bundle:android
```

Upload `build/generated/<platform>/` as `hello/<platform>/` on the same static
origin that serves `apps.json`. The R2 bucket (via `cdn:pack` and
`cdn:upload`) is that origin; any static host works, there is no server code.
The host is built with `JINNIE_CDN` naming that origin. To check the release path on a phone first, run
`pnpm --filter @jinnie/host cdn:release`, which serves every app's release
bundle under the same paths from your machine.

Because the host reads that file on launch, both a new bundle and a new app
reach existing installs without an app-store release. The host binary changes
only when a native dependency or the SDK does.

## Learn navigation bridge (SDK 1.1)

Core mini apps may call the optional `host.openApp(appId)` to push a registered
sibling mini app. It returns `false` for an unavailable app and never writes
financial records. The host wires this to native stack navigation, so Back
returns to the previous screen. Community mini apps do not receive this method.
Learn uses this route for its practical action links; its WebView bridge is
documented in [LEARN.md](LEARN.md).
