# Input and release verification — 17 September 2026

The SDK is now 1.2.0. All packaged mini apps require that host version, matching
their federation manifests. Numeric apps import the new strict input parser
and calendar validator. Release hosts use
`https://jinnie-cdn.vercel.app`; `cdn.jinnie.ph` is reserved for assets.

## Input contract

- `Input money` shows thousands separators while editing and passes ungrouped
  strings to the form. It preserves decimal points and trailing zeroes.
- Money accepts two decimal places by default; exchange rates allow six.
- Negative numbers require `signed`. Opening balances use this option.
- Numeric input rejects letters, scientific notation, excess precision, and
  values with more than 12 integer digits. Submitted values must be below
  one trillion in magnitude.
- Day-of-month fields accept integers from 1 to 31. Card suffixes require
  exactly four digits when supplied. Dates must be real YYYY-MM-DD dates.
- Required text, numeric ranges, and dates show inline errors after blur;
  rejected edits explain the expected format immediately. Form submit guards
  remain in place. PINs keep their existing length/security rules.
- Learn wish amounts and numeric exercises group digits, preserve caret
  position, and report invalid data. Money requires a positive amount with
  up to two decimals; lessons can accept signed numeric answers.

## Verification

- All 17 workspace package type checks passed.
- SDK: 48 tests; native Learn: 10; CDN server: 3 — all passed.
- Learn web: 64 tests passed; website lint, TypeScript, and production build passed.
- All 15 mini apps built successfully for Android and iOS JavaScript.
- Android release APK assembled successfully after retrying the packaging task.
- The final release APK was installed on the attached phone; onboarding, Home,
  and Bills loaded successfully using the existing deployed Vercel bundles.
  This confirms the production origin; the new remotes were tested locally.
- Attached vivo V2205 (Android 14): Home, Wallet, Accounts, Bills, launcher,
  Settings, and Security opened; seven real sample-data screens captured.
- Bills amount `1234567.50` displayed `1,234,567.50`; a third fractional digit
  was rejected without changing the value; due day 32 disabled Add bill.
- Learn onboarding amount on Android Chrome displayed `1,234,567.50`.
- Business homepage and real screenshot composition checked in Android Chrome.

## Prepared outputs and remaining release work

This section records the initial local build. Subsequent publication status and
the move to `sdk.jinnie.ph` / `cdn.jinnie.ph` are in [DEPLOYMENT.md](DEPLOYMENT.md).

- APK: `packages/host/android/app/build/outputs/apk/release/app-release.apk`.
- CDN folder: `.build/jinnie-cdn` (Android and iOS containers plus apps.json).
- Website: `C:/dev/jinnie-web` production build.
- These changes have not been published to Vercel or app stores. Publish the
  new host alongside SDK 1.2.0 remotes; older hosts cannot run those remotes.
- The local APK uses the generated development signing key. Production signing,
  store submission, and native iOS build/device QA remain necessary.
- EAS now selects Node 24.18.0, matching the locally validated runtime and
  satisfying the installed React Native engine requirement.
- Desktop visual QA was unavailable: automatic approval review blocked a
  shell browser launch, and the browser connector reported no available browser.
  No DNS changes were made.

The on-device checks cover representative shared inputs, not every individual
form or platform. Keep the automated regression suite and verify store-signed
builds before distribution.
