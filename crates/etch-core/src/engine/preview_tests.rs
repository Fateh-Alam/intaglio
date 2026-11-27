use super::*;
use crate::{plan_preview, DevelopSettings, PreviewCamera};
use serde_json::json;

fn engine() -> Option<Engine> {
    let instance = wgpu::Instance::default();
    pollster::block_on(Engine::new(&instance, None))
        .map_err(|error| eprintln!("skipping: {error}"))
        .ok()
}

#[derive(Default)]
struct PreviewFlags<'a> {
    mask: Option<&'a str>,
    pick: bool,
    clip: bool,
    comparison: Option<PreviewComparison<'a>>,
}

fn preview(
    engine: &mut Engine,
    photo: &Photo,
    edit: &PreparedEdit,
    camera: PreviewCamera,
    size: (u32, u32),
    flags: PreviewFlags<'_>,
) -> Vec<u8> {
    let format = wgpu::TextureFormat::Rgba8UnormSrgb;
    let target = engine.device.create_texture(&wgpu::TextureDescriptor {
        label: Some("test viewport"),
        size: wgpu::Extent3d {
            width: size.0,
            height: size.1,
            depth_or_array_layers: 1,
        },
        mip_level_count: 1,
        sample_count: 1,
        dimension: wgpu::TextureDimension::D2,
        format,
        usage: wgpu::TextureUsages::RENDER_ATTACHMENT | wgpu::TextureUsages::COPY_SRC,
        view_formats: &[],
    });
    let tile = plan_preview(
        edit.output_size(photo.width, photo.height),
        [0.0, 0.0, size.0 as f32, size.1 as f32],
        size,
        camera,
        8192,
        edit.preview_effects(),
    )
    .unwrap();
    engine
        .render_preview(
            photo,
            edit,
            &target.create_view(&Default::default()),
            format,
            wgpu::Color::BLACK,
            PreviewStyle {
                tile,
                mask_plate: flags.mask,
                pick_mask_color: flags.pick,
                show_clipping: flags.clip,
                comparison: flags.comparison,
            },
        )
        .unwrap();
    engine
        .read_rgba8(
            new_encoder(&engine.device, "test preview readback"),
            &target,
            size,
            false,
        )
        .unwrap()
}

#[test]
fn comparison_uses_crop_coordinates_and_keeps_warnings_on_the_edited_side() {
    let Some(mut engine) = engine() else { return };
    let bytes: Vec<_> = (0..128 * 64).flat_map(|i| [(i % 128) as u8, 102, 54, 255]).collect();
    let photo = engine.upload(128, 64, &bytes);
    let edit = PreparedEdit::from(&serde_json::from_value::<DevelopSettings>(json!({
        "brightness": 5.0, "crop": { "x": 0.25, "y": 0.0, "width": 0.5, "height": 1.0 },
    })).unwrap());
    let plot = |engine: &mut Engine, split| preview(
        engine, &photo, &edit, PreviewCamera { inset: 1.0, ..Default::default() }, (64, 64),
        PreviewFlags { clip: true, comparison: Some(PreviewComparison { split, snapshot: None }), ..Default::default() },
    );
    let split = plot(&mut engine, 0.5);
    let before = plot(&mut engine, 1.0);
    assert_eq!(&split[..32 * 4], &before[..32 * 4]);
    assert!(split[16 * 4].abs_diff(48) <= 1);
    assert_eq!(&split[32 * 4..32 * 4 + 4], &[255, 51, 41, 255]);
    assert!(before[48 * 4].abs_diff(80) <= 1);
    let captured = engine.render_sample(&photo, &edit, 64, 64).unwrap();
    assert!(captured[16 * 4] > 240);
    assert_eq!(&captured[16 * 4 + 1..16 * 4 + 4], &[255; 3]);
}

#[test]
fn snapshot_divider_tracks_the_full_image_when_panned() {
    let Some(mut engine) = engine() else { return };
    let photo = engine.upload(256, 128, &[20, 102, 30, 255].repeat(256 * 128));
    let snapshot = engine.upload(64, 32, &[160, 45, 190, 255].repeat(64 * 32));
    let edit = PreparedEdit::from(&DevelopSettings::default());
    let output = preview(
        &mut engine, &photo, &edit,
        PreviewCamera { inset: 1.0, zoom: 4.0, cx: 0.625, ..Default::default() },
        (64, 32),
        PreviewFlags { comparison: Some(PreviewComparison { split: 0.5625, snapshot: Some(&snapshot) }), ..Default::default() },
    );
    let (rgba, _) = output.as_chunks::<4>();
    assert_eq!(rgba[15], [160, 45, 190, 255]);
    assert!(rgba[16].iter().zip([20, 102, 30, 255]).all(|(actual, expected)| actual.abs_diff(expected) <= 1));
}

