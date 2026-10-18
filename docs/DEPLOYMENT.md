# Hosting — 17 September 2026

| Service | Project / origin | Verification |
| --- | --- | --- |
| Business site | Vercel `sumnora/jinnie-web`, `https://jinnie.ph` | Production HTML and real screenshot return 200 |
| Learn | Same Next.js deployment, `https://learn.jinnie.ph` | HTTPS, native embed, course routes, metadata, and worker verified |
| SDK mini apps | Vercel `sumnora/jinnie-cdn`, `https://sdk.jinnie.ph` | HTTPS and all 30 Android/iOS entry checksums verified |
| Media | Cloudflare R2, `https://cdn.jinnie.ph` | 2,014 assets uploaded; image hashes and audio/video ranges verified |

`https://jinnie-cdn.vercel.app/apps.json` serves all 15 apps requiring SDK 1.2.0.
All 30 Android/iOS manifests and entry-bundle checksums match the local release.
The previously installed APK uses this retained Vercel alias; future builds
default to `https://sdk.jinnie.ph`.

The web project's production variables are:

- `NEXT_PUBLIC_SITE_URL=https://jinnie.ph`
- `NEXT_PUBLIC_LEARN_URL=https://learn.jinnie.ph/`
- `JINNIE_ASSET_ORIGIN=https://cdn.jinnie.ph`

Next proxies media requests to R2 while retaining same-origin URLs for Learn's
offline worker. The R2 publisher is `pnpm --filter @jinnie/host assets:upload`;
it uploads only generated Learn media and website screenshots. Upload media
before deploying website changes that reference it. Existing old SDK objects
in R2 have been preserved, but new SDK deployments go to Vercel.

The SDK project is intentionally disconnected from the monorepo's Git integration:
its deployment input is the generated `.build/jinnie-cdn` directory, not the app
repository root. The web project is connected to `sumnora/jinnie-web`.

## DNS verified

Vercel verifies the apex and these Cloudflare DNS-only CNAMEs:

| Name | Target |
| --- | --- |
| `learn` | `5bb64d0e3282cc0c.vercel-dns-016.com` |
| `sdk` | `66d822031f591af2.vercel-dns-016.com` |

The existing `cdn` R2 custom domain is unchanged. The provided Cloudflare token
cannot access this DNS zone, but the records appeared during deployment and
Vercel reports both configured correctly. The workstation retained negative
DNS answers temporarily; custom-host HTTPS checks used Vercel's reported public
IP while retaining hostname-based TLS certificate verification. No DNS
credentials are stored in this document.
