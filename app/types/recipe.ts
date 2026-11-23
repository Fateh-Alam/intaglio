import { AdjustmentLayer } from "./editor";

export type RecipeTag = string;
export type SubjectType = "portrait" | "street" | "landscape" | "food" | "wedding" | "night" | "macro" | "architecture" | "product";

export type BaseDevelopParams = {
  brightness?: number; // legacy exposure
  contrast?: number;
  highlights?: number;
  shadows?: number;
  whites?: number;
  blacks?: number;
  vibrance?: number;
  saturation?: number;
  temperature?: number;
  tint?: number;
};

/** Legacy optional color block kept tolerant for older imported recipe files. */
export type OklchMixerParams = Record<string, number | undefined>;

export type CurvePreset = {
  name?: string;
};

export type FilmLookParams = {
  filmEmulation?: string;
  filmEmulationStrength?: number;
  filmBorder?: boolean;
};

export type OpticalParams = {
  halation?: number;
  bloom?: number;
  vignette?: number;
  aberration?: number;
  anamorphicDistortion?: number;
  anamorphicStreaks?: number;
  godLightStrength?: number;
  godLightX?: number;
  godLightY?: number;
};

export type GrainParams = {
  grain?: number;
};

export type FinishParams = {
  sharpness?: number;
  structure?: number;
  dehaze?: number;
  skinProtect?: number;
};

export type RecipeSettings = {
  base?: BaseDevelopParams;
  color?: OklchMixerParams;
  curve?: CurvePreset;
  film?: FilmLookParams;
  optics?: OpticalParams;
  texture?: GrainParams;
  finishing?: FinishParams;
  
  adjustmentLayers?: AdjustmentLayer[];
  
  raw?: Record<string, unknown>;
};

export type RecipeQAProfile = {
  testedOn?: string[];
  skinSafe?: boolean;
};

export type RecipeSwatchDefinition = {
  thumbnailUrl?: string;
  colorPalette?: string[];
};

export type IntaglioRecipe = {
  id: string;
  name: string;
  subtitle?: string;
  description: string;
  tags: RecipeTag[];
  intensityDefault: number;
  compatibleSubjects?: SubjectType[];
  avoidSubjects?: SubjectType[];
  settings: RecipeSettings;
  qa?: RecipeQAProfile;
  previewSwatch?: RecipeSwatchDefinition;
  source?: "built-in" | "imported" | "user";
};
