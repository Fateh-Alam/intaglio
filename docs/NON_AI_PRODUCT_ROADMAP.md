# Intaglio Public-Beta Roadmap

Intaglio is a deterministic, non-AI, local still-photography darkroom. The public-beta priority is proof: one serializable document, one measurable renderer, portable assets, offline continuity, and claims that never exceed qualification evidence.

## Public-beta boundary

- Current and previous major Chrome and Safari on Apple Silicon Macs.
- JPEG, PNG, WebP, and supported-camera RAW input; JPEG, PNG, and WebP output.
- `.int`, `.intaglio`, and `.cube`; no legacy migration or generic JSON import.
- Local Process, Plate, Mask, graph, proof-sheet, batch, and export workflows.
- Linear-sRGB working space and sRGB output.

## Qualification still required

1. Expand the passing PNG/MozJPEG/WebP equal-size and forced-tile Chromium/WebKit fixtures into the full image/effect matrix, landmark extraction, and the 100-megapixel stress run.
2. Qualify redistributable RAW samples per advertised family and camera.
3. Extend the Chromium-proven 65 MB OPFS-backed writer to streaming extraction, prove the same path in actual Safari, then qualify a 1 GB project without process-memory duplication. Playwright WebKit currently proves the preflight recovery path when OPFS is unavailable.
4. Complete installed-PWA and offline-update testing in real Chrome and Safari.
5. Validate the OpenNext preview before the single public traffic cutover.

Future work includes wider-gamut/HDR output, deeper camera/lens profiles, and advanced denoise. It does not include AI, video, tethering, cloud editing, or collaboration.
