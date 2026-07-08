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

export type FilmEmulation = string;

export interface LutUserData {
  lutSize?: number;
}

export interface EditorSettings {
  contrast: number;
  brightness: number;
  highlights: number;
  shadows: number;
  whites: number;
  blacks: number;
  vibrance: number;
  tealOrange: number;
  temperature: number;
  tint: number;
  skinProtect: number;
  grain: number;
  vignette: number;
  sharpness: number;
  dehaze: number;
  aberration: number;
  structure: number;
  filmBorder: boolean;
  toneCurveTexture: THREE.DataTexture | null;
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
  lutTexture: THREE.DataTexture | null;
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
  radialMaskEnabled: boolean;
  radialMaskX: number;
  radialMaskY: number;
  radialMaskRadius: number;
  radialMaskFeather: number;
  radialMaskInvert: boolean;
  radialMaskExposure: number;
  radialMaskContrast: number;
  radialMaskSaturation: number;
  linearMaskEnabled: boolean;
  linearMaskAngle: number;
  linearMaskPosition: number;
  linearMaskFeather: number;
  linearMaskExposure: number;
  linearMaskContrast: number;
  luminosityMaskEnabled: boolean;
  luminosityMaskTarget: number;
  luminosityMaskRange: number;
  luminosityMaskExposure: number;
  luminosityMaskSaturation: number;
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
  "toneCurveTexture" | "compareTexture" | "lutTexture"
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

export interface WatermarkSettings {
  enabled: boolean;
  text: string;
  position: WatermarkPosition;
  opacity: number;
  size: number;
}

export interface HistogramData {
  r: number[];
  g: number[];
  b: number[];
  luma: number[];
  clipping: {
    shadows: number;
    highlights: number;
  };
  average: {
    r: number;
    g: number;
    b: number;
  };
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
