//! Renders the shared parity cases with etch-core, for comparison with the
//! web renderer (tests/browser/native-parity.spec.ts).
//!
//!   cargo run --example parity_cases -- make-fixture <out.png>
//!   cargo run --example parity_cases -- render <fixture.png> <cases.json> <out-dir> [atlases.json]
//!
//! `render` writes `<out-dir>/<case>.rgba`: raw 8-bit sRGB RGBA, row-major.

use std::collections::BTreeMap;
use std::path::Path;

use etch_core::{wgpu, CubeLut, DevelopSettings, Engine, PreparedEdit};
use image::{ImageDecoder, ImageEncoder};

/// 64×48: neutral ramps, skin-like tones, saturated primaries and deep shadows.
fn fixture() -> image::RgbaImage {
    let (width, height) = (64u32, 48u32);
    image::RgbaImage::from_fn(width, height, |x, y| {
        let t = x as f32 / (width - 1) as f32;
        let band = y / 8;
        let [r, g, b] = match band {
            0 => [t, t, t],
            1 => [t * t, t * t, t * t],
            2 => [0.92 * t + 0.05, 0.68 * t + 0.04, 0.55 * t + 0.03],
            3 => [1.0 - t, 0.2 + 0.6 * t, 0.15],
            4 => [0.1 + 0.8 * t, 0.15, 0.9 - 0.75 * t],
            _ => [0.25 * t, 0.45 * t, 0.85 * t],
        };
        let shade = 0.55 + 0.45 * ((y % 8) as f32 / 7.0);
        let px = |c: f32| (c * shade).clamp(0.0, 1.0).mul_add(255.0, 0.0).round() as u8;
        image::Rgba([px(r), px(g), px(b), 255])
    })
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args: Vec<String> = std::env::args().skip(1).collect();
    match args.as_slice() {
        [mode, out] if mode == "make-fixture" => {
            fixture().save(out)?;
            println!("wrote {out}");
        }
        [mode, profile_path, out] if mode == "make-profiled-fixture" => {
            let profile = std::fs::read(profile_path)?;
            let sample = fixture();
            let mut encoder = image::codecs::png::PngEncoder::new(std::fs::File::create(out)?);
            encoder.set_icc_profile(profile)?;
            encoder.write_image(&sample, sample.width(), sample.height(), image::ExtendedColorType::Rgba8)?;
        }
        [mode, fixture_path, cases_path, out_dir, assets @ ..] if mode == "render" && assets.len() <= 1 => {
            let source = image::open(fixture_path)?.into_rgba8();
            // Each case is editor settings; `lutFile` (relative to the fixture) names a .cube to load.
            let cases: BTreeMap<String, serde_json::Value> = serde_json::from_str(&std::fs::read_to_string(cases_path)?)?;
            let fixture_dir = Path::new(fixture_path).parent().unwrap_or(Path::new("."));
            let instance = wgpu::Instance::default();
            let mut engine = pollster::block_on(Engine::new(&instance, None))?;
            if let Some(path) = assets.first() {
                let atlases: BTreeMap<String, String> = serde_json::from_str(&std::fs::read_to_string(path)?)?;
                let dir = Path::new(path).parent().unwrap_or(Path::new("."));
                for (ramp, file) in atlases {
                    engine.set_creative_atlas(ramp, &std::fs::read(dir.join(file))?)?;
                }
            }
            let photo = engine.upload(source.width(), source.height(), &source);
            let rgb16 = (0..source.height()).flat_map(|y| (0..source.width()).flat_map(move |x| {
                let code = (1 + x + 23 * y * y) as u16;
                [code, code / 2, code / 3]
            })).collect();
            let raw = engine.upload_linear(source.width(), source.height(), rgb16);
            let mut profiled = BTreeMap::new();
            std::fs::create_dir_all(out_dir)?;
            for (name, case) in &cases {
                let lut = match case.get("lutFile").and_then(|file| file.as_str()) {
                    Some(file) => Some(CubeLut::parse(&std::fs::read_to_string(fixture_dir.join(file))?).ok_or("invalid .cube")?),
                    None => None,
                };
                engine.set_lut(lut.as_ref());
                let settings: DevelopSettings = serde_json::from_value(case.clone())?;
                let edit = PreparedEdit::from(&settings);
                let photo = if let Some(file) = case["iccSource"].as_str() {
                    if !profiled.contains_key(file) {
                        let mut decoder = image::ImageReader::open(fixture_dir.join(file))?.into_decoder()?;
                        let icc = decoder.icc_profile()?.ok_or("fixture has no embedded ICC profile")?;
                        let decoded = image::DynamicImage::from_decoder(decoder)?.into_rgba8();
                        let (width, height) = decoded.dimensions();
                        let rgb = etch_core::color::import_profiled_rgba(decoded.into_raw(), &icc)?;
                        profiled.insert(file, engine.upload_owned(width, height, rgb));
                    }
                    &profiled[file]
                } else if case["linearSource"].as_bool() == Some(true) { &raw } else { &photo };
                let (width, height) = edit.output_size(photo.width, photo.height);
                let pixels = engine.render_to_rgba8_sized(photo, &edit, width, height)?;
                std::fs::write(Path::new(out_dir).join(format!("{name}.rgba")), pixels)?;
            }
            println!("rendered {} cases on {}", cases.len(), engine.device.adapter_info().name);
        }
        _ => return Err("usage: parity_cases make-fixture <out.png> | render <fixture.png> <cases.json> <out-dir> [atlases.json]".into()),
    }
    Ok(())
}