#[test]
fn linear_raw_keeps_detail_below_the_eight_bit_proxy_floor() {
    let Some(mut engine) = engine() else { return };
    let photo = engine.upload_linear(64, 32, [1, 3, 7].repeat(64 * 32));
    let develop = DevelopSettings { brightness: 5.0, ..Default::default() };
    let edit = PreparedEdit::from(&develop);
    let rgba = engine.render_sample(&photo, &edit, 64, 32).unwrap();
    let [r, g, b, alpha]: [u8; 4] = rgba[0..4].try_into().unwrap();
    assert!(r > 0 && g > r && b > g, "sub-8-bit detail was lost: {r} {g} {b}");
    assert_eq!(alpha, 255);
}

#[test]
fn raw_loupe_reads_original_rgb16_when_panning_beyond_the_gpu_texture_limit() {
    let Some(mut engine) = engine() else { return };
    let width = engine.device.limits().max_texture_dimension_2d + 1024;
    let height = 48;
    let raw = (0..width * height).flat_map(|index| {
        let red = if (index % width).is_multiple_of(2) { 1 } else { 19 };
        [red, 7, 3]
    }).collect();
    let photo = engine.upload_linear(width, height, raw);
    let edit = PreparedEdit::from(&DevelopSettings { brightness: 5.0, ..Default::default() });
    for center in [width / 4, width * 3 / 4] {
        let out = preview(&mut engine, &photo, &edit, PreviewCamera {
            zoom: width as f32 / 160.0, cx: center as f32 / width as f32, inset: 1.0, ..Default::default()
        }, (160, 48), PreviewFlags::default());
        let (rgba, _) = out.as_chunks::<4>();
        for (index, pair) in rgba.as_chunks::<2>().0.iter().enumerate() {
            assert!(pair[0][0] >= 1 && pair[1][0] > pair[0][0] + 15, "{center}, {index}: {pair:?}");
        }
    }
}

#[test]
fn one_to_one_pans_across_an_oversized_source_without_resampling() {
    let Some(mut engine) = engine() else { return };
    let width = engine.device.limits().max_texture_dimension_2d + 1024;
    let height = 144;
    let stripe = |x: u32| if x.is_multiple_of(2) { 8 } else { 246 };
    let bytes = (0..width * height)
        .flat_map(|i| [stripe(i % width), 0, 0, 255])
        .collect();
    let photo = engine.upload_owned(width, height, bytes);
    let edit = PreparedEdit::from(&DevelopSettings::default());
    let zoom = width as f32 / 160.0;
    for center in [width / 4, width * 3 / 4] {
        let camera = PreviewCamera {
            zoom,
            cx: center as f32 / width as f32,
            inset: 1.0,
            ..PreviewCamera::default()
        };
        let pixels = preview(
            &mut engine,
            &photo,
            &edit,
            camera,
            (160, 96),
            PreviewFlags::default(),
        );
        let (rgba, _) = pixels.as_chunks::<4>();
        for (index, pixel) in rgba.iter().enumerate() {
            let x = center - 80 + (index % 160) as u32;
            assert!(pixel[0].abs_diff(stripe(x)) <= 1, "{x}: {pixel:?}");
        }
    }
}

