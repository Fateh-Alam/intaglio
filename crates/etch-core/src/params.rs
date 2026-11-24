//! Edit settings in, shader parameters out. Mirrors `BaseDevelopPass.updateUniforms`.

use bytemuck::{Pod, Zeroable};
use serde::Deserialize;

/// The editor's settings fields this pass reads, named as in `EditorSettings`
/// (app/types/editor.ts) so the editor can send its settings object unchanged.
/// Anything missing takes the editor's default.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct DevelopSettings {
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
}

impl Default for DevelopSettings {
    fn default() -> Self {
        Self {
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
        }
    }
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
        }
    }
}
