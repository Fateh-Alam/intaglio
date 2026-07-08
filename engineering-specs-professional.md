# Nyvarra Studio: Instagrammable + Professional-Grade Editor Specification

**Document type:** Product-engineering specification, rendering architecture guide, algorithm manual, recipe design system, and implementation roadmap  
**Target:** Transform Nyvarra Studio from a cinematic WebGL image stylizer into a creator-friendly, professional-grade browser editor  
**Primary codebase areas:** `app/components/ImagePlane.tsx`, `app/components/CinematicEditor.tsx`, `app/editor/pageTypes.ts`, `app/lib/presets.ts`, `app/lib/filmShaderChunk.ts`, `app/utils/lutParser.ts`, `app/utils/colorTransfer.ts`, `app/components/BrushMaskCanvas.tsx`, `app/components/HistogramAnalyzer.tsx`, `app/components/CurveEditor.tsx`, export modules, project/session persistence

---

## 0. Brutal Executive Summary

Nyvarra already has the important thing most editing tools do not have: **taste**.

It has cinematic recipes, halation, bloom, film borders, anamorphic effects, god lights, LUTs, curves, brush masks, histograms, A/B comparison, virtual copies, and a strong brand direction. The issue is not lack of features. The issue is that these features currently sit on a renderer that behaves like a large experimental shader instead of a professional imaging pipeline.

The goal is not to make Nyvarra boring. The goal is to make Nyvarra **trustworthy while still looking insane on Instagram**.

The new product target:

> **Nyvarra Studio is a cinematic creative editor for creators, photographers, designers, and visual storytellers, powered by a professional-grade color-managed rendering engine.**

This means Nyvarra does not need to become a complete Lightroom replacement on day one. It should not waste energy building catalogs, cloud libraries, facial tagging, or print workflows before the core is mature. Instead, it should become the editor people open when they want images to look:

- cinematic
- expensive
- moody
- editorial
- surreal
- polished
- filmic
- Instagram-native
- export-clean
- consistent
- non-destructive

The transformation requires five core shifts:

1. **From monolithic shader to render graph.**
2. **From 8-bit-ish creative math to high-precision, color-managed processing.**
3. **From fixed global settings to a document model with adjustment layers and masks.**
4. **From HSL/RGB hacks to perceptual color operations using OKLAB/OKLCH.**
5. **From cool presets to a systematic recipe engine with QA rules and visual identity.**

---

## 1. Product Positioning

### 1.1 What Nyvarra Should Be

Nyvarra should not position itself as another generic photo editor.

The market already has:

- Lightroom for professional RAW development and catalogs
- Photoshop for compositing
- VSCO for mobile film looks
- Instagram for basic social edits
- CapCut for creator templates
- Canva for lightweight design
- Dehancer for serious film emulation
- DaVinci Resolve for colorists

Nyvarra should become:

> **The cinematic editor for still images.**

It should make ordinary photos feel like:

- a movie still
- an album cover
- a fashion campaign
- a private memory archive
- a dream sequence
- a designer moodboard
- a late-night city frame
- an editorial Instagram carousel

### 1.2 What Nyvarra Should Not Try To Be Yet

Do not try to build all of this immediately:

- full Lightroom catalog system
- full Photoshop compositing
- advanced RAW demosaicing engine from scratch
- AI generative fill
- cloud sync
- marketplace
- mobile app
- social network

These can come later. The immediate problem is renderer trust and creator desirability.

### 1.3 The Ideal User Promise

The product promise should be:

> **Upload any photo. Apply a cinematic recipe. Fine-tune with professional controls. Export clean, high-resolution images that look exactly like the preview.**

### 1.4 The Emotional Promise

The user should feel:

- “This made my photo look expensive.”
- “This does not look like a generic filter.”
- “This is more cinematic than Lightroom presets.”
- “The colors do not fall apart when I push them.”
- “I can trust this for a real post, portfolio, campaign, poster, or client preview.”

---

## 2. Definition of Professional Grade

A professional-grade editor is not defined by number of sliders. It is defined by predictability, precision, and confidence.

Nyvarra becomes professional grade when it satisfies these conditions:

### 2.1 Rendering Requirements

- Every visible control has a real, tested effect.
- Preview and export match visually.
- High-resolution images do not collapse performance.
- Effects are resolution-independent.
- Color operations do not cause obvious banding.
- Masks remain editable and independent.
- LUTs are applied in known color spaces.
- Tone curves do not overshoot or posterize.
- Skin remains plausible under aggressive recipes.
- Gradients remain smooth after heavy edits.
- Export preserves expected resolution and color appearance.

### 2.2 UX Requirements

- A beginner can get a beautiful result in 10 seconds.
- A serious user can fine-tune in layers.
- The user always knows what changed.
- Recipes feel curated, not random.
- Controls are grouped by mental model, not shader internals.
- The product has visual hierarchy and premium restraint.
- “Instagrammable” looks are one-click, but not destructive.

### 2.3 Engineering Requirements

- Render pipeline is modular.
- Settings schema is versioned.
- Project files are backwards-compatible.
- GPU feature detection is explicit.
- Expensive effects use downsampled framebuffers.
- Masks use textures/framebuffers, not base64 strings as primary live state.
- History stores operations intelligently, not huge snapshots for every micro-change.
- Export path uses the same render graph as preview, only at different dimensions/quality.

---

## 3. Current Critical Problems

### 3.1 Problem: Monolithic `ImagePlane.tsx`

Current state appears to place most image processing inside one huge fragment shader.

This creates these problems:

- Every pixel evaluates too many branches.
- Large blur effects are impossible or low quality.
- Debugging becomes painful.
- Adding one effect risks breaking another.
- Preview/export consistency becomes harder.
- Performance scales poorly on large canvases.
- Shader compile time and uniform management become fragile.

### 3.2 Problem: Single Global Settings Object

A massive `EditorSettings` object mixes:

- image processing state
- UI state
- compare state
- masks
- LUT textures
- curves
- transforms
- recipe values
- film emulation
- history-related values

This is not scalable.

### 3.3 Problem: Color Math Is Not Perceptual Enough

Standard RGB/HSL operations are not perceptually uniform. Pushing blue saturation darkens perceived lightness. Hue shifts can create hard boundaries. Skin protection can fail because skin is not just a hue value.

### 3.4 Problem: WebGL 1.0 Compromises

Flattened 3D LUTs, 8-bit textures, and manual interpolation create performance and quality limits.

### 3.5 Problem: Masking Is Too Fixed

One brush mask plus fixed radial/linear/luminosity variables is not a real local adjustment system.

### 3.6 Problem: Recipes Can Expose Engine Weaknesses

Strong recipes use halation, grain, dehaze, tint, hue shifts, vignette, and optical distortion. If the renderer is weak, strong recipes reveal:

- skin artifacts
- color clipping
- banding
- muddy shadows
- crunchy highlights
- slow frame rate
- inconsistent export

### 3.7 Problem: Film Emulations Are More Like Film-Inspired Looks

Current film emulations described as simple channel/HSL/luma transforms are useful creatively, but not accurate enough to market as true film emulation.

---

## 4. Target System Architecture

Nyvarra should be rebuilt around four layers:

```txt
Application UI
  ↓
Document Model + State Store
  ↓
Render Graph / Processing Engine
  ↓
GPU Backend + Export Backend
```

### 4.1 The New Document Model

Replace the “one giant settings object” as the long-term source of truth with a versioned document structure.

```ts
export type NyvarraDocument = {
  schemaVersion: number;
  id: string;
  createdAt: string;
  updatedAt: string;

  source: ImageSource;
  color: ColorPipelineConfig;
  transform: TransformStack;

  adjustmentStack: AdjustmentLayer[];
  masks: MaskLayer[];
  recipes: AppliedRecipe[];
  overlays: OverlayLayer[];

  history: HistoryGraph;
  exportProfiles: ExportProfile[];
  metadata: DocumentMetadata;
};
```

### 4.2 Source Model

```ts
export type ImageSource = {
  id: string;
  kind: "raster" | "raw" | "video-frame";
  fileName: string;
  mimeType: string;
  width: number;
  height: number;
  orientation: number;
  embeddedColorProfile?: EmbeddedColorProfile;
  exif?: Record<string, unknown>;
  originalBlobRef: string;
  previewTextureRef?: string;
  fullResTextureRef?: string;
};
```

### 4.3 Color Pipeline Config

```ts
export type ColorPipelineConfig = {
  inputColorSpace: "srgb" | "display-p3" | "adobe-rgb" | "rec2020" | "unknown";
  workingColorSpace: "linear-srgb" | "linear-display-p3";
  perceptualSpace: "oklab" | "oklch";
  displayTransform: "srgb" | "display-p3";
  precision: "half-float" | "float";
  gamutMapping: "clip" | "compress" | "perceptual";
  dithering: boolean;
};
```

### 4.4 Adjustment Layer Model

All edits should become layers or operations.

```ts
export type AdjustmentLayer = {
  id: string;
  name: string;
  type:
    | "base-develop"
    | "tone-curve"
    | "hsl-oklch"
    | "color-wheels"
    | "lut"
    | "film-look"
    | "local-adjustment"
    | "optical-effect"
    | "grain"
    | "sharpen"
    | "vignette";
  enabled: boolean;
  opacity: number;
  blendMode:
    | "normal"
    | "color"
    | "luminosity"
    | "soft-light"
    | "screen"
    | "multiply";
  maskIds: string[];
  params: Record<string, unknown>;
};
```

### 4.5 Mask Layer Model

```ts
export type MaskLayer = {
  id: string;
  name: string;
  enabled: boolean;
  type:
    | "brush"
    | "radial"
    | "linear"
    | "luminosity-range"
    | "color-range"
    | "subject"
    | "sky"
    | "depth";
  mode: "add" | "subtract" | "intersect";
  opacity: number;
  feather: number;
  params: Record<string, unknown>;
  textureRef?: string;
  vectorStrokes?: BrushStroke[];
};
```

### 4.6 Render Graph Model

A render graph is a directed acyclic graph of passes.

```ts
export type RenderPassNode = {
  id: string;
  name: string;
  passType: string;
  inputs: string[];
  outputs: string[];
  uniforms: Record<string, unknown>;
  resolutionScale: number;
  precision: "uint8" | "half" | "float";
  enabled: boolean;
};
```

### 4.7 Required Render Targets

Use named render targets:

```txt
rtInputLinear
rtBaseDeveloped
rtToneMapped
rtMaskComposite
rtLocalAdjusted
rtLookApplied
rtBrightPass
rtBloomQuarter
rtBloomHalf
rtHalation
rtOptical
rtFinalLinear
rtDisplayEncoded
```

---

## 5. GPU Backend Requirements

### 5.1 Require WebGL 2.0 For Pro Mode

Nyvarra should have two rendering modes:

```ts
export type RendererMode = "creative-compatible" | "pro-webgl2";
```

- `creative-compatible`: fallback path for weaker devices.
- `pro-webgl2`: required for high-quality editing.

Pro mode should require:

- WebGL 2.0
- `EXT_color_buffer_float` or half-float equivalent
- `OES_texture_float_linear` where possible
- `THREE.HalfFloatType` render targets
- `THREE.Data3DTexture` for LUTs
- high precision shaders

