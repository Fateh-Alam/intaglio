//! The global passes on the GPU (film looks, glows, optical effects, grain,
//! sharpening): each test checks what a person would expect to see.

use etch_core::{wgpu, DevelopSettings, Engine, PreparedEdit};
use serde_json::json;

const W: u32 = 64;
const H: u32 = 64;

fn engine() -> Option<Engine> {
    pollster::block_on(Engine::new(&wgpu::Instance::default(), None)).map_err(|error| eprintln!("skipping: {error}")).ok()
}

/// Left half dark grey, right half near white: one hard vertical edge.
fn photo() -> Vec<u8> {
    (0..W * H)
        .flat_map(|i| {
            let v = if i % W < W / 2 { 40 } else { 245 };
            [v, v, v, 255]
        })
        .collect()
}

/// Flat mid grey.
fn grey() -> Vec<u8> {
    [128, 128, 128, 255].repeat((W * H) as usize)
}

fn render_photo(engine: &mut Engine, pixels: &[u8], settings: serde_json::Value) -> Vec<u8> {
    let settings: DevelopSettings = serde_json::from_value(settings).expect("settings");
    let photo = engine.upload(W, H, pixels);
    engine.render_to_rgba8(&photo, &PreparedEdit::from(&settings)).expect("readback")
}

fn render(engine: &mut Engine, settings: serde_json::Value) -> Vec<u8> {
    render_photo(engine, &photo(), settings)
}

fn px(pixels: &[u8], x: u32, y: u32) -> [u8; 3] {
    let i = ((y * W + x) * 4) as usize;
    [pixels[i], pixels[i + 1], pixels[i + 2]]
}

#[test]
fn display_dither_is_spatial_stable_and_subtle() {
    let Some(mut engine) = engine() else { return };
    let settings = json!({ "brightness": 0.004 });
    let flat = grey();
    let output = render_photo(&mut engine, &flat, settings.clone());
    assert_eq!(output, render_photo(&mut engine, &flat, settings));
    let (pixels, _) = output.as_chunks::<4>();
    let darkest = pixels.iter().map(|pixel| pixel[0]).min().unwrap();
    let lightest = pixels.iter().map(|pixel| pixel[0]).max().unwrap();
    assert!(darkest < lightest && lightest - darkest <= 2, "display dither range: {darkest}..={lightest}");
    assert!(pixels.iter().all(|pixel| pixel[0] == pixel[1] && pixel[1] == pixel[2] && pixel[3] == 255));
}

#[test]
fn no_global_effects_change_nothing() {
    let Some(mut engine) = engine() else { return };
    let out = render(&mut engine, json!({ "filmEmulation": "none", "sharpness": 0.0005 }));
    assert!(out.iter().zip(photo().iter()).all(|(a, b)| a.abs_diff(*b) <= 1));
}

#[test]
fn vignette_darkens_corners_and_keeps_the_centre() {
    let Some(mut engine) = engine() else { return };
    let out = render_photo(&mut engine, &grey(), json!({ "vignette": 0.8 }));
    assert!(px(&out, 0, 0)[0] < 60, "corner {:?}", px(&out, 0, 0));
    assert!(px(&out, 32, 32)[0].abs_diff(128) <= 2, "centre {:?}", px(&out, 32, 32));
}

#[test]
fn film_border_frames_the_photo_in_black() {
    let Some(mut engine) = engine() else { return };
    let out = render_photo(&mut engine, &grey(), json!({ "filmBorder": true }));
    assert_eq!(px(&out, 0, 30), [0, 0, 0]);
    assert_eq!(px(&out, 30, 63), [0, 0, 0]);
    assert!(px(&out, 30, 30)[0].abs_diff(128) <= 1);
}

#[test]
fn sharpening_raises_contrast_at_edges_only() {
    let Some(mut engine) = engine() else { return };
    let out = render(&mut engine, json!({ "sharpness": 0.8 }));
    assert!(px(&out, 31, 32)[0] < 40 - 10, "dark side of the edge gets darker: {:?}", px(&out, 31, 32));
    assert!(px(&out, 32, 32)[0] >= 250, "bright side gets brighter: {:?}", px(&out, 32, 32));
    assert!(px(&out, 8, 32)[0].abs_diff(40) <= 1, "flat areas stay: {:?}", px(&out, 8, 32));
}

#[test]
fn bloom_spills_light_into_the_dark_side() {
    let Some(mut engine) = engine() else { return };
    let out = render(&mut engine, json!({ "bloom": 1.0, "bloomThreshold": 0.5 }));
    let near = px(&out, 28, 32)[0];
    assert!(near > 40 + 15, "dark pixels by the edge glow: {near}");
    assert!(px(&out, 2, 32)[0] < near, "and the glow fades with distance");
}

#[test]
fn halation_glows_red() {
    let Some(mut engine) = engine() else { return };
    let out = render(&mut engine, json!({ "halation": 1.0, "halationThreshold": 0.5 }));
    let [r, g, b] = px(&out, 29, 32);
    assert!(r > g + 10 && g >= b, "warm red fringe: {:?}", [r, g, b]);
}

