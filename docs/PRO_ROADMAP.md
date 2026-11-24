# Intaglio Pro Roadmap

> **North star:** the editor a working photographer opens first and closes last — where they develop RAW, grade, build and apply LUTs, retouch, proof, and deliver — on the web, macOS, and Windows, with identical pixels everywhere.

This document supersedes nothing in [NON_AI_PRODUCT_ROADMAP.md](NON_AI_PRODUCT_ROADMAP.md); it is the long-range plan that sits above the public-beta qualification work. Every feature here must still meet the [render parity contract](RENDER_PARITY.md): **claims never exceed evidence.**

---

## 0. How we win

We will not out-feature Lightroom, Capture One, Photoshop, Resolve and darktable one checkbox at a time. We win by being **the only editor that is all of these at once**:

| Axis | Incumbents | Intaglio |
|---|---|---|
| **Color science** | Lightroom: closed, display-referred sliders. Resolve: superb, but built for video. | Scene-referred, spectral-capable, OKLab-native pipeline with Resolve-class grading tools *for stills*. |
| **LUT workflow** | Lightroom can't author LUTs. Photoshop's are clumsy. Resolve is video-only. | Author, sculpt, analyze, decompose, and export LUTs as a first-class workflow. |
| **Determinism** | Nobody guarantees identical output across machines. | Byte-reproducible recipes; preview = export = batch, enforced by tests. |
| **Privacy** | Cloud-first (Adobe), account walls. | Local-only. Photos never leave the machine. No account required. |
| **Reach** | Desktop-only or web-lite. | Same engine on web, macOS, and Windows. Open a link, start grading. |
| **Price of entry** | Subscriptions. | A free web tier that is genuinely pro; desktop for power. |

**Positioning line:** *"Resolve-grade color for photographers. Runs anywhere. Never uploads your photos."*

### Product principles
1. **Pixels are the product.** No feature ships without a golden-image test and a parity gate.
2. **Scene-referred by default.** Light is linear; display is a view. Nothing clips until output.
3. **Every control is honest.** If a slider is visible, it has a tested, documented effect.
4. **Non-destructive and inspectable.** Every edit is a node; every node can be soloed, bypassed, and diffed.
5. **Fast is a feature.** < 16 ms slider response on a 24 MP proxy, always.
6. **No AI, ever.** Classical algorithms, deterministic results (decided 2026-10-03, see §11).
7. **Pro power, Lightroom simplicity.** The most advanced tool on the market must feel as approachable as Lightroom. See the ease-of-use contract below.
8. **Breathtaking design.** The interface must be the most beautiful, considered product design in the category: calm, precise, photo-first, fast. Design quality is a release gate, not polish.
9. **Power for everyone (decided 2026-11-24).** Etch aims to be the most capable photo app ever made, and its most innovative, highest-capability features are never reserved for photography experts. Anyone, on their first day, can reach and use them. Expert surfaces add depth and precision, but no capability exists *only* behind expert vocabulary or setup.

