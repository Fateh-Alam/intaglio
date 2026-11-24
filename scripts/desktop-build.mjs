// Builds Etch.app and the .dmg (`pnpm desktop:build`).
//
// With the update key present (~/.tauri/etch-updater.key, password in the
// macOS Keychain item "etch-updater-key"), it also signs the update archive
// and writes latest.json, ready to attach to a GitHub release. Without the
// key it still builds, just without update files.

import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { UPDATE_ARCHIVE, buildUpdateManifest, releaseAssetUrl } from "./lib/updateManifest.mjs";

const root = process.cwd();
const keyPath = process.env.ETCH_UPDATER_KEY ?? path.join(os.homedir(), ".tauri", "etch-updater.key");
const env = { ...process.env, CI: "true" }; // CI keeps the .dmg step from driving Finder.
const args = ["tauri", "build"];

const canSignUpdates = existsSync(keyPath);
if (canSignUpdates) {
  env.TAURI_SIGNING_PRIVATE_KEY = readFileSync(keyPath, "utf8");
  if (!env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD) {
    try {
      env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD = execFileSync("security", ["find-generic-password", "-s", "etch-updater-key", "-w"], { encoding: "utf8" }).trim();
    } catch {
      console.error('The update key needs its password: add the Keychain item "etch-updater-key" or set TAURI_SIGNING_PRIVATE_KEY_PASSWORD.');
      process.exit(1);
    }
  }
} else {
  console.warn(`No update key at ${keyPath}: building without update files.`);
  args.push("--config", JSON.stringify({ bundle: { createUpdaterArtifacts: false } }));
}

const build = spawnSync("pnpm", args, { stdio: "inherit", env });
if (build.status !== 0) process.exit(build.status ?? 1);
if (!canSignUpdates) process.exit(0);

const { version } = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
const bundleDir = path.join(root, "src-tauri", "target", "release", "bundle");
const signature = readFileSync(path.join(bundleDir, "macos", `${UPDATE_ARCHIVE}.sig`), "utf8");
const manifestPath = path.join(bundleDir, "latest.json");
writeFileSync(manifestPath, `${JSON.stringify(buildUpdateManifest({ version, signature, notes: process.env.ETCH_RELEASE_NOTES ?? "" }), null, 2)}\n`);

const dmg = path.join(bundleDir, "dmg", `Etch_${version}_aarch64.dmg`);
console.log(`
Release files for Etch ${version}:
  ${dmg}
  ${path.join(bundleDir, "macos", UPDATE_ARCHIVE)}
  ${manifestPath}

Publish them (installed copies update from ${releaseAssetUrl(version)}):
  gh release create v${version} "${dmg}" "${path.join(bundleDir, "macos", UPDATE_ARCHIVE)}" "${manifestPath}" --title "Etch ${version}" --notes "…"
`);