#[test]
fn zoomed_coverage_tints_only_the_selected_mask_and_leaves_export_pixels_alone() {
    let Some(mut engine) = engine() else { return };
    let photo = engine.upload(256, 160, &[100, 110, 120, 255].repeat(256 * 160));
    let settings = serde_json::from_value::<DevelopSettings>(json!({
        "masks": [{ "id": "r", "type": "radial", "blendMode": "ADD", "opacity": 1,
            "params": { "center": { "x": 0.31, "y": 0.5 }, "radius": 0.12, "radiusX": 0.12, "radiusY": 0.12, "angle": 0, "feather": 0.2, "invert": false } }],
        "adjustmentLayers": [{ "id": "selected", "opacity": 0.5, "maskIds": ["r"], "params": { "brightness": 0.25 } }]
    })).unwrap();
    let edit = PreparedEdit::from(&settings);
    let export = engine.render_to_rgba8(&photo, &edit).unwrap();
    let size = (100, 80);
    let camera = PreviewCamera {
        zoom: 2.56,
        cx: 0.31,
        inset: 1.0,
        ..PreviewCamera::default()
    };
    let unmarked = preview(
        &mut engine,
        &photo,
        &edit,
        camera,
        size,
        PreviewFlags::default(),
    );
    let marked = preview(
        &mut engine,
        &photo,
        &edit,
        camera,
        size,
        PreviewFlags {
            mask: Some("selected"),
            ..Default::default()
        },
    );
    let inside = (40 * 100 + 50) * 4;
    assert!(marked[inside] > unmarked[inside] + 50);
    assert_eq!(&unmarked[..4], &marked[..4]);
    let with_picker = preview(
        &mut engine,
        &photo,
        &edit,
        camera,
        size,
        PreviewFlags {
            mask: Some("selected"),
            pick: true,
            ..Default::default()
        },
    );
    assert!(marked
        .iter()
        .zip(with_picker)
        .all(|(a, b)| a.abs_diff(b) <= 1));
    let picked = engine.pick_mask_color(0.31, 0.5).expect("linear input");
    let want = 0.1274;
    assert!(
        (picked[0] - want).abs() < 0.001,
        "sample is the 100/255 sRGB input converted to linear: {picked:?}"
    );
    assert!(engine.pick_mask_color(-0.1, 0.5).is_none());
    assert_eq!(
        preview(
            &mut engine,
            &photo,
            &edit,
            camera,
            size,
            PreviewFlags {
                mask: Some("missing"),
                ..Default::default()
            }
        ),
        unmarked
    );
    assert_eq!(engine.render_to_rgba8(&photo, &edit).unwrap(), export);
}

#[test]
fn spatial_edits_on_a_visible_tile_match_the_full_frame() {
    let Some(mut engine) = engine() else { return };
    let (width, height): (u32, u32) = (512, 320);
    let input: Vec<_> = (0..width * height)
        .flat_map(|i| {
            let (x, y) = (i % width, i / width);
            let bright = if (x / 37 + y / 29).is_multiple_of(2) {
                195
            } else {
                35
            };
            [bright, (x / 2) as u8, (y / 2) as u8, 255]
        })
        .collect();
    let photo = engine.upload(width, height, &input);
    let settings = DevelopSettings {
        halation: 0.25,
        bloom: 0.35,
        bloom_radius: 1.3,
        grain: 0.04,
        structure: 0.15,
        aberration: 0.01,
        vignette: 0.2,
        ..Default::default()
    };
    let edit = PreparedEdit::from(&settings);
    let full = engine.render_to_rgba8(&photo, &edit).unwrap();
    let camera = PreviewCamera {
        zoom: 4.0,
        cx: 0.625,
        cy: 0.60,
        inset: 1.0,
        ..Default::default()
    };
    let visible = preview(
        &mut engine,
        &photo,
        &edit,
        camera,
        (128, 96),
        PreviewFlags::default(),
    );
    let (visible, _) = visible.as_chunks::<4>();
    let (full, _) = full.as_chunks::<4>();
    let worst = visible
        .iter()
        .enumerate()
        .map(|(i, pixel)| {
            let reference = &full[(144 + i / 128) * width as usize + 256 + i % 128];
            pixel
                .iter()
                .zip(reference)
                .map(|(a, b)| a.abs_diff(*b))
                .max()
                .unwrap()
        })
        .max()
        .unwrap();
    assert!(
        worst <= 2,
        "the tile differs from the full frame by {worst}/255"
    );
}

#[test]
fn clipping_warnings_follow_the_output_and_keep_transparent_pixels_clear() {
    let Some(mut engine) = engine() else { return };
    let input: Vec<_> = (0..96 * 64)
        .flat_map(|pixel| match pixel % 96 / 32 {
            0 => [0, 0, 0, 255],
            1 => [255, 255, 255, 255],
            _ => [255, 0, 255, 0],
        })
        .collect();
    let photo = engine.upload(96, 64, &input);
    let settings = serde_json::from_value::<DevelopSettings>(json!({
        "adjustmentLayers": [{ "id": "selected", "opacity": 1, "maskIds": [], "params": { "brightness": -0.001 } }]
    })).unwrap();
    let edit = PreparedEdit::from(&settings);
    let output = preview(
        &mut engine,
        &photo,
        &edit,
        PreviewCamera {
            inset: 1.0,
            ..Default::default()
        },
        (96, 64),
        PreviewFlags {
            clip: true,
            ..Default::default()
        },
    );
    let (rgba, _) = output.as_chunks::<4>();
    assert_eq!(rgba[16], [31, 97, 255, 255]);
    assert_eq!(rgba[48], [255, 51, 41, 255]);
    assert_eq!(rgba[80], [0, 0, 0, 255]);
    let export = engine.render_to_rgba8(&photo, &edit).unwrap();
    assert_eq!(export[80 * 4 + 3], 0);
}
