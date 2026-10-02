import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";

const projectRoot = process.cwd();
const publicDir = path.join(projectRoot, "public");
const rawPublicDir = path.join(publicDir, "libraw");
await mkdir(rawPublicDir, { recursive: true });
for (const filename of ["index.js", "worker.js", "libraw.js", "libraw.wasm"]) await copyFile(path.join(projectRoot, "node_modules", "libraw-wasm", "dist", filename), path.join(rawPublicDir, filename));

console.log("Prepared Intaglio RAW browser runtime.");
