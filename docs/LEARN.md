# Jinnie Learn integration

Learn is a first-party federated mini app at port **9014**. Its full-height
React Native WebView embeds **https://learn.jinnie.ph/**. The course has one
source owner, **`jinnie-web`**: authored lessons and media live in `learn`, while
Next.js routes and React components provide the course interface. This includes
English/Tagalog content, blue/gold art, narration, captions, certificates and
learning interactions. This native repository contains only the wrapper and
bridge; it does not copy or package the course.

The host owns `react-native-webview` **13.16.1**, the version listed by this
workspace's installed Expo 57 `bundledNativeModules.json`. The native SDK is
**1.1.0** and Learn requires that SDK, so an older binary will hide the app until
it has the new native module. Rebuild the host after installing dependencies;
refreshing JavaScript alone cannot install WebView. iOS also needs regenerated
native projects and CocoaPods on macOS.

## Content and development

Edit course data/media in `jinnie-web/learn` and the course's Next.js components
in `jinnie-web/src/components/learn`; the App Router entry is in `src/app/learn`.
The website owns deployment to `learn.jinnie.ph`; changes do not require a native
content sync. There is no separate static HTML application or hash router.
Shared activity widgets are mounted and disposed within the React screens.
The native mini-app loads:

```text
https://learn.jinnie.ph/?embed=native
```

`JINNIE_LEARN_URL` configures the course route base and defaults to
`https://learn.jinnie.ph/` in both development and release. The wrapper preserves
the base path and existing query parameters, and sets
`embed=native`. Set this variable before starting or building `@jinnie/learn`;
restart its server after changing it. `.env.example` documents the values but
is not automatically loaded by Re.Pack.

`JINNIE_CDN` remains separate: it configures the host's app catalog and federated
containers. The native `cdn:pack` output contains `apps.json` and app bundles,
including the small Learn wrapper. Course HTML and media are hosted by the
website and are never included in that package.

```powershell
pnpm --filter @jinnie/host cdn
pnpm --filter @jinnie/learn start
pnpm --filter @jinnie/host start
```

For a local course preview, start the website from `jinnie-web`:

```powershell
pnpm dev --port 3010
```

That command starts the Next.js application and serves the shared course assets.
The website's `pnpm build:learn` publishes only canonical media into ignored
`public/learn-assets`, checking source hashes and swapping validated output with
rollback on failure. It does not copy course HTML, JavaScript or CSS. The root
`pnpm build` creates the Next.js production application and its service worker.
Then use this in the shell running the native Learn dev server:

```powershell
$env:JINNIE_LEARN_URL = "http://localhost:3010/learn"
pnpm --filter @jinnie/learn start
```

On Android, reverse `tcp:3010` to `tcp:3010` for the selected device in addition
to the normal host/CDN/mini-app ports. Use a device-reachable LAN URL instead
when connecting over Wi-Fi. Remove the override for the hosted course.

The normal `pnpm start` dashboard includes Learn. On Android the existing
`reverse` command includes the wrapper port 9014. The course first needs to be downloaded;
offline shell and media availability depend on the WebView engine and saved
media packs. Progress is stored by the native host even when a WebView cache is
cleared. Unavailable content shows a retry screen instead of discarding progress.

## Bridge and data

Only messages from the configured course origin and allowed routes are accepted.
The hosted paths are `/`, `/onboard`, `/placement`, `/placement/age`, `/paths`,
`/path/<id>`, `/lesson/<id>`, `/bite/<id>`, `/practice` and `/me`. Local preview
uses the same paths beneath `/learn`. IDs may be URL-encoded, but separators,
malformed encodings and unknown routes are rejected. Next.js navigation keeps
`embed=native` on its URLs. Requests are
JSON `{source:"jinnie-learn",id,type,payload}`. Replies dispatch
`jinnie-learn-response` with `{id,ok,value,error}` in the course window.

| Type | Payload | Result |
| --- | --- | --- |
| `ready` | None | Stored progress JSON string, or `null` |
| `saveState` | `{state: string}` | Persisted progress acknowledged after read-back |
| `openApp` | `{app: string}` | Push the real registered Jinnie app |
| `saveFile` | `{name,mime,base64}` | Open the native share sheet for a JSON backup or SVG certificate |

Progress is namespaced under `jinnie.learn.progress.v1`. Main Jinnie backup,
restore and local-data removal include it. Restoring an older backup without
Learn replaces and removes the previous Learn record. Standalone/browser progress
is separate and can be moved using Learn's backup import/export.