### 5.2 Render Target Defaults

```ts
const PRO_RENDER_TARGET_OPTIONS = {
  type: THREE.HalfFloatType,
  format: THREE.RGBAFormat,
  colorSpace: THREE.NoColorSpace,
  minFilter: THREE.LinearFilter,
  magFilter: THREE.LinearFilter,
  depthBuffer: false,
  stencilBuffer: false,
};
```

### 5.3 Resolution Strategy

Preview can use adaptive resolution. Export cannot.

```ts
export type PreviewQuality = "draft" | "balanced" | "quality" | "retina";

const previewScale = {
  draft: 0.5,
  balanced: 0.75,
  quality: 1.0,
  retina: Math.min(window.devicePixelRatio, 2),
};
```

Export must use image-space dimensions, not screen-space dimensions.

```txt
Preview resolution = viewport dimensions × preview scale
Export resolution = selected output dimensions
Effect radius = image-relative radius, converted per target resolution
```

### 5.4 Effect Radius Normalization

All radius controls must be normalized by image diagonal or short edge.

```ts
const imageDiag = Math.sqrt(width * width + height * height);
const radiusPx = normalizedRadius * imageDiag;
```

For UI simplicity:

```txt
Small glow radius: 0.003 to 0.008 × diagonal
Medium glow radius: 0.008 to 0.025 × diagonal
Large dreamy radius: 0.025 to 0.06 × diagonal
```

This prevents bloom/halation from changing appearance between preview and export.

---

## 6. Master Render Pipeline

### 6.1 High-Level Pipeline

```txt
1. Input Decode Pass
2. Orientation + Geometry Pass
3. Linearization + Color Profile Transform
4. Base Develop Pass
5. Tone Curve Pass
6. Perceptual Color Pass
7. HSL/OKLCH Channel Mixer Pass
8. Three-Way Color Wheels Pass
9. Mask Generation Passes
10. Local Adjustment Composite Pass
11. LUT / Recipe Look Pass
12. Film Response Pass
13. Halation Bright Pass
14. Halation Blur Pass
15. Bloom Bright Pass
16. Bloom Blur Pyramid Pass
17. Optical FX Pass
18. Grain Pass
19. Sharpen / Structure Pass
20. Vignette / Border Pass
21. Text / Overlay Composite
22. Display Transform Pass
23. Dither Pass
24. Export Encode Pass
```

### 6.2 Pass Categories

| Category               | Examples                    |     Precision |       Resolution |
| ---------------------- | --------------------------- | ------------: | ---------------: |
| Input/color management | decode, linearize           |    half/float |             full |
| Base develop           | exposure, WB, contrast      |    half/float |             full |
| Local edits            | masks, brush, radial        |    half/float | full or mask-res |
| Blurs                  | bloom, halation, tilt-shift |          half |      downsampled |
| Creative effects       | grain, aberration, vignette |          half |             full |
| Display/export         | transform, dither, encode   | half to 8-bit |           output |

---

## 7. Color Management and Core Equations

### 7.1 sRGB to Linear

Use exact sRGB transfer.

```glsl
vec3 srgbToLinear(vec3 c) {
  bvec3 cutoff = lessThanEqual(c, vec3(0.04045));
  vec3 lower = c / 12.92;
  vec3 higher = pow((c + 0.055) / 1.055, vec3(2.4));
  return mix(higher, lower, vec3(cutoff));
}
```

### 7.2 Linear to sRGB

```glsl
vec3 linearToSrgb(vec3 c) {
  c = max(c, vec3(0.0));
  bvec3 cutoff = lessThanEqual(c, vec3(0.0031308));
  vec3 lower = c * 12.92;
  vec3 higher = 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055;
  return mix(higher, lower, vec3(cutoff));
}
```

### 7.3 Relative Luminance

Use linear RGB luminance for Rec.709/sRGB primaries:

```glsl
float luma709(vec3 linearRgb) {
  return dot(linearRgb, vec3(0.2126, 0.7152, 0.0722));
}
```

Do not use gamma-encoded luma for physical operations like exposure, bright-pass, bloom, halation threshold, or sharpening.

### 7.4 Exposure

Brightness should behave like exposure value stops, not arbitrary addition.

```glsl
vec3 applyExposure(vec3 color, float ev) {
  return color * exp2(ev);
}
```

UI mapping:

```ts
// Slider range -100 to +100
const ev = slider / 50; // -2 to +2 stops
```

Suggested pro range:

```txt
Normal slider: -2 EV to +2 EV
Advanced mode: -5 EV to +5 EV
Recipe range: -0.35 EV to +0.35 EV usually
```

### 7.5 White Balance

There are two acceptable levels:

#### Level 1: Diagonal RGB White Balance

Useful for speed.

```glsl
vec3 applyWhiteBalanceDiagonal(vec3 color, vec3 wbMultiplier) {
  return color * wbMultiplier;
}
```

#### Level 2: Chromatic Adaptation Matrix

Use Bradford adaptation for better behavior.

Bradford matrices:

```txt
M_Bradford =
[  0.8951   0.2664  -0.1614 ]
[ -0.7502   1.7135   0.0367 ]
[  0.0389  -0.0685   1.0296 ]

M_Bradford^-1 =
[  0.9869929  -0.1470543   0.1599627 ]
[  0.4323053   0.5183603   0.0492912 ]
[ -0.0085287   0.0400428   0.9684867 ]
```

Algorithm:

```txt
1. Convert source white XYZ to cone response: srcCone = M_Bradford × srcWhiteXYZ
2. Convert destination white XYZ: dstCone = M_Bradford × dstWhiteXYZ
3. Scale cone response: D = diag(dstCone / srcCone)
4. Adaptation matrix: M = M_Bradford^-1 × D × M_Bradford
5. Apply to XYZ color
```

If full XYZ transforms are too expensive in the main shader, precompute a 3×3 matrix on CPU and pass as uniform.

### 7.6 Temperature UI Mapping

Use mired shift rather than linear Kelvin for smoother UI.

```txt
mired = 1,000,000 / kelvin
```

Mapping:

```ts
const neutralK = 6500;
const neutralMired = 1_000_000 / neutralK;
const miredShift = slider * 1.2; // slider -100 to +100 gives strong shift
const targetMired = neutralMired + miredShift;
const targetKelvin = 1_000_000 / targetMired;
```

Warm slider should increase mired, lowering Kelvin.

### 7.7 Tint

Tint should shift along green-magenta axis after white balance.

Simple diagonal approximation:

```glsl
vec3 applyTint(vec3 color, float tint) {
  // tint: -1 green, +1 magenta
  vec3 magenta = vec3(1.0 + tint * 0.05, 1.0 - tint * 0.08, 1.0 + tint * 0.05);
  vec3 green = vec3(1.0 + tint * 0.03, 1.0 + tint * 0.08, 1.0 + tint * 0.03);
  return tint >= 0.0 ? color * magenta : color * green;
}
```

Better: incorporate tint into chromatic adaptation or LMS cone response.

---

## 8. Tone and Contrast Algorithms

### 8.1 Why Existing Contrast Needs Improvement

A simple pivot contrast formula can be harsh:

```glsl
color = pivot * pow(color / pivot, 1.0 + contrast);
```

This can crush shadows and create unnatural highlight behavior.

### 8.2 Recommended Contrast Formula

Use logarithmic exposure space for contrast.

```glsl
vec3 applyLogContrast(vec3 color, float contrast, float pivot) {
  vec3 safeColor = max(color, vec3(1e-6));
  vec3 logColor = log2(safeColor);
  float logPivot = log2(pivot);
  logColor = (logColor - logPivot) * (1.0 + contrast) + logPivot;
  return exp2(logColor);
}
```

Suggested pivot:

```txt
pivot = 0.18 for scene-referred middle gray
```

Slider mapping:

```ts
const contrast = (slider / 100) * 0.75; // -0.75 to +0.75
```

### 8.3 Filmic Tone Curve

Use a toe/shoulder curve for recipes and film looks.

Generic filmic curve:

```glsl
vec3 filmicTone(vec3 x) {
  x = max(vec3(0.0), x - 0.004);
  return (x * (6.2 * x + 0.5)) / (x * (6.2 * x + 1.7) + 0.06);
}
```

Use this carefully. It bakes a display-like transform, so do not stack blindly with other display transforms.

### 8.4 Highlight Recovery Slider

Highlight adjustment should act mostly on upper luminance and preserve hue.

```glsl
vec3 applyHighlights(vec3 color, float amount) {
  float y = luma709(color);
  float w = smoothstep(0.45, 1.0, y);
  float factor = exp2(-amount * w); // positive amount recovers highlights
  return color * factor;
}
```

UI behavior:

```txt
Highlights -100: brighter highlights
Highlights +100: recovered/darker highlights
```

Alternative mapping:

```glsl
factor = mix(1.0, 0.55, amount * w);
```

### 8.5 Shadows Slider

Lift shadows without milking blacks too aggressively.

```glsl
vec3 applyShadows(vec3 color, float amount) {
  float y = luma709(color);
  float w = 1.0 - smoothstep(0.02, 0.45, y);
  vec3 lifted = color + vec3(amount * 0.18) * w * (1.0 - color);
  vec3 deepened = color * (1.0 + amount * 0.5 * w);
  return amount >= 0.0 ? lifted : deepened;
}
```

### 8.6 Whites and Blacks

Whites and blacks should adjust endpoints, not duplicate contrast.

```glsl
vec3 applyWhites(vec3 color, float whites) {
  float y = luma709(color);
  float w = smoothstep(0.65, 1.0, y);
  return color * exp2(whites * w);
}

vec3 applyBlacks(vec3 color, float blacks) {
  float y = luma709(color);
  float w = 1.0 - smoothstep(0.0, 0.35, y);
  return color * exp2(blacks * w);
}
```

### 8.7 Dehaze

A simple browser-friendly dehaze can combine black point restoration, local contrast, and saturation.

```glsl
vec3 applyDehaze(vec3 color, float amount) {
  float y = luma709(color);
  float hazeMask = smoothstep(0.05, 0.75, y);
  vec3 contrastColor = applyLogContrast(color, amount * 0.45, 0.18);
  vec3 satColor = adjustOklchChroma(color, 1.0 + amount * 0.25);
  return mix(color, mix(contrastColor, satColor, 0.35), abs(amount) * hazeMask);
}
```

For negative dehaze, add atmospheric lift:

```glsl
color = mix(color, vec3(luma709(color)) + vec3(0.08, 0.09, 0.1), -amount * 0.35);
```

---

## 9. Tone Curves

### 9.1 Replace Catmull-Rom for Final LUT Generation

Catmull-Rom curves can overshoot. Overshoot causes clipped values, weird contrast jumps, and banding.

Use **monotonic cubic Hermite interpolation** or **PCHIP** for final LUT generation.

### 9.2 PCHIP Algorithm

Given points `(x_i, y_i)` sorted by x.

```txt
h_i = x_{i+1} - x_i
d_i = (y_{i+1} - y_i) / h_i
```

Interior slopes:

If `d_{i-1}` and `d_i` have opposite signs or either is zero:

```txt
m_i = 0
```

Otherwise:

