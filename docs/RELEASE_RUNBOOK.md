# Intaglio Public-Beta Release Runbook

## Local automated evidence

Run `pnpm qualify`, then record frozen-install, typecheck, lint, unit/render/archive tests, Next build, Chromium/WebKit browser and offline automation, and OpenNext build separately. A local pass does not prove actual Safari/Chrome, installed-app, or live behavior.

For archive evidence, record OPFS availability, reported quota, source/archive byte lengths, ZIP signature, whether the returned object is disk-backed, and peak process memory. The automated 65 MB Chromium probe is only an implementation gate; release still requires the 1 GB round-trip and restart/offline restore gate. A safe WebKit preflight rejection is not evidence that actual Safari supports large disk-backed creation.

## Browser and install evidence

Qualify current/previous Chrome and Safari on Apple Silicon. Record editor/graph/masks/archives/proofs/exports/batch, keyboard/accessibility, actual Safari WebDriver/manual behavior, Chrome installed PWA, Safari Add to Dock, complete network loss, restart, update without mixed chunks, and local-project preservation.

## Cloudflare cutover

1. Create the `intaglio` Worker and `intaglio-opennext-cache` R2 bucket.
2. Validate bindings and OpenNext through a non-public preview URL.
3. Warm the disposable incremental cache and verify routes/assets/offline update.
4. Switch `intaglio.app` traffic once.
5. Retain the former Worker/cache for 72 hours as rollback only.
6. Remove former resources only after live route, asset, error, and offline-update health checks remain clean.

Do not report a public-beta release from a local build or synthetic WebKit result alone.