### Ease-of-use contract (every feature must pass)
1. **Familiar first.** The default right panel follows Lightroom's mental model and order: Basic → Tone Curve → Color Mixer → Color Grading → Detail → Optics → Geometry → Effects → Calibration. Advanced surfaces (Nodes, LUT Studio, Scopes, Film Lab) are opt-in workspaces and never stand in the way, but what they can do is never locked inside them (rule 9).
2. **Plain language.** Every control is labeled in photographer words ("Highlights", "Skin tones", "Make sky bluer"), with the technical term and a one-line explanation on hover.
3. **One click to power.** Every advanced capability has a single obvious entry point ("Match look from a photo…", "Save look as LUT…", "Fix skin tones").
4. **Good by default.** Color management, profiles and view transforms are automatic and correct with zero setup; experts can override.
5. **Progressive disclosure.** Simple sliders up front; a "More" chevron reveals precision controls. Double-click any slider to reset it. Everything is undoable.
6. **Direct manipulation.** Drag on the photo itself to adjust curves, colors and masks (targeted adjustment), not just numbers.
7. **Lightroom-compatible muscle memory** where it makes sense: `\` before/after, `R` crop, `K` brush, `J` clipping, `Cmd/Ctrl+Z`, double-click to reset.
8. **Honest feedback.** Every slow operation shows progress; every failure says what happened and how to fix it.
9. **No expert-only capability.** Every innovative or advanced capability ships with an outcome-first front door that a beginner understands: named for the result, not the technique ("Match the colors of this photo", not "optimal-transport color transfer"); reachable in one click from the photo, the Edit panel or the command bar; and good with zero settings. The expert surface (nodes, curves, numbers) is the same feature opened up, not a separate, harder feature. A capability isn't done until someone new to photography can use it unaided. This is a release gate, checked alongside the render contract.

---

## 1. What was fixed in this pass (2026-10-03)

These were shipping defects; all are now covered by unit tests and/or the render-contract browser gate (Chromium + WebKit).

| Defect | Impact | Fix |
|---|---|---|
| **Master tone curve ignored.** The curve LUT packed master into alpha; the shader read only RGB. | The main curve did nothing. | `ToneCurvePass` applies master → per-channel. |
| **Exports, batch, and proofs dropped all curves.** The curve texture was injected only into the preview's settings. | Preview ≠ export for any curve edit. Per-plate curves never worked. | `ToneCurvePass` now builds its own table from `curvePoints`, so every render path gets curves. |
| **Curves overshot and were 8-bit.** Catmull-Rom splines rang past control points and were clamped and quantized to 256 steps. | Banding, posterization, impossible shapes. | PCHIP (Fritsch–Carlson) curves with no overshoot, a 1024-entry float32 table, applied in display-encoded space with unit-slope headroom above 1.0. |
| **Adjustment plates decoded sRGB twice.** `BaseDevelopPass` linearized its input but also re-ran on every plate. | Any plate darkened and crushed its masked region even with zero adjustments. | New `InputTransformPass` linearizes exactly once per graph. |
| **LUTs applied to linear light.** Creative `.cube` LUTs expect display-encoded input. | Every imported LUT looked wrong (crushed and washed out). | LUTs are sampled in sRGB-encoded space with extended range. |
| **LUTs quantized to 8-bit** through a 2D atlas. | Banding in smooth gradients. | Half-float `Data3DTexture` with hardware trilinear sampling. |
| **LUT Creator did nothing.** It made a 3D texture without `lutSize` metadata, so `LutPass` disabled itself. | Feature silently broken. | All LUT sources go through one installer. |
| **Palette Heist did nothing.** It produced a 2D per-channel map that `LutPass` could not read. | Feature silently broken. | It now bakes a 33³ cube LUT. |
| **Generated LUTs were not saved into projects.** | Grades lost on reopen. | Generated LUTs are installed as `.cube` assets and round-trip through archives. |
| **RAW edited from an 8-bit proxy.** libraw's 16-bit buffer was decoded and then discarded. | RAW files had JPEG-level headroom. | The 16-bit linear buffer is uploaded as a half-float texture for preview, export, and batch. |
| **Batch export decoded sRGB twice** (`SRGBColorSpace` plus a shader decode). | Batch output darker than preview. | Source encoding is detected per texture. |
| **Rotation sheared non-square images; lens distortion was elliptical.** | Geometry visibly wrong on every 3:2 photo. | Aspect-correct geometry with diagonal-normalized distortion. |
| **The canvas re-rendered the full graph at 60 fps when idle.** | Battery and GPU drain, fans spinning. | `frameloop="demand"`, invalidated only on input changes. |
| **Histogram included the letterbox** and sampled every 15th frame. | Wrong histogram and palette. | Debounced readback from the rendered image only. |
| **Export failures were silent.** The modal closed with no file and no message. | Users thought it worked. | Errors are reported. |
| `solveCatmullRom` sorted the caller's array in place. | Mutated React state. | Removed. |

### Known defects still open (Phase 0 work)
- **Grade Graph is decorative.** Nodes are validated and saved, but nothing compiles them into the renderer. → Phase 1, item G1.
- **No crop stage in the renderer.** `GeometryState.crop` exists in the schema only. → Phase 0.
- **History stores 50 full snapshots.** → Phase 0, command history.
- **12 `alert/confirm/prompt` calls and 6 `<a download>` flows** (recounted 2026-11-24). These block the desktop app (webviews don't implement `prompt`). → Phase 0.
- **RAW is decoded into sRGB primaries** (`outputColor: 1`). Wide-gamut camera color is clipped at decode. → Phase 1, item C2.
- **Two very large files:** `useEditorState.tsx` (~1.8k lines) and `EditorRightSidebar.tsx` (~1.9k lines).

---

## 2. Target architecture

```
                ┌──────────────────────── Intaglio Document (.intaglio) ───────────────────────┐
                │ source assets · grade graph (nodes/edges) · masks · LUT/ICC/DCP/font assets   │
                │ command history (branchable) · export profiles · catalog metadata             │
                └───────────────────────────────────────┬──────────────────────────────────────┘
                                                        │ compile
                ┌───────────────────────────────────────▼──────────────────────────────────────┐
                │ Graph IR  — typed, hashed nodes; dirty tracking; resolution-independent params │
                └───────────────┬─────────────────────────────────────────┬────────────────────┘
                                │                                         │
                ┌───────────────▼───────────────┐         ┌───────────────▼───────────────┐
                │ etch-core (Rust, wgpu, WGSL)  │         │ GPU backend: WebGL2 (fallback) │
                │ WebGPU · Metal · D3D12        │         │ current three.js passes        │
                │ compute, scopes, PatchMatch   │         │ retired once etch-core matches │
                └───────────────┬───────────────┘         └───────────────┬───────────────┘
                                └──────────────┬──────────────────────────┘
                     ┌─────────────────────────▼─────────────────────────┐
                     │ Tile scheduler · node cache · proxy pyramid ·      │
                     │ viewport-first rendering · background full-res    │
                     └─────────────────────────┬─────────────────────────┘
          ┌──────────────────┬─────────────────┼─────────────────┬────────────────────┐
     Preview/Loupe        Proof sheets         Export/Batch          Desktop native I/O