```txt
w1 = 2h_i + h_{i-1}
w2 = h_i + 2h_{i-1}
m_i = (w1 + w2) / (w1/d_{i-1} + w2/d_i)
```

Hermite interpolation for `t = (x - x_i)/h_i`:

```txt
y = (2t^3 - 3t^2 + 1)y_i
  + (t^3 - 2t^2 + t)h_i m_i
  + (-2t^3 + 3t^2)y_{i+1}
  + (t^3 - t^2)h_i m_{i+1}
```

### 9.3 Tone Curve Texture Precision

Do not store curve LUT as 8-bit if possible.

Minimum:

```ts
const curveData = new Float32Array(4096 * 4);
```

Suggested size:

```txt
Preview: 1024 samples
Export/pro: 4096 samples
```

Store values in half-float or float texture.

### 9.4 Curve Application

Apply master curve on luminance or RGB depending on mode.

Modes:

```ts
export type CurveMode = "rgb-channels" | "luminance-preserving";
```

RGB channel mode:

```glsl
color.r = texture(uCurveRed, color.r).r;
color.g = texture(uCurveGreen, color.g).r;
color.b = texture(uCurveBlue, color.b).r;
color = applyMasterCurve(color);
```

Luminance-preserving mode:

```glsl
float y = luma709(color);
float y2 = texture(uMasterCurve, y).r;
color *= y2 / max(y, 1e-6);
```

Use luminance-preserving mode for professional edits and RGB mode for creative channel looks.

---

## 10. OKLAB / OKLCH Color Engine

### 10.1 Why OKLAB

OKLAB is much better than HSL for image editing because it is more perceptually uniform. Hue/chroma operations feel more natural and preserve perceived lightness better.

### 10.2 Linear RGB to OKLAB

Use Bjorn Ottosson's OKLAB matrices.

```glsl
vec3 linearSrgbToOklab(vec3 c) {
  float l = 0.4122214708 * c.r + 0.5363325363 * c.g + 0.0514459929 * c.b;
  float m = 0.2119034982 * c.r + 0.6806995451 * c.g + 0.1073969566 * c.b;
  float s = 0.0883024619 * c.r + 0.2817188376 * c.g + 0.6299787005 * c.b;

  vec3 lms = sign(vec3(l, m, s)) * pow(abs(vec3(l, m, s)), vec3(1.0 / 3.0));

  return vec3(
    0.2104542553 * lms.x + 0.7936177850 * lms.y - 0.0040720468 * lms.z,
    1.9779984951 * lms.x - 2.4285922050 * lms.y + 0.4505937099 * lms.z,
    0.0259040371 * lms.x + 0.7827717662 * lms.y - 0.8086757660 * lms.z
  );
}
```

### 10.3 OKLAB to Linear RGB

```glsl
vec3 oklabToLinearSrgb(vec3 lab) {
  float l_ = lab.x + 0.3963377774 * lab.y + 0.2158037573 * lab.z;
  float m_ = lab.x - 0.1055613458 * lab.y - 0.0638541728 * lab.z;
  float s_ = lab.x - 0.0894841775 * lab.y - 1.2914855480 * lab.z;

  float l = l_ * l_ * l_;
  float m = m_ * m_ * m_;
  float s = s_ * s_ * s_;

  return vec3(
     4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
  );
}
```

### 10.4 OKLAB to OKLCH

```glsl
vec3 oklabToOklch(vec3 lab) {
  float C = length(lab.yz);
  float h = atan(lab.z, lab.y); // radians
  return vec3(lab.x, C, h);
}
```

### 10.5 OKLCH to OKLAB

```glsl
vec3 oklchToOklab(vec3 lch) {
  return vec3(lch.x, lch.y * cos(lch.z), lch.y * sin(lch.z));
}
```

### 10.6 Chroma Adjustment

```glsl
vec3 adjustOklchChroma(vec3 linearRgb, float chromaScale) {
  vec3 lab = linearSrgbToOklab(max(linearRgb, vec3(0.0)));
  vec3 lch = oklabToOklch(lab);
  lch.y *= chromaScale;
  return oklabToLinearSrgb(oklchToOklab(lch));
}
```

### 10.7 Hue Shift

```glsl
vec3 shiftOklchHue(vec3 linearRgb, float radians) {
  vec3 lab = linearSrgbToOklab(max(linearRgb, vec3(0.0)));
  vec3 lch = oklabToOklch(lab);
  lch.z += radians;
  return oklabToLinearSrgb(oklchToOklab(lch));
}
```

### 10.8 Vibrance

Vibrance should increase low-chroma colors more than already saturated colors.

```glsl
vec3 applyVibrance(vec3 color, float amount) {
  vec3 lab = linearSrgbToOklab(max(color, vec3(0.0)));
  vec3 lch = oklabToOklch(lab);
  float chroma = lch.y;
  float weight = 1.0 - smoothstep(0.02, 0.22, chroma);
  lch.y *= 1.0 + amount * weight;
  return oklabToLinearSrgb(oklchToOklab(lch));
}
```

---

## 11. Professional HSL Replacement: OKLCH Channel Mixer

### 11.1 Channel Buckets

Instead of RGB/HSL hue buckets, use OKLCH hue angle.

```ts
const channels = [
  { id: "red", centerDeg: 25, widthDeg: 38 },
  { id: "orange", centerDeg: 55, widthDeg: 32 },
  { id: "yellow", centerDeg: 92, widthDeg: 36 },
  { id: "green", centerDeg: 145, widthDeg: 48 },
  { id: "aqua", centerDeg: 195, widthDeg: 42 },
  { id: "blue", centerDeg: 245, widthDeg: 46 },
  { id: "purple", centerDeg: 292, widthDeg: 42 },
  { id: "magenta", centerDeg: 335, widthDeg: 38 },
];
```

### 11.2 Circular Hue Distance

```glsl
float circularDistance(float a, float b) {
  float d = abs(a - b);
  return min(d, 6.28318530718 - d);
}
```

### 11.3 Smooth Channel Weight

```glsl
float hueWeight(float hue, float center, float width) {
  float d = circularDistance(hue, center);
  return 1.0 - smoothstep(width * 0.5, width, d);
}
```

### 11.4 Apply Channel Adjustments

```glsl
vec3 applyOklchChannel(
  vec3 color,
  float center,
  float width,
  float hueShift,
  float chromaShift,
  float lightnessShift
) {
  vec3 lab = linearSrgbToOklab(max(color, vec3(0.0)));
  vec3 lch = oklabToOklch(lab);
  float w = hueWeight(lch.z, center, width);

  lch.z += hueShift * w;
  lch.y *= 1.0 + chromaShift * w;
  lch.x += lightnessShift * w;

  return oklabToLinearSrgb(oklchToOklab(lch));
}
```

### 11.5 Channel Mixer Safety Rules

- Clamp lightness `L` to a safe range: `0.0 to 1.2` internally.
- Clamp chroma softly, not harshly.
- Avoid hue shifts larger than ±45° in normal UI.
- For recipes, allow ±60° but QA strongly.
- Skin hues must be protected if skinProtect > 0.

---

## 12. Skin Protection Engine

### 12.1 Why Simple Hue Detection Fails

Skin is not only hue. Skin exists across:

- many ethnicities
- warm/cool lighting
- shadow/highlight regions
- makeup
- compression artifacts
- mixed lighting

A robust skin protection system should combine hue, chroma, luminance, and red-green relationship.

### 12.2 Skin Mask in OKLCH

Approximate skin hue range in OKLCH varies, but common skin tends to occupy warm red-orange hues with moderate chroma.

```glsl
float skinMaskOklch(vec3 linearRgb) {
  vec3 lab = linearSrgbToOklab(max(linearRgb, vec3(0.0)));
  vec3 lch = oklabToOklch(lab);

  float hue = lch.z;
  if (hue < 0.0) hue += 6.28318530718;

  float skinCenter = radians(55.0);
  float skinWidth = radians(55.0);
  float h = hueWeight(hue, skinCenter, skinWidth);

  float chromaMask = smoothstep(0.025, 0.08, lch.y) * (1.0 - smoothstep(0.32, 0.46, lch.y));
  float lightMask = smoothstep(0.18, 0.38, lch.x) * (1.0 - smoothstep(0.95, 1.1, lch.x));

  return h * chromaMask * lightMask;
}
```

### 12.3 RGB Relationship Skin Guard

Add a second check in linear or gamma RGB:

```glsl
float skinMaskRgb(vec3 rgb) {
  float r = rgb.r;
  float g = rgb.g;
  float b = rgb.b;

  float rg = smoothstep(0.02, 0.18, r - g);
  float gb = smoothstep(-0.05, 0.12, g - b);
  float rb = smoothstep(0.06, 0.28, r - b);
  float brightness = smoothstep(0.08, 0.22, max(max(r, g), b));

  return rg * gb * rb * brightness;
}
```

### 12.4 Combined Skin Mask

```glsl
float skinMask(vec3 linearRgb) {
  vec3 srgb = linearToSrgb(max(linearRgb, vec3(0.0)));
  float m1 = skinMaskOklch(linearRgb);
  float m2 = skinMaskRgb(srgb);
  return clamp(max(m1, m2) * 1.15, 0.0, 1.0);
}
```

### 12.5 Skin Protection Blend

For destructive color shifts:

```glsl
vec3 protectSkin(vec3 original, vec3 adjusted, float strength) {
  float m = skinMask(original) * strength;
  return mix(adjusted, original, m);
}
```

Better version: preserve skin hue/chroma but allow luminance edits.

```glsl
vec3 protectSkinColorOnly(vec3 original, vec3 adjusted, float strength) {
  float m = skinMask(original) * strength;

  vec3 labOrig = linearSrgbToOklab(max(original, vec3(0.0)));
  vec3 labAdj = linearSrgbToOklab(max(adjusted, vec3(0.0)));

  // keep adjusted lightness, restore original a/b partially
  vec3 labProtected = vec3(labAdj.x, mix(labAdj.yz, labOrig.yz, m));
  return oklabToLinearSrgb(labProtected);
}
```

---

## 13. Three-Way Color Wheels

### 13.1 Luminance Range Weights

Use soft masks for shadows, midtones, highlights.

```glsl
float shadowWeight(float y, float balance) {
  float end = mix(0.30, 0.45, balance * 0.5 + 0.5);
  return 1.0 - smoothstep(0.02, end, y);
}

float highlightWeight(float y, float balance) {
  float start = mix(0.55, 0.70, balance * 0.5 + 0.5);
  return smoothstep(start, 1.0, y);
}

float midtoneWeight(float y, float balance) {
  float s = shadowWeight(y, balance);
  float h = highlightWeight(y, balance);
  return clamp(1.0 - s - h, 0.0, 1.0);
}
```

Normalize weights:

```glsl
vec3 normalizeWeights(float s, float m, float h) {
  float sumW = max(s + m + h, 1e-5);
  return vec3(s, m, h) / sumW;
}
```

### 13.2 Color Wheel Offset in OKLAB

Color wheel hue/saturation should push `a,b` axes in OKLAB, not raw RGB.

```glsl
vec2 wheelOffset(float hueRadians, float saturation, float strength) {
  return vec2(cos(hueRadians), sin(hueRadians)) * saturation * strength;
}
```

