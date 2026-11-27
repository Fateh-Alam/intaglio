//! Adjustment layers and masks on the GPU: each test checks what a person
//! would expect to see, not just that something changed.

use etch_core::{wgpu, DevelopSettings, Engine, PreparedEdit};
use serde_json::json;

const W: u32 = 32;
const H: u32 = 32;

fn engine() -> Option<Engine> {
    pollster::block_on(Engine::new(&wgpu::Instance::default(), None)).map_err(|error| eprintln!("skipping: {error}")).ok()
}

/// Left half mid-grey, right half a left-to-right brightness ramp.
/// Comparisons use an unedited render with the same display dither.
fn photo() -> Vec<u8> {
    (0..W * H)
        .flat_map(|i| {
            let x = i % W;
            let v = if x < W / 2 { 118 } else { (40 + (x - W / 2) * 13) as u8 };
            [v, v, v, 255]
        })
        .collect()
}

fn render(engine: &mut Engine, settings: serde_json::Value) -> Vec<u8> {
    let settings: DevelopSettings = serde_json::from_value(settings).expect("settings");
    let photo = engine.upload(W, H, &photo());
    engine.render_to_rgba8(&photo, &PreparedEdit::from(&settings)).expect("readback")
}

fn at(pixels: &[u8], x: u32, y: u32) -> u8 {
    pixels[((y * W + x) * 4) as usize]
}

fn layer(masks: &[&str], opacity: f64, params: serde_json::Value) -> serde_json::Value {
    json!({ "id": "layer", "maskIds": masks, "opacity": opacity, "blendMode": "normal", "params": params })
}

#[test]
fn an_unmasked_layer_is_the_same_edit_applied_everywhere() {
    let Some(mut engine) = engine() else { return };
    let local = render(&mut engine, json!({ "adjustmentLayers": [layer(&[], 1.0, json!({ "brightness": 0.7, "contrast": 0.2 }))] }));
    let global = render(&mut engine, json!({ "brightness": 0.7, "contrast": 0.2 }));
    let worst = local.iter().zip(&global).map(|(a, b)| a.abs_diff(*b)).max().unwrap();
    assert!(worst <= 1, "layer vs global differ by {worst}/255");
    assert!(at(&local, 4, 4) > at(&photo(), 4, 4) + 30, "the edit applied");
}

#[test]
fn invisible_layers_change_nothing() {
    let Some(mut engine) = engine() else { return };
    let original = render(&mut engine, json!({}));
    for settings in [
        json!({ "adjustmentLayers": [layer(&[], 0.0, json!({ "brightness": 1.0 }))] }),
        json!({ "adjustmentLayers": [{ "id": "off", "maskIds": [], "opacity": 1.0, "enabled": false, "params": { "brightness": 1.0 } }] }),
    ] {
        let out = render(&mut engine, settings);
        assert!(out.iter().zip(&original).all(|(a, b)| a.abs_diff(*b) <= 1));
    }
}

#[test]
fn radial_and_linear_masks_place_the_edit() {
    let Some(mut engine) = engine() else { return };
    let original = render(&mut engine, json!({}));
    let radial = json!({ "id": "r", "type": "radial", "blendMode": "ADD", "opacity": 1, "params": { "center": { "x": 0.25, "y": 0.5 }, "radius": 0.15, "radiusX": 0.15, "radiusY": 0.15, "angle": 0, "feather": 0.1, "invert": false } });
    let out = render(&mut engine, json!({ "masks": [radial], "adjustmentLayers": [layer(&["r"], 1.0, json!({ "brightness": 1.0 }))] }));
    assert!(at(&out, 8, 16) > at(&original, 8, 16) + 40, "inside the circle is brighter");
    assert_eq!(at(&out, 2, 2), at(&original, 2, 2), "outside the circle is untouched");

    // Linear: full effect at the top, none at the bottom.
    let linear = json!({ "id": "l", "type": "linear", "blendMode": "ADD", "opacity": 1, "params": { "angle": 0, "position": 0.5, "feather": 0.2, "invert": false, "start": { "x": 0.5, "y": 0.0 }, "end": { "x": 0.5, "y": 1.0 } } });
    let out = render(&mut engine, json!({ "masks": [linear], "adjustmentLayers": [layer(&["l"], 1.0, json!({ "brightness": 1.0 }))] }));
    let (top, middle, bottom) = (at(&out, 4, 0), at(&out, 4, 16), at(&out, 4, 31));
    assert!(top > middle && middle > bottom, "fades top to bottom: {top} {middle} {bottom}");
    assert!(bottom.abs_diff(at(&original, 4, 31)) <= 1, "bottom row untouched");
}