#[test]
fn grain_adds_texture_to_flat_grey() {
    let Some(mut engine) = engine() else { return };
    let out = render_photo(&mut engine, &grey(), json!({ "grain": 0.3 }));
    let values: Vec<f32> = out.chunks(4).map(|p| p[0] as f32).collect();
    let mean = values.iter().sum::<f32>() / values.len() as f32;
    let spread = (values.iter().map(|v| (v - mean).powi(2)).sum::<f32>() / values.len() as f32).sqrt();
    assert!(spread > 5.0, "grain spread {spread}");
    assert!((mean - 128.0).abs() < 6.0, "grain keeps the brightness: {mean}");
}

/// Compare a smaller render with an area average of the full-resolution edit.
#[test]
fn glow_and_grain_keep_their_photo_scale() {
    let Some(mut engine) = engine() else { return };
    let edge = engine.upload(W, H, &photo());
    let flat = engine.upload(W, H, &grey());
    for (settings, photo, factors, max_mean) in [
        (json!({"bloom": 0.65, "bloomThreshold": 0.55}), &edge, &[2, 4][..], 3.0),
        (json!({"halation": 0.65, "halationThreshold": 0.55}), &edge, &[2, 4][..], 3.0),
        (json!({"grain": 0.18}), &flat, &[2][..], 1.5),
    ] {
        let edit = PreparedEdit::from(&serde_json::from_value::<DevelopSettings>(settings.clone()).unwrap());
        let full = engine.render_to_rgba8(photo, &edit).unwrap();
        for &factor in factors {
            let (width, height) = (W / factor, H / factor);
            let fit = engine.render_to_rgba8_sized(photo, &edit, width, height).unwrap();
            let mut error = 0.0;
            for y in 0..height {
                for x in 0..width {
                    let mut average = 0.0;
                    for dy in 0..factor {
                        for dx in 0..factor { average += f32::from(px(&full, x * factor + dx, y * factor + dy)[0]); }
                    }
                    error += (average / (factor * factor) as f32 - f32::from(fit[((y * width + x) * 4) as usize])).abs();
                }
            }
            let mean = error / (width * height) as f32;
            assert!(mean < max_mean, "{settings} scale 1/{factor} had mean channel error {mean}");
        }
    }
}

#[test]
fn film_looks_change_colour() {
    let Some(mut engine) = engine() else { return };
    let out = render_photo(&mut engine, &grey(), json!({ "filmEmulation": "kodak_portra_400" }));
    let [r, _, b] = px(&out, 30, 30);
    assert!(r > b + 3, "Portra warms grey: {:?}", px(&out, 30, 30));
    let none = render_photo(&mut engine, &grey(), json!({ "filmEmulation": "kodak_portra_400", "filmEmulationStrength": 0.0 }));
    assert!(none.iter().zip(grey().iter()).all(|(a, b)| a.abs_diff(*b) <= 1));
}

#[test]
fn every_effect_together_with_a_local_layer() {
    let Some(mut engine) = engine() else { return };
    let out = render(
        &mut engine,
        json!({
            "filmEmulation": "cinestill_800t", "halation": 0.5, "bloom": 0.4, "vignette": 0.3, "aberration": 0.004,
            "anamorphicStreaks": 0.5, "godLightStrength": 0.6, "godLightRim": 0.4, "godLightSpecular": 0.3, "grain": 0.05,
            "sharpness": 0.3, "structure": 0.2, "filmBorder": true,
            "adjustmentLayers": [{ "id": "l", "maskIds": [], "opacity": 1.0, "params": { "brightness": 0.2 } }],
        }),
    );
    assert_eq!(out.len(), (W * H * 4) as usize);
    assert!(out.iter().zip(photo().iter()).any(|(a, b)| a.abs_diff(*b) > 8));
}

#[test]
fn out_of_gamut_colour_before_a_film_look_never_blacks_out_the_glow() {
    // A strong saturation layer pushes channels below zero; film looks used to
    // turn those into NaN, which the halation blur spread across the frame.
    let Some(mut engine) = engine() else { return };
    let colourful: Vec<u8> = (0..W * H).flat_map(|i| [(i % W * 4) as u8, 200, (255 - i / W * 4) as u8, 255]).collect();
    let out = render_photo(
        &mut engine,
        &colourful,
        json!({
            "filmEmulation": "cinestill_800t", "halation": 0.6, "halationThreshold": 0.3, "bloom": 0.4, "bloomThreshold": 0.3,
            "adjustmentLayers": [{ "id": "l", "maskIds": [], "opacity": 1.0, "params": { "saturation": 1.0, "vibrance": 1.0 } }],
        }),
    );
    let black = out.chunks(4).filter(|p| p[..3] == [0, 0, 0]).count();
    assert!(black < (W * H / 20) as usize, "{black} black pixels");
}