Apply:

```glsl
vec3 applyColorWheels(vec3 color, Wheel shadows, Wheel mids, Wheel highs, float balance) {
  float y = luma709(color);
  float sw = shadowWeight(y, balance);
  float mw = midtoneWeight(y, balance);
  float hw = highlightWeight(y, balance);
  vec3 w = normalizeWeights(sw, mw, hw);

  vec3 lab = linearSrgbToOklab(max(color, vec3(0.0)));

  vec2 offS = wheelOffset(shadows.hue, shadows.sat, shadows.amount) * w.x;
  vec2 offM = wheelOffset(mids.hue, mids.sat, mids.amount) * w.y;
  vec2 offH = wheelOffset(highs.hue, highs.sat, highs.amount) * w.z;

  lab.yz += offS + offM + offH;
  lab.x += shadows.luma * w.x + mids.luma * w.y + highs.luma * w.z;

  return oklabToLinearSrgb(lab);
}
```

---

## 14. LUT Engine

### 14.1 Use 3D Textures in WebGL 2

Use `THREE.Data3DTexture` instead of flattening LUTs into 2D textures in pro mode.

```ts
const texture = new THREE.Data3DTexture(data, size, size, size);
texture.format = THREE.RGBAFormat;
texture.type = THREE.HalfFloatType;
texture.minFilter = THREE.LinearFilter;
texture.magFilter = THREE.LinearFilter;
texture.unpackAlignment = 1;
texture.needsUpdate = true;
```

### 14.2 LUT Input Domain

Every LUT must declare what it expects:

```ts
export type LutMetadata = {
  size: 17 | 33 | 65;
  inputColorSpace: "srgb" | "linear-srgb" | "logc" | "cineon" | "unknown";
  outputColorSpace: "srgb" | "linear-srgb" | "unknown";
  domainMin: [number, number, number];
  domainMax: [number, number, number];
};
```

If unknown, treat as display-referred sRGB creative LUT and warn quietly in UI.

### 14.3 LUT Sampling GLSL

```glsl
vec3 applyLut3D(sampler3D lut, vec3 color, float strength) {
  vec3 coord = clamp(color, vec3(0.0), vec3(1.0));
  vec3 graded = texture(lut, coord).rgb;
  return mix(color, graded, strength);
}
```

### 14.4 Tetrahedral Interpolation for CPU/Fallback

If WebGL 2 is not available, use tetrahedral interpolation in shader or CPU, not crude trilinear if quality matters.

Given fractional position within cube:

```txt
fx, fy, fz ∈ [0,1]
```

Tetrahedral selection:

```txt
If fx >= fy:
  If fy >= fz: order x,y,z
  Else if fx >= fz: order x,z,y
  Else: order z,x,y
Else:
  If fx >= fz: order y,x,z
  Else if fy >= fz: order y,z,x
  Else: order z,y,x
```

Tetrahedral interpolation reduces artifacts compared with trilinear in many LUT transforms.

### 14.5 LUT QA

Reject or warn on LUTs with:

- unsupported dimensions
- malformed headers
- missing data rows
- values outside declared domain unless intended
- non-monotonic extreme transforms causing clipping
- huge file size freezing UI

---

## 15. Masking System

### 15.1 Replace Fixed Mask Uniforms With Mask Stack

Current fixed mask variables should become mask layers.

Each adjustment layer can reference one or more masks.

```txt
Adjustment Layer
  ├── params
  ├── blend mode
  ├── opacity
  └── maskIds[]
```

Each mask produces a grayscale texture in `[0,1]`.

### 15.2 Mask Combination

Supported operations:

```glsl
float combineMask(float base, float next, int mode) {
  if (mode == ADD) return clamp(base + next, 0.0, 1.0);
  if (mode == SUBTRACT) return clamp(base - next, 0.0, 1.0);
  if (mode == INTERSECT) return base * next;
  return base;
}
```

### 15.3 Radial Mask

```glsl
float radialMask(vec2 uv, vec2 center, float radius, float feather, float invert) {
  float d = distance(uv, center);
  float inner = radius * (1.0 - feather);
  float m = 1.0 - smoothstep(inner, radius, d);
  return mix(m, 1.0 - m, invert);
}
```

### 15.4 Linear Gradient Mask

```glsl
float linearMask(vec2 uv, float angle, float position, float feather, float invert) {
  vec2 dir = vec2(cos(angle), sin(angle));
  float p = dot(uv - vec2(0.5), dir) + 0.5;
  float m = smoothstep(position - feather, position + feather, p);
  return mix(m, 1.0 - m, invert);
}
```

### 15.5 Luminosity Range Mask

```glsl
float luminosityMask(float y, float target, float range, float feather) {
  float d = abs(y - target);
  return 1.0 - smoothstep(range, range + feather, d);
}
```

### 15.6 Color Range Mask in OKLCH

```glsl
float colorRangeMask(vec3 color, float targetHue, float hueWidth, float targetChroma, float chromaRange) {
  vec3 lab = linearSrgbToOklab(max(color, vec3(0.0)));
  vec3 lch = oklabToOklch(lab);
  float hw = hueWeight(lch.z, targetHue, hueWidth);
  float cw = 1.0 - smoothstep(chromaRange, chromaRange * 1.5, abs(lch.y - targetChroma));
  return hw * cw;
}
```

### 15.7 Brush Mask Architecture

Do not use base64 as the live mask pipeline.

Use:

```txt
Brush input
  ↓
Vector stroke stored in document
  ↓
Rasterized into OffscreenCanvas or WebGL framebuffer
  ↓
GPU texture updated
  ↓
Mask pass composites it
```

### 15.8 Brush Stroke Model

```ts
export type BrushStroke = {
  id: string;
  points: Array<{ x: number; y: number; pressure?: number; t: number }>;
  size: number;
  feather: number;
  flow: number;
  opacity: number;
  mode: "paint" | "erase";
};
```

### 15.9 Brush Dab Formula

For each dab:

```glsl
float brushDab(vec2 uv, vec2 center, float radius, float feather) {
  float d = distance(uv, center);
  float solid = radius * (1.0 - feather);
  return 1.0 - smoothstep(solid, radius, d);
}
```

Flow accumulation:

```glsl
mask = 1.0 - (1.0 - mask) * (1.0 - dab * flow);
```

Erase:

```glsl
mask = mask * (1.0 - dab * flow);
```

### 15.10 Mask Resolution

Mask resolution should be proportional to image size but capped.

```ts
const maxMaskLongEdge = 2048;
const scale = Math.min(1, maxMaskLongEdge / Math.max(width, height));
const maskWidth = Math.round(width * scale);
const maskHeight = Math.round(height * scale);
```

For export, either:

- rerasterize vector strokes at export resolution, or
- upscale high-res mask with linear filtering if acceptable.

Professional mode should rerasterize.

---

## 16. Local Adjustments

### 16.1 Local Adjustment Formula

Each local layer applies its adjustment and blends using mask value.

```glsl
vec3 applyLocalAdjustment(vec3 base, LocalParams p, float mask) {
  vec3 adjusted = base;
  adjusted = applyExposure(adjusted, p.exposure);
  adjusted = applyLogContrast(adjusted, p.contrast, 0.18);
  adjusted = applyHighlights(adjusted, p.highlights);
  adjusted = applyShadows(adjusted, p.shadows);
  adjusted = applyVibrance(adjusted, p.vibrance);
  adjusted = adjustOklchChroma(adjusted, 1.0 + p.saturation);
  adjusted = applyTemperatureTint(adjusted, p.temperature, p.tint);
  return mix(base, adjusted, mask * p.opacity);
}
```

### 16.2 Local Adjustment Safety

Local adjustments should not destroy transitions.

Add mask blur/feather pass:

```txt
Mask texture
  ↓
Optional separable blur
  ↓
Local adjustment composite
```

### 16.3 Multiple Local Adjustments

Process local adjustment layers sequentially.

```ts
for (const layer of adjustmentStack.filter(
  (l) => l.type === "local-adjustment",
)) {
  renderLocalAdjustmentPass(layer);
}
```

Use a ping-pong pair of full-resolution render targets:

```txt
rtA → local layer 1 → rtB
rtB → local layer 2 → rtA
rtA → local layer 3 → rtB
```

---

## 17. Bloom Pipeline

### 17.1 Bloom Should Be Multi-Pass

Do not calculate bloom in the main shader.

Pipeline:

```txt
Input linear image
  ↓
Bright pass threshold
  ↓
Downsample 1/2
  ↓
Downsample 1/4
  ↓
Downsample 1/8
  ↓
Separable blur at each level
  ↓
Upsample and composite
  ↓
Add/mix into final image
```

### 17.2 Bright Pass

```glsl
vec3 brightPass(vec3 color, float threshold, float knee) {
  float y = luma709(color);
  float soft = smoothstep(threshold - knee, threshold + knee, y);
  return color * soft;
}
```

### 17.3 Gaussian Kernel

1D Gaussian:

```txt
G(x) = exp(-(x^2) / (2σ^2)) / (sqrt(2π)σ)
```

Discrete normalized weights:

```ts
function gaussianKernel(radius: number, sigma = radius / 3) {
  const weights = [];
  let sum = 0;
  for (let i = -radius; i <= radius; i++) {
    const w = Math.exp(-(i * i) / (2 * sigma * sigma));
    weights.push(w);
    sum += w;
  }
  return weights.map((w) => w / sum);
}
```

### 17.4 Separable Blur

Instead of O(r²), use two O(r) passes:

```txt
Horizontal blur: sample x offsets
Vertical blur: sample y offsets
```

GLSL horizontal:

```glsl
vec3 blurHorizontal(sampler2D tex, vec2 uv, vec2 texelSize) {
  vec3 sum = vec3(0.0);
  for (int i = -RADIUS; i <= RADIUS; i++) {
    sum += texture(tex, uv + vec2(float(i) * texelSize.x, 0.0)).rgb * weight[i + RADIUS];
  }
  return sum;
}
```

### 17.5 Bloom Composite

```glsl
vec3 compositeBloom(vec3 base, vec3 bloom, float intensity) {
  return base + bloom * intensity;
}
```

Optional screen blend for display-referred creative mode:

```glsl
vec3 screen(vec3 a, vec3 b) {
  return 1.0 - (1.0 - a) * (1.0 - b);
}
```

Use additive in linear mode for pro pipeline.

---

## 18. Halation Pipeline

### 18.1 Halation Is Not Just Bloom

Halation should be warmer/redder, more edge-aware, and strongest around intense highlights.

Pipeline:

```txt
Input linear image
  ↓
Highlight extraction
  ↓
Red/orange weighting
  ↓
Edge/gate mask
  ↓
Downsample
  ↓
Blur
  ↓
Composite behind highlights
```

### 18.2 Highlight Extraction

```glsl
vec3 halationBrightPass(vec3 color, float threshold, float knee) {
  float y = luma709(color);
  float m = smoothstep(threshold - knee, threshold + knee, y);
  return color * m;
}
```

### 18.3 Red Bias

```glsl
vec3 halationColorize(vec3 bright, float warmth) {
  vec3 warm = bright * vec3(1.25, 0.55, 0.32);
  return mix(bright, warm, warmth);
}
```

