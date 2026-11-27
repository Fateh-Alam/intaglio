use etch_core::{wgpu, DevelopSettings, Engine, PreparedEdit};
use serde_json::{json, Value};

#[test]
fn the_entire_catalog_renders_on_the_gpu() {
    let instance = wgpu::Instance::default();
    let mut engine = match pollster::block_on(Engine::new(&instance, None)) {
        Ok(engine) => engine,
        Err(error) => {
            eprintln!("skipping: {error}");
            return;
        }
    };
    let (width, height) = (48, 32);
    let pixels: Vec<_> = (0..width * height)
        .flat_map(|i| {
            let c = (i % width) * 255 / (width - 1);
            [
                c as u8,
                (255 - c) as u8,
                (i % 255) as u8,
                if i < width { 0 } else { 255 },
            ]
        })
        .collect();
    let photo = engine.upload(width, height, &pixels);
    let catalog: Value =
        serde_json::from_str(include_str!("../src/creative.generated.json")).unwrap();
    let effects = catalog["effects"].as_array().unwrap();
    for effect in effects {
        let id = effect[0].as_str().unwrap();
        if let Some(ramp) = effect[1]["glyphs"].as_str().filter(|ramp| !ramp.is_empty()) {
            let size = 40 * 56 * ramp.chars().count();
            let mask: Vec<u8> = (0..size).map(|i| if i % 7 > 1 { 255 } else { 0 }).collect();
            engine.set_creative_atlas(ramp.into(), &mask).unwrap();
        }
        let settings: DevelopSettings = serde_json::from_value(json!({
            "creativeEffects": [{ "effect": id, "angle": 23, "phase": 0.23, "size": 63 }]
        }))
        .unwrap();
        let image = engine
            .render_to_rgba8(&photo, &PreparedEdit::from(&settings))
            .unwrap_or_else(|error| panic!("{id}: {error}"));
        assert_eq!(image.len(), pixels.len(), "{id}");
        let (rgba, _) = image.as_chunks::<4>();
        assert!(
            rgba.iter().take(width as usize).all(|px| px[3] == 0),
            "{id} lost source transparency"
        );
        assert!(
            rgba.iter()
                .skip(width as usize)
                .any(|px| px[3] == 255 && px[..3] != [0, 0, 0]),
            "{id} blacked out the photo"
        );
    }
}
