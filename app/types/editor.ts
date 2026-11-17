import type * as THREE from "three";

export interface CurvePoint {
  x: number;
  y: number;
}

export interface CurvePoints {
  master: CurvePoint[];
  red: CurvePoint[];
  green: CurvePoint[];
  blue: CurvePoint[];
}

export interface ColorGradingValue {
  h: number;
  s: number;
  l: number;
}

export interface ColorGradingSettings {
  shadows: ColorGradingValue;
  midtones: ColorGradingValue;
  highlights: ColorGradingValue;
  balance: number;
}

// --- MASK SYSTEM TYPES ---

export type MaskBlendMode = "ADD" | "SUBTRACT" | "INTERSECT";

export type BrushStroke = {
  id: string;
  points: Array<{ x: number; y: number; pressure?: number; t: number }>;
  size: number;
  feather: number;
  flow: number;
  opacity: number;
  mode: "paint" | "erase";
};

/** Positions are in image space: 0…1 across, 0…1 down (top-left origin). */
export type RadialMaskParams = {
  center: { x: number; y: number };
  /** Legacy single radius in normalized coordinates (used when radiusX is absent). */
  radius: number;
  /** Ellipse half-width and half-height, in units of image height. */
  radiusX?: number;
  radiusY?: number;
  /** Ellipse rotation in degrees. */
  angle?: number;
  /** Soft edge: legacy absolute width, or (with radiusX) a 0…1 fraction of the radius. */
  feather: number;
  invert: boolean;
};

export type LinearMaskParams = {
  /** Legacy angle/position/feather form (used when start/end are absent). */
  angle: number;
  position: number;
  feather: number;
  invert: boolean;
  /** Full effect at start, fading to none at end (image space). */
  start?: { x: number; y: number };
  end?: { x: number; y: number };
};

/** Perceived lightness range (0 = black, 1 = white). */
export type LuminosityMaskParams = {
  /** Missing on older projects, which use Rec. 709 luminance. */
  colorSpace?: "oklab";
  target: number;
  range: number;
  feather: number;
};

/** OKLCh hue range; hue and width are fractions of a turn. Chroma 0 = any colorfulness. */
export type ColorRangeMaskParams = {
  /** Missing on older projects, which use HSV. */
  colorSpace?: "oklch";
  targetHue: number;
  hueWidth: number;
  targetChroma: number;
  chromaRange: number;
};

export type BrushMaskParams = {
  strokes: BrushStroke[];
};

export type RadialMaskLayer = {
  id: string;
  name: string;
  type: "radial";
  blendMode: MaskBlendMode;
  opacity: number;
  params: RadialMaskParams;
};

export type LinearMaskLayer = {
  id: string;
  name: string;
  type: "linear";
  blendMode: MaskBlendMode;
  opacity: number;
  params: LinearMaskParams;
};

export type LuminosityMaskLayer = {
  id: string;
  name: string;
  type: "luminosity";
  blendMode: MaskBlendMode;
  opacity: number;
  params: LuminosityMaskParams;
};

export type ColorRangeMaskLayer = {
  id: string;
  name: string;
  type: "colorRange";
  blendMode: MaskBlendMode;
  opacity: number;
  params: ColorRangeMaskParams;
};

export type BrushMaskLayer = {
  id: string;
  name: string;
  type: "brush";
  blendMode: MaskBlendMode;
  opacity: number;
  params: BrushMaskParams;
};

export type MaskLayer =
  | RadialMaskLayer
  | LinearMaskLayer
  | LuminosityMaskLayer
  | ColorRangeMaskLayer
  | BrushMaskLayer;

export type AdjustmentLayer = {
  id: string;
  name: string;
  maskIds: string[];
  opacity: number;
  enabled?: boolean;
  blendMode: "normal"; // Extendable later
  params: Partial<EditorSettings>;
};

// -------------------------

export type FilmEmulation = string;

export interface LutUserData {
  lutSize?: number;
  domainMin?: [number, number, number];
  domainMax?: [number, number, number];
  title?: string;
}

