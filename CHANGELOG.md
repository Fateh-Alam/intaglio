# Intaglio Changelog

## 0.1.0 public-beta stabilization — unreleased

- Preserved and stabilized the Process Engine, Plate Stack, Mask Blend, Tone Curve, Proof Sheet, and RenderGraph refactor.
- Introduced `IntaglioDocumentV2`, a validated typed graph, canonical plates/masks/brush vectors, overlays, asset references, and export profiles.
- Unified preview/proof/export/batch graph construction and deterministic text/watermark composition.
- Added CIEDE2000/SSIM parity gates, half-pixel landmark checks, proof deltas, and overlap-cropped tiling.
- Added checksum-verified ZIP `.int` recipes and `.intaglio` projects, incremental Blob hashing, quota preflight, and OPFS-backed large-archive creation with deterministic recovery errors.
- Added pinned worker-backed supported-camera RAW development and preserved originals.
- Added local batch ZIP export with progress, cancel/retry, hashes, and manifest.
- Replaced the old service worker with a Serwist/Turbopack-generated, content-revisioned Intaglio offline shell.
- Removed video, tethering, legacy formats, repair scripts, backup files, and unsupported claims.
- Fixed the master tone curve (previously ignored) and curves missing from export, batch, proof, and plates; curves are now overshoot-free PCHIP in a float32 table applied in display-encoded space.
- Fixed adjustment plates decoding sRGB twice; a single input transform now linearizes each source.
- Fixed creative LUTs being applied to linear light and quantized to 8 bits; LUTs are half-float 3D textures sampled in display-encoded space. LUT Creator and Palette Match now work and save their LUTs into projects.
- RAW sources now render from the decoder's 16-bit linear buffer in preview, export, and batch instead of the 8-bit proxy.
- Fixed rotation shear and elliptical lens distortion on non-square images, batch export double-decoding sRGB, an idle 60 fps render loop, letterbox-polluted histograms, and silent export failures.
- Added render-contract correctness gates (neutral plate, identity LUT, master curve in export) and the long-range [Pro Roadmap](docs/PRO_ROADMAP.md).

This entry records implementation only. Public-beta release claims remain blocked until the real-browser, installed/offline, stress, and Cloudflare runbook gates pass.
