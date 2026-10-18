# App catalog screenshot capture — 17 September 2026

Captured Budget, Insights, Subscriptions, Credit, Learn, Goals, Debts, Circles,
Remit, and Shared from Jinnie 1.0.0 on the attached vivo V2205. The original
488 × 1088 PNGs are in `../jinnie-web/public/screens/`. All ten were visually
inspected and uploaded to `https://cdn.jinnie.ph/screens/`; SHA-256 hashes match.

The website commit is `eed265f`. Lint, production build, all 14 catalog detail
pages, all catalog thumbnails, and all original and optimized production image
responses passed verification.

## Recorded route

Replay from the app repository:

```powershell
argent flow run app-catalog-captures-20260917 --platform android --device 10AC8H2WBT000GZ
```

Requires an unlocked test device with Jinnie installed, first-run setup already
completed, sample data initially absent, and Learn still on its English age
selection welcome screen. The route loads the built-in Reyes sample household
and removes it at the end. It does not create user transactions or learning
progress. Capture the desired screen with Argent's screenshot tool; the route
does not automatically copy PNGs into the website.

The manual capture completed. **The automated replay is unverified:** it stopped
at step 72 before Circles because Android's devtools helper reported “Service is
currently terminating.” The report recorded 60 passed, 0 failed, 1 errored, and
32 skipped steps. This is an environment error, not a passing regression test.
Temporary sample records were removed manually after the interrupted replay.

Recorder coordinate fallbacks for Home and Settings were replaced with semantic
selectors; their replay steps were skipped by the helper failure and remain
unverified. Element-seeking swipes were converted to `scroll-to`; no coordinate
or raw-gesture exceptions remain in the saved YAML.
