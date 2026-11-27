//! The GPU develop pass must match its CPU twin (`reference.rs`) pixel for pixel,
//! within 8-bit rounding. That's how we know the WGSL port says what the formulas say.

use etch_core::reference::{develop_with_lut, linear_to_srgb, srgb_to_linear};
use etch_core::{fit_rect, wgpu, ColorGrading, Crop, CubeLut, CurvePoint, CurvePoints, DevelopParams, DevelopSettings, Engine, PreparedEdit, Wheel};

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

fn expected(photo: &[u8], edit: &PreparedEdit) -> Vec<u8> {
    expected_with_lut(photo, edit, None)
}

fn expected_with_lut(photo: &[u8], edit: &PreparedEdit, lut: Option<&CubeLut>) -> Vec<u8> {
    let mut out = Vec::with_capacity(photo.len());
    for px in photo.chunks(4) {
        let linear = [0, 1, 2].map(|i| srgb_to_linear(px[i] as f32 / 255.0));
        for c in develop_with_lut(linear, edit, lut) {
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
    let edit = PreparedEdit::from(&settings);
    let gpu = engine.render_to_rgba8(&photo, &edit).expect("readback");
    let cpu = expected(&photo_pixels, &edit);
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
    let out = engine.render_to_rgba8(&photo, &PreparedEdit::from(&DevelopSettings::default())).expect("readback");
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

fn points(list: &[(f64, f64)]) -> Vec<CurvePoint> {
    list.iter().map(|&(x, y)| CurvePoint { x, y }).collect()
}

fn s_curve() -> CurvePoints {
    CurvePoints {
        master: points(&[(0.0, 0.0), (0.25, 0.18), (0.75, 0.84), (1.0, 1.0)]),
        red: points(&[(0.0, 0.03), (0.5, 0.55), (1.0, 1.0)]),
        blue: points(&[(0.0, 0.0), (0.5, 0.44), (1.0, 0.95)]),
        ..Default::default()
    }
}

#[test]
fn curves_mixer_and_grading_match_the_reference() {
    let cases: [(&str, DevelopSettings); 6] = [
        ("tone curve", DevelopSettings { curve_points: s_curve(), ..Default::default() }),
        ("inverting curve", DevelopSettings { curve_points: CurvePoints { master: points(&[(0.0, 1.0), (1.0, 0.0)]), ..Default::default() }, ..Default::default() }),
        ("mixer", DevelopSettings { hsl_red_hue: 0.4, hsl_orange_sat: -0.6, hsl_yellow_lum: 0.5, hsl_blue_sat: 0.8, hsl_blue_hue: -0.3, hsl_green_lum: -0.6, ..Default::default() }),
        ("mixer with skin protection", DevelopSettings { hsl_orange_sat: 0.9, hsl_red_hue: 0.6, safe_skin_enabled: true, ..Default::default() }),
        (
            "grading",
            DevelopSettings {
                color_grading: ColorGrading {
                    shadows: Wheel { h: 0.55, s: 0.6, l: -0.2 },
                    midtones: Wheel { h: 0.1, s: 0.2, l: 0.0 },
                    highlights: Wheel { h: 0.08, s: 0.5, l: 0.15 },
                    balance: 0.3,
                },
                ..Default::default()
            },
        ),
        (
            "everything",
            DevelopSettings {
                brightness: 0.3,
                contrast: 0.2,
                vibrance: 0.2,
                curve_points: s_curve(),
                hsl_blue_sat: 0.5,
                hsl_orange_hue: 0.2,
                color_grading: ColorGrading { shadows: Wheel { h: 0.55, s: 0.4, l: 0.0 }, highlights: Wheel { h: 0.08, s: 0.3, l: 0.0 }, ..Default::default() },
                ..Default::default()
            },
        ),
    ];
    for (name, settings) in cases {
        assert_matches(name, settings);
    }
}

#[test]
fn mixer_leaves_pure_greys_alone() {
    // Regression: OKLab hue is rounding noise on greys, so luminance bands used
    // to brighten or darken neutrals at random (grey 232 → 255 on one engine, 203 on another).
    let Some(mut engine) = engine() else { return };
    let greys: Vec<u8> = (0..64u32).flat_map(|i| { let v = (i * 4) as u8; [v, v, v, 255] }).collect();
    let photo = engine.upload(64, 1, &greys);
    let settings = DevelopSettings { hsl_red_lum: 0.8, hsl_orange_lum: -0.8, hsl_yellow_lum: 0.8, hsl_green_lum: -0.8, hsl_aqua_lum: 0.8, hsl_blue_lum: -0.8, hsl_purple_lum: 0.8, hsl_magenta_lum: -0.8, ..Default::default() };
    let out = engine.render_to_rgba8(&photo, &PreparedEdit::from(&settings)).expect("readback");
    let worst = out.iter().zip(&greys).map(|(a, b)| a.abs_diff(*b)).max().unwrap();
    assert!(worst <= 1, "mixer luminance moved a pure grey by {worst}/255");
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
    let settings: DevelopSettings = serde_json::from_str(
        r#"{"brightness":1,"protectHighlights":true,"filmGamma":1.2,"unrelated":"ignored","hslBlueSat":0.5,"safeSkinEnabled":true,
            "curvePoints":{"master":[{"x":0,"y":0},{"x":0.5,"y":0.6},{"x":1,"y":1}],"red":[],"green":[{"x":0,"y":0},{"x":1,"y":1}],"blue":[{"x":0,"y":0},{"x":1,"y":1}]},
            "colorGrading":{"shadows":{"h":0.5,"s":0.3,"l":0},"midtones":{"h":0,"s":0,"l":0},"highlights":{"h":0,"s":0,"l":0},"balance":0.2}}"#,
    )
    .unwrap();
    assert_eq!(settings.hsl_blue_sat, 0.5);
    assert!(settings.safe_skin_enabled && !settings.curve_points.is_identity());
    assert_eq!(settings.color_grading.shadows.s, 0.3);
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

#[test]
fn large_photos_shown_small_are_smooth_not_jagged() {
    let Some(mut engine) = engine() else { return };
    // A 1-pixel black/white checkerboard shown at an awkward size (64 → 14, as a
    // real photo in a window would be) should blend to an even grey (half the
    // light: sRGB 188), not alias into stripes or moiré.
    let size = 64;
    let pixels: Vec<u8> = (0..size * size)
        .flat_map(|i| {
            let on = ((i % size) + (i / size)) % 2 == 0;
            let v = if on { 255 } else { 0 };
            [v, v, v, 255]
        })
        .collect();
    let photo = engine.upload(size, size, &pixels);
    let out = engine.render_to_rgba8_sized(&photo, &PreparedEdit::from(&DevelopSettings::default()), 14, 14).expect("readback");
    let (low, high) = out.chunks(4).fold((255u8, 0u8), |(lo, hi), px| (lo.min(px[0]), hi.max(px[0])));
    assert!(low >= 184 && high <= 192, "downscaled checkerboard ranged {low}..{high}, expected an even ~188 grey");
}

fn fixture_lut() -> CubeLut {
    let text = std::fs::read_to_string(concat!(env!("CARGO_MANIFEST_DIR"), "/../../public/parity/native-fixture.cube")).expect("fixture LUT");
    CubeLut::parse(&text).expect("valid fixture LUT")
}

#[test]
fn creative_luts_match_the_reference() {
    let Some(mut engine) = engine() else { return };
    let lut = fixture_lut();
    engine.set_lut(Some(&lut));
    let pixels = test_photo();
    let photo = engine.upload(SIZE, SIZE, &pixels);
    for (name, settings) in [
        ("LUT at full strength", DevelopSettings { lut_strength: 1.0, ..Default::default() }),
        ("LUT at 60%", DevelopSettings { lut_strength: 0.6, ..Default::default() }),
        ("LUT after a grade", DevelopSettings { lut_strength: 0.8, brightness: 0.3, curve_points: s_curve(), hsl_blue_sat: 0.4, ..Default::default() }),
    ] {
        let edit = PreparedEdit::from(&settings);
        let gpu = engine.render_to_rgba8(&photo, &edit).expect("readback");
        let cpu = expected_with_lut(&pixels, &edit, Some(&lut));
        let worst = gpu.iter().zip(&cpu).map(|(a, b)| a.abs_diff(*b)).max().unwrap();
        let moved = gpu.iter().zip(&pixels).map(|(a, b)| a.abs_diff(*b)).max().unwrap();
        assert!(worst <= 2, "{name}: GPU differs from the reference by up to {worst}/255");
        assert!(moved >= 8, "{name}: the LUT barely changed the photo ({moved}/255)");
    }
    // Strength 0, or no LUT, leaves the photo alone.
    let off = engine.render_to_rgba8(&photo, &PreparedEdit::from(&DevelopSettings::default())).expect("readback");
    assert!(off.iter().zip(&pixels).all(|(a, b)| a.abs_diff(*b) <= 1));
    engine.set_lut(None);
    let cleared = engine.render_to_rgba8(&photo, &PreparedEdit::from(&DevelopSettings { lut_strength: 1.0, ..Default::default() })).expect("readback");
    assert!(cleared.iter().zip(&pixels).all(|(a, b)| a.abs_diff(*b) <= 1), "a cleared LUT must not apply");
}

fn pixel(data: &[u8], width: u32, x: u32, y: u32) -> [u8; 4] {
    let i = ((y * width + x) * 4) as usize;
    [data[i], data[i + 1], data[i + 2], data[i + 3]]
}

#[test]
fn crop_returns_exactly_that_part_of_the_photo() {
    let Some(mut engine) = engine() else { return };
    let pixels = test_photo();
    let photo = engine.upload(SIZE, SIZE, &pixels);
    let settings = DevelopSettings { crop: Crop { x: 0.25, y: 0.5, width: 0.5, height: 0.25 }, ..Default::default() };
    let edit = PreparedEdit::from(&settings);
    let (width, height) = edit.output_size(SIZE, SIZE);
    assert_eq!((width, height), (8, 4));
    let out = engine.render_to_rgba8_sized(&photo, &edit, width, height).expect("readback");
    for y in 0..height {
        for x in 0..width {
            let (got, want) = (pixel(&out, width, x, y), pixel(&pixels, SIZE, x + 4, y + 8));
            assert!(got.iter().zip(want).all(|(a, b)| a.abs_diff(b) <= 1), "crop pixel ({x},{y}) is {got:?}, expected {want:?}");
        }
    }
}

#[test]
fn quarter_turn_is_an_exact_pixel_rotation() {
    let Some(mut engine) = engine() else { return };
    let pixels = test_photo();
    let photo = engine.upload(SIZE, SIZE, &pixels);
    let out = engine.render_to_rgba8(&photo, &PreparedEdit::from(&DevelopSettings { rotate: 90.0, ..Default::default() })).expect("readback");
    let n = SIZE - 1;
    let matches = |map: &dyn Fn(u32, u32) -> (u32, u32)| {
        (0..SIZE).all(|y| (0..SIZE).all(|x| {
            let (sx, sy) = map(x, y);
            pixel(&out, SIZE, x, y).iter().zip(pixel(&pixels, SIZE, sx, sy)).all(|(a, b)| a.abs_diff(b) <= 1)
        }))
    };
    let clockwise = matches(&|x, y| (y, n - x));
    let counter_clockwise = matches(&|x, y| (n - y, x));
    assert!(clockwise ^ counter_clockwise, "rotate 90° must be one exact quarter turn (cw {clockwise}, ccw {counter_clockwise})");
    eprintln!("rotate +90° turns the photo {}", if clockwise { "clockwise" } else { "counter-clockwise" });
}
