---
name: film_recipe_creator
description: "Guidelines and reference for creating new Film Recipes (Presets) for the Nyvarra Studio application. Trigger this skill whenever asked to add, design, or modify a preset/recipe."
---

# Nyvarra Studio Film Recipe Creation Guide

Nyvarra Studio features a powerful WebGL-based color grading and effects engine. Presets (or "Recipes") are defined in `app/lib/presets.ts`. When creating a new recipe, you must meticulously design the parameters to produce a stunning, cinematic look that fully utilizes the available engine capabilities.

## 1. File Location & Structure
All built-in presets are exported as `PRESETS: Preset[]` in `app/lib/presets.ts`.

```typescript
export type Preset = {
  id: string; // Unique kebab-case identifier
  name: string; // Human-readable name
  description: string; // 1-2 sentence description of the vibe and effects used
  tags: string[]; // Used for categorization and swatch generation (e.g. "Vintage", "B&W", "Nyvarra Signatures")
  settings: Record<string, unknown>; // The actual WebGL parameters
  source?: "built-in" | "imported";
};
```

## 2. Available Settings & Expected Ranges
Do not just adjust exposure and contrast! A great recipe uses advanced properties to create a unique vibe.

### Basic Grading
- `brightness` (-1.0 to 1.0): Adjusts overall exposure. Usually keep between -0.2 and +0.2.
- `contrast` (-1.0 to 1.0): Negative is faded/flat, positive is punchy. Usually -0.2 to +0.5.
- `temperature` (-1.0 to 1.0): Negative is cool (blue), positive is warm (orange/yellow).
- `tint` (-1.0 to 1.0): Negative is green (Matrix vibe), positive is magenta (dreamy/vintage).

### Advanced Color
- `tealOrange` (0.0 to 1.0): Pushes shadows to teal and highlights to orange. Standard cinematic look is ~0.4 to 0.7.
- `skinProtect` (0.0 to 1.0): How much to protect human skin tones from the tealOrange shift. Usually 0.5 to 0.9.
- `targetHue` (0 to 360) / `hueShift` (-1.0 to 1.0): Used to shift specific hues.
- `falseColor` (boolean): Thermal/predator vision effect. Usually `false` unless doing an experimental recipe.

### Texture & Optics
- `grain` (0.0 to 1.0): Film noise. Clean digital is 0.0, heavy vintage is 0.2 to 0.3.
- `vignette` (0.0 to 1.0): Darkens corners. 0.2 is subtle, 0.5 is heavy.
- `halation` (0.0 to 1.0): Blooms highlights (especially reds like CineStill). 0.1 is subtle glow, 0.5+ is massive dreamy bloom.
- `sharpness` (-1.0 to 1.0): Negative blurs/softens, positive sharpens. 
- `dehaze` (-1.0 to 1.0): Positive cuts through fog and adds deep contrast; negative adds a lifted, misty fade.
- `aberration` (0.0 to 0.1): Chromatic aberration (color fringing at edges). Keep very low (0.001 - 0.005) for subtle vintage lenses, higher (0.015) for experimental glitch.
- `structure` (-1.0 to 1.0): Micro-contrast. Positive adds gritty detail, negative softens features.

### Cinematic FX
- `filmBorder` (boolean): Adds a physical black film border/aspect ratio crop.
- `anamorphicStreaks` (0.0 to 1.0): Horizontal lens flares from bright lights. 0.1 is subtle, 0.5+ is JJ Abrams style.
- `anamorphicDistortion` (0.0 to 1.0): Curvature of the lens at the edges. 0.02 is subtle vintage lens, 0.1 is fish-eye.
- `godLightStrength` (0.0 to 1.0): Volumetric god rays. 0.1 is subtle atmosphere, 0.5+ is heavy fog light.
- `godLightX` / `godLightY` (0.0 to 1.0): The 2D origin of the god rays (e.g. 0.5, 0.5 is center).

## 3. Tagging & Swatch Generation
The UI automatically generates a mathematically accurate CSS gradient swatch based on the settings AND the tags.
**Important Tags to use:**
- `"Vintage"`: Classic film stock simulations.
- `"Nyvarra Signatures"`: Exclusive, highly stylized, experimental looks.
- `"B&W"` or `"Monochrome"`: Will automatically desaturate the preview swatch.
- `"Warm"` / `"Cool"`: Helps the swatch generator bias the colors.
- `"Cinematic"`, `"Dreamy"`, `"Moody"`, `"Experimental"`: Descriptive tags for the user.

## 4. Best Practices for New Recipes
1. **Always provide every setting key** in your new preset (even if it's 0 or false) to ensure a clean state switch when applying. You can copy an existing preset's settings block and modify values.
2. **Balance is Key**: If you add heavy halation, consider adding negative structure to lean into the "soft focus" look, or heavy grain to make it look like 16mm film.
3. **Be Specific**: If the user asks for a "Cyberpunk" recipe, use high contrast, deep teal (`tealOrange: 0.8`), red `halation`, heavy `anamorphicStreaks`, and `aberration`.

Use this guide whenever you are tasked with creating new recipes!