```

### Engine strategy: one engine, three shells
- **Now:** a TypeScript engine on three.js/WebGL2 (what exists).
- **Next:** introduce a **Graph IR** between the document and passes. Passes declare inputs, outputs, params and cost, and the scheduler caches each node by content hash. This alone fixes the "every plate re-runs every pass at full resolution" problem.
- **Then:** build **`etch-core`**, a Rust engine that implements the IR on **`wgpu`** with **WGSL** shaders (Phase 3). `wgpu` targets Metal on macOS, D3D12 on Windows, and WebGPU in the browser through WASM, so one shader source and one engine produce the pixels on every platform. Compute shaders unlock fast separable blurs, image pyramids (local Laplacian, multiband blending), GPU histograms and scopes, NL-means denoise, and PatchMatch. The current GLSL passes are ported to WGSL (`naga` translates most of them), gated pass by pass by the render contract.
- **Desktop native compute** (Phase 4): RAW decode, lens corrections, ICC transforms, the catalog and file watching run natively in `etch-core`, and the desktop viewport is a native Metal layer (§10). The web build runs WASM builds of the same crates, so one codebase still yields the same pixels everywhere. The TypeScript/WebGL2 engine stays as the web fallback until `etch-core` matches it, then retires.

### State architecture (Phase 0)
- Replace the 90-key `EditorSettings` bag with **typed node params** in the grade graph. Keep a "Basic" facade so the current UI keeps working.
- **Command-pattern history:** each edit is an invertible command (`{nodeId, path, before, after}`). Unlimited, cheap, serializable.
- **Branchable history** ("look branches"): fork a version, try a look, merge or discard. It's git for grades, and works because the engine is deterministic.
- Split the store into slices (document, view/UI, runtime GPU resources, catalog) and split `useEditorState`/`EditorRightSidebar` into one module per tool.

---

## 3. Track C — Color science (the moat)

### C1. Precision everywhere
- [x] Float curves, half-float 3D LUTs, 16-bit RAW source *(done this pass)*
- [ ] Full-float (RGBA32F) intermediate targets on capable GPUs, with half-float as fallback. Measure banding on synthetic 16-bit gradients.
- [ ] Blue-noise dithering at output, quantized to the output bit depth (8/10/12/16).

### C2. Scene-referred wide-gamut working space
- [ ] RAW decode to **camera-native → XYZ** (`outputColor` raw/XYZ) using the camera matrix, with no clipping at decode.
- [ ] Working space: **linear Rec.2020** (configurable to ACEScg). sRGB/P3 sources are converted in with a 3×3 matrix.
- [ ] **Chromatic adaptation** via CAT16/Bradford. White balance becomes an illuminant change rather than RGB gains.
- [ ] **Output transforms** as explicit nodes: sRGB, Display P3, Rec.2020, Adobe RGB, ProPhoto, plus HDR PQ/HLG.
- [ ] **Gamut mapping**: OKLCh chroma compression with constant hue and lightness (CSS Color 4 algorithm), optionally the ACES 2.0 gamut compressor. It replaces hard clipping.
- [ ] **View transforms** as a choice: "Standard" (current), **AgX**, **sigmoid** (darktable-style), ACES 2.0. Highlights roll off filmically instead of clipping.

### C3. Camera profiles
- [ ] **DCP support** (DNG Camera Profiles: ForwardMatrix, HueSatMap, LookTable, ProfileToneCurve) so users can bring Adobe Standard / Camera Matching profiles they already own.
- [ ] **Profile authoring from a ColorChecker shot.** Detect the chart (classical corner/patch detection), solve a 3×3 matrix plus a hue twist, and export DCP and ICC. A deterministic "calibrate my camera" feature that Lightroom doesn't have.
- [ ] Dual-illuminant interpolation (StdA ↔ D65) driven by white-balance temperature.

### C4. Color management and proofing
- [ ] **ICC v4 via lcms2-WASM:** embed profiles on export, read embedded profiles on import (wide-gamut JPEGs from phones are currently mis-rendered as sRGB).
- [ ] **Soft proofing:** printer/paper ICC, rendering intent, black-point compensation, paper-white simulation, and an out-of-gamut overlay.
- [ ] **Display profile** (desktop only, since browsers can't read it): proper monitor ICC transform for color-critical viewing.
- [ ] **Delivery proof matrix:** one click shows the image as it will look on Instagram (sRGB, 8-bit, and Instagram's resampling and JPEG recompression simulated), an iPhone HDR display, and print (soft proof), side by side.

### C5. Spectral darkroom (experimental flagship)
- [ ] **Spectral upsampling** of every pixel (Jakob & Hanika 2019 sigmoid-polynomial LUT) on the GPU.
- [ ] **Relight:** change the illuminant spectrally (D50 → tungsten → fluorescent F11 → golden hour). This is physically different from a WB slider; metamerism shows up correctly.
- [ ] **Real film emulation:** negative stock spectral sensitivities → dye densities (characteristic curves) → print stock (e.g. a 2383-style print stage) → scanner/viewing illuminant. With interlayer (DIR) coupler crosstalk, halation from base reflection in the red layer, and resolution-independent **Boolean-model film grain** (Newson et al. 2017) whose structure tracks density rather than overlaid noise.
- [ ] A **film-stock library** as data (curves and spectra), not shaders, so stocks are versioned, testable assets.

> Nobody ships spectral film emulation for stills in a browser. This becomes the "how is this possible" demo.

---

## 4. Track G — Grading and LUTs (where photographers switch)

### G1. A node grader that actually renders
- [x] **Compile the GradeGraph into the renderer** for the serial image path. Preview, export, proof sheets and batch use saved order, bypass, opacity and supported numeric overrides. Mask side inputs remain owned by the Masks/Plate pipeline; unsupported image branches and node overrides are rejected.
- [ ] Node types: serial, parallel, layer mixer (with blend modes), splitter/combiner (per-channel), **key mixer**, outside node (inverse of a key), and compound nodes (save a sub-graph as a reusable "macro").
- [ ] Per-node **key input** (masks/qualifiers), opacity, bypass, solo, and cache-flag.
- [x] A simple "Layers" view over the same graph for people who don't want nodes, two-way synced. The optional pro workspace includes an expandable Nodes canvas.

**Initial workspace checkpoint — 18 November 2026**

Open **Pro grading** from the Edit controls. The default Edit, Masks and Text modes keep their current layout. The pro panel reuses the editor's neutral dark surfaces, blue selection accents and compact controls, keeping the photograph dominant. Layers is the default because a complete horizontal graph is unreadable in a narrow sidebar; Nodes can expand across the viewport and initially focus the selected stage at a readable zoom. Graph selection, reordering, bypass and opacity operate on one saved graph. Mask references direct the user to the Masks panel.

The Scopes tab provides luma/RGB waveforms and a vectorscope with graticule and a skin-hue reference. They use the display-referred preview's sampled pixels, with CPU canvas drawing. This is **not yet the GPU/under-2-ms G5 implementation**. The current loupe keeps scope sampling on the whole frame.

LUT Studio imports existing 3D `.cube` looks, opens the LUT author, and bakes the graph's pixel-local color operations to 33³/65³ sRGB `.cube` files. It excludes masks/plates, geometry, bloom, halation, optical/spatial effects, sharpening, creative effects and overlays, and lists those exclusions before export. Shapers, other formats and LUT diagnostics remain open below.

Local verification: typecheck, lint, production build and 67 automated tests passed; eight Chromium/WebKit browser checks passed for grading, render/export parity, cropped masked project reopening and loupe integration. GPU assertions cover graph defaults, bypass, opacity, numeric overrides, actual mixer inputs and LUT round-trip. Visual checks cover 1440, 1024 and 390 px; the 65³ export contains 274,625 finite RGB entries, and scope output remains unchanged at 1:1 loupe zoom. No deployment is implied by these checks.

### G2. Grading tools (Resolve parity for stills, then beyond)
- [ ] **Primaries:** lift/gamma/gain/offset wheels and **log wheels** (shadow/midtone/highlight with adjustable ranges), contrast with pivot, temperature/tint in the working space, color boost, and **printer lights** (RGB offset in printer points) for the analog feel.
- [ ] **Curves suite:** custom (master + RGB, done), **Hue vs Hue, Hue vs Sat, Hue vs Lum, Lum vs Sat, Sat vs Sat, Sat vs Lum**, all PCHIP in OKLCh.
- [ ] **Color Warper:** a 2D hue-chroma mesh you drag directly, plus a chroma-lightness mesh, rendered as a GPU deformation field.
- [ ] **Qualifiers:** HSL/OKLCh keyer with softness, denoise, clean black/white, blur, and a "highlight" overlay. 3D key (pick samples, key the convex hull in OKLab).
- [ ] **Power windows** (existing masks) with per-edge feather, inside/outside grades, and mask boolean nodes (exist in schema).
- [ ] **Shot matching across a set:** pick a hero image and match exposure, white balance, and tonal distribution of 50 others (statistics plus optimal transport, below).

### G3. LUT studio
- [ ] **Import:** `.cube` (1D+3D, shaper), `.3dl`, `.csp`, Resolve `.cube` with shaper, Hald CLUT PNG, `.look`/`.ctf` (OCIO CLF).
- [ ] **Export the whole grade as a LUT**, 33³ or 65³, with a log/shaper option, so a look built in Intaglio can be used in Lightroom (as a profile), Premiere, Resolve, FCP, or a camera monitor. This makes Intaglio the place photographers and videographers author looks.
- [ ] **LUT inspector:** render any LUT as a deformed 3D lattice in OKLab (three.js already in the stack), plus the image's color cloud, a gamut-clipping heatmap, and smoothness/inversion diagnostics (Jacobian sign flips mean a LUT folds colors).
- [ ] **Color Space Sculptor** *(novel):* grab a region of the image's 3D color cloud and drag it in OKLab space. The LUT deforms smoothly (RBF/thin-plate spline in OKLab, with optional constraints to keep neutrals neutral and skin on the skin line), live.
- [ ] **Look DNA** *(novel):* decompose any LUT by least squares into an editable tone curve, 3×3 matrix, hue-vs-hue/sat curves, and a small residual. Import someone's LUT and get sliders instead of a black box. Re-bake on export.
- [ ] **LUT blending and interpolation:** mix two looks, or morph between them along a slider.
- [ ] **Look library:** tags, before/after thumbnails rendered on *your* current photo, favorites, and an A/B grid ("try 12 looks at once").

### G4. Color transfer (classical, deterministic)
- [ ] Replace the per-channel histogram match (Palette Heist) with **sliced optimal transport in OKLab** (Rabin 2011 / Pitié 2007 N-dimensional PDF transfer), plus a regrain step to remove artifacts. Bake the result to a LUT.
- [ ] Region-to-region transfer: the reference's sky colors go to my sky, using qualifier keys.
- [ ] **Constraint grading ("grade by numbers")** *(novel):* state goals such as "skin on the skin-tone line at L=0.7", "sky hue 245° C=0.09", "neutral gray here". A deterministic solver adjusts white balance, wheels and curves to satisfy them (weighted least squares). Precise like a colorist, fast like a preset.

### G5. Scopes
- [ ] GPU **waveform** (luma/RGB overlay), **parade**, **vectorscope** with skin-tone line and graticule, **CIE 1931/1976 chromaticity** scope with gamut triangles, **3D OKLab histogram**, and false color (exists). All live, at under 2 ms.
- [ ] Click a scope to probe: hovering the image highlights the waveform trace, and selecting in the vectorscope highlights pixels.

---

## 5. Track D — RAW development

- [ ] **Worker-side decode with progress** (exists). Add a **native Rust decoder** in desktop builds, roughly 5–10× faster and multi-threaded.
- [ ] **Demosaic choice:** AMaZE, RCD, LMMSE, DCB, Markesteijn (X-Trans), plus dual-demosaic blending by local contrast. RCD by default; preview uses fast bilinear, and full res renders in the background.
- [ ] **Highlight reconstruction:** inpaint-opposed and guided-Laplacians (darktable-class) so blown skies recover detail.
- [ ] **RAW-domain denoise** before demosaic: per-camera, per-ISO noise profiles (Anscombe/variance-stabilizing transform plus wavelet or NL-means). Deterministic and calibrated, the classical answer to "AI denoise".
- [ ] **Capture sharpening:** Richardson–Lucy deconvolution with an auto-estimated Gaussian PSF (RawTherapee-style).
- [ ] **Lens correction:** lensfun database (distortion, TCA, vignetting) auto-matched from EXIF, plus Adobe **LCP** profile import. Auto-CA via per-channel radial alignment by edge correlation, and defringe.
- [ ] **Flat-field correction** from a user-supplied flat frame (pro landscape and astro).
- [ ] **Dark-frame subtraction** (astro and long exposure).
- [ ] **Pixel-shift merge** (Sony/Pentax/Olympus/Panasonic multi-shot RAWs).
- [ ] **Per-camera qualification** (already a release gate): a fixture per family, color-checked.

---

## 6. Track P — Pixel editing and retouching

- [ ] **Crop stage** (open defect): aspect presets, straighten tool, crop overlays (exist in GridOverlay), and **auto-upright** via Hough line detection and vanishing points (classical).
- [ ] **Perspective warp** (Upright-style guides), **liquify** (GPU displacement field), **content-aware scale**.
- [ ] **Heal / clone / spot removal:** PatchMatch for source search, Poisson blending solved with GPU multigrid, and "visualize spots" mode (high-pass, inverted) for sensor-dust hunting.
- [ ] **Content-aware fill (classical):** multi-scale PatchMatch completion (Wexler et al.). Good on textures, skies and backgrounds, with no generative model.
- [ ] **Frequency separation** as a node: texture and tone layers, each paintable.
- [ ] **Dodge and burn in linear light:** brushes that add or remove photons (exposure in stops) rather than overlaying gray. Includes a "light-painting" mode with colored light.
- [ ] **Local contrast:** **local Laplacian filters** (Paris et al. 2011; fast Aubry 2014) for halo-free clarity, texture and structure. This replaces the current single-scale structure slider and is the single biggest "looks expensive" upgrade.
- [ ] **Edge-aware masks:** guided filter / domain transform refinement on every mask, an **auto-edge brush** (bilateral-grid flood seeded by the stroke), and "refine edge" for hair against sky.
- [ ] **Luminosity mask library:** Lights/Darks/Midtones 1–5 and zone masks, one click each, combinable through mask nodes.
- [ ] **Pixel layers:** import a second image (sky, texture, overlay) with blend modes, transform and mask. Compositing scoped to what photographers need, not full Photoshop.

---

## 7. Track M — Multi-image (computational, classical)

- [ ] **HDR merge** from brackets: alignment (median-threshold bitmaps / tile alignment), Debevec-style weighting in raw linear space, and ghost removal by deviation from a reference. Outputs a float DNG-like source.
- [ ] **Panorama:** ORB/AKAZE features, RANSAC homography or cylindrical projection, multiband blending (Burt–Adelson).
- [ ] **Focus stacking:** Laplacian-pyramid maximum-sharpness selection with halo suppression.
- [ ] **Handheld burst super-resolution and noise reduction** (Wronski et al. 2019 kernel regression; classical, not ML). Use a phone or camera burst to get a cleaner, higher-resolution frame.
- [ ] **Time-stack / star-trail** blending modes (lighten, mean, median).

---

## 8. Track W — Workflow and library

- [ ] **Catalog:** SQLite (WASM on web via OPFS; native in `etch-core` on desktop, WAL mode with FTS5 keyword search) with folders, collections, smart collections, ratings, flags, color labels, keywords, and EXIF/IPTC fields.
- [ ] **Lightroom Classic catalog import:** a `.lrcat` is a SQLite database, so read folders, collections, ratings, flags, color labels and keywords directly, and map develop settings (`crs:` fields) and Lightroom presets to our nodes. This is the switching lever on desktop.
- [ ] **Preview cache and smart previews** (desktop): cached renders for the grid and ~2560 px float16 proxies, so photos stay editable with their drive disconnected.
- [ ] **Culling:** decode embedded RAW JPEG previews for instant browsing (no full decode), loupe/compare/survey views, and keyboard-only flow (P/X/1–5/arrows). Target: 100 RAWs culled per minute.
- [ ] **Sync settings** across a selection, with **relative sync** (exposure +0.3 rather than set to 0.3) and per-module checkboxes.
- [ ] **XMP sidecars:** read and write. Import **Lightroom develop settings** (mapped to our nodes, documenting what doesn't map) so a switcher's back catalog comes with them.
- [ ] **Virtual copies, snapshots, look branches** (§2), and history scrubbing as a timeline.
- [ ] **Export presets:** multiple simultaneous outputs (web 2048px sRGB + print TIFF 16-bit ProPhoto + Instagram 1080×1350), with filename templates, metadata stripping/keeping, watermark (exists), output sharpening per medium, and **file size targets** ("under 2 MB").
- [ ] **Formats out:** JPEG (MozJPEG, exists), PNG 8/16, WebP, **AVIF 10/12-bit**, **JPEG XL**, **TIFF 16-bit/float**, **Ultra HDR gain-map JPEG**, DNG (linear) for round-tripping.
- [ ] **Hot folders** (desktop): watch a folder, apply a recipe, write proofs. A practical alternative to tethering.
- [ ] **Instagram-native output** (existing strength): carousel builder (exists), seamless panorama carousels, feed-grid preview, and safe-zone overlays.

---

## 9. Track X — Experience

- [ ] **Performance budgets** enforced in CI: slider-to-photon under 16 ms on a 24 MP proxy (M1 baseline), 100 MP export under 20 s, RAW open to first pixel under 1.5 s (embedded preview) and under 4 s (full develop).
- [ ] **Viewport-first rendering:** render only visible tiles at screen resolution; refine to 1:1 when zoomed; cancel stale work.
- [x] **Loupe:** 100/200/400% with pixel grid, plus a **navigator**. 100% is one image pixel per device pixel. Z or a click toggles Fit/100%; ⌘+/⌘−/⌘0, pinch and the zoom menu step through 25–800%; drag, scroll or Space-drag pans with any tool. The visible tile renders at full resolution (Creative Effects render the whole frame, capped by the GPU texture limit), and histogram, scopes and navigator stay on the whole frame. Browser checks confirm a 1 px checkerboard resolves at 100% and matches the exported PNG with a brush mask and Creative Effects.
- [ ] **Customizable workspace:** dockable panels, saved layouts ("Grade", "Retouch", "Cull"), and full keyboard customization. The command palette exists; make every action available in it.
- [ ] **Hardware surfaces** (desktop): MIDI/HID controller mapping (Loupedeck, TourBox, Tangent Ripple/Elements), so colorists can grade with physical wheels.
- [ ] **Second display "client monitor"** (desktop): a clean full-screen output on another monitor.
- [ ] **Accessibility:** full keyboard paths, screen-reader labels on every control, reduced motion, high-contrast UI.
- [ ] **Onboarding:** "open a photo → pick a look → fine-tune" in 10 seconds; progressive disclosure for pro tools.

---

## 10. Desktop: a Mac app that competes with Lightroom (Windows next)

On desktop, Lightroom is beaten in three places: the **image viewport**, the **catalog** and **browsing speed**. A webview is weakest in exactly those three. So the native layer owns the pixels and the library, and the React UI we already have owns the panels.

### Decision (2026-11-24): Rust engine + native Metal viewport, React UI in a Tauri 2 shell

This replaces the earlier plan of running the web renderer unchanged inside the webview.

```
┌───────────────────── Etch.app (Tauri 2 shell) ─────────────────────┐
│  React UI (existing panels, sliders, curves, wheels) — WKWebView   │
│      │  small JSON messages only (slider values, commands)         │
│      ▼                                                             │
│  etch-core (Rust) ── edit graph ── GPU pipeline (wgpu → Metal)     │
│      │                                │                            │
│  catalog · RAW · color · I/O          └─► native Metal viewport    │
│  (SQLite, LibRaw, lcms2, ImageIO)         (EDR/HDR, ColorSync)     │
└────────────────────────────────────────────────────────────────────┘
        The same etch-core compiles to WASM + WebGPU for the web app
