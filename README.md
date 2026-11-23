# Etch

Etch is a deterministic, non-AI, client-only digital darkroom for still photography. This branch targets a public beta on the current and previous major Chrome and Safari releases on Apple Silicon Macs.

## Implemented beta boundary

- JPEG, PNG, WebP, and worker-backed supported-camera RAW input. The adapter recognizes `DNG`, `CR2/CR3`, `NEF`, `ARW`, `RAF`, `ORF`, and `RW2`; per-camera fixture qualification is still a release gate.
- JPEG, PNG, and WebP output through pinned browser WASM codecs, including overlap-cropped tiled rendering.
- One renderer graph (`IntaglioRenderer`) shared by preview, proof sheets, exports, and batch jobs, with measured equal-size PNG parity in local Chromium and WebKit automation.
- Typed Process Engine, Plate, Mask, and advanced graph contracts.
- Portable ZIP-based `.etchlook` recipes and `.etch` projects (with full backwards-compatible opening for legacy `.int` and `.intaglio` V2 files), incremental SHA-256, content-addressed source/LUT/font assets, quota preflight, and disk-backed OPFS creation for large archives where supported.
- Local batch ZIP export with deterministic collision-safe names and `batch-manifest.json`.
- Installable Serwist/Turbopack PWA shell with content-revisioned product assets and post-first-load offline operation.

Legacy Ormond and Nyvarra formats, generic JSON imports, video, tethering, cloud image processing, and arbitrary shader plugins are intentionally unsupported.

## Development

The repository pins Node `24.1.0` and pnpm `11.5.1`.

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

Release gates:

```bash
pnpm typecheck
pnpm lint
pnpm test:unit
pnpm test:render
pnpm test:archive
pnpm test:browser
pnpm test:offline
pnpm build
pnpm build:cloudflare
```

`pnpm qualify` runs the clean local automated gate. It does not replace actual Chrome/Safari interaction, installed/offline QA, or post-cutover Cloudflare health checks.

The archive browser contract currently proves a 65 MB disk-backed project in Chromium and a safe size-specific rejection in Playwright WebKit when OPFS is unavailable. This is not yet the promised 1 GB real-Safari qualification.

## Privacy

Photographs, RAW files, recipes, projects, LUTs, uploaded fonts, and exports stay in the browser. Cloudflare may record request and error telemetry for the application shell, but editor content is never sent to the Worker.

See [file formats](docs/FILE_FORMATS.md), [render parity](docs/RENDER_PARITY.md), [privacy and offline behavior](docs/PRIVACY_AND_OFFLINE.md), and the [release runbook](docs/RELEASE_RUNBOOK.md).