### 18.4 Edge Emphasis

Halation should appear near contrast edges.

Approximate edge mask:

```glsl
float edgeMask(sampler2D tex, vec2 uv, vec2 texel) {
  float c = luma709(texture(tex, uv).rgb);
  float r = luma709(texture(tex, uv + vec2(texel.x, 0.0)).rgb);
  float l = luma709(texture(tex, uv - vec2(texel.x, 0.0)).rgb);
  float t = luma709(texture(tex, uv + vec2(0.0, texel.y)).rgb);
  float b = luma709(texture(tex, uv - vec2(0.0, texel.y)).rgb);
  float gx = r - l;
  float gy = t - b;
  return smoothstep(0.02, 0.20, sqrt(gx * gx + gy * gy));
}
```

### 18.5 Composite

```glsl
vec3 applyHalation(vec3 base, vec3 halo, float intensity) {
  return base + halo * intensity;
}
```

Recipe rule:

```txt
Dreamy look: halation high, structure negative
Night neon: halation high, anamorphic streaks medium/high
Film look: halation medium, grain medium, contrast moderate
Luxury flash: halation low/medium, sharpness medium, grain low
```

---

## 19. Anamorphic Streaks

### 19.1 Extract Bright Sources

```glsl
vec3 streakBrightPass(vec3 color, float threshold) {
  float y = luma709(color);
  float m = smoothstep(threshold, threshold + 0.25, y);
  return color * m;
}
```

### 19.2 Directional Blur

For horizontal streaks:

```glsl
vec3 anamorphicStreak(sampler2D tex, vec2 uv, vec2 texel, float radius) {
  vec3 sum = vec3(0.0);
  float weightSum = 0.0;

  for (int i = -MAX_STREAK; i <= MAX_STREAK; i++) {
    float x = float(i) / float(MAX_STREAK);
    float w = exp(-abs(x) * 3.0);
    vec2 offset = vec2(x * radius * texel.x, 0.0);
    sum += texture(tex, uv + offset).rgb * w;
    weightSum += w;
  }

  return sum / weightSum;
}
```

Run this at downsampled resolution.

### 19.3 Color Style

Classic anamorphic blue:

```glsl
streak *= vec3(0.55, 0.72, 1.4);
```

Nyvarra recipe variants:

```txt
Neon Monsoon: cyan-blue streaks
Bubblegum Noir: pink streaks
Mango Moonrise: amber-orange streaks
Funeral Disco: violet streaks
```

Add recipe param:

```ts
anamorphicStreakColor: [number, number, number];
```

---

## 20. Lens Distortion, Aberration, and Keystone

### 20.1 Lens Distortion

Barrel/pincushion model:

```glsl
vec2 distortUv(vec2 uv, float k1, float k2) {
  vec2 p = uv * 2.0 - 1.0;
  float r2 = dot(p, p);
  vec2 distorted = p * (1.0 + k1 * r2 + k2 * r2 * r2);
  return distorted * 0.5 + 0.5;
}
```

UI:

```txt
lensDistortion: -1 to +1
k1 = lensDistortion * 0.25
k2 = lensDistortion * 0.05
```

### 20.2 Chromatic Aberration

```glsl
vec3 applyAberration(sampler2D tex, vec2 uv, float amount) {
  vec2 center = vec2(0.5);
  vec2 dir = uv - center;
  float r = length(dir);
  vec2 offset = normalize(dir + 1e-6) * amount * r;

  float red = texture(tex, uv + offset).r;
  float green = texture(tex, uv).g;
  float blue = texture(tex, uv - offset).b;
  return vec3(red, green, blue);
}
```

Keep subtle by default:

```txt
Professional: 0.0005 to 0.003
Creative: 0.003 to 0.012
Experimental: 0.012 to 0.03
```

### 20.3 Keystone Correction

For trapezoid correction, apply UV remapping before sampling.

```glsl
vec2 applyKeystone(vec2 uv, float kx, float ky) {
  vec2 p = uv - 0.5;
  p.x += kx * p.y;
  p.y += ky * p.x;
  return p + 0.5;
}
```

For professional geometry, implement a 3×3 homography matrix:

```glsl
vec2 applyHomography(vec2 uv, mat3 H) {
  vec3 p = H * vec3(uv, 1.0);
  return p.xy / p.z;
}
```

---

## 21. Structure, Clarity, and Sharpening

### 21.1 Separate These Three Concepts

Do not merge all detail controls into one.

| Control   | What it should do                 |
| --------- | --------------------------------- |
| Structure | Mid-frequency local contrast      |
| Clarity   | Broad local contrast around edges |
| Sharpness | Fine edge sharpening              |

### 21.2 Unsharp Mask

```txt
blurred = GaussianBlur(image, radius)
highpass = image - blurred
result = image + highpass × amount
```

GLSL composite:

```glsl
vec3 unsharp(vec3 base, vec3 blurred, float amount, float threshold) {
  vec3 hp = base - blurred;
  float edge = length(hp);
  float m = smoothstep(threshold, threshold * 2.0, edge);
  return base + hp * amount * m;
}
```

### 21.3 Structure

Use smaller blur radius and protect skin.

```glsl
vec3 applyStructure(vec3 base, vec3 blurredSmall, float amount) {
  vec3 hp = base - blurredSmall;
  float skin = skinMask(base);
  float protect = 1.0 - skin * 0.65;
  return base + hp * amount * protect;
}
```

### 21.4 Negative Structure

Negative structure should soften texture without making the whole image blurry.

```glsl
vec3 applyNegativeStructure(vec3 base, vec3 blurredSmall, float amount) {
  float skin = skinMask(base);
  float m = mix(0.5, 1.0, skin); // stronger on skin
  return mix(base, blurredSmall, -amount * 0.35 * m);
}
```

### 21.5 Output Sharpening

Export sharpening depends on output size:

```txt
Instagram 1080 px: radius 0.5 to 0.8 px, amount 0.25 to 0.45
4K export: radius 0.8 to 1.2 px, amount 0.15 to 0.30
Print-style: radius 1.0 to 1.8 px, amount 0.10 to 0.25
```

---

## 22. Grain Engine

### 22.1 Grain Should Not Be Uniform Noise

Film grain should vary by:

- luminance
- channel
- recipe
- virtual film speed
- image resolution
- shadow density

### 22.2 Grain Noise Source

Use blue noise texture if possible. If not, use hash noise.

```glsl
float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
```

### 22.3 Gaussian Noise Approximation

Sum multiple uniform random values:

```glsl
float gaussianNoise(vec2 uv, float seed) {
  float n = 0.0;
  n += hash(uv + seed + 0.1);
  n += hash(uv + seed + 1.7);
  n += hash(uv + seed + 3.3);
  n += hash(uv + seed + 5.9);
  return n / 4.0 * 2.0 - 1.0;
}
```

### 22.4 Luma-Dependent Grain

```glsl
float grainAmountByLuma(float y, float baseAmount) {
  float shadow = 1.0 - smoothstep(0.05, 0.45, y);
  float mid = smoothstep(0.10, 0.45, y) * (1.0 - smoothstep(0.65, 0.95, y));
  return baseAmount * (0.6 + shadow * 0.9 + mid * 0.35);
}
```

### 22.5 Apply Grain in Linear or Display Space?

For visual film-like grain, apply near final display stage but before final dithering.

```glsl
vec3 applyGrain(vec3 displayLinear, vec2 uv, float amount, float size, float seed) {
  float y = luma709(displayLinear);
  float g = gaussianNoise(floor(uv * size) / size, seed);
  float a = grainAmountByLuma(y, amount);

  vec3 chromaNoise = vec3(
    gaussianNoise(uv * size + 11.0, seed),
    gaussianNoise(uv * size + 17.0, seed),
    gaussianNoise(uv * size + 23.0, seed)
  );

  vec3 lumaGrain = vec3(g) * a;
  vec3 chromaGrain = chromaNoise * a * 0.35;
  return displayLinear + lumaGrain + chromaGrain;
}
```

### 22.6 Grain UI Parameters

```ts
export type GrainParams = {
  amount: number; // 0-1
  size: number; // normalized grain scale
  roughness: number; // variation
  colorGrain: number; // 0 monochrome, 1 color
  shadowBias: number;
  seed: number;
};
```

Recipe presets:

```txt
Clean editorial: amount 0.02 to 0.05
Modern cinematic: 0.06 to 0.12
35mm film vibe: 0.12 to 0.22
16mm gritty: 0.22 to 0.38
Experimental: 0.38+
```

---

## 23. Vignette and Film Border

### 23.1 Vignette Formula

```glsl
float vignetteMask(vec2 uv, float roundness, float feather) {
  vec2 p = uv * 2.0 - 1.0;
  p.x *= mix(1.0, 0.75, roundness);
  float d = dot(p, p);
  return smoothstep(1.0, 1.0 - feather, d);
}
```

Composite:

```glsl
vec3 applyVignette(vec3 color, vec2 uv, float amount, float roundness, float feather) {
  float m = vignetteMask(uv, roundness, feather);
  return mix(color * (1.0 - amount), color, m);
}
```

### 23.2 Film Border

Film border should be a separate overlay layer, not baked into color shader.

```ts
export type BorderOverlay = {
  enabled: boolean;
  style: "clean-black" | "35mm" | "polaroid" | "contact-sheet" | "cinema-matte";
  thickness: number;
  roughness: number;
  dust: number;
  aspectRatio?: "original" | "1:1" | "4:5" | "16:9" | "2.39:1";
};
```

### 23.3 Instagram Crop Safe Ratios

Built-in crop targets:

```txt
Instagram Feed Portrait: 4:5
Instagram Square: 1:1
Instagram Story/Reel Cover: 9:16
Cinematic Wide: 2.39:1
Classic Photo: 3:2
Phone Photo: 4:3
```

---

## 24. False Color

False color should be an exposure diagnostic overlay, not a recipe gimmick by default.

### 24.1 False Color Mapping

Use linear luminance mapped to zones:

```txt
< 0.02: purple/blue = crushed shadows
0.02 - 0.08: blue = deep shadows
0.08 - 0.18: cyan/green = shadows
0.18: middle gray = green
0.35 - 0.55: yellow = skin-ish exposure
0.55 - 0.80: orange = bright
0.80 - 1.00: red = near clipping
> 1.00: white/red flash = clipped
```

GLSL:

```glsl
vec3 falseColor(float y) {
  if (y < 0.02) return vec3(0.10, 0.00, 0.35);
  if (y < 0.08) return vec3(0.00, 0.10, 0.85);
  if (y < 0.18) return vec3(0.00, 0.70, 0.90);
  if (y < 0.35) return vec3(0.00, 0.85, 0.25);
  if (y < 0.55) return vec3(0.90, 0.85, 0.10);
  if (y < 0.80) return vec3(1.00, 0.45, 0.00);
  if (y < 1.00) return vec3(1.00, 0.00, 0.00);
  return vec3(1.0);
}
```

---

## 25. Dithering and Banding Prevention

### 25.1 Why Dithering Matters

Banding will appear in:

- skies
- fog
- gradients
- studio backdrops
- shadows
- compressed phone images

Especially after curves, dehaze, contrast, LUTs, and export to 8-bit JPEG.

