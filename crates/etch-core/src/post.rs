//! The global passes after the develop stage (film looks, halation, bloom,
//! optical effects and grain, sharpening), in the web renderer's order. The
//! shaders are in `post.wgsl`; this side decides which passes run.

use bytemuck::{Pod, Zeroable};

use crate::params::DevelopSettings;

/// Film look ids in the web's `FILM_EMULATIONS` order; the shader takes the index.
const FILM_IDS: &str = include_str!("film_ids.txt");

/// Index of a film look as the web's `FILM_EMULATIONS.findIndex`, 0 ("none") when unknown.
pub fn film_index(id: &str) -> usize {
    FILM_IDS.lines().position(|line| line == id).unwrap_or(0)
}

/// The uniform block of `post.wgsl`, field for field.
#[repr(C)]
#[derive(Debug, Clone, Copy, PartialEq, Pod, Zeroable)]
pub struct PostParams {
    pub size: [f32; 4],
    pub effect_size: [f32; 4],
    pub film: [f32; 4],
    pub sharpen: [f32; 4],
    pub threshold: [f32; 4],
    pub blur: [f32; 4],
    pub composite: [f32; 4],
    pub god: [f32; 4],
    pub optical: [f32; 4],
    pub optical2: [f32; 4],
    pub god_color: [f32; 4],
    pub rect: [f32; 4],
    pub display: [f32; 4],
    pub window: [f32; 4],
    pub visible: [f32; 4],
    pub preview_background: [f32; 4],
}

/// A glow pass (halation or bloom).
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Glow {
    pub strength: f32,
    pub threshold: f32,
    pub radius: f32,
    /// 0 bloom, 1 halation; selects the shader's bright pass and composite.
    pub mode: f32,
}

/// One global pass.
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum PostStep {
    Film,
    Glow(Glow),
    Optical,
    Sharpen,
}

/// Which global passes an edit needs, with their settings.
#[derive(Debug, Clone, PartialEq)]
pub struct PostEffects {
    /// Shared uniform values; size, threshold, blur, composite and rect are set per pass.
    pub params: PostParams,
    pub steps: Vec<PostStep>,
}

impl From<&DevelopSettings> for PostEffects {
    fn from(s: &DevelopSettings) -> Self {
        let film = film_index(&s.film_emulation) as f32;
        let params = PostParams {
            film: [film, s.film_emulation_strength, 0.0, 0.0],
            sharpen: [s.sharpness, s.structure, 0.0, 0.0],
            god: [s.god_light_strength, s.god_light_x, s.god_light_y, s.god_light_specular],
            optical: [s.god_light_rim, s.god_light_falloff, s.vignette, s.aberration],
            optical2: [if s.film_border { 1.0 } else { 0.0 }, s.anamorphic_streaks, s.grain, 0.0],
            god_color: [s.god_light_color_r, s.god_light_color_g, s.god_light_color_b, 0.0],
            window: [0.0, 0.0, 1.0, 1.0],
            visible: [0.0, 0.0, 1.0, 1.0],
            ..PostParams::zeroed()
        };

        // Each pass runs when the web's `enabled` would be true. The film pass
        // always runs on the web, but with no look it only copies.
        let mut steps = Vec::new();
        if film > 0.0 && s.film_emulation_strength > 0.0 {
            steps.push(PostStep::Film);
        }
        if s.halation > 0.0 {
            steps.push(PostStep::Glow(Glow { strength: s.halation, threshold: s.halation_threshold, radius: s.halation_radius, mode: 1.0 }));
        }
        if s.bloom > 0.0 {
            steps.push(PostStep::Glow(Glow { strength: s.bloom, threshold: s.bloom_threshold, radius: s.bloom_radius, mode: 0.0 }));
        }
        if s.god_light_strength > 0.0 || s.vignette > 0.0 || s.aberration > 0.0 || s.film_border || s.anamorphic_streaks > 0.0 || s.grain > 0.0 {
            steps.push(PostStep::Optical);
        }
        if s.sharpness.abs() > 0.001 || s.structure.abs() > 0.001 {
            steps.push(PostStep::Sharpen);
        }
        Self { params, steps }
    }
}

impl Default for PostEffects {
    fn default() -> Self {
        Self::from(&DevelopSettings::default())
    }
}

/// A quarter-resolution document grid, limited by the input tile's detail.
pub fn glow_axis(reference: f32, span: f32, working: u32, radius: f32) -> (u32, f32) {
    let reference_taps = (reference / 4.0).floor().max(1.0) * span;
    let size = working.min(reference_taps.round().max(1.0) as u32);
    (size, 2.0 * radius * size as f32 / reference_taps)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn film_ids_follow_the_web_order() {
        assert_eq!(film_index("none"), 0);
        assert_eq!(film_index("kodak_portra_400"), 1);
        assert_eq!(film_index("not a film"), 0);
        assert_eq!(FILM_IDS.lines().count(), 32);
    }

    #[test]
    fn default_settings_need_no_passes() {
        assert!(PostEffects::default().steps.is_empty());
    }

    #[test]
    fn passes_run_in_the_web_order() {
        let settings: DevelopSettings = serde_json::from_str(r#"{"sharpness":0.4,"grain":0.1,"bloom":0.5,"halation":0.3,"filmEmulation":"kodak_portra_400"}"#).unwrap();
        let steps = PostEffects::from(&settings).steps;
        assert!(matches!(steps[..], [PostStep::Film, PostStep::Glow(Glow { mode: 1.0, .. }), PostStep::Glow(Glow { mode: 0.0, .. }), PostStep::Optical, PostStep::Sharpen]));
    }
}
