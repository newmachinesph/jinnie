# Project environment

Inspected 17 September 2026 using Argent workspace inspection.

React Native 0.86.3 + Expo 57 prebuild; Re.Pack 5.3, Hermes, new architecture. This requires a native build, not Expo Go. Android is generated; iOS is configured but needs macOS build verification. Package manager: pnpm 11.20.0. On Windows use `pnpm.cmd`.

- Host: `pnpm --filter @jinnie/host start` (8081; use `--port 8082` if occupied).
- Local release remotes: `pnpm --filter @jinnie/host cdn:release` (9020).
- Build remotes: `pnpm -r --filter '!@jinnie/host' --if-present bundle:android`.
- Reverse device ports with explicit `adb -s SERIAL reverse tcp:8081 tcp:HOST_PORT`, plus 9020.
- Android build: `packages/host/android/gradlew.bat :app:assembleRelease --no-daemon`.
- Checks: `pnpm typecheck`, `pnpm test`.
- Package: `com.jinnie.app`; deep-link scheme: `jinnie`.
- SDK release origin: `https://sdk.jinnie.ph`, overridden by `JINNIE_CDN`; `https://jinnie-cdn.vercel.app` remains available for existing binaries.
- Cloudflare R2 public asset origin: `https://cdn.jinnie.ph`.
- Learn source is `C:/dev/jinnie-web`; override `JINNIE_LEARN_URL` for local device QA.

Do not reuse unrelated servers on 8081. Release bundles must be regenerated after changing compiled environment values. Store distribution needs production signing; local generated Android builds currently use a development key. iOS cannot be verified on this Windows host.