### 25.2 Triangular Dither

Use two random values to create triangular PDF noise.

```glsl
float triangularDither(vec2 uv, float seed) {
  float a = hash(uv + seed);
  float b = hash(uv + seed + 19.19);
  return a - b;
}
```

Apply before final quantization:

```glsl
vec3 applyDither(vec3 srgb, vec2 uv, float seed) {
  float d = triangularDither(uv, seed) / 255.0;
  return srgb + vec3(d);
}
```

### 25.3 Dither Strength

```txt
8-bit JPEG/PNG: 1/255
10-bit display: 1/1023
Preview: subtle, avoid visible crawling
Export: deterministic seed, stable
```

---

## 26. Film Response System

### 26.1 Rename Current Film Emulations

Current 31 shader-based film formulas should be renamed internally as:

```txt
Film-Inspired Looks
```

Do not market them as accurate film simulations unless rebuilt.

### 26.2 Professional Film Look Model

A film look should include:

```ts
export type FilmLookModel = {
  id: string;
  name: string;
  category: "negative" | "slide" | "bw" | "print" | "experimental";
  responseCurve: FilmCurveParams;
  colorMatrix: Mat3;
  channelCurves: ChannelCurveParams;
  saturationModel: SaturationModel;
  halation: HalationParams;
  grain: GrainParams;
  printTone?: PrintToneParams;
};
```

### 26.3 Film Curve

```ts
export type FilmCurveParams = {
  toeStrength: number;
  toeLength: number;
  shoulderStrength: number;
  shoulderLength: number;
  gamma: number;
  blackLift: number;
  whiteRolloff: number;
};
```

### 26.4 Toe/Shoulder Curve

```glsl
float filmCurve(float x, float toe, float shoulder, float gamma) {
  x = max(x, 0.0);
  float toePart = x / (x + toe);
  float shoulderPart = 1.0 - exp(-x * shoulder);
  float mixed = mix(toePart, shoulderPart, 0.5);
  return pow(mixed, gamma);
}
```

More controllable:

```glsl
float softClip(float x, float start, float strength) {
  float t = max(x - start, 0.0);
  return start + t / (1.0 + strength * t);
}
```

### 26.5 Exposure-Dependent Saturation

Film often loses saturation in extreme shadows/highlights.

```glsl
float filmSaturationByLuma(float y, float baseSat) {
  float shadowDesat = smoothstep(0.0, 0.18, y);
  float highlightDesat = 1.0 - smoothstep(0.75, 1.2, y) * 0.35;
  return baseSat * shadowDesat * highlightDesat;
}
```

### 26.6 Color Crossover

Add subtle luminance-dependent channel shifts.

```glsl
vec3 applyColorCrossover(vec3 color, float strength) {
  float y = luma709(color);
  vec3 shadows = vec3(-0.02, 0.01, 0.04);
  vec3 highs = vec3(0.04, 0.01, -0.02);
  vec3 shift = mix(shadows, highs, smoothstep(0.1, 0.9, y));
  return color + shift * strength;
}
```

### 26.7 Film Look QA

A film look passes QA when:

- gray ramp remains smooth
- skin remains plausible
- no channel clips early
- shadows have texture
- highlights roll off gently
- grain does not crawl excessively
- export matches preview
- look works on at least five image categories

---

## 27. Recipe Engine for Instagrammable Looks

### 27.1 What Makes a Recipe Instagrammable

A recipe is Instagrammable when it creates immediate visual identity at thumbnail size.

Key qualities:

- recognizable color palette
- intentional contrast profile
- strong but controlled skin handling
- emotionally specific name
- beautiful swatch
- performs well on phone photos
- works on common subjects: faces, cafes, streets, skies, mirrors, cars, weddings, night lights
- avoids generic “filter” feeling

### 27.2 Recipe Anatomy

```ts
export type NyvarraRecipe = {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  tags: RecipeTag[];
  intensityDefault: number;
  compatibleSubjects: SubjectType[];
  avoidSubjects: SubjectType[];
  settings: RecipeSettings;
  qa: RecipeQAProfile;
  previewSwatch: RecipeSwatchDefinition;
};
```

### 27.3 Recipe Settings Should Expand Beyond Current Presets

Current presets are direct settings. Future recipes should be layered.

```ts
export type RecipeSettings = {
  base: BaseDevelopParams;
  color: OklchMixerParams;
  wheels: ColorWheelParams;
  curve: CurvePreset;
  film: FilmLookParams;
  optics: OpticalParams;
  texture: GrainParams;
  finishing: FinishParams;
};
```

### 27.4 Recipe Intensity

A recipe should be adjustable with one master amount.

For each param:

```ts
value = neutral + (recipeValue - neutral) * intensity;
```

For booleans:

```ts
boolean enabled if intensity > threshold
```

For curves:

```txt
curveY = neutralY + (recipeCurveY - neutralY) × intensity
```

For LUTs:

```txt
lutStrength = recipeLutStrength × intensity
```

### 27.5 Recipe Safety Clamp

Even if a recipe is aggressive, clamp dangerous operations:

```ts
const RECIPE_LIMITS = {
  exposureEv: [-0.75, 0.75],
  contrast: [-0.45, 0.65],
  temperature: [-0.45, 0.45],
  tint: [-0.45, 0.45],
  chromaScale: [0.65, 1.65],
  halation: [0, 0.65],
  aberration: [0, 0.02],
  vignette: [0, 0.55],
};
```

Experimental recipes can exceed this only if tagged `Experimental` and hidden from default beginner recommendations.

### 27.6 Recipe Categories

Recommended Nyvarra collections:

```txt
Nyvarra Signatures
Night Cinema
Flash Diary
Soft Apocalypse
Editorial Skin
Wedding Fever
Rain & Neon
Muted Luxury
Old Money Film
Dream Archive
B&W Mythology
Poster Looks
Experimental Heat
```

### 27.7 Recipe QA Test Set

Every recipe must be tested on:

1. daylight portrait
2. indoor warm portrait
3. low-light flash portrait
4. street night lights
5. landscape/sky
6. food/cafe image
7. wedding/formal clothing
8. mirror selfie
9. flat lay/product
10. high dynamic range phone photo

### 27.8 Recipe Failure Conditions

Reject or adjust recipe if:

- skin becomes gray, orange, red, or green in more than 30% of portraits
- skies show visible banding
- shadows clip more than 8% unless intentionally noir
- highlights clip more than 5% unless flash recipe
- faces become over-sharpened
- grain is too visible on small export
- recipe swatch looks too similar to existing recipe
- exported image differs visibly from preview

### 27.9 Recipe Names

Avoid generic names:

Bad:

```txt
Cinematic Teal
Vintage Warm
Soft Film
Moody Dark
Portrait Pro
```

Good:

```txt
Jinn Market 2AM
Rain Taxi Halation
Bubblegum Noir
Hotel Mirror Flash
Emerald Wedding Tape
Lavender Crime Scene
```

### 27.10 Recipe Descriptions

Formula:

```txt
[Visual character] + [technical behavior] + [best use case]
```

Example:

```txt
A wet neon night look with cyan shadows, yellow light bloom, and soft glassy halation. Best for rain streets, cafes, car windows, and late-night portraits.
```

---

## 28. Swatch Generation

### 28.1 Swatches Should Be Generated From Recipe Identity

Do not generate swatches only from tags. Use actual recipe settings.

### 28.2 Swatch Input Samples

Generate swatch using virtual color chips:

```txt
skin light
skin medium
skin deep
sky blue
foliage green
neutral gray
shadow gray
highlight cream
red fabric
night blue
```

Apply recipe to these samples through the same color math, then create gradient.

### 28.3 Swatch Algorithm

```ts
function generateRecipeSwatch(recipe: Recipe): CssGradient {
  const chips = STANDARD_COLOR_CHIPS.map((chip) =>
    applyRecipeToChip(chip, recipe),
  );
  const dominant = clusterColors(chips, 5);
  const ordered = orderByHueAndLightness(dominant);
  return createLinearGradient(ordered);
}
```

### 28.4 Swatch Must Communicate

Swatch should reveal:

- warm/cool bias
- contrast level
- shadow color
- highlight color
- experimental nature
- monochrome status

---

## 29. Histogram, Scopes, and Analysis

### 29.1 Current Histogram Is Preview-Useful But Not Pro-Accurate

A 128×72 sample is okay for UI responsiveness but not enough for precise professional analysis.

### 29.2 Three-Tier Analysis System

```ts
export type AnalysisQuality =
  | "fast-preview"
  | "balanced-sample"
  | "full-export";
```

| Mode            |    Resolution | Use                        |
| --------------- | ------------: | -------------------------- |
| fast-preview    |        128×72 | live histogram             |
| balanced-sample | 512 long edge | better clipping/skin stats |
| full-export     |   full output | export warnings            |

### 29.3 Histogram Metrics

Compute:

```ts
export type HistogramMetrics = {
  rgb: [number[], number[], number[]];
  luma: number[];
  shadowClipPct: number;
  highlightClipPct: number;
  redClipPct: number;
  greenClipPct: number;
  blueClipPct: number;
  meanLuma: number;
  medianLuma: number;
  contrastP95P5: number;
  saturationMean: number;
  skinExposureMean?: number;
};
```

### 29.4 Clipping Calculation

```ts
const shadowClipPct = count(luma <= 2) / total;
const highlightClipPct = count(luma >= 253) / total;
```

For float linear pipeline:

```ts
shadowClip = y < 0.001;
highlightClip = anyChannel > 1.0 after display transform;
```

### 29.5 Zebra Overlay

Highlight clipping overlay:

```glsl
float clipped = step(1.0, max(max(color.r, color.g), color.b));
float stripes = step(0.5, fract((gl_FragCoord.x + gl_FragCoord.y) * 0.1));
vec3 overlay = mix(color, vec3(1.0, 0.0, 0.0), clipped * stripes * 0.8);
```

### 29.6 Scopes to Add

Add pro scopes later:

- RGB histogram
- luma histogram
- waveform
- vectorscope
- skin-tone line indicator
- clipping warnings
- gamut warning

---

## 30. Export System

### 30.1 Export Must Use Same Render Graph

Never use a separate “screenshot canvas” path for professional export.

Use:

```txt
Same document
Same render graph
Different resolution
Different quality settings
Different output transform
```

### 30.2 Export Profiles

```ts
export type ExportProfile = {
  id: string;
  name: string;
  format: "jpeg" | "png" | "webp" | "tiff";
  width?: number;
  height?: number;
  scale?: number;
  quality?: number;
  colorSpace: "srgb" | "display-p3";
  embedProfile: boolean;
  preserveMetadata: boolean;
  stripLocation: boolean;
  outputSharpening: "none" | "screen" | "instagram" | "print";
  watermark?: WatermarkConfig;
};
```

### 30.3 Instagram Export Profiles

```txt
Instagram Feed Portrait: 1080 × 1350, JPEG/WebP, sRGB, quality 0.90
Instagram Square: 1080 × 1080, JPEG/WebP, sRGB, quality 0.90
Instagram Story: 1080 × 1920, JPEG/WebP, sRGB, quality 0.90
Carousel Master: 2160 × 2700, JPEG, sRGB, quality 0.92
High-res Archive: original resolution, PNG or JPEG 0.95
```