#[test]
fn luminance_masks_select_by_brightness_and_masks_combine() {
    let Some(mut engine) = engine() else { return };
    let original = render(&mut engine, json!({}));
    // Only bright tones (OKLab L near 0.85): the bright end of the ramp, not the grey half.
    let bright = json!({ "id": "b", "type": "luminosity", "blendMode": "ADD", "opacity": 1, "params": { "colorSpace": "oklab", "target": 0.85, "range": 0.1, "feather": 0.05 } });
    let out = render(&mut engine, json!({ "masks": [bright], "adjustmentLayers": [layer(&["b"], 1.0, json!({ "brightness": -1.0 }))] }));
    assert!(at(&out, W - 1, 8) + 30 < at(&original, W - 1, 8), "brightest pixels darkened");
    assert_eq!(at(&out, 4, 8), at(&original, 4, 8), "mid-grey untouched");

    // A circle minus a smaller circle leaves a ring.
    let circle = |id: &str, radius: f64, mode: &str| json!({ "id": id, "type": "radial", "blendMode": mode, "opacity": 1, "params": { "center": { "x": 0.25, "y": 0.5 }, "radius": radius, "radiusX": radius, "radiusY": radius, "angle": 0, "feather": 0.05, "invert": false } });
    let out = render(&mut engine, json!({ "masks": [circle("outer", 0.2, "ADD"), circle("inner", 0.08, "SUBTRACT")], "adjustmentLayers": [layer(&["outer", "inner"], 1.0, json!({ "brightness": 1.0 }))] }));
    assert_eq!(at(&out, 8, 16), at(&original, 8, 16), "the hole in the middle is untouched");
    assert!(at(&out, 8, 11) > at(&original, 8, 11) + 40, "the ring is brighter");

    // Intersect: circle ∩ bright tones = nothing here (the circle sits on mid-grey).
    let bright_intersect = json!({ "id": "bi", "type": "luminosity", "blendMode": "INTERSECT", "opacity": 1, "params": { "colorSpace": "oklab", "target": 0.85, "range": 0.1, "feather": 0.05 } });
    let out = render(&mut engine, json!({ "masks": [circle("outer", 0.2, "ADD"), bright_intersect], "adjustmentLayers": [layer(&["outer", "bi"], 1.0, json!({ "brightness": 1.0 }))] }));
    assert_eq!(at(&out, 8, 16), at(&original, 8, 16), "grey inside the circle isn't bright, so the intersection is empty");
}

#[test]
fn brush_masks_paint_where_the_stroke_went() {
    let Some(mut engine) = engine() else { return };
    let original = render(&mut engine, json!({}));
    let brush = json!({ "id": "b", "type": "brush", "blendMode": "ADD", "opacity": 1, "params": { "strokes": [
        { "id": "s", "points": [{ "x": 0.05, "y": 0.5, "t": 0 }, { "x": 0.45, "y": 0.5, "t": 1 }], "size": 1.0, "feather": 0.4, "flow": 1, "opacity": 1, "mode": "paint" }
    ] } });
    let out = render(&mut engine, json!({ "masks": [brush], "adjustmentLayers": [layer(&["b"], 1.0, json!({ "brightness": 1.0 }))] }));
    assert!(at(&out, 8, 16) > at(&original, 8, 16) + 40, "under the stroke is brighter");
    assert_eq!(at(&out, 8, 1), at(&original, 8, 1), "above the stroke is untouched");
}
