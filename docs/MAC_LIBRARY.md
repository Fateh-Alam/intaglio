# Mac photo library

From the Mac start screen or File menu, open **Library**, then **Import folder**. Etch indexes supported photos recursively in a local SQLite catalog and keeps the originals in their folders. Reimport refreshes availability and keeps ratings. If folders overlap, each photo keeps one shared rating and flag.

Use the arrows to browse, Space to switch between Grid and Preview, P or X to pick or reject and advance, U to clear a flag, and 0–5 to set a rating. Press E to open the original in Edit. Use Shift-click for a range or Command-click for individual selections. Batch export applies the current editor adjustments and export settings to the selection, or the current filter when there is no selection. It writes one photo at a time to a chosen folder, preserves existing files, and reports per-file failures.

## 2,000-frame check

The test shoot was [Stillwater Lift Bridge](https://github.com/Matt1Up/stillwater-lift-bridge-photogrammetry-dataset) by Matthew Guertin, licensed CC BY 4.0. The 2,000-image workload used unique camera thumbnails extracted from the shoot's JPEGs. Their export resolution was 160 × 120. It did not load the full 20 GB of original files.

| Check | Result on Apple M3 |
|---|---:|
| Native scan, SQLite import and list readback | 34.3 ms |
| Native uncached JPEG preview p95 | 0.97 ms |
| Native flag and rating write p95 | 0.023 ms |
| Reopen and verify all catalog culling decisions | 286 pick/rating pairs and 1,714 rejects |

The local Mac build imported the 2,000 files through the native folder dialog. Keyboard picks, rejects, ratings and preview mode worked. Both picks exported through the native destination picker. Two full-size JPEG originals from the same shoot also saved at 4,096 × 3,072. When a name matched a previous output, Etch saved a second file under a numbered name.

The RAW path was checked separately on eight real camera originals in CR2, CR3, NEF, ARW, RAF, ORF, RW2 and DNG. Each produced a decodable library preview without running the editor's full development pipeline. The camera preview test is independent of the 2,000-thumbnail timing.

Re-run the native checks with `ETCH_LIBRARY_SHOOT=<folder> cargo test --manifest-path src-tauri/Cargo.toml real_photo_library_benchmark -- --ignored --nocapture` or `ETCH_LIBRARY_RAWS=<folder> cargo test --manifest-path src-tauri/Cargo.toml real_camera_previews -- --ignored --nocapture`.

## Mac and web

Etch for Mac 1.0.0-rc.2 includes the web editor through `64e3679`, covering titles and captions, MP4 export for animated Creative Effects, the revised Grade mode, and the searchable Effects sidebar with previews and docked applied effects. The photo library and native Metal viewport are available in the Mac app. See the [editor changes since rc.1](https://github.com/Fateh-Alam/intaglio/compare/v1.0.0-rc.1...64e36792b785a5c1dba461d2231dca692f56bdee).