### 30.4 Tiled Export

Large images can exceed GPU texture/render target limits. Implement tiled export.

Algorithm:

```txt
1. Determine output dimensions.
2. Query MAX_TEXTURE_SIZE.
3. If output within max texture size, render normally.
4. Else split into overlapping tiles.
5. Render each tile with padding for blur/sharpen effects.
6. Crop padding from tile.
7. Stitch into final canvas/blob.
```

Tile padding:

```ts
const padding = Math.ceil(maxEffectRadiusPx * 2);
```

### 30.5 Export Consistency QA

For each export:

```txt
Render preview at export aspect
Render export downscaled to preview size
Compute difference metric
Warn if difference > threshold
```

Approximate RMS difference:

```ts
function rmsDiff(a: Uint8Array, b: Uint8Array) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum / a.length);
}
```

---

## 31. Non-Destructive Editing and History

### 31.1 History Should Store Operations

Do not store full document snapshots for every slider tick.

Use operation events:

```ts
export type HistoryOperation =
  | {
      type: "set-param";
      layerId: string;
      path: string;
      before: unknown;
      after: unknown;
    }
  | { type: "add-layer"; layer: AdjustmentLayer }
  | { type: "remove-layer"; layer: AdjustmentLayer }
  | { type: "add-mask"; mask: MaskLayer }
  | { type: "brush-stroke"; maskId: string; stroke: BrushStroke }
  | {
      type: "apply-recipe";
      recipeId: string;
      beforeStack: string;
      afterStack: string;
    };
```

### 31.2 Slider Debouncing

During drag:

```txt
update live state continuously
store one history event on drag end
```

### 31.3 Checkpoints

Create full checkpoints only after major actions:

- image import
- recipe apply
- export
- project save
- virtual copy creation
- destructive raster operation, if any

### 31.4 Virtual Copies

Virtual copy should share source image but have independent adjustment stack.

```ts
export type VirtualCopy = {
  id: string;
  name: string;
  baseDocumentId: string;
  adjustmentStack: AdjustmentLayer[];
  masks: MaskLayer[];
  createdAt: string;
};
```

---

## 32. UI/UX Redesign Principles

### 32.1 The User Journey

Ideal flow:

```txt
Upload image
  ↓
Instant beautiful recipe suggestions
  ↓
Choose vibe
  ↓
Adjust intensity
  ↓
Fine-tune with Light / Color / Skin / Effects / Masks
  ↓
Compare before/after
  ↓
Export for Instagram or full-res
```

### 32.2 Beginner Mode vs Pro Mode

```ts
export type EditorMode = "creator" | "pro";
```

Creator mode shows:

- recipe grid
- intensity slider
- light quick fixes
- skin protection
- grain/glow
- crop/export presets

Pro mode shows:

- curves
- OKLCH mixer
- masks
- LUTs
- color wheels
- scopes
- export details
- render quality

### 32.3 UI Panels

Recommended panel structure:

```txt
1. Looks
2. Light
3. Color
4. Skin
5. Masks
6. Effects
7. Detail
8. Geometry
9. Text/Overlays
10. Export
```

### 32.4 Looks Panel

Look card should show:

- recipe name
- swatch
- thumbnail preview
- tags
- intensity
- best-use icons
- “safe for skin” badge if QA passed

### 32.5 Adjustment Controls Must Be Semantic

Do not expose shader names to users.

Bad:

```txt
uHalationThreshold
uGodLightFalloff
uOklchChromaScale
```

Good:

```txt
Glow Threshold
Light Bloom
Shadow Color
Skin Safety
Dream Softness
Color Separation
```

### 32.6 Instagrammable UI Details

Add delight without harming function:

- before/after draggable wiper
- recipe hover preview
- “try on this photo” instant thumbnails
- cinematic crop overlays
- poster/title safe guides
- export cards for Instagram sizes
- recipe collections with editorial names
- one-click “Make it cinematic” button

---

## 33. Performance Guidelines

### 33.1 Performance Budget

Target:

```txt
Basic slider live update: < 16 ms on decent laptop
Recipe apply preview: < 100 ms after texture upload
Brush stroke visual feedback: < 16 ms
Histogram update: every 100-250 ms
Export: may take longer but must show progress
```

### 33.2 Dirty Pass System

Do not rerender every pass if only one setting changed.

Examples:

```txt
Exposure changed → recompute base pass onward
Grain seed changed → recompute grain/composite onward
Mask stroke changed → recompute mask/local onward
Text moved → recompute overlay/display only
Crop changed → recompute geometry/display/export preview
```

### 33.3 Render Dependency Graph

```ts
const dependencies = {
  inputDecode: [],
  baseDevelop: ["inputDecode"],
  toneCurve: ["baseDevelop"],
  perceptualColor: ["toneCurve"],
  masks: ["toneCurve"],
  localAdjustments: ["perceptualColor", "masks"],
  look: ["localAdjustments"],
  bloom: ["look"],
  halation: ["look"],
  finalComposite: ["look", "bloom", "halation"],
  display: ["finalComposite"],
};
```

### 33.4 Shader Variants

Instead of one huge shader with many branches, compile variants:

```txt
BaseDevelopShader
ToneCurveShader
OklchMixerShader
LutShader
LocalAdjustmentShader
BloomBrightPassShader
BlurShader
CompositeShader
GrainShader
DisplayShader
```

### 33.5 Uniform Packing

Avoid hundreds of individual uniforms. Use uniform buffers where possible or packed textures.

For WebGL 2, consider:

- uniform arrays for small fixed settings
- float textures for larger adjustment data
- texture atlases for masks

---

## 34. File Structure Refactor

Recommended structure:

```txt
app/
  editor/
    document/
      NyvarraDocument.ts
      migrations.ts
      serialization.ts
      history.ts
    render/
      RenderGraph.ts
      RenderPass.ts
      RenderTargets.ts
      capabilities.ts
      passes/
        InputDecodePass.ts
        BaseDevelopPass.ts
        ToneCurvePass.ts
        OklchMixerPass.ts
        ColorWheelsPass.ts
        MaskPass.ts
        LocalAdjustmentPass.ts
        LutPass.ts
        FilmLookPass.ts
        BloomPass.ts
        HalationPass.ts
        OpticalPass.ts
        GrainPass.ts
        SharpenPass.ts
        CompositePass.ts
        DisplayTransformPass.ts
    shaders/
      colorSpaces.glsl
      oklab.glsl
      tone.glsl
      masks.glsl
      blur.glsl
      grain.glsl
      film.glsl
      lut.glsl
    recipes/
      schema.ts
      builtIns.ts
      qa.ts
      swatches.ts
    export/
      exportProfiles.ts
      renderExport.ts
      tiledExport.ts
      metadata.ts
    analysis/
      histogram.ts
      scopes.ts
      clipping.ts
  components/
    editor/
      CanvasViewport.tsx
      RightPanel.tsx
      LooksPanel.tsx
      LightPanel.tsx
      ColorPanel.tsx
      MasksPanel.tsx
      ExportPanel.tsx
```

---

## 35. Migration Plan From Current Code

### 35.1 Phase 0: Stabilize Current App

- Hide unimplemented controls like sharpness until implemented.
- Add settings schema version.
- Add renderer capability detection.
- Add export/preview mismatch checklist.
- Add recipe QA set.

### 35.2 Phase 1: Split Monolithic Shader

Create passes:

```txt
BaseColorPass
ToneCurvePass
EffectsCompositePass
DisplayPass
```

Do not rewrite everything at once. First split the shader into three or four sections.

### 35.3 Phase 2: Add Render Targets

Implement ping-pong render targets.

```ts
class PingPongTarget {
  read: THREE.WebGLRenderTarget;
  write: THREE.WebGLRenderTarget;
  swap() {
    [this.read, this.write] = [this.write, this.read];
  }
}
```

### 35.4 Phase 3: Move Bloom/Halation to Multi-Pass

This gives immediate visual and performance improvement.

### 35.5 Phase 4: Add OKLAB/OKLCH

Replace HSL mixer and vibrance logic.

### 35.6 Phase 5: Replace Brush Base64 Pipeline

Move brush masks to GPU texture/canvas texture workflow.

### 35.7 Phase 6: Document Model

Gradually map old `EditorSettings` into new layer model.

```ts
function migrateEditorSettingsToDocument(
  settings: EditorSettings,
): NyvarraDocument {
  return {
    schemaVersion: 1,
    source,
    color,
    transform,
    adjustmentStack: convertSettingsToLayers(settings),
    masks: convertSettingsToMasks(settings),
    recipes: [],
    overlays: [],
    history: createInitialHistory(),
    exportProfiles: defaultExportProfiles,
    metadata,
  };
}
```

### 35.8 Phase 7: Export Engine

Use same render graph for preview/export.

### 35.9 Phase 8: Recipe System v2

Convert existing recipes into layered recipes with intensity support and QA metadata.

---

## 36. Specific Algorithms to Implement First

### 36.1 Priority 1: Multi-Pass Bloom

Why first:

- huge visual improvement
- fixes expensive shader loops
- makes recipes look more premium

Implement:

```txt
BrightPass → Downsample → BlurH → BlurV → Composite
```

### 36.2 Priority 2: Halation

Why:

- signature Nyvarra look
- high Instagram impact
- can be professional if subtle

Implement:

```txt
Highlight Extract → Red Bias → Edge Mask → Blur → Composite
```

### 36.3 Priority 3: OKLCH Mixer

Why:

- color edits become less ugly
- recipes become safer
- skin protection improves

Implement:

```txt
RGB linear → OKLAB → OKLCH → hue/chroma/luma shifts → RGB linear
```

### 36.4 Priority 4: Tone Curve PCHIP

Why:

- reduces curve artifacts
- improves pro feel

### 36.5 Priority 5: Dithering

Why:

- immediate banding improvement
- small implementation cost

### 36.6 Priority 6: Mask Stack

Why:

- unlocks professional workflows
- enables future AI masks

---

## 37. QA Framework

### 37.1 Technical QA Images

Create test images:

```txt
1. 0-1 grayscale ramp
2. RGB ramps
3. hue wheel
4. saturation grid
5. skin tone chart
6. high dynamic range lights
7. night neon image
8. blue sky gradient
9. low-light portrait
10. fine texture/detail chart
```

### 37.2 Automated Checks

```ts
export type RenderQAResult = {
  bandingScore: number;
  clippingScore: number;
  skinShiftDeltaE: number;
  previewExportRms: number;
  renderTimeMs: number;
  memoryMb: number;
};
```

### 37.3 Banding Score

For gradient ramp:

```txt
Compute adjacent pixel difference.
Count repeated identical values after export.
High repetition across broad regions = banding risk.
```

### 37.4 Skin Shift Score

Use approximate OKLAB distance.

```ts
function deltaOklab(a: Lab, b: Lab) {
  return Math.sqrt((a.L - b.L) ** 2 + (a.a - b.a) ** 2 + (a.b - b.b) ** 2);
}
```

Recipe should not exceed skin hue/chroma threshold unless intentionally experimental.

### 37.5 Performance QA

Track:

