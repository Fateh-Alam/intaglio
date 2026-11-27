// Regenerates crates/etch-core/src/film.wgsl and film_ids.txt from the web's film looks.
import { readFileSync, writeFileSync } from "node:fs";
import { convertFilmChunk, filmIds } from "./lib/filmWgsl.mjs";

const chunk = readFileSync("app/lib/filmShaderChunk.ts", "utf8").match(/`([\s\S]*)`/)[1];
writeFileSync("crates/etch-core/src/film.wgsl", convertFilmChunk(chunk));
writeFileSync("crates/etch-core/src/film_ids.txt", `${filmIds(readFileSync("app/lib/filmEmulations.ts", "utf8")).join("\n")}\n`);
console.log("Wrote crates/etch-core/src/film.wgsl and film_ids.txt");