```

### Stack

| Layer | Choice | Why |
|---|---|---|
| Engine | Rust crate `etch-core`; `rayon` for CPU threads, `tokio` for I/O | Real threads and no memory cap; one engine for web, macOS and Windows |
| GPU | `wgpu` with WGSL shaders (Metal on macOS, WebGPU on web, D3D12 on Windows) | One shader source on every platform; GLSL passes port via `naga` |
| Viewport | Native `CAMetalLayer`: float16, extended linear Display P3, EDR enabled | Lightroom-class HDR editing and full ColorSync display management, which a webview canvas can't give us |
| UI | Existing React/TS panels in Tauri 2 (WKWebView on macOS, WebView2 on Windows) | Keeps the UI we have and one UI for every platform |
| RAW | LibRaw (under its CDDL licence), then our own GPU demosaic and highlight reconstruction (§5) | Widest camera coverage; quality stays ours |
| Lens | lensfun database, Adobe LCP import, DNG opcodes | Most lenses covered on day one |
| Color | lcms2 (ICC, soft proofing, printer profiles), our OKLab/Rec.2020 pipeline, AgX/ACES view transforms, DCP | §3 on native and web alike |
| Catalog | SQLite (`rusqlite`) in WAL mode, FTS5 keyword search, XMP sidecars | Scales past 500k photos; sidecars mean no lock-in |
| Previews | Embedded RAW JPEGs for an instant grid, then a cache of our renders, plus smart-preview proxies (~2560 px, float16) | Photo Mechanic-fast culling; editing with the drive offline |
| Formats | libjpeg-turbo/MozJPEG, libjxl, libavif, libtiff, Apple ImageIO for HEIC, Adobe XMP Toolkit, Adobe DNG SDK | Fast and permissively licensed |
| Mac platform | `notify` (FSEvents) hot folders, Quick Look and Spotlight extensions, PhotoKit import, security-scoped bookmarks | Feels like a Mac app; keeps the Mac App Store possible |
| Shipping | Ad-hoc signed `.dmg` (no paid Apple membership, so no notarization; decided 2026-11-24), Tauri updater with Etch's own update key, Apple Silicon first | Direct download; a one-time "Open Anyway" on first launch, then silent updates. Developer ID can be added later without other changes |

### Engine rules (how it feels faster than Lightroom)
1. **Pixels never cross the bridge.** The UI sends parameters; Rust renders straight to the Metal layer. Only histograms, scopes and thumbnails come back, as small buffers.
2. **Render only what's on screen**, at screen resolution, while editing. Full resolution is for 100% zoom and export (§9 viewport-first rendering).
3. **Show pixels at once, then refine:** embedded JPEG, then proxy render, then full render.
4. **Tiled image pyramid** for large files and panoramas, so there are no texture-size limits and memory stays flat on 100 MP files.

### Alternatives considered
| Option | Verdict |
|---|---|
| Tauri with the web renderer inside the webview (previous plan) | Fine as the first shell (D1), but webview memory limits and no EDR or display-transform control cap it below Lightroom |
| Electron | Lowest risk, but Chromium-only, ~150 MB+, and native work through C++ Node add-ons |
| SwiftUI/AppKit UI over `etch-core` | The fallback if a native view under the webview proves fiddly. Best Mac feel, but a second UI to maintain |
| Fully native Rust UI (egui/iced) | Rewrites a working UI for little gain; rejected |

### Licensing guardrails (closed-source app)
- **No GPL code:** no exiv2, and no code from darktable or RawTherapee. Read their papers; don't copy their code.
- **LGPL** (lensfun, gphoto2 for tethering later) is dynamically linked, with attribution. LibRaw is used under CDDL.
- Prefer Apple ImageIO over libheif (LGPL) for HEIC on macOS.

### Desktop phases
1. **D1 — Shell (2–3 wk, after Phase 0's dialog/download abstraction):** static-export the editor (`output: "export"` for the editor routes; marketing pages stay on Cloudflare), Tauri window, native menus, app icon, native Open/Save dialogs replacing `<a download>` (6 sites), in-app dialogs replacing `alert/confirm/prompt` (12 sites), Finder drag-and-drop, file associations (`.etch`, `.etchlook`, legacy `.int`/`.intaglio`, RAW "Open With"), recent files, ad-hoc signing, a `.dmg` and auto-update. The current TS renderer runs in WKWebView.
   **Exit:** an ad-hoc signed `.dmg` installs on a second Mac with the documented first-launch steps, then opens, edits and exports at parity with Safari.
2. **D2 — `etch-core` and the Metal viewport (Phase 3; months, not weeks):** port the passes to WGSL in Rust, render into a `CAMetalLayer` under a transparent webview, and drive it from the React UI over IPC.
   **Exit:** the render contract passes Metal against the web golden images; slider-to-photon budgets from §9 are met.
3. **D3 — Library:** SQLite catalog, preview cache and smart previews, culling, and **Lightroom Classic catalog import** (§8).
   **Exit:** Phase 6's 2,000-image wedding, on desktop.
4. **D4 — Native compute and output:** LibRaw decode (multi-threaded), lcms2 with the display profile, lensfun, HDR/EDR editing and HDR export, print with soft proofing, hot folders.
5. **D5 — Desktop-only power:** second-display client view, MIDI/HID controllers, Quick Look and Spotlight, PhotoKit import.
6. **Web on `etch-core`:** the web app runs the same engine through WASM + WebGPU; the TS/WebGL2 renderer retires once it is at parity. **Windows** follows with the same core: WebView2 over a D3D12 swap chain.

**Rule:** the desktop app is a superset, never a fork. Every document opens on web, macOS and Windows and renders identical pixels, gated by the same render contract run headless in Rust and inside each webview.

**Testing:** `tauri-driver` doesn't support macOS, so engine correctness is tested in Rust (`cargo test` against golden images), UI flows run against the web build in Playwright WebKit, and the shell gets a small native smoke test.

---

## 11. Decision: no AI (final)

**Decided 2026-10-03: Intaglio contains no AI or machine-learning models, on any platform, opt-in or otherwise.** Every algorithm is classical, documented, and reproducible. Where competitors use neural networks, we ship a classical alternative and make it excellent:

| Competitor AI feature | Intaglio classical answer |
|---|---|
| AI Denoise | Profiled RAW-domain denoise (VST + wavelet/NL-means), burst merge |
| Subject / sky masking | Qualifier keys, edge-aware brush, luminosity masks, guided-filter refine |
| Generative remove | PatchMatch completion + Poisson blending |
| Auto-tone | Deterministic statistics-based auto (documented formula), constraint grading |
| Super resolution | Multi-frame burst super-resolution, pixel-shift merge |

---

## 12. Phased delivery

Effort is in engineer-weeks for one strong engineer. Each phase has hard exit criteria.

### Phase 0 — Foundation (4–6 wk)
Store and command-history refactor; split the god files; renderer crop stage; dialogs/download abstraction (desktop-ready); golden image matrix (neutral, gradients, HDR, skin, saturated, high-ISO RAW); performance benchmark harness in CI.
**Exit:** no file over 600 lines in `editor/`; unlimited undo; crop renders and exports at parity; benchmark dashboard green.

### Phase 1 — Grading core (8–10 wk)
Graph IR plus node cache; **GradeGraph compiles to the renderer**; full curves suite; log wheels; qualifiers; GPU scopes; LUT export of the whole grade; LUT inspector.
**Exit:** a colorist can build a 6-node grade with keys, export a 65³ LUT, and see that LUT match the in-app render (ΔE ≤ 0.5).

### Phase 2 — Color science (8–10 wk)
Camera-native RAW → Rec.2020 working space; CAT16 white balance; view transforms (AgX/sigmoid/ACES 2.0); gamut mapping; ICC in/out; soft proofing; DCP import; P3/16-bit/AVIF/JXL/TIFF export.
**Exit:** ColorChecker test shots within ΔE2000 ≤ 2.0 mean of reference; no hard clipping in the view transform; wide-gamut phone JPEGs render correctly.

### Phase 3 — `etch-core` and performance (12–16 wk estimate)
Rust engine on `wgpu` with WGSL passes behind the IR (§2, §10 D2); native Metal viewport on desktop; compute blurs and pyramids; viewport-first tiling; local Laplacian clarity. The web keeps the WebGL2 engine until `etch-core` runs there through WASM + WebGPU at parity.
**Exit:** performance budgets met on M1 Air and a mid-range Windows laptop (Intel Iris Xe); Metal, WebGPU and WebGL2 at parity under the render contract.

### Phase 4 — Desktop (shell 2–3 wk after Phase 0; the rest overlaps Phases 3 and 6)
§10 D1 shell first (Tauri, native I/O, signed builds, auto-update), then D3–D5 as the engine lands: native catalog, LibRaw decode, lcms2, HDR/EDR, print.
**Exit:** an installable macOS build that culls, grades and exports with the native engine; the same `.etch` document renders identically on web and macOS. Signed Windows builds follow on the same core.

### Phase 5 — Pro toolkit (10–12 wk)
Heal/clone/content-aware fill, frequency separation, linear-light dodge & burn, edge-aware masks, lens correction, profiled denoise, capture sharpening, highlight reconstruction.
**Exit:** sensor-dust cleanup and portrait retouch can be done without leaving Intaglio.

### Phase 6 — Library and workflow (8–10 wk)
Catalog, culling, sync, XMP and Lightroom import, export presets, hot folders.
**Exit:** a 2,000-image wedding can be culled, graded, and exported in Intaglio alone.

### Phase 7 — Moonshots (ongoing)
Spectral darkroom and film-stock library; Color Space Sculptor; Look DNA; constraint grading; optimal-transport color transfer; HDR/panorama/focus stacking; burst super-resolution; ColorChecker profile authoring; HDR/EDR editing.

---

## 13. Quality gates (always on)

- **Render contract** (exists): preview = export = tiled = JPEG/WebP, Chromium + WebKit. Extended this pass with **correctness gates** (neutral plate is a no-op, identity LUT is a no-op, master curve reaches export). Every new node adds a correctness gate, not just a parity gate.
- **Golden images:** per node, per format, per backend (WebGL2/WebGPU/Metal/D3D12), per platform (web/macOS/Windows), checked headless in Rust and in the browser.
- **Numerical tests:** curves (monotonicity, no overshoot), LUT round-trips, color transforms against reference matrices, ICC transforms against lcms2 reference output.
- **Performance CI:** budgets from §9 fail the build on regression over 10%.
- **Fuzzing:** archive parser, `.cube` parser, XMP parser.

---

## 14. Risks

| Risk | Mitigation |
|---|---|
| WebGPU behavior differs between WebKit and Chromium | Keep the WebGL2 fallback; run the render contract per backend per engine. |
| Memory on 100 MP RAW in the browser | Tile everything; half-float proxies; native decode on desktop; explicit memory budget and graceful downgrade. |
| Scope explosion | Phases have exit criteria; nothing ships without its gate. Moonshots stay in Phase 7. |
| Licensing | No GPL code (exiv2, darktable, RawTherapee). LibRaw under CDDL; lensfun (LGPL library, CC-BY-SA database) dynamically linked with attribution; ImageIO over libheif on macOS. lcms2 (MIT), OCIO (BSD), libjxl (BSD), libavif (BSD), libultrahdr (Apache), wgpu and Tauri (MIT/Apache) are permissive. Review before each integration. |
| Native Metal view under a transparent webview is fiddly (input routing, resize sync) | Spike it first in D2; fall back to a SwiftUI/AppKit UI over `etch-core` if it can't hold 120 Hz. |
| WKWebView memory limits while D1 still renders in the webview | Keep D1 on proxies with tiled export; move rendering to `etch-core` in D2. |
| No WebDriver for WKWebView (`tauri-driver` lacks macOS) | Engine tests in Rust, UI tests on the web build in Playwright WebKit, a small native smoke test for the shell. |
| Users asking for AI features | The no-AI decision is final; each AI feature competitors ship has a classical answer in §11 that we must make excellent. |
