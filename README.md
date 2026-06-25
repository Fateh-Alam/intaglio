# Ormond

A timeless digital darkroom for photographs that deserve patience.

Ormond is a browser-based, local-first photography workspace built with Next.js,
React, Three.js, and WebGL. The visible product direction is quiet, archival,
and photo-led; the editing capabilities remain client-side.

## Features

- WebGL image development with exposure, contrast, HSL, color wheels, tone
  curves, film emulation, halation, bloom, grain, lens effects, and masking.
- 3D `.cube` LUT import plus an in-app LUT creator.
- Reference matching, history, virtual copies, edit diff viewer, snapshots, and
  A/B comparison.
- `.orm` Print Recipes for reusable edit settings.
- Ormond Collections with search, tags, favorites, local imports, and native
  `.orm` downloads.
- `.ormond` Ormond Archives for complete portable sessions.
- Legacy `.nyv`, `.nyvlt`, and `.nyvproj` imports remain supported.
- Manual culling with ratings, pick/reject flags, color labels, and shortcuts.
- Editable title, caption, creator, copyright, and keyword metadata saved inside
  Archives.
- Exportable proof watermark and export recipes for delivery workflows.
- Command palette, PWA install support, and offline editor fallback.
- Local export to JPEG, PNG, and WebP.

## Native File Formats

- `.orm` - Print Recipe. Stores selected edit settings as a reusable recipe.
- `.ormond` - Ormond Archive. Stores a full local session: image source, edit
  recipe, text overlay, metadata, watermark settings, export recipe, virtual
  copies, and restore state.
- `.nyv` - Legacy recipe import.
- `.nyvlt` - Legacy session import.
- `.nyvproj` - Legacy project session import.
- `.cube` - Industry LUT format for import and creator output.

The PWA manifest advertises `.ormond` archive handling and still accepts legacy
session formats where supported by the installed browser.

## Getting Started

Install dependencies:

```bash
pnpm install
```

Run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

```bash
pnpm lint
pnpm build
pnpm start
pnpm test:e2e
```

## Project Structure

- `app/page.tsx` - Ormond editorial home.
- `app/editor/page.tsx` - main darkroom workspace.
- `app/presets/page.tsx` - Ormond Collections.
- `app/components` - editor controls, modals, WebGL canvas components, and panels.
- `app/lib/brand.ts` - product naming, format, and storage-key constants.
- `app/utils` - LUT parsing, reference matching, spline, and tutorial helpers.
- `docs/NON_AI_PRODUCT_ROADMAP.md` - product roadmap.
- `public` - public app assets.
