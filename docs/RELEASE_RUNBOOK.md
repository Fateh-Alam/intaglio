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

## macOS app (Tauri shell)

The Mac app is built from `src-tauri/` with `pnpm desktop:build` (roadmap §10, phase D1).

### Distribution without notarization (decided 2026-11-24)
Etch ships outside the paid Apple Developer Program, so builds are **ad-hoc signed, not notarized** (`bundle.macOS.signingIdentity: "-"`). What that means:

- **First launch needs one extra step.** macOS blocks apps from unidentified developers. On macOS 15 and later: open Etch, dismiss the warning, then **System Settings → Privacy & Security → Open Anyway**. The download page must show these steps with screenshots, in plain words, because this step is where a beginner gives up (roadmap rule 9).
- **After that, nothing changes.** Updates from the in-app updater are signed with Etch's own update key (not Apple's), and files the app downloads itself aren't quarantined, so updates install without warnings.
- **Ad-hoc signatures change every build.** macOS may ask again for permissions it ties to the signature (for example, folder access) after an update. Keep anything that needs a permission optional.
- **No Mac App Store** for now. If a Developer ID becomes affordable later, add `APPLE_SIGNING_IDENTITY` and the notary credentials to the build environment; nothing else changes.

### Update key (keep it safe)
Updates are signed with Etch's own key, not Apple's. Installed copies trust only this key, so:

- **Private key:** `~/.tauri/etch-updater.key`. **Password:** the macOS Keychain item `etch-updater-key`. Neither ever goes in the repository.
- **Back up both now**, together, somewhere other than this Mac (for example a password manager's secure note). If the key is lost, existing installs can never receive another update; people would have to download a new copy by hand.
- **If the key leaks**, someone could sign a fake update. Generate a new key, ship a release signed with the **old** key that switches the app to the new public key, then retire the old one.
- On another machine, put the key back at that path (or set `ETCH_UPDATER_KEY`) and the password in the Keychain (or set `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`).

### Publishing a release
1. Bump `version` in `package.json` (the app reads its version from there) and describe the release in `CHANGELOG.md`.
2. `pnpm desktop:build`. With the key present it signs `Etch.app.tar.gz`, writes `latest.json` and prints the exact `gh release create` command.
3. Run the release checks below, then that command. It uploads the `.dmg` (for new installs), `Etch.app.tar.gz` and `latest.json` (for updates) to a release tagged `v<version>`.
4. Installed copies find it through `releases/latest/download/latest.json` within a day, or at once from **Check for Updates…**. A draft or pre-release isn't "latest", so mark the release as published only when it is ready.

### Release checks
- `codesign -dv src-tauri/target/release/bundle/macos/Etch.app` shows `Signature=adhoc`.
- On a second Mac: download the `.dmg` from the release page, drag Etch to Applications, follow the first-launch steps, and confirm it opens.
- Open a photo, edit, **Export** (native Save sheet writes the file), **Save Project** and reopen it by double-clicking it in Finder, open a JPEG with **Open With → Etch**, use **File → Open Recent**, and drop a RAW file on the window.
- Every menu item works, and ⌘O/⌘S/⌘E/⌘Z fire once (not twice).
- The render contract matches Safari on the same machine.
