//! The web catalog supplies defaults and shaders. Native code supplies the
//! ordered render passes and the textures those shaders read.
use std::collections::HashMap;
use std::sync::OnceLock;

use bytemuck::{Pod, Zeroable};
use serde::Deserialize;
use wgpu::util::DeviceExt;

#[derive(Debug, Clone, Default, Deserialize, PartialEq)]
#[serde(default, rename_all = "camelCase")]
pub struct CreativeLayer {
    pub effect: String,
    enabled: Option<bool>,
    opacity: Option<f64>,
    size: Option<f64>,
    detail: Option<f64>,
    angle: Option<f64>,
    phase: Option<f64>,
    shadow: Option<String>,
    light: Option<String>,
    glyphs: Option<String>,
    invert: Option<bool>,
    dither: Option<String>,
    palette: Option<String>,
    custom_palette: Option<Vec<String>>,
}

#[derive(Deserialize)]
struct Catalog {
    effects: Vec<(String, CreativeLayer)>,
    palettes: HashMap<String, Vec<String>>,
}

fn catalog() -> &'static Catalog {
    static CATALOG: OnceLock<Catalog> = OnceLock::new();
    CATALOG.get_or_init(|| {
        serde_json::from_str(include_str!("creative.generated.json"))
            .expect("generated creative catalog")
    })
}

fn rgb(value: &str) -> Option<[u8; 3]> {
    let hex = value.strip_prefix('#')?;
    if hex.len() != 6 || !hex.bytes().all(|byte| byte.is_ascii_hexdigit()) {
        return None;
    }
    let packed = u32::from_str_radix(hex, 16).ok()?;
    Some([(packed >> 16) as u8, (packed >> 8) as u8, packed as u8])
}

#[derive(Debug, Clone, PartialEq)]
pub struct PreparedCreative {
    pub(crate) index: usize,
    pub(crate) effect: String,
    pub(crate) opacity: f64,
    pub(crate) size: f64,
    pub(crate) detail: f64,
    pub(crate) angle: f64,
    pub(crate) phase: f64,
    shadow: [u8; 3],
    light: [u8; 3],
    pub(crate) glyphs: Option<String>,
    pub(crate) invert: bool,
    pub(crate) dither: String,
    pub(crate) palette: String,
    pub(crate) colors: Vec<[u8; 3]>,
}

impl PreparedCreative {
    pub(crate) fn from_layer(layer: &CreativeLayer) -> Option<Self> {
        let catalog = catalog();
        let (index, (_, defaults)) = catalog
            .effects
            .iter()
            .enumerate()
            .find(|(_, (id, _))| *id == layer.effect)?;
        let number = |value: Option<f64>, fallback: Option<f64>, min: f64, max: f64| {
            value
                .filter(|v| v.is_finite())
                .or(fallback)
                .expect("generated default")
                .clamp(min, max)
        };
        let opacity = number(layer.opacity, defaults.opacity, 0.0, 1.0);
        if layer.enabled == Some(false) || opacity == 0.0 {
            return None;
        }
        let color = |value: &Option<String>, fallback: &Option<String>| {
            value
                .as_deref()
                .and_then(rgb)
                .or_else(|| fallback.as_deref().and_then(rgb))
                .expect("generated color")
        };
        let palette = layer
            .palette
            .as_deref()
            .filter(|id| catalog.palettes.contains_key(*id))
            .unwrap_or("mono");
        let mut colors: Vec<_> = catalog.palettes[palette]
            .iter()
            .filter_map(|color| rgb(color))
            .collect();
        if palette == "custom" {
            if let Some(custom) = &layer.custom_palette {
                let values: Vec<_> = custom
                    .iter()
                    .filter_map(|color| rgb(color))
                    .take(16)
                    .collect();
                if values.len() >= 2 {
                    colors = values;
                }
            }
        }
        let glyphs = defaults
            .glyphs
            .as_deref()
            .filter(|ramp| !ramp.is_empty())
            .map(|ramp| {
                let value: String = layer
                    .glyphs
                    .as_deref()
                    .unwrap_or(ramp)
                    .chars()
                    .take(64)
                    .collect();
                if value.is_empty() {
                    String::from(" ")
                } else {
                    value
                }
            });
        Some(Self {
            index,
            effect: layer.effect.clone(),
            opacity,
            size: number(layer.size, defaults.size, 1.0, 120.0),
            detail: number(layer.detail, defaults.detail, 0.0, 1.0),
            angle: number(layer.angle, defaults.angle, -180.0, 180.0),
            phase: number(layer.phase, defaults.phase, 0.0, 1.0),
            shadow: color(&layer.shadow, &defaults.shadow),
            light: color(&layer.light, &defaults.light),
            glyphs,
            invert: layer.invert.unwrap_or(false),
            dither: layer
                .dither
                .as_deref()
                .filter(|id| crate::creative_raster::known_method(id))
                .unwrap_or("bayer8")
                .into(),
            palette: palette.into(),
            colors,
        })
    }