```txt
GPU frame time
shader compile time
texture upload time
export time
memory use
brush latency
histogram update cost
```

---

## 38. Instagram-Specific Product Features

### 38.1 “Make It Viral” Is Too Cheap. Use Better Naming.

Possible feature names:

```txt
Cinematic Boost
Poster Grade
Make It Editorial
Nyvarra Finish
Carousel Polish
Mood Match
```

### 38.2 Auto Recipe Suggestions

Analyze image:

```ts
type ImageAnalysis = {
  averageLuma: number;
  contrast: number;
  dominantHues: number[];
  faceDetected?: boolean;
  skinPct?: number;
  highlightClipPct: number;
  sceneType:
    | "portrait"
    | "night"
    | "landscape"
    | "food"
    | "indoor"
    | "street"
    | "unknown";
};
```

Suggest recipes based on scene:

```txt
Night + lights → Neon Monsoon, Rain Taxi Halation, Funeral Disco
Portrait + warm indoor → Hotel Mirror Flash, Bubblegum Noir, Emerald Wedding Tape
Sky/landscape → Overcast Candyland, Mango Moonrise, Goldfish Memory
Wedding/formal → Emerald Wedding Tape, Arctic Mehndi, Chrome Saffron
```

### 38.3 Recipe Thumbnail Grid

Render small previews using downsampled texture and low-cost pass.

```txt
Max thumbnail size: 240 px wide
Render recipes asynchronously
Cache by image hash + recipe id + intensity
```

### 38.4 Carousel Export

Add ability to export:

- single image
- before/after slide
- recipe name slide
- contact sheet of 4 variants
- split-screen cinematic comparison

### 38.5 Poster Mode

Poster mode combines:

- crop
- text overlay
- film border
- grain
- cinematic color
- export aspect preset

This is highly Instagrammable and differentiates Nyvarra from normal editors.

---

## 39. Professional Trust Features

### 39.1 “Safe Skin” Toggle

A simple toggle that applies skin hue/chroma protection to recipes.

```txt
Off: pure recipe
Medium: protect skin hue/chroma
Strong: preserve skin color strongly, allow luminance changes
```

### 39.2 “Protect Highlights” Toggle

Prevents recipes from blowing out bright areas.

```glsl
vec3 protectHighlights(vec3 original, vec3 adjusted, float strength) {
  float y = luma709(original);
  float m = smoothstep(0.75, 1.15, y) * strength;
  return mix(adjusted, min(adjusted, original * 1.05), m);
}
```

### 39.3 “Clean Gradients” Toggle

Adds dithering and reduces aggressive channel curve artifacts.

### 39.4 “Export Match” Indicator

Show:

```txt
Preview/export match: Excellent / Good / Risky
```

Risky if:

- huge blur radius
- device lacks float render targets
- export dimensions exceed GPU caps
- fallback path active

---

## 40. Security, Privacy, and Local-First Behavior

Nyvarra should be privacy-friendly by default.

### 40.1 Local Processing

If possible:

```txt
Images stay in browser
No upload required
No server storage unless user chooses cloud/project sync
```

### 40.2 EXIF Privacy

Export options:

```txt
Preserve metadata
Remove metadata
Remove location only
```

Default for Instagram export:

```txt
Strip location metadata
```

---

## 41. Error Handling

### 41.1 GPU Capability Failures

If WebGL 2 unavailable:

```txt
Nyvarra can still run in Creative Compatibility Mode, but Pro rendering features are limited on this device.
```

Disable:

- high precision LUTs
- full-res bloom preview
- heavy multi-mask stack

### 41.2 Large Image Handling

If image is too large:

```txt
Preview optimized for speed. Export will render full quality.
```

Never silently downscale export unless user chooses it.

### 41.3 LUT Errors

Friendly messages:

```txt
This LUT could not be read. Try a standard .cube LUT with 17, 33, or 65 size.
```

---

## 42. Implementation Checklist

### 42.1 Engine

- [ ] Add WebGL 2 capability detection
- [ ] Add half-float render target setup
- [ ] Add render graph class
- [ ] Add ping-pong render target utility
- [ ] Split monolithic shader into passes
- [ ] Add display transform pass
- [ ] Add deterministic dithering
- [ ] Add preview/export shared render path

### 42.2 Color

- [ ] Add sRGB exact transfer functions
- [ ] Add OKLAB/OKLCH GLSL include
- [ ] Replace HSL mixer with OKLCH mixer
- [ ] Add skin mask/protection
- [ ] Add PCHIP tone curves
- [ ] Add 3D LUT support

### 42.3 Effects

- [ ] Multi-pass bloom
- [ ] Multi-pass halation
- [ ] Directional anamorphic streak pass
- [ ] Grain engine v2
- [ ] Structure/clarity/sharpness separation
- [ ] Vignette pass
- [ ] Film border overlay layer

### 42.4 Masks

- [ ] Define mask layer schema
- [ ] Render radial masks to mask texture
- [ ] Render linear masks to mask texture
- [ ] Render luminosity masks
- [ ] Replace base64 brush live state
- [ ] Add vector brush strokes
- [ ] Add mask add/subtract/intersect
- [ ] Add independent local adjustments

### 42.5 Recipes

- [ ] Add recipe schema v2
- [ ] Add recipe intensity
- [ ] Add recipe QA metadata
- [ ] Add generated swatches from color chips
- [ ] Add subject compatibility tags
- [ ] Add recipe thumbnail cache
- [ ] Rename basic film emulations as film-inspired looks

### 42.6 Export

- [ ] Add export profiles
- [ ] Add Instagram presets
- [ ] Add original-resolution export
- [ ] Add tiled export fallback
- [ ] Add metadata privacy options
- [ ] Add export sharpening
- [ ] Add preview/export RMS comparison

### 42.7 UI

- [ ] Creator/pro mode split
- [ ] Looks panel redesign
- [ ] Light panel cleanup
- [ ] Color panel with OKLCH channels
- [ ] Skin panel
- [ ] Mask panel
- [ ] Effects panel
- [ ] Export panel
- [ ] Scopes panel in pro mode

---

## 43. Suggested Development Order

### Sprint 1: Foundation

```txt
Capability detection
Render target manager
Render graph skeleton
Base pass extraction from ImagePlane
Display pass
Dithering
```

### Sprint 2: Bloom/Halation

```txt
Bright pass
Downsample pass
Separable blur pass
Bloom composite
Halation bright pass
Halation composite
Recipe retuning
```

### Sprint 3: Color Upgrade

```txt
OKLAB utilities
OKLCH channel mixer
Vibrance rewrite
Skin mask
Skin protection
PCHIP curve LUT
```

### Sprint 4: Mask System

```txt
Mask schema
Mask texture generation
Radial/linear/luminosity masks
Brush vector strokes
Local adjustment layer
```

### Sprint 5: Export Trust

```txt
Shared render graph export
Instagram export profiles
Full-res export
Tiled export
Output sharpening
Metadata options
```

### Sprint 6: Recipe System v2

```txt
Layered recipe schema
Intensity slider
QA metadata
Swatch generation
Thumbnail renderer
Recipe collections
```

---

## 44. Acceptance Criteria

Nyvarra can be considered “Instagrammable + professional-grade v1” when:

### Rendering

- [ ] Preview and export visually match.
- [ ] 4K image preview remains interactive in balanced mode.
- [ ] Bloom and halation are multi-pass and resolution-independent.
- [ ] Tone curves do not band obvious gradients.
- [ ] Dithering is applied on 8-bit export.
- [ ] LUTs use 3D texture in pro mode.

### Color

- [ ] HSL mixer replaced or supplemented by OKLCH mixer.
- [ ] Skin protection works on diverse portraits.
- [ ] Recipes preserve plausible skin unless marked experimental.
- [ ] Saturation edits do not darken blues unnaturally.

### Masks

- [ ] Multiple independent masks exist.
- [ ] Brush masks are editable.
- [ ] Local adjustment layers can target different masks.
- [ ] Add/subtract/intersect works.

### Recipes

- [ ] At least 30 recipes with QA metadata.
- [ ] Each recipe has thumbnail preview and swatch.
- [ ] Recipe intensity works.
- [ ] Instagram export profiles available.

### Export

- [ ] Original-resolution export supported.
- [ ] Instagram 4:5, 1:1, 9:16 supported.
- [ ] Metadata stripping supported.
- [ ] Export sharpening supported.

---

## 45. Golden Rule

Never add a new visual feature if it makes the renderer less trustworthy.

Nyvarra’s competitive advantage should be:

```txt
Taste + Trust
```

Not just:

```txt
More sliders
```

The product should feel magical to creators and dependable to professionals.

That is the actual target.

---

## 46. Codex Implementation Prompt

Use this if handing the work to Codex or another coding agent:

```txt
You are working on Nyvarra Studio, a Next.js + React + Three.js/WebGL browser-based cinematic image editor. The current codebase has a monolithic ImagePlane.tsx shader and a large EditorSettings object. Your task is to migrate Nyvarra toward a professional-grade, Instagrammable creative editor.

Do not add more random sliders. First improve the rendering foundation.

Primary goals:
1. Split the monolithic shader into a modular render graph.
2. Use WebGL 2 and half-float render targets when available.
3. Implement ping-pong render targets for sequential passes.
4. Move bloom and halation into multi-pass bright-pass + blur + composite pipelines.
5. Add exact sRGB linearization/display transform functions.
6. Add deterministic dithering before 8-bit output.
7. Add OKLAB/OKLCH GLSL utilities.
8. Replace or supplement the existing HSL mixer with OKLCH-based hue/chroma/lightness operations.
9. Add a robust skin protection mask using OKLCH + RGB relationship heuristics.
10. Replace fixed mask variables with a MaskLayer[] schema over time.
11. Stop using base64 as the live brush mask state; store vector strokes and rasterize into texture/canvas/framebuffer.
12. Ensure export uses the same render graph as preview at target resolution.
13. Add Instagram export profiles and output sharpening.
14. Convert recipes to layered recipe schema with intensity support and QA metadata.

Implementation constraints:
- Preserve existing UI where possible during migration.
- Add compatibility wrappers from old EditorSettings to new pass params.
- Do not break existing presets immediately; add migration helpers.
- Keep fallback mode for devices without WebGL 2, but mark it as Creative Compatibility Mode.
- All new shader math must operate in linear RGB unless explicitly display-referred.
- Perceptual color edits should use OKLAB/OKLCH.
- Blur effects must use separable blur and downsampled render targets.
- Preview and export must match visually.

Acceptance criteria:
- Existing images still load and render.
- Basic exposure/contrast works through new base pass.
- Bloom and halation no longer depend on giant main shader loops.
- Dithering reduces banding on gradient tests.
- OKLCH saturation does not darken blue gradients unnaturally.
- Recipes can be applied with a master intensity slider.
- Export can produce 1080x1350 Instagram portrait output.
```

---

## 47. Final Product Philosophy

Nyvarra should not feel like a spreadsheet of controls.

It should feel like entering a private color studio.

The engineering must be rigorous, but the output should feel emotional.

The user should not think about OKLAB, half-float buffers, separable blur, LUT interpolation, or render graphs. They should only feel:

```txt
This photo finally looks like what I meant.
```

That is the entire point.
