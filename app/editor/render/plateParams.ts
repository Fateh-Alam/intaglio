import type { EditorSettings } from "../../types/editor";

const IDENTITY_CURVE = [{ x: 0, y: 0 }, { x: 1, y: 1 }];

/**
 * Neutral values for every parameter read by plate passes (develop, tone
 * curve, OKLCh mixer, color wheels, LUT). An adjustment plate renders with
 * these defaults plus its own params, so global edits are never applied twice
 * inside a masked region and local sliders start from zero.
 */
export const PLATE_NEUTRAL = {
  brightness: 0,
  contrast: 0,
  highlights: 0,
  shadows: 0,
  whites: 0,
  blacks: 0,
  vibrance: 0,
  saturation: 0,
  temperature: 0,
  tint: 0,
  dehaze: 0,
  protectHighlights: false,
  filmToeStrength: 0,
  filmToeLength: 0.1,
  filmShoulderStrength: 0,
  filmShoulderLength: 1,
  filmGamma: 1,
  colorCrossover: 0,
  lumaDesat: 0,
  curvePoints: { master: IDENTITY_CURVE, red: IDENTITY_CURVE, green: IDENTITY_CURVE, blue: IDENTITY_CURVE },
  colorGrading: { shadows: { h: 0, s: 0, l: 0 }, midtones: { h: 0, s: 0, l: 0 }, highlights: { h: 0, s: 0, l: 0 }, balance: 0 },
  hslRedHue: 0, hslRedSat: 0, hslRedLum: 0,
  hslOrangeHue: 0, hslOrangeSat: 0, hslOrangeLum: 0,
  hslYellowHue: 0, hslYellowSat: 0, hslYellowLum: 0,
  hslGreenHue: 0, hslGreenSat: 0, hslGreenLum: 0,
  hslAquaHue: 0, hslAquaSat: 0, hslAquaLum: 0,
  hslBlueHue: 0, hslBlueSat: 0, hslBlueLum: 0,
  hslPurpleHue: 0, hslPurpleSat: 0, hslPurpleLum: 0,
  hslMagentaHue: 0, hslMagentaSat: 0, hslMagentaLum: 0,
  safeSkinEnabled: false,
  skinProtect: 0,
  lutTexture: null,
  lutStrength: 0,
} satisfies Partial<EditorSettings>;

export type PlateParamKey = keyof typeof PLATE_NEUTRAL;

export const isPlateParam = (key: string): key is PlateParamKey => key in PLATE_NEUTRAL;

/** Settings a plate renders with: global context, neutral plate params, then the plate's own. */
export function plateRenderSettings(settings: EditorSettings, params: Partial<EditorSettings>): EditorSettings {
  return { ...settings, ...PLATE_NEUTRAL, ...params };
}
