//! The GPU develop pass must match its CPU twin (`reference.rs`) pixel for pixel,
//! within 8-bit rounding. That's how we know the WGSL port says what the formulas say.

use etch_core::reference::{develop, linear_to_srgb, srgb_to_linear};
use etch_core::{fit_rect, wgpu, DevelopParams, DevelopSettings, Engine};

const SIZE: u32 = 16;

/// Darks, mid-tones, highlights, neutrals and saturated colors.
fn test_photo() -> Vec<u8> {
    let mut rgba = Vec::new();
    for y in 0..SIZE {
        for x in 0..SIZE {
            let t = x as f32 / (SIZE - 1) as f32;
            let row = y % 4;
            let [r, g, b] = match row {
                0 => [t, t, t],
                1 => [t, 0.35 + 0.3 * t, 1.0 - t],
                2 => [0.9 * t + 0.05, 0.2, 0.6 * (1.0 - t)],
                _ => [0.95, 0.85 * t, 0.15 + 0.7 * t],
            };
            let shade = 0.35 + 0.65 * (y as f32 / (SIZE - 1) as f32);
            for c in [r * shade, g * shade, b * shade] {
                rgba.push((c.clamp(0.0, 1.0) * 255.0).round() as u8);
            }
            rgba.push(255);
        }
    }
    rgba
}

fn engine() -> Option<Engine> {
    let instance = wgpu::Instance::default();
    match pollster::block_on(Engine::new(&instance, None)) {
        Ok(engine) => {
            eprintln!("GPU: {:?}", engine.device.adapter_info());
            Some(engine)
        }
        Err(error) => {
            eprintln!("skipping GPU parity test: {error}");
            None
        }
    }
}

fn expected(photo: &[u8], params: &DevelopParams) -> Vec<u8> {
    let mut out = Vec::with_capacity(photo.len());
    for px in photo.chunks(4) {
        let linear = [0, 1, 2].map(|i| srgb_to_linear(px[i] as f32 / 255.0));
        for c in develop(linear, params) {
            out.push((linear_to_srgb(c).clamp(0.0, 1.0) * 255.0).round() as u8);
        }
        out.push(px[3]);
    }
    out
}

fn assert_matches(name: &str, settings: DevelopSettings) {
    let Some(mut engine) = engine() else { return };
    let photo_pixels = test_photo();
    let photo = engine.upload(SIZE, SIZE, &photo_pixels);
    let params = DevelopParams::from(&settings);
    let gpu = engine.render_to_rgba8(&photo, &params).expect("readback");
    let cpu = expected(&photo_pixels, &params);
    let worst = gpu.iter().zip(&cpu).map(|(a, b)| a.abs_diff(*b)).max().unwrap();
    assert!(worst <= 2, "{name}: GPU differs from the reference by up to {worst}/255");
    // Guard against a test that passes because nothing happened.
    let moved = gpu.iter().zip(&photo_pixels).map(|(a, b)| a.abs_diff(*b)).max().unwrap();
    assert!(moved >= 8, "{name}: the edit barely changed the photo ({moved}/255)");
    eprintln!("{name}: max GPU/CPU difference {worst}/255, edit moved pixels up to {moved}/255");
}

#[test]
fn defaults_leave_the_photo_untouched() {
    let Some(mut engine) = engine() else { return };
    let pixels = test_photo();
    let photo = engine.upload(SIZE, SIZE, &pixels);
    let out = engine.render_to_rgba8(&photo, &DevelopParams::default()).expect("readback");
    let worst = out.iter().zip(&pixels).map(|(a, b)| a.abs_diff(*b)).max().unwrap();
    assert!(worst <= 1, "default settings changed pixels by up to {worst}/255");
}

#[test]
fn every_basic_control_matches_the_reference() {
    let cases: [(&str, DevelopSettings); 13] = [
        ("exposure", DevelopSettings { brightness: 0.8, ..Default::default() }),
        ("contrast", DevelopSettings { contrast: 0.5, ..Default::default() }),
        ("highlights", DevelopSettings { highlights: -0.7, ..Default::default() }),
        ("shadows+", DevelopSettings { shadows: 0.6, ..Default::default() }),
        ("shadows-", DevelopSettings { shadows: -0.6, ..Default::default() }),
        ("whites", DevelopSettings { whites: 0.5, ..Default::default() }),
        ("blacks", DevelopSettings { blacks: -0.5, ..Default::default() }),
        ("temperature", DevelopSettings { temperature: 0.6, ..Default::default() }),
        ("tint", DevelopSettings { tint: -0.4, ..Default::default() }),
        ("vibrance", DevelopSettings { vibrance: 0.7, ..Default::default() }),
        ("saturation", DevelopSettings { saturation: -0.5, ..Default::default() }),
        ("dehaze", DevelopSettings { dehaze: 0.6, ..Default::default() }),
        ("film", DevelopSettings { film_toe_strength: 0.6, film_shoulder_strength: 0.8, film_gamma: 1.1, color_crossover: 0.5, luma_desat: 0.4, ..Default::default() }),
    ];
    for (name, settings) in cases {
        assert_matches(name, settings);
    }
}

#[test]
fn a_busy_edit_matches_the_reference() {
    assert_matches(
        "busy edit",
        DevelopSettings {
            brightness: 0.4,
            contrast: 0.3,
            highlights: -0.5,
            shadows: 0.4,
            whites: 0.2,
            blacks: -0.2,
            temperature: -0.3,
            tint: 0.2,
            protect_highlights: true,
            vibrance: 0.3,
            saturation: 0.1,
            dehaze: 0.2,
            ..Default::default()
        },
    );
}

#[test]
fn reads_the_editors_settings_json() {
    let settings: DevelopSettings = serde_json::from_str(r#"{"brightness":1,"protectHighlights":true,"filmGamma":1.2,"unrelated":"ignored"}"#).unwrap();
    assert_eq!(settings.brightness, 1.0);
    assert!(settings.protect_highlights);
    assert_eq!(settings.film_gamma, 1.2);
    assert_eq!(settings.film_shoulder_length, 1.0, "missing fields take the editor's defaults");
    // Neutral temperature maps to D65.
    assert!((DevelopParams::from(&DevelopSettings::default()).temperature - 6500.0).abs() < 0.01);
}

#[test]
fn photos_fit_their_area_without_cropping() {
    // A tall 2000×2500 photo in a 1000×800 area of a 1000×800 target: 640 px wide, centered.
    let [left, bottom, right, top] = fit_rect(2000, 2500, [0.0, 0.0, 1000.0, 800.0], (1000, 800));
    assert!((top - 1.0).abs() < 1e-6 && (bottom + 1.0).abs() < 1e-6);
    assert!(((right - left) / 2.0 * 1000.0 - 640.0).abs() < 1e-3);
    assert!((left + right).abs() < 1e-6, "centered");
}
