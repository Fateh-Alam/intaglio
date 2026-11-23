export interface EffectControl {
  key: "size" | "detail" | "angle" | "phase";
  label: string;
  initial: number;
}

const size = (label: string, initial: number): EffectControl => ({ key: "size", label, initial });
const detail = (label: string, initial: number): EffectControl => ({ key: "detail", label, initial });
const angle = (initial = 0): EffectControl => ({ key: "angle", label: "Angle", initial });
const phase: EffectControl = { key: "phase", label: "Phase", initial: 0 };
const ink = [size("Spacing", 11), detail("Ink coverage", 0.55)];
const bend = [size("Radius", 70), detail("Distortion", 0.55)];
const glass = [size("Pattern size", 23), detail("Refraction", 0.55), angle()];
const cells = [size("Cell size", 14), detail("Cell definition", 0.55)];
const material = [size("Texture size", 15), detail("Texture depth", 0.65)];
const signal = [size("Band size", 15), detail("Interference", 0.55), phase];

type ColorSlots = { shadow?: string; light?: string };

type EffectRow = readonly [
  id: string, name: string, controls: readonly EffectControl[],
  options?: { colors?: readonly [string, string]; colorSlots?: ColorSlots; glyphs?: string; palette?: boolean },
];

const type = (glyphs: string, colors: readonly [string, string] = ["#0c1015", "#e9efdf"], colorSlots?: ColorSlots) =>
  colorSlots ? ({ glyphs, colors, colorSlots }) : ({ glyphs, colors });
const colors = (shadow: string, light: string, colorSlots?: ColorSlots) =>
  colorSlots ? ({ colors: [shadow, light] as const, colorSlots }) : ({ colors: [shadow, light] as const });

