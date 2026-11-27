import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FILM_EMULATION_SHADER_CHUNK } from "../../app/lib/filmShaderChunk";
import { FILM_EMULATIONS } from "../../app/lib/filmEmulations";
import { convertFilmChunk, filmIds } from "../../scripts/lib/filmWgsl.mjs";

describe("Mac engine film looks", () => {
  it("are generated from the web's GLSL and up to date (run pnpm gen:film-wgsl)", () => {
    expect(readFileSync("crates/etch-core/src/film.wgsl", "utf8")).toBe(convertFilmChunk(FILM_EMULATION_SHADER_CHUNK));
  });

  it("index films in the web's order", () => {
    expect(readFileSync("crates/etch-core/src/film_ids.txt", "utf8").trim().split("\n")).toEqual(FILM_EMULATIONS.map((film) => film.id));
    expect(filmIds(readFileSync("app/lib/filmEmulations.ts", "utf8"))).toEqual(FILM_EMULATIONS.map((film) => film.id));
  });
});