The course waits for native `ready` before enabling progress changes. Failed
hydration offers retry; successful native state replaces the browser mirror,
including clearing it after a main-app reset. Failed saves retain the latest
snapshot for a new mutation or explicit retry and prevent `openApp` dispatch
until saved. The course emits `jinnie-learn-save-status` with `{saved: boolean}`
and exposes `retryNativeSave()` for its retry interface. A pending backup restore
cannot prompt or apply after its React widget is disposed.

The navigation allowlist is Wallet, Budget, Accounts, Credit, Debts, Circles,
Remit, Goals and Bills. Navigation opens an app; it never posts a transaction or
copies lesson example amounts into financial records. The course receives no
account balances or ledger data. File sharing accepts JSON/SVG only, validates
filenames and base64, limits exports to 4 MB, and removes temporary files after
the share sheet closes. External links use the system browser or phone/email
handler; arbitrary schemes and document navigation are blocked.

Android hardware Back and the native Learn header's Back button navigate the
course's browser history before closing Learn. A small injected observer tracks
Next.js push/replace/pop navigation without replacing its router state; a second
reports scroll direction as `scroll` messages, so the native header collapses
while reading and returns on the first scroll up. Focus
and native app-state changes dispatch `jinnie-learn-visibility`, pausing both
narration and document audio/video when the course is hidden. Foreground loads
time out after 30 seconds; network failures and renderer termination show a
branded retry screen. Retry returns to the last trusted route and does not loop
automatically. Accepted final progress saves finish even when Learn closes.

## Checks

```powershell
pnpm -r typecheck
pnpm --filter @jinnie/sdk test
pnpm --filter @jinnie/learn test
pnpm --filter @jinnie/host test:cdn
pnpm --filter @jinnie/learn bundle:android
pnpm --filter @jinnie/learn bundle:ios
pnpm --filter @jinnie/host cdn:pack
```

Protocol tests cover hosted and local Next.js routes, encoded IDs, query
preservation, URL trust, malformed requests, file limits, response
escaping and navigation targets. CDN tests exercise MIME types, HEAD, normal
and suffix ranges, invalid ranges and path traversal. SDK tests cover Learn's
version gate and backup replacement behavior. Native UI verification requires
a rebuilt Android/iOS host; a browser-only check cannot establish that the
native WebView or share sheet works.

History-observer tests cover preserving Next.js router state and Back availability;
visibility tests cover narration notifications and pausing document media.
All nine Learn tests and the Learn/host TypeScript checks pass. Both Android and
iOS Learn JavaScript bundles build with the hosted route base.
The native CDN contains no course directory. These build checks do not deploy or
verify the public website.
The Next.js React course still needs a fresh Android runtime check using the local
preview or the deployed Learn domain. Prior static-course device checks below do
not establish runtime behavior of the new renderer. Any legacy
`cdn/learn-content` directory is unused,
ignored by Git and excluded from `cdn:pack`.

## Native verification — 11 September 2026

Before the hosting consolidation, verified on the Pixel_10a Android API 37 emulator with the rebuilt debug host
installed using `adb install -r`, preserving its existing profile. The host ran
on port 8082, Learn on 9014, Wallet on 9002 and the content CDN on 9020.
Content revision: `19d88235063e`. This records bridge and native UI verification;
it does not establish that the new hosted domain has been deployed.

- The recorded launcher-to-Learn fragment `.argent/flows/learn-native-direct.yaml`
  replayed all nine steps successfully. It requires an installed, unlocked host
  with onboarding complete and the development servers running.
- The full course rendered inside the native screen. Onboarding and a completed
  payslip bite persisted through the native bridge. A fresh Learn screen restored
  the completed bite even after its WebView local-storage mirror was removed.
- The authored Wallet action opened the real native Wallet; Android Back returned
  to the same lesson. No financial entry was created. Narration played, then its
  audio player stopped and unloaded when Learn lost focus.
- Me → Save progress backup opened the Android share sheet with a JSON file.
  Dismissing it returned to Learn and re-enabled export. No recipient was selected.
- The service worker controlled the course document. Full offline media-pack
  download and native certificate sharing were not manually exercised.
- Temporary Learn progress was removed after QA, restoring the initially absent
  native key. A fresh screen returned to onboarding with no browser mirror.

The runtime check caught Android WebView's origin-only message URL. The bridge
now accepts that origin only while the tracked top-level URL remains the exact
trusted course document; regression tests reject other documents and origins.
All 54 SDK, Learn-protocol and CDN tests passed. Android host compilation and
both Android/iOS Learn JavaScript bundles passed, and `cdn:pack` was refreshed.
Native iOS compilation/runtime was not verified on this Windows machine.
