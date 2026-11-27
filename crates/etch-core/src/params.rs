//! Edit settings in, shader parameters out. Mirrors the `updateUniforms` of
//! BaseDevelopPass, ToneCurvePass, OklchMixerPass and ColorWheelsPass.

use bytemuck::{Pod, Zeroable};
use serde::Deserialize;

use crate::curves::CurvePoints;

/// One color-grading wheel, as in `ColorGradingValue`: hue (0–1 turn), saturation, luminance.
#[derive(Debug, Clone, Copy, Default, PartialEq, Deserialize)]
#[serde(default)]
pub struct Wheel {
    pub h: f32,
    pub s: f32,
    pub l: f32,
}

/// Three-way color grading, as in `ColorGradingSettings`.
#[derive(Debug, Clone, Copy, Default, PartialEq, Deserialize)]
#[serde(default)]
pub struct ColorGrading {
    pub shadows: Wheel,
    pub midtones: Wheel,
    pub highlights: Wheel,
    pub balance: f32,
}

/// Normalized crop, top-left origin, as `PhotoCrop`.
#[derive(Debug, Clone, Copy, PartialEq, Deserialize)]
#[serde(default)]
pub struct Crop {
    pub x: f32,
    pub y: f32,
    pub width: f32,
    pub height: f32,
}

impl Default for Crop {
    fn default() -> Self {
        Self { x: 0.0, y: 0.0, width: 1.0, height: 1.0 }
    }
}

/// The color mixer's eight hue bands, in `EditorSettings` order and naming.
pub const MIXER_BANDS: [&str; 8] = ["Red", "Orange", "Yellow", "Green", "Aqua", "Blue", "Purple", "Magenta"];

/// The editor's settings fields this pass reads, named as in `EditorSettings`
/// (app/types/editor.ts) so the editor can send its settings object unchanged.
/// Anything missing takes the editor's default.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct DevelopSettings {
    /// The already validated, ordered image path of a custom saved graph.
    pub grade_nodes: Option<Vec<GradeNodeInput>>,
    pub brightness: f32,
    pub contrast: f32,
    pub highlights: f32,
    pub shadows: f32,
    pub whites: f32,
    pub blacks: f32,
    pub temperature: f32,
    pub tint: f32,
    pub protect_highlights: bool,
    pub vibrance: f32,
    pub saturation: f32,
    pub dehaze: f32,
    pub film_toe_strength: f32,
    pub film_toe_length: f32,
    pub film_shoulder_strength: f32,
    pub film_shoulder_length: f32,
    pub film_gamma: f32,
    pub color_crossover: f32,
    pub luma_desat: f32,
    pub curve_points: CurvePoints,
    // Color mixer: hue, saturation and luminance per band.
    pub hsl_red_hue: f32,
    pub hsl_red_sat: f32,
    pub hsl_red_lum: f32,
    pub hsl_orange_hue: f32,
    pub hsl_orange_sat: f32,
    pub hsl_orange_lum: f32,
    pub hsl_yellow_hue: f32,
    pub hsl_yellow_sat: f32,
    pub hsl_yellow_lum: f32,
    pub hsl_green_hue: f32,
    pub hsl_green_sat: f32,
    pub hsl_green_lum: f32,
    pub hsl_aqua_hue: f32,
    pub hsl_aqua_sat: f32,
    pub hsl_aqua_lum: f32,
    pub hsl_blue_hue: f32,
    pub hsl_blue_sat: f32,
    pub hsl_blue_lum: f32,
    pub hsl_purple_hue: f32,
    pub hsl_purple_sat: f32,
    pub hsl_purple_lum: f32,
    pub hsl_magenta_hue: f32,
    pub hsl_magenta_sat: f32,
    pub hsl_magenta_lum: f32,
    pub skin_protect: f32,
    pub safe_skin_enabled: bool,
    pub color_grading: ColorGrading,
    /// How strongly the creative LUT applies (0–1). The LUT itself is set on the engine.
    pub lut_strength: f32,
    // Geometry (GeometryPass).
    pub crop: Crop,
    /// Straighten angle in degrees.
    pub rotate: f32,
    pub zoom: f32,
    pub lens_distortion: f32,
    pub keystone_h: f32,
    pub keystone_v: f32,
    pub anamorphic_distortion: f32,
    // Global passes (post.rs): film looks, halation, bloom, optical effects, sharpening.
    /// Film look id from the web's `FILM_EMULATIONS`.
    pub film_emulation: String,
    pub film_emulation_strength: f32,
    pub halation: f32,
    pub halation_threshold: f32,
    pub halation_radius: f32,
    pub bloom: f32,
    pub bloom_threshold: f32,
    pub bloom_radius: f32,
    pub grain: f32,
    pub vignette: f32,
    pub aberration: f32,
    pub film_border: bool,
    pub anamorphic_streaks: f32,
    pub god_light_strength: f32,
    pub god_light_x: f32,
    pub god_light_y: f32,
    pub god_light_color_r: f32,
    pub god_light_color_g: f32,
    pub god_light_color_b: f32,
    pub god_light_specular: f32,
    pub god_light_rim: f32,
    pub god_light_falloff: f32,
    pub sharpness: f32,
    pub structure: f32,
    /// Local adjustments (`adjustmentLayers`) and the masks they reference.
    pub adjustment_layers: Vec<crate::masks::AdjustmentLayer>,
    pub masks: Vec<crate::masks::MaskLayer>,
    pub creative_effects: Vec<crate::creative::CreativeLayer>,
}