    pub(crate) fn raster(&self) -> bool {
        matches!(self.effect.as_str(), "dither" | "pixel-sort")
    }

    pub(crate) fn uniforms(&self, size: (u32, u32), rect: [f32; 4]) -> CreativeParams {
        let normalized = |rgb: [u8; 3]| {
            [
                rgb[0] as f32 / 255.0,
                rgb[1] as f32 / 255.0,
                rgb[2] as f32 / 255.0,
                0.0,
            ]
        };
        CreativeParams {
            rect,
            size_opacity: [
                size.0 as f32,
                size.1 as f32,
                self.opacity as f32,
                self.glyphs.as_ref().map_or(1, |ramp| ramp.chars().count()) as f32,
            ],
            controls: [
                self.size as f32,
                self.detail as f32,
                self.angle.to_radians() as f32,
                self.phase as f32,
            ],
            shadow: normalized(self.shadow),
            light: normalized(self.light),
            mode: [0, u32::from(self.invert), u32::from(self.raster()), 0],
        }
    }
}

#[repr(C)]
#[derive(Clone, Copy, Pod, Zeroable)]
pub(crate) struct CreativeParams {
    rect: [f32; 4],
    size_opacity: [f32; 4],
    controls: [f32; 4],
    shadow: [f32; 4],
    light: [f32; 4],
    mode: [u32; 4],
}

pub(crate) struct CreativePipeline {
    programs: HashMap<(usize, wgpu::TextureFormat), wgpu::RenderPipeline>,
    pub(crate) atlases: HashMap<String, wgpu::TextureView>,
}

impl CreativePipeline {
    pub(crate) fn new() -> Self {
        Self {
            programs: HashMap::new(),
            atlases: HashMap::new(),
        }
    }

    pub(crate) fn pipeline(
        &mut self,
        device: &wgpu::Device,
        layout: &wgpu::PipelineLayout,
        layer: &PreparedCreative,
        format: wgpu::TextureFormat,
    ) -> &wgpu::RenderPipeline {
        self.programs
            .entry((layer.index, format))
            .or_insert_with(|| {
                let mut shaders =
                    include_str!("creative.generated.wgsl").split("\n// Effect function\n");
                let common = shaders.next().expect("generated common shader");
                let effect = shaders.nth(layer.index).expect("generated effect shader");
                let call = format!("etchEffect{}()", layer.index);
                let common = common.replacen("etchEffect0()", &call, 1);
                let source = format!(
                    "{common}\n{effect}\n{}",
                    include_str!("creative_vertex.wgsl")
                );
                let shader = device.create_shader_module(wgpu::ShaderModuleDescriptor {
                    label: Some(&layer.effect),
                    source: wgpu::ShaderSource::Wgsl(source.into()),
                });

                device.create_render_pipeline(&wgpu::RenderPipelineDescriptor {
                    label: Some(&layer.effect),
                    layout: Some(layout),
                    vertex: wgpu::VertexState {
                        module: &shader,
                        entry_point: Some("vs_creative"),
                        buffers: &[],
                        compilation_options: Default::default(),
                    },
                    fragment: Some(wgpu::FragmentState {
                        module: &shader,
                        entry_point: Some("main"),
                        targets: &[Some(wgpu::ColorTargetState {
                            format,
                            blend: None,
                            write_mask: wgpu::ColorWrites::ALL,
                        })],
                        compilation_options: Default::default(),
                    }),
                    primitive: Default::default(),
                    depth_stencil: None,
                    multisample: Default::default(),
                    multiview_mask: None,
                    cache: None,
                })
            })
    }
}

pub(crate) fn upload_pattern(
    device: &wgpu::Device,
    queue: &wgpu::Queue,
    size: (u32, u32),
    format: wgpu::TextureFormat,
    bytes: &[u8],
) -> wgpu::TextureView {
    device
        .create_texture_with_data(
            queue,
            &wgpu::TextureDescriptor {
                label: Some("creative effect pattern"),
                size: wgpu::Extent3d {
                    width: size.0,
                    height: size.1,
                    depth_or_array_layers: 1,
                },
                mip_level_count: 1,
                sample_count: 1,
                dimension: wgpu::TextureDimension::D2,
                format,
                usage: wgpu::TextureUsages::TEXTURE_BINDING,
                view_formats: &[],
            },
            wgpu::util::TextureDataOrder::LayerMajor,
            bytes,
        )
        .create_view(&Default::default())
}
