# Intaglio V2 File Formats

`.int` recipes and `.intaglio` projects are ZIP containers with `manifest.json`, `checksums.sha256`, embedded hash-addressed assets, and an optional WebP thumbnail. `formatVersion` is `2.0.0`; the app ID is `intaglio-darkroom`.

```text
manifest.json
assets/source/<sha256>.<ext>       # .intaglio only
assets/luts/<sha256>.cube
assets/fonts/<sha256>.<ext>
assets/comparisons/<sha256>.webp # .intaglio only
previews/thumbnail.webp
checksums.sha256
```

Recipes contain graph/plate/mask/overlay/export defaults and their required LUT/font assets, but no source photograph, comparison snapshots, edit history, or virtual copies. Projects contain the untouched source plus the complete document, serialized edit history and virtual copies, and hash-addressed comparison snapshots.

Creation preflights browser quota before work begins and uses fflate's incremental ZIP writer. Asset checksums are also computed incrementally from Blob streams. Each Blob is fed to ZIP in stream chunks. Archives estimated at 64 MB or larger are written incrementally to a temporary origin-private file, retained until the download URL is revoked, and then removed; smaller archives use an in-memory Blob. A large save is blocked with a size-specific recovery message when OPFS or sufficient quota is unavailable instead of risking a tab crash. The 65 MB contract currently passes as a disk-backed `File` in automated Chromium; Playwright WebKit exercises the safe no-OPFS recovery path, so actual Safari qualification remains mandatory. Import preflights the central directory before extraction, but still requires the selected archive and expanded entries in browser memory; OPFS-backed extraction and the full 1 GB stress qualification remain release gates.

Imports reject traversal paths, missing or mismatched checksums, invalid graphs, unknown format/app IDs, more than 10,000 entries, expanded content above 1 GB, and suspicious compression ratios. Object URLs, filesystem paths, GPU resources, and browser cache keys are not document data.

Legacy `.orm`, `.ormond`, `.nyv`, `.nyvlt`, `.nyvproj`, and generic JSON files are unsupported.
