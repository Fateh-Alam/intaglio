# Etch Changelog

## 1.0.0-rc.2 for macOS

- Added the local photo library with folder import, cached camera previews, keyboard culling, ratings, and selected batch export.
- Brought the web editor's Titles, Grade mode, and Creative Effects sidebar to Mac. Effects can preview on the Metal canvas before they are applied.
- Animated Creative Effects export as H.264 MP4 to a folder you choose. A new export gets a numbered suffix if its filename is already in use.

## 1.0.0-rc.1 for macOS

- Bloom and halation use the same spread at Fit, at 100% zoom, and in exports. Film grain stays anchored to the photo and softens as it becomes too fine for the preview to resolve.
- Includes the Metal editor preview, tiled zoom, mask overlays, saved serial Grade Graphs, and color-managed RGB ICC input described below.

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
- Fixed Color Mixer luminance (and hue/saturation) bands changing pure greys at random: OKLab gives a grey a "hue" made of rounding noise, so a band could brighten or darken neutral tones, differently per GPU. Bands now fade in with colorfulness and leave neutrals untouched.
- Photos now blend in linear light when resampled: textures decode sRGB before filtering, so straightening, lens correction, keystone and zoomed-out previews no longer darken hard edges and fine detail (up to ΔE 23 before).
- Fixed a WebKit smear along the edges of straightened or lens-corrected photos (mip selection broke where the geometry pass sampled inside an `if`); the Before view samples the same way.
- The local Cloudflare runtime now starts only for `next dev`, not `next start`, so tests no longer collide with another checkout's runtime.
- Fixed grain differing between browsers (a `fract(sin())` hash isn't the same on every GPU); grain now uses an integer hash and renders the same pixels everywhere.
- Fixed film looks turning out-of-gamut channels into NaN, which halation and bloom then spread until the whole photo went black (for example, a strongly saturated local layer under CineStill 800T with halation).
- Added the Mac app (Tauri shell) and `etch-core`, a native engine for it that reproduces the web renderer's develop, tone curve, color mixer, grading, creative LUT, geometry, local adjustment, film look, glow, optical effect, grain and sharpening output, checked in Chromium and WebKit by `tests/browser/native-parity.spec.ts`.
- Ported the sRGB display transform and all 136 Creative Effects to the Mac rendering engine. The developer viewport can exercise shader effects, glyph textures and raster dithering.
- The main Mac editor uses Metal for standard sRGB photos on the canonical grade graph. Added tiled zoom with source-pixel inspection and live mask coverage, including screen-sized mask controls at high magnification.
- Before, the A/B divider, and saved snapshot comparisons stay on Metal. Snapshots capture the entire edited crop and omit viewport overlays, regardless of the current zoom or comparison mode.
- The Mac viewport takes the existing 16-bit RAW development buffer and preserves its shadow detail in Fit and source-resolution zoom, including photos larger than a single GPU texture.
- Saved serial Grade Graphs run on Metal, including node order, overrides, bypass and partial opacity. JPEG and PNG imports with embedded RGB ICC profiles convert into the editor’s sRGB working space. Corrected a Film-first graph and profile conversion on the WebGL path.

This entry records implementation only. Public-beta release claims remain blocked until the real-browser, installed/offline, stress, and Cloudflare runbook gates pass.
