# Privacy and Offline Operation

Intaglio performs editing locally. Photographs, RAW files, recipes, projects, LUTs, uploaded fonts, and exports are not uploaded. Cloudflare observability may retain application-shell request/error telemetry, but no editor content.

The Serwist/Turbopack-generated service worker precaches the shell, editor routes, built-in fonts, icons, sample, versioned Next chunks, and bundled RAW WASM. It runtime-caches only same-origin application navigation. User photographs, projects, recipes, LUT/font uploads, and exports are never request URLs and are excluded from the generated asset manifest by extension. Atomic revisions install before activation; failed installs leave the previous working shell intact, and clients receive an update prompt.

Offline support begins after one complete successful online load. Portable-save creation checks quota and usable origin-private file storage before processing large projects, then reports a size-specific recovery path when Private Browsing or insufficient storage prevents the operation. The 1 GB statement remains a qualification target until the documented stress gate passes in supported real browsers.