export interface EditorSettings {
  contrast: number;
  brightness: number;
  highlights: number;
  shadows: number;
  whites: number;
  blacks: number;
  vibrance: number;
  saturation: number;
  tealOrange: number;
  temperature: number;
  tint: number;
  skinProtect: number;
  safeSkinEnabled: boolean;
  protectHighlights: boolean;
  grain: number;
  vignette: number;
  sharpness: number;
  dehaze: number;
  aberration: number;
  structure: number;
  filmBorder: boolean;
  filmToeStrength: number;
  filmToeLength: number;
  filmShoulderStrength: number;
  filmShoulderLength: number;
  filmGamma: number;
  filmBlackLift: number;
  filmWhiteRolloff: number;
  colorCrossover: number;
  lumaDesat: number;
  curvePoints: CurvePoints;
  colorGrading: ColorGradingSettings;
  compareEnabled: boolean;
  compareTexture: THREE.Texture | null;
  compareSplit: number;
  halation: number;
  halationThreshold: number;
  halationRadius: number;
  bloom: number;
  bloomThreshold: number;
  bloomRadius: number;
  lensDistortion: number;
  keystoneH: number;
  keystoneV: number;
  tiltShiftAmount: number;
  tiltShiftPosition: number;
  tiltShiftAngle: number;
  lutTexture: THREE.Data3DTexture | null;
  lutStrength: number;
  falseColor: boolean;
  anamorphicDistortion: number;
  anamorphicStreaks: number;
  godLightStrength: number;
  godLightX: number;
  godLightY: number;
  godLightColorR: number;
  godLightColorG: number;
  godLightColorB: number;
  godLightSpecular: number;
  godLightRim: number;
  godLightFalloff: number;
  targetHue: number;
  hueShift: number;
  rotate: number;
  zoom: number;

  appliedRecipeId: string | null;
  recipeIntensity: number;

  adjustmentLayers: AdjustmentLayer[];
  masks: MaskLayer[];
  hslRedHue: number;
  hslRedSat: number;
  hslRedLum: number;
  hslOrangeHue: number;
  hslOrangeSat: number;
  hslOrangeLum: number;
  hslYellowHue: number;
  hslYellowSat: number;
  hslYellowLum: number;
  hslGreenHue: number;
  hslGreenSat: number;
  hslGreenLum: number;
  hslAquaHue: number;
  hslAquaSat: number;
  hslAquaLum: number;
  hslBlueHue: number;
  hslBlueSat: number;
  hslBlueLum: number;
  hslPurpleHue: number;
  hslPurpleSat: number;
  hslPurpleLum: number;
  hslMagentaHue: number;
  hslMagentaSat: number;
  hslMagentaLum: number;
  filmEmulation: FilmEmulation;
  filmEmulationStrength: number;
  wiperActive: boolean;
}

export type EditorSettingKey = keyof EditorSettings;
export type EditorSettingValue = EditorSettings[EditorSettingKey];
export type SerializableEditorSettings = Omit<
  EditorSettings,
  "compareTexture" | "lutTexture"
>;

export type PerformanceMode = "draft" | "balanced" | "quality";
export type CompositionGuide =
  | "off"
  | "thirds"
  | "center"
  | "golden"
  | "safe";

export type WatermarkPosition =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | "center";

export type GridOverlayMode = "none" | "1:1" | "4:5" | "9:16" | "carousel-4:5-2" | "carousel-4:5-3" | "title-safe" | "action-safe";

export interface WatermarkSettings {
  enabled: boolean;
  text: string;
  position: WatermarkPosition;
  opacity: number;
  size: number;
}

export interface HistogramData {
  rgb: [number[], number[], number[]];
  luma: number[];
  shadowClipPct: number;
  highlightClipPct: number;
  redClipPct: number;
  greenClipPct: number;
  blueClipPct: number;
  meanLuma: number;
  meanRgb: [number, number, number];
  medianLuma: number;
  contrastP95P5: number;
  saturationMean: number;
  palette: string[];
}

export interface ImageBounds {
  width: number;
  height: number;
  left: number;
  top: number;
}

export interface AssetMetadataSettings {
  title: string;
  author: string;
  copyright: string;
  camera: string;
  lens: string;
  iso: string;
  focalLength: string;
  aperture: string;
  shutterSpeed: string;
  date: string;
  location: string;
  description: string;
  caption: string;
  rating: number;
  colorLabel: string;
  flagStatus: string;
  creator: string;
  keywords: string;
}

export interface AppCommand {
  id: string;
  title: string;
  section: string;
  shortcut?: string;
  keywords?: string[];
  disabled?: boolean;
  run: () => void;
}