const groups = {
  "ASCII & Text": [
    ["characters", "Characters", [size("Character size", 11), detail("Contrast", 0.55), phase], type(" .:-=+*#%@")],
    ["ascii-studio", "ASCII Studio", [size("Character size", 9), detail("Color", 0.7), phase], type(" ·+○◇#▓█")],
    ["keycap", "Keycap ASCII", [size("Key size", 19), detail("Key depth", 0.65)], type(" .:-+*#%@")],
    ["block", "Block Characters", cells, type(" ░▒▓▀▄▛█")],
    ["dots", "Dots", ink, colors("#101014", "#e9eceb")],
    ["mixed", "Mixed Glyphs", cells, type(" .:╱+×▫■▓█")],
    ["braille", "Braille", ink, colors("#090c10", "#eef4e8")],
  ],
  "Pixel & Blocks": [
    ["pixel-art", "Pixel Art", [size("Pixel size", 8), detail("Color levels", 0.28)]],
    ["mosaic", "Mosaic", [size("Tile size", 20), detail("Grout width", 0.4)]],
    ["lego", "LEGO", [size("Brick size", 18), detail("Stud depth", 0.65)]],
    ["voxel", "Voxel", [size("Cube size", 23), detail("Face shading", 0.65)]],
    ["hex-mosaic", "Hex Mosaic", cells],
    ["led-matrix", "LED Matrix", [size("LED spacing", 9), detail("Glow", 0.65)], colors("#090710", "#ff7c29")],
  ],
  "Print & Paper": [
    ["dither", "Dither", [size("Pixel size", 3), detail("Dither strength", 1), angle(), phase], { palette: true }],
    ["stippling", "Stippling", ink, colors("#1e1a16", "#f5ede0")],
    ["risograph", "Risograph", [size("Screen size", 10), detail("Misregistration", 0.45), angle(15)], colors("#e82d79", "#09a6b3")],
    ["comic", "Comic", [size("Dot spacing", 8), detail("Ink edges", 0.6)]],
    ["sketch", "Sketch", material, colors("#222126", "#f7f2e7")],
    ["engraving", "Engraving", [...ink, angle(-18)], colors("#221e17", "#f5e6c9")],
    ["warhol", "Warhol", [size("Panel size", 82), detail("Tonal separation", 0.7)]],
    ["blueprint", "Blueprint", [size("Grid spacing", 31), detail("Line sensitivity", 0.6)], colors("#073475", "#c8efff")],
    ["halftone", "Halftone", [...ink, angle(35)], colors("#1e1c22", "#f9f4e6")],
    ["woodblock", "Woodblock", material, colors("#15223e", "#f0d6a0")],
    ["posterize", "Posterize", [detail("Color levels", 0.23)]],
    ["mezzotint", "Mezzotint", ink, colors("#211c19", "#f0e5d8")],
    ["pointillize", "Pointillize", ink, colors("#191716", "#efe4d0", { light: "Canvas" })],
    ["crosshatch", "Crosshatch", [...ink, angle(32)], colors("#2b211c", "#f6eee2")],
    ["cmyk-drops", "CMYK Drops", [...ink, angle(0)]],
    ["cyanotype", "Cyanotype", [detail("Print density", 0.6)], colors("#042f64", "#e7f3fd")],
    ["honeycomb-screen", "Honeycomb Screen", ink, colors("#262034", "#f6e4c8")],
    ["crumpled-print", "Crumpled Print", material],
  ],
  Geometric: [
    ["cross", "Cross", [...ink, angle()], colors("#101217", "#edeee8")],
    ["diamond", "Diamond", [...ink, angle()], colors("#101217", "#edeee8")],
    ["lines", "Lines", [...ink, angle()], colors("#101217", "#edeee8")],
    ["diagonal", "Diagonal", [...ink, angle(45)], colors("#101217", "#edeee8")],
    ["specimen", "Specimen", [size("Plate spacing", 37), detail("Line weight", 0.4)]],
    ["low-poly", "Low Poly", [size("Facet size", 37), detail("Facet shade", 0.55)]],
    ["droste", "Droste", [size("Inner aperture", 30), detail("Rotation", 0.45), angle(18)]],
    ["truchet", "Truchet", [...ink, angle(0)], colors("#171c24", "#faedd7")],
    ["iso-extrude", "Iso Extrude", [size("Column size", 15), detail("Height", 0.7)]],
    ["flow-field", "Flow Field", [...ink, angle()], colors("#111a27", "#c5e5db")],
    ["lattice", "Lattice", [size("Weave size", 17), detail("Strand width", 0.65)]],
    ["topography", "Topography", [detail("Contour count", 0.58), size("Line weight", 16)], colors("#132c21", "#d4e8b1")],
    ["forms", "Forms", [size("Shape spacing", 18), detail("Shape scale", 0.62), angle(0)]],
    ["schematic", "Schematic", [size("Trace spacing", 21), detail("Line weight", 0.5)], colors("#141a23", "#d6eedc")],
    ["neon-grid", "Neon Grid", [size("Grid spacing", 29), detail("Emission", 0.68)], colors("#140922", "#ff45be")],
  ],
  Distort: [
    ["smudge", "Smudge", [size("Stroke size", 25), detail("Drag distance", 0.6), angle(28)]],
    ["pinch", "Pinch", bend],
    ["spherize", "Spherize", bend],
    ["twirl", "Twirl", [...bend, angle(65)]],
    ["zigzag", "ZigZag", [...bend, phase]],
    ["ripple", "Ripple", [size("Wavelength", 30), detail("Displacement", 0.45), phase]],
    ["polar", "Polar", [angle(), detail("Radial stretch", 0.5)]],
    ["shear", "Shear", [size("Band height", 55), detail("Skew", 0.5), angle()]],
  ],
  "Blur & Focus": [
    ["motion-blur", "Motion Blur", [size("Length", 27), detail("Falloff", 0.5), angle(25)]],
    ["tilt-shift", "Tilt-Shift", [size("Blur radius", 25), detail("Focus width", 0.3), angle()]],
    ["gaussian-blur", "Gaussian Blur", [size("Radius", 18)]],
    ["radial-blur", "Radial Blur", [size("Length", 30), detail("Rotation", 0.0), angle()]],
  ],
  "Glitch & Signal": [
    ["crt", "CRT Screen", [size("Scan spacing", 4), detail("Curvature", 0.45), phase]],
    ["pixel-sort", "Pixel Sort", [size("Run length", 33), detail("Brightness threshold", 0.35), angle()]],
    ["forensics", "Forensics", [size("Grid spacing", 22), detail("Contour sensitivity", 0.6)], colors("#040a10", "#8cfce8")],
    ["digital-distortion", "Digital Distortion", signal],
    ["datamosh", "Datamosh", [size("Block size", 34), detail("Smear", 0.7), phase]],
    ["lofi", "Lofi", signal],
    ["rgb-split", "RGB Split", [size("Channel offset", 8), angle(0)]],
    ["scanline", "Scanline", [size("Line spacing", 5), detail("Line darkness", 0.56), phase], colors("#09070c", "#ffffff", { shadow: "Line color" })],
    ["thermal", "Thermal", [detail("Heat range", 0.54)]],
    ["beacon", "Beacon", [size("Point spacing", 22), detail("Signal strength", 0.65), phase], colors("#080a19", "#ff6639")],
  ],
  "Light & Color": [
    ["disco", "Disco", [size("Shape size", 22), detail("Color shifts", 0.64), phase]],
    ["anaglyph", "Anaglyph 3D", [size("Stereo offset", 11), angle(0)]],
    ["gradient-map", "Gradient Map", [detail("Midpoint", 0.5)], colors("#231249", "#ffd298")],
    ["prism", "Prism", [size("Facet size", 27), detail("Dispersion", 0.55), angle(30)]],
    ["dreamdust", "Dreamdust", [size("Particle size", 20), detail("Particle glow", 0.6), phase], colors("#21152e", "#f9aadc")],
    ["light-wind", "Light Wind", [size("Streak length", 45), detail("Light intensity", 0.65), angle(22), phase], colors("#220c4f", "#78dbea")],
    ["kaleidoscope", "Kaleidoscope", [detail("Segments", 0.36), angle(0), phase]],
    ["warpbloom", "Warpbloom", [size("Glow radius", 24), detail("Warp strength", 0.64), phase], colors("#692dee", "#ffcfac")],
    ["duotone", "Duotone", [detail("Tonal contrast", 0.55)], colors("#18314a", "#f5ae85")],
    ["edge-glow", "Edge Glow", [size("Glow width", 9), detail("Sensitivity", 0.64)], colors("#130723", "#63e9fb")],
    ["aberration", "Aberration", [size("Dispersion", 9), detail("Radial bias", 0.67)]],
  ],
  Glass: [
    ["frosted-glass", "Frosted Glass", glass],
    ["tinted-glass", "Tinted Glass", glass, colors("#492943", "#ffba69")],
    ["shatter", "Shatter", glass],
    ["vitrine", "Vitrine", glass],
    ["glass-orb", "Glass Orb", bend],
    ["fluted-glass", "Fluted Glass", glass],
    ["cross-reeded", "Cross Reeded", glass],
    ["hammered", "Hammered", glass],
    ["diamond-glass", "Diamond Glass", glass],
    ["hex-glass", "Hexagon Glass", glass],
    ["glass-ripple", "Ripple Glass", [size("Wavelength", 30), detail("Refraction", 0.6), phase]],
    ["ice-crackle", "Ice Crackle", glass],
    ["chevron-prism", "Chevron Prism", glass],
    ["seedy-bubbles", "Seedy Bubbles", glass],
    ["glass-pixel", "Glass Pixel", glass],
    ["jello", "Jello", [...glass, phase]],
  ],
  "Material & Texture": [
    ["waves", "Waves", [size("Wavelength", 20), detail("Amplitude", 0.5), angle(16), phase]],
    ["oil-paint", "Oil Paint", material],
    ["watercolor", "Watercolor", material],
    ["chrome", "Chrome", material],
    ["thin-film", "Thin-Film", [...material, phase]],
    ["marble", "Marble", material, colors("#36314a", "#f3e7d4")],
    ["molten-metal", "Molten Metal", [...material, phase], colors("#341521", "#ffa446")],
    ["crystallize", "Crystallize", material],
    ["emboss", "Emboss", [size("Relief width", 5), detail("Relief depth", 0.55), angle(35)], colors("#423b38", "#e0d2bd")],
    ["petrol-sheen", "Petrol Sheen", [...material, phase]],
    ["heat-tint", "Heat Tint", [...material, phase]],
  ],
  "Studio Tools": [
    ["relief", "Relief", [size("Relief width", 20), detail("Depth", 0.55), angle(45)], colors("#172432", "#d9d4c9")],
    ["weave", "Weave", [size("Thread spacing", 8), detail("Thread depth", 0.58), angle(45)], colors("#3a273b", "#efccad")],
    ["woodgrain", "Woodgrain", [size("Ring spacing", 20), detail("Grain depth", 0.61), angle(16)], colors("#452016", "#eca860")],
    ["layered-paper", "Layered Paper", [size("Layer spacing", 14), detail("Number of layers", 0.58), angle(35)], colors("#173e4d", "#fae4c4")],
    ["studio-frame", "Studio Frame", [size("Margin", 24), detail("Layout", 0.48), angle()], type("INTAGLIO", ["#202020", "#eee7d7"], { shadow: "Ink", light: "Paper" })],
    ["signal-grid", "Signal Grid", [size("Grid spacing", 38), detail("Sweep", 0.54), phase], colors("#001010", "#63ffaf")],
    ["negative", "Negative", [detail("Color crossover", 0.4)], colors("#10335b", "#ffe6a0")],
    ["scan-slice", "Scan Slice", [size("Viewport", 64), detail("Slice direction", 0.5), angle()], colors("#080c11", "#8ff1eb")],
    ["infrared", "Infrared", [detail("Color separation", 0.65)], colors("#ca155a", "#7ff3e9")],
    ["neon-tube", "Neon Tube", [size("Tube width", 6), detail("Glow", 0.68)], colors("#220a21", "#f357cc")],
    ["slit-scan", "Slit Scan", [size("Stretch length", 35), detail("Band width", 0.6), angle(90), phase]],
    ["separation", "Separation", [size("Part spacing", 25), detail("Offset", 0.6), angle(15)], colors("#122535", "#c5f7ec")],
    ["stamp-ink", "Stamp Ink", [size("Impression size", 65), detail("Ink loss", 0.44), angle()], type("PRINTED", ["#8c2037", "#ffebd2"], { shadow: "Ink" })],
    ["inlay", "Inlay", [size("Facet size", 15), detail("Reflectivity", 0.63), angle(35), phase], colors("#202344", "#bde7dc")],
  ],
  Finishing: [
    ["vignette", "Vignette", [size("Radius", 60), detail("Feather", 0.55)], colors("#050408", "#ffffff", { shadow: "Vignette color" })],
    ["crt-curvature", "CRT Curvature", [detail("Curvature", 0.35)]],
    ["bloom", "Bloom", [size("Radius", 17), detail("Threshold", 0.48)], colors("#111111", "#fff7dc", { light: "Glow color" })],
    ["character-bloom", "Character Bloom", [size("Radius", 5), detail("Sensitivity", 0.55)], colors("#070708", "#f4ffae", { light: "Glow color" })],
    ["character-chroma", "Character Chroma", [size("Offset", 4), angle(0)]],
    ["film-grain", "Film Grain", [size("Grain size", 2), detail("Color grain", 0.12), phase]],
    ["film-dust", "Film Dust", [size("Particle size", 5), detail("Density", 0.35), phase]],
    ["digital-noise", "Digital Noise", [size("Noise size", 3), detail("Color noise", 0.65), phase]],
    ["pixelate", "Pixelate", [size("Pixel size", 8)]],
    ["sharpen", "Sharpen", [size("Radius", 2), detail("Edge gain", 0.4)]],
    ["reduce-noise", "Reduce Noise", [size("Radius", 5), detail("Edge protection", 0.6)]],
    ["diffuse", "Diffuse", [size("Spread", 5), detail("Noise scale", 0.42), phase]],
    ["threshold", "Threshold", [detail("Cutoff", 0.5), size("Softness", 5)], colors("#060709", "#fafafa")],
    ["fragment", "Fragment", [size("Offset", 11), detail("Spread", 0.55), angle(0)]],
    ["color-overlay", "Color Overlay", [detail("Luminosity preservation", 0.72)], colors("#5e204f", "#f59583")],
    ["lens-flare", "Lens Flare", [size("Spread", 52), detail("Flare position", 0.68), angle(20)], colors("#913a21", "#ffd4a1")],
  ],
} as const satisfies Record<string, readonly EffectRow[]>;

export const EFFECT_GROUPS = Object.keys(groups) as (keyof typeof groups)[];
export type EffectId = (typeof groups)[keyof typeof groups][number][0];

export interface EffectDefinition {
  id: EffectId;
  name: string;
  group: keyof typeof groups;
  controls: readonly EffectControl[];
  colors?: readonly [string, string];
  colorSlots?: ColorSlots;
  glyphs?: string;
  palette?: boolean;
}

export const EFFECTS: readonly EffectDefinition[] = EFFECT_GROUPS.flatMap((group) =>
  (groups[group] as readonly EffectRow[]).map(([id, name, controls, options]) => ({
    id: id as EffectId, name, group, controls, ...options,
  })),
);

export const EFFECT_BY_ID = new Map(EFFECTS.map((effect) => [effect.id, effect]));
