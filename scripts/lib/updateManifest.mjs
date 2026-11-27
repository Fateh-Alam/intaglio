// The `latest.json` the Etch Mac app's updater reads (see src-tauri/src/updates.rs).

export const RELEASES_REPO = "Fateh-Alam/intaglio";
export const UPDATE_ARCHIVE = "Etch.app.tar.gz";

/** Download URL of the update archive attached to the release for `version`. */
export function releaseAssetUrl(version, asset = UPDATE_ARCHIVE, repo = RELEASES_REPO) {
  return `https://github.com/${repo}/releases/download/v${version}/${asset}`;
}

/**
 * Builds the updater manifest for an Apple Silicon release.
 * `signature` is the contents of the `.sig` file Tauri writes next to the archive.
 */
export function buildUpdateManifest({ version, signature, notes = "", date = new Date() }) {
  if (!/^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-rc\.[1-9]\d*)?$/.test(version)) {
    throw new Error(`Version must look like 1.2.3 or 1.2.3-rc.1, got "${version}".`);
  }
  if (!signature?.trim()) throw new Error("The update archive has no signature. Build with the update key.");
  return {
    version,
    notes,
    pub_date: date.toISOString(),
    platforms: {
      "darwin-aarch64": { signature: signature.trim(), url: releaseAssetUrl(version) },
    },
  };
}
