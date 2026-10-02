# Render Parity Contract

Preview, A/B, proof, export, batch, and thumbnails compile the same canonical graph. The order is decode/orient, global geometry, a single linear-sRGB input transform (skipped for 16-bit linear RAW sources), ordered plates and mask expressions, global film/optical/bloom/halation/sharpen, sRGB display transform, then text/watermark in output coordinates. Tone curves and creative LUTs operate on display-encoded values inside the linear pipeline (encode, apply, decode) with extended range above 1.0.

At equal dimensions, each fixture must independently satisfy:

- PNG versus lossless preview readback: SSIM >= `0.9995`, mean CIEDE2000 <= `0.25`, p99 CIEDE2000 <= `0.75`.
- JPEG/WebP quality >= 90 versus pre-encode reference: SSIM >= `0.995`, mean CIEDE2000 <= `1.0`.
- Crop corners, mask boundaries, text baselines, and watermark anchors: <= `0.5` output pixel.
- Tile-edge regions use the same ordinary-image thresholds.

The automated equal-size fixture uses an actual WebGL preview readback and separately rendered/decoded PNG, JPEG, and WebP exports. Output encoding uses pinned jSquash browser WASM codecs: Rust PNG, MozJPEG, and libwebp. For the beta's quality-90-or-higher contract, MozJPEG uses maximum-quality 4:4:4 chroma and WebP uses lossless mode; this intentionally favors the perceptual gate over file size. File signatures and the published lossless/lossy thresholds are checked in both engines.

The fixture enables geometry, LUT/domain handling, an adjustment plate, radial, linear, luminance, color-range, and brush masks, text, watermark, and deterministic grain. A forced 2-by-2 tile version exercises global UV mapping, overlap, crop, stitch, masks, grain, and overlays against the non-tiled reference. Both fixtures pass independently in Playwright Chromium and WebKit. Cached transparent overlay layers remove WebKit's otherwise context-dependent glyph-edge rasterization while keeping visible preview and export content on the same compositor.

Remaining fixture qualification covers the full neutral/gradient/high-dynamic-range/skin/saturated image matrix, each mask operator in isolation, bloom/halation, a 100-megapixel tiled stress run, overlay landmark extraction, cross-browser byte/perceptual comparison, and actual Safari. Playwright WebKit is local automated evidence; it is not real Safari or installed-PWA evidence.

Parity cannot detect an operation that is equally wrong in preview and export, so the probe also runs correctness gates against known results: a full-coverage neutral plate must be a no-op, a 17-point identity LUT must be a no-op (mean CIEDE2000 <= `0.25`), and an inverting master curve must reach the exported PNG (mean CIEDE2000 >= `20`).