impl DevelopSettings {
    /// Mixer bands as (hue, saturation, luminance), in `MIXER_BANDS` order.
    pub fn mixer(&self) -> [[f32; 3]; 8] {
        [
            [self.hsl_red_hue, self.hsl_red_sat, self.hsl_red_lum],
            [self.hsl_orange_hue, self.hsl_orange_sat, self.hsl_orange_lum],
            [self.hsl_yellow_hue, self.hsl_yellow_sat, self.hsl_yellow_lum],
            [self.hsl_green_hue, self.hsl_green_sat, self.hsl_green_lum],
            [self.hsl_aqua_hue, self.hsl_aqua_sat, self.hsl_aqua_lum],
            [self.hsl_blue_hue, self.hsl_blue_sat, self.hsl_blue_lum],
            [self.hsl_purple_hue, self.hsl_purple_sat, self.hsl_purple_lum],
            [self.hsl_magenta_hue, self.hsl_magenta_sat, self.hsl_magenta_lum],
        ]
    }
}

impl Default for DevelopSettings {
    fn default() -> Self {
        Self {
            grade_nodes: None,
            brightness: 0.0,
            contrast: 0.0,
            highlights: 0.0,
            shadows: 0.0,
            whites: 0.0,
            blacks: 0.0,
            temperature: 0.0,
            tint: 0.0,
            protect_highlights: false,
            vibrance: 0.0,
            saturation: 0.0,
            dehaze: 0.0,
            film_toe_strength: 0.0,
            film_toe_length: 0.1,
            film_shoulder_strength: 0.0,
            film_shoulder_length: 1.0,
            film_gamma: 1.0,
            color_crossover: 0.0,
            luma_desat: 0.0,
            curve_points: CurvePoints::default(),
            hsl_red_hue: 0.0,
            hsl_red_sat: 0.0,
            hsl_red_lum: 0.0,
            hsl_orange_hue: 0.0,
            hsl_orange_sat: 0.0,
            hsl_orange_lum: 0.0,
            hsl_yellow_hue: 0.0,
            hsl_yellow_sat: 0.0,
            hsl_yellow_lum: 0.0,
            hsl_green_hue: 0.0,
            hsl_green_sat: 0.0,
            hsl_green_lum: 0.0,
            hsl_aqua_hue: 0.0,
            hsl_aqua_sat: 0.0,
            hsl_aqua_lum: 0.0,
            hsl_blue_hue: 0.0,
            hsl_blue_sat: 0.0,
            hsl_blue_lum: 0.0,
            hsl_purple_hue: 0.0,
            hsl_purple_sat: 0.0,
            hsl_purple_lum: 0.0,
            hsl_magenta_hue: 0.0,
            hsl_magenta_sat: 0.0,
            hsl_magenta_lum: 0.0,
            skin_protect: 0.0,
            safe_skin_enabled: false,
            color_grading: ColorGrading::default(),
            lut_strength: 0.0,
            crop: Crop::default(),
            rotate: 0.0,
            zoom: 1.0,
            lens_distortion: 0.0,
            keystone_h: 0.0,
            keystone_v: 0.0,
            anamorphic_distortion: 0.0,
            film_emulation: "none".into(),
            film_emulation_strength: 1.0,
            halation: 0.0,
            halation_threshold: 0.7,
            halation_radius: 1.0,
            bloom: 0.0,
            bloom_threshold: 0.8,
            bloom_radius: 1.0,
            grain: 0.0,
            vignette: 0.0,
            aberration: 0.0,
            film_border: false,
            anamorphic_streaks: 0.0,
            god_light_strength: 0.0,
            god_light_x: 0.5,
            god_light_y: 0.5,
            god_light_color_r: 1.0,
            god_light_color_g: 0.95,
            god_light_color_b: 0.9,
            god_light_specular: 0.0,
            god_light_rim: 0.0,
            god_light_falloff: 1.0,
            sharpness: 0.0,
            structure: 0.0,
            adjustment_layers: Vec::new(),
            masks: Vec::new(),
            creative_effects: Vec::new(),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum GradeKind {
    Develop, Curve, OklchMixer, ColorWheels, Lut, PlateComposite,
    Film, Halation, Bloom, Optical, Sharpen,
}

impl GradeKind {
    pub(crate) fn color_code(self) -> Option<f32> {
        Some(match self {
            Self::Develop => 1.0, Self::Curve => 2.0, Self::OklchMixer => 3.0,
            Self::ColorWheels => 4.0, Self::Lut => 5.0,
            _ => return None,
        })
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct GradeNodeInput {
    pub kind: GradeKind,
    pub opacity: f32,
    /// Effective settings resolved by the same override logic as WebGL.
    pub settings: Option<Box<DevelopSettings>>,
}

#[derive(Debug, Clone, PartialEq)]
pub(crate) struct GradeStep {
    pub kind: GradeKind,
    pub opacity: f32,
    pub shader: DevelopParams,
    pub post: Option<(crate::post::PostStep, crate::post::PostParams)>,
    pub shares_global_settings: bool,
}

/// The uniform block of `develop.wgsl`, field for field.
#[repr(C)]
#[derive(Debug, Clone, Copy, PartialEq, Pod, Zeroable)]
pub struct DevelopParams {
    pub exposure: f32,
    pub contrast: f32,
    pub highlights: f32,
    pub shadows: f32,
    pub whites: f32,
    pub blacks: f32,
    /// White balance target in kelvin (6500 is neutral).
    pub temperature: f32,
    pub tint: f32,
    pub protect_highlights: f32,
    pub vibrance: f32,
    pub saturation: f32,
    pub dehaze: f32,
    pub toe_strength: f32,
    pub toe_length: f32,
    pub shoulder_strength: f32,
    pub shoulder_length: f32,
    pub film_gamma: f32,
    pub color_crossover: f32,
    pub luma_desat: f32,
    pub _pad: f32,
    /// Clip-space placement of the photo: left, bottom, right, top.
    pub rect: [f32; 4],
    /// Per mixer band: hue shift (radians), chroma offset, lightness offset, unused.
    pub mixer: [[f32; 4]; 8],
    /// Shadows, midtones, highlights: hue (radians), saturation, luminance, unused.
    pub grading: [[f32; 4]; 3],
    /// Grading balance, skin protection, tone curve on, mixer on.
    pub switches: [f32; 4],
    /// Grading on, then unused.
    pub switches2: [f32; 4],
    /// Creative LUT: strength, size, on, unused. The engine fills size and on.
    pub lut: [f32; 4],
    pub lut_domain_min: [f32; 4],
    pub lut_domain_max: [f32; 4],
    /// Crop: x, y (top-left origin), width, height.
    pub crop: [f32; 4],
    /// Rotation (radians), zoom, lens distortion, anamorphic.
    pub geometry: [f32; 4],
    /// Keystone horizontal, keystone vertical, photo aspect (the engine fills it), geometry on.
    pub geometry2: [f32; 4],
    /// Tile within the cropped output, then the resident window of the source.
    pub output_window: [f32; 4],
    pub source_window: [f32; 4],
    pub viewport_background: [f32; 4],
    /// Output width and height, the display size of a source pixel, and clipping.
    pub viewport_image: [f32; 4],
    /// Visible origin and extent within the working tile.
    pub viewport_visible: [f32; 4],
    /// Leading pixel-local nodes that share the document's parameter block.
    pub leading_grade: [[f32; 4]; 2],
}

impl Default for DevelopParams {
    fn default() -> Self {
        Self::from(&DevelopSettings::default())
    }
}

impl From<&DevelopSettings> for DevelopParams {
    fn from(s: &DevelopSettings) -> Self {
        // The temperature slider is a mired shift: 1.0 moves 50 mireds cooler… warmer.
        let neutral_mired = 1_000_000.0 / 6500.0;
        let target_mired = neutral_mired - s.temperature * 50.0;
        let g = s.color_grading;
        let skin_protect = if s.safe_skin_enabled { 1.0 } else { s.skin_protect };
        let mixer_on = s.mixer().iter().flatten().any(|value| *value != 0.0) || s.skin_protect != 0.0 || s.safe_skin_enabled;
        let grading_on = [g.shadows, g.midtones, g.highlights].iter().any(|wheel| wheel.s != 0.0 || wheel.l != 0.0);
        let full_crop = s.crop.width == 1.0 && s.crop.height == 1.0;
        let geometry_on = !full_crop || s.rotate != 0.0 || s.zoom != 1.0 || s.lens_distortion != 0.0 || s.keystone_h != 0.0 || s.keystone_v != 0.0 || s.anamorphic_distortion != 0.0;
        Self {
            exposure: s.brightness,
            contrast: s.contrast,
            highlights: s.highlights,
            shadows: s.shadows,
            whites: s.whites,
            blacks: s.blacks,
            temperature: 1_000_000.0 / target_mired.max(1.0),
            tint: s.tint,
            protect_highlights: if s.protect_highlights { 1.0 } else { 0.0 },
            vibrance: s.vibrance,
            saturation: s.saturation,
            dehaze: s.dehaze,
            toe_strength: s.film_toe_strength,
            toe_length: s.film_toe_length,
            shoulder_strength: s.film_shoulder_strength,
            shoulder_length: s.film_shoulder_length,
            film_gamma: s.film_gamma,
            color_crossover: s.color_crossover,
            luma_desat: s.luma_desat,
            _pad: 0.0,
            rect: [-1.0, -1.0, 1.0, 1.0],
            mixer: s.mixer().map(|[hue, sat, lum]| [hue * MIXER_HUE_SCALE, sat, lum * MIXER_LIGHTNESS_SCALE, 0.0]),
            grading: [g.shadows, g.midtones, g.highlights].map(|wheel| [wheel.h * std::f32::consts::TAU, wheel.s, wheel.l, 0.0]),
            switches: [g.balance, skin_protect, flag(!s.curve_points.is_identity()), flag(mixer_on)],
            switches2: [flag(grading_on), 0.0, 0.0, 0.0],
            lut: [s.lut_strength, 2.0, 0.0, 0.0],
            lut_domain_min: [0.0; 4],
            lut_domain_max: [1.0, 1.0, 1.0, 0.0],
            crop: [s.crop.x, s.crop.y, s.crop.width, s.crop.height],
            geometry: [s.rotate.to_radians(), if s.zoom == 0.0 { 1.0 } else { s.zoom }, s.lens_distortion, s.anamorphic_distortion],
            geometry2: [s.keystone_h, s.keystone_v, 1.0, flag(geometry_on)],
            output_window: [0.0, 0.0, 1.0, 1.0],
            source_window: [0.0, 0.0, 1.0, 1.0],
            viewport_background: [0.0; 4],
            viewport_image: [0.0; 4],
            viewport_visible: [0.0; 4],
            leading_grade: [[0.0; 4]; 2],
        }
    }
}

/// Mixer hue slider ±1 → ±45° (0.785 rad); luminance slider ±1 → ±0.15 OKLab L.
const MIXER_HUE_SCALE: f32 = 0.785;
const MIXER_LIGHTNESS_SCALE: f32 = 0.15;

fn flag(on: bool) -> f32 {
    if on { 1.0 } else { 0.0 }
}

/// Shader parameters plus the tone-curve table they read, and any adjustment layers.
#[derive(Debug, Clone, PartialEq)]
pub struct PreparedEdit {
    pub params: DevelopParams,
    /// RGBA curve table (see `CurvePoints::table`); `None` when the curves are straight lines.
    pub curve_table: Option<Vec<f32>>,
    /// Adjustment layers in order.
    pub plates: Vec<crate::masks::PreparedPlate>,
    /// Global passes after the develop stage.
    pub post: crate::post::PostEffects,
    pub creative: Vec<crate::creative::PreparedCreative>,
    pub(crate) grade_nodes: Option<Vec<GradeStep>>,
}

impl PreparedEdit {
    /// Filter overlap needed outside the on-screen tile, in render pixels.
    pub fn preview_effects(&self) -> crate::preview::PreviewEffects {
        use crate::post::PostStep;
        let mut padding: f32 = 2.0;
        let mut reach = [0.0; 2];
        let mut add = |step: &PostStep, params: &crate::post::PostParams| {
            padding += match step {
                PostStep::Glow(glow) => (glow.radius * 32.0).ceil() + 4.0,
                PostStep::Optical | PostStep::Sharpen => 4.0,
                PostStep::Film => 0.0,
            };
            if matches!(step, PostStep::Optical) {
                let relief = if params.god[0] > 0.0 { 1.0 / 480.0 } else { 0.0 };
                let streaks = if params.optical2[1] > 0.0 { 0.10 } else { 0.0 };
                reach[0] += params.optical[3].max(0.0) + streaks + relief;
                reach[1] += relief;
            } else if matches!(step, PostStep::Sharpen) && params.sharpen[1].abs() > 0.001 {
                reach[0] += 0.005;
                reach[1] += 0.005;
            }
        };
        if let Some(nodes) = &self.grade_nodes {
            for (step, params) in nodes.iter().filter_map(|node| node.post.as_ref()) { add(step, params); }
        } else {
            for step in &self.post.steps { add(step, &self.post.params); }
        }
        crate::preview::PreviewEffects {
            full_frame: !self.creative.is_empty(),
            local_padding: padding.min(1024.0) as u32,
            relative_reach: reach,
        }
    }

    /// Output size for a `width`×`height` photo after cropping, as `cropSize`.
    pub fn output_size(&self, width: u32, height: u32) -> (u32, u32) {
        let [_, _, crop_width, crop_height] = self.params.crop;
        ((width as f32 * crop_width).round().max(1.0) as u32, (height as f32 * crop_height).round().max(1.0) as u32)
    }
}

impl From<&DevelopSettings> for PreparedEdit {
    fn from(settings: &DevelopSettings) -> Self {
        let curve_table = (!settings.curve_points.is_identity()).then(|| settings.curve_points.table());
        Self::prepare(settings, curve_table)
    }
}

impl PreparedEdit {
    /// Exposure and mask drags normally leave the tone curve unchanged.
    pub fn update(&mut self, settings: &DevelopSettings, previous_curves: &mut CurvePoints) {
        let table = if *previous_curves == settings.curve_points {
            self.curve_table.take()
        } else {
            previous_curves.clone_from(&settings.curve_points);
            (!settings.curve_points.is_identity()).then(|| settings.curve_points.table())
        };
        *self = Self::prepare(settings, table);
    }

    fn prepare(settings: &DevelopSettings, curve_table: Option<Vec<f32>>) -> Self {
        let params = DevelopParams::from(settings);
        let plates = settings
            .adjustment_layers
            .iter()
            .map(|layer| crate::masks::PreparedPlate::new(layer, &settings.masks, params.crop))
            .collect();
        let creative = settings.creative_effects.iter().filter_map(crate::creative::PreparedCreative::from_layer).collect();
        use crate::post::{PostEffects, PostStep};
        let post = PostEffects::from(settings);
        let grade_nodes = settings.grade_nodes.as_ref().map(|nodes| nodes.iter().filter_map(|node| {
            if !(node.opacity > 0.0 && node.opacity <= 1.0) { return None; }
            let effective = node.settings.as_deref().unwrap_or(settings);
            let effects = node.settings.as_ref().map(|settings| PostEffects::from(settings.as_ref()));
            let effects = effects.as_ref().unwrap_or(&post);
            let stage = effects.steps.iter().find(|step| match (node.kind, step) {
                (GradeKind::Film, PostStep::Film) | (GradeKind::Optical, PostStep::Optical) | (GradeKind::Sharpen, PostStep::Sharpen) => true,
                (GradeKind::Halation, PostStep::Glow(g)) => g.mode == 1.0,
                (GradeKind::Bloom, PostStep::Glow(g)) => g.mode == 0.0,
                _ => false,
            });
            if stage.is_none() && matches!(node.kind, GradeKind::Film | GradeKind::Halation | GradeKind::Bloom | GradeKind::Optical | GradeKind::Sharpen) {
                return None;
            }
            Some(GradeStep { kind: node.kind, opacity: node.opacity, shader: DevelopParams::from(effective), post: stage.map(|step| (*step, effects.params)), shares_global_settings: node.settings.is_none() })
        }).collect());
        Self { params, curve_table, plates, post, creative, grade_nodes }
    }
}
