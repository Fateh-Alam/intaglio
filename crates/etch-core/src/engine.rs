//! The GPU side: one device, the develop pipeline, and photos uploaded once.
//! Draws into any texture: a window's surface or an offscreen image.

use std::collections::HashMap;
use std::sync::{Mutex, OnceLock};

use crate::creative::{self, CreativePipeline, PreparedCreative};
use crate::curves::TONE_CURVE_RESOLUTION;
use crate::lut::CubeLut;
use crate::masks::{MaskBlock, MAX_BRUSH_PARTS};
use crate::params::{DevelopParams, PreparedEdit};
use crate::post::{PostParams, PostStep};
use crate::preview::{PreviewComparison, PreviewStyle, PreviewTile};
use crate::source::{self, SourceRect};
use wgpu::util::DeviceExt;

mod grade_graph;

/// Working images between passes: half float, like the web renderer's.
const WORKING_FORMAT: wgpu::TextureFormat = wgpu::TextureFormat::Rgba16Float;
const CREATIVE_FORMAT: wgpu::TextureFormat = wgpu::TextureFormat::Rgba8Unorm;
type ImagePair = Option<((u32, u32), [wgpu::TextureView; 2])>;

fn draw(encoder: &mut wgpu::CommandEncoder, target: &wgpu::TextureView, clear: wgpu::Color, pipeline: &wgpu::RenderPipeline, groups: &[&wgpu::BindGroup]) {
    draw_images(encoder, &[(target, wgpu::LoadOp::Clear(clear))], pipeline, groups);
}

fn draw_images(encoder: &mut wgpu::CommandEncoder, images: &[(&wgpu::TextureView, wgpu::LoadOp<wgpu::Color>)], pipeline: &wgpu::RenderPipeline, groups: &[&wgpu::BindGroup]) {
    let attachments: [_; 2] = std::array::from_fn(|index| {
        images.get(index).map(|&(view, load)| wgpu::RenderPassColorAttachment {
            view,
            depth_slice: None,
            resolve_target: None,
            ops: wgpu::Operations { load, store: wgpu::StoreOp::Store },
        })
    });
    let mut pass = encoder.begin_render_pass(&wgpu::RenderPassDescriptor {
        label: Some("pass"),
        color_attachments: &attachments[..images.len()],
        ..Default::default()
    });
    pass.set_pipeline(pipeline);
    for (index, group) in groups.iter().enumerate() {
        pass.set_bind_group(index as u32, *group, &[]);
    }
    pass.draw(0..6, 0..1);
}

fn new_encoder(device: &wgpu::Device, label: &str) -> wgpu::CommandEncoder {
    device.create_command_encoder(&wgpu::CommandEncoderDescriptor { label: Some(label) })
}

#[derive(Default)]
struct RenderImages {
    working: ImagePair,
    glow: ImagePair,
    creative: ImagePair,
    grade_base: Option<((u32, u32), wgpu::TextureView)>,
}

/// A photo on the GPU. Uploaded once, developed many times.
pub struct Photo {
    view: wgpu::TextureView,
    large: Option<LargePhoto>,
    pub width: u32,
    pub height: u32,
}

struct LargePhoto {
    pixels: SourcePixels,
    proxy_size: (u32, u32),
    resident: Mutex<Option<(SourceRect, wgpu::TextureView)>>,
}

enum SourcePixels {
    Srgb(Vec<u8>),
    Linear(Vec<u16>),
}

struct CoverageTile {
    size: (u32, u32),
    format: wgpu::TextureFormat,
    texture: wgpu::Texture,
    view: wgpu::TextureView,
}
pub struct Engine {
    pub device: wgpu::Device,
    pub queue: wgpu::Queue,
    shader: wgpu::ShaderModule,
    layout: wgpu::BindGroupLayout,
    pipeline_layout: wgpu::PipelineLayout,
    pipelines: HashMap<(&'static str, wgpu::TextureFormat), wgpu::RenderPipeline>,
    sampler: wgpu::Sampler,
    mips: crate::mips::MipBuilder,
    linear_mips: OnceLock<crate::mips::MipBuilder>,
    curve_texture: wgpu::Texture,
    /// The table last uploaded to `curve_texture`, so unchanged curves cost nothing.
    curve_uploaded: Option<Vec<f32>>,
    lut_view: wgpu::TextureView,
    /// Size and domain of the loaded LUT; `None` when there is none.
    lut_info: Option<(usize, [f32; 3], [f32; 3])>,
    mask_layout: wgpu::BindGroupLayout,
    plate_layout: wgpu::PipelineLayout,
    plate_pipelines: HashMap<(&'static str, wgpu::TextureFormat), wgpu::RenderPipeline>,
    images: RenderImages,
    sample_images: RenderImages,
    /// Transparent 1×1 stand-in for brush slots a layer doesn't use.
    empty_brush: wgpu::TextureView,
    /// Rasterized brush masks, so unchanged strokes cost nothing per frame.
    brush_cache: Vec<(crate::masks::BrushParams, u32, wgpu::TextureView)>,
    /// The global passes (`film.wgsl` + `post.wgsl`).
    post_shader: wgpu::ShaderModule,
    post_layout: wgpu::BindGroupLayout,
    post_pipeline_layout: wgpu::PipelineLayout,
    post_pipelines: HashMap<(&'static str, wgpu::TextureFormat), wgpu::RenderPipeline>,
    creative: CreativePipeline,
    coverage: Option<CoverageTile>,
    mask_sample_tile: Option<PreviewTile>,
}

#[derive(Debug)]
pub struct EngineError(pub String);

impl std::fmt::Display for EngineError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(&self.0)
    }
}
impl std::error::Error for EngineError {}

/// Clip-space rectangle (left, bottom, right, top) that fits a `width`×`height`
/// photo inside `area` (x, y, w, h in target pixels, y down) without cropping.
pub fn fit_rect(width: u32, height: u32, area: [f32; 4], target: (u32, u32)) -> [f32; 4] {
    let [ax, ay, aw, ah] = area;
    let scale = (aw / width as f32).min(ah / height as f32);
    let (w, h) = (width as f32 * scale, height as f32 * scale);
    let (x, y) = (ax + (aw - w) / 2.0, ay + (ah - h) / 2.0);
    let (tw, th) = (target.0 as f32, target.1 as f32);
    [x / tw * 2.0 - 1.0, 1.0 - (y + h) / th * 2.0, (x + w) / tw * 2.0 - 1.0, 1.0 - y / th * 2.0]
}

impl Engine {
    /// Creates the engine on the best GPU. Pass the surface it will draw to, if any.
    pub async fn new(instance: &wgpu::Instance, surface: Option<&wgpu::Surface<'_>>) -> Result<Self, EngineError> {
        let adapter = instance
            .request_adapter(&wgpu::RequestAdapterOptions {
                power_preference: wgpu::PowerPreference::HighPerformance,
                compatible_surface: surface,
                force_fallback_adapter: false,
                ..Default::default()
            })
            .await
            .map_err(|error| EngineError(format!("No usable GPU: {error}")))?;
        let (device, queue) = adapter
            .request_device(&wgpu::DeviceDescriptor { label: Some("etch-core"), ..Default::default() })
            .await
            .map_err(|error| EngineError(format!("Could not open the GPU: {error}")))?;

        let shader = device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some("develop"),
            source: wgpu::ShaderSource::Wgsl(concat!(include_str!("display.wgsl"), "\n", include_str!("develop.wgsl")).into()),
        });
        let layout = device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
            label: Some("develop"),
            entries: &[
                wgpu::BindGroupLayoutEntry {
                    binding: 0,
                    visibility: wgpu::ShaderStages::VERTEX_FRAGMENT,
                    ty: wgpu::BindingType::Buffer { ty: wgpu::BufferBindingType::Uniform, has_dynamic_offset: false, min_binding_size: None },
                    count: None,
                },
                wgpu::BindGroupLayoutEntry {
                    binding: 1,
                    visibility: wgpu::ShaderStages::FRAGMENT,
                    ty: wgpu::BindingType::Texture {
                        sample_type: wgpu::TextureSampleType::Float { filterable: true },
                        view_dimension: wgpu::TextureViewDimension::D2,
                        multisampled: false,
                    },
                    count: None,
                },
                wgpu::BindGroupLayoutEntry {
                    binding: 2,
                    visibility: wgpu::ShaderStages::FRAGMENT,
                    ty: wgpu::BindingType::Sampler(wgpu::SamplerBindingType::Filtering),
                    count: None,
                },
                wgpu::BindGroupLayoutEntry {
                    binding: 3,
                    visibility: wgpu::ShaderStages::FRAGMENT,
                    ty: wgpu::BindingType::Texture {
                        sample_type: wgpu::TextureSampleType::Float { filterable: false },
                        view_dimension: wgpu::TextureViewDimension::D2,
                        multisampled: false,
                    },
                    count: None,
                },
                wgpu::BindGroupLayoutEntry {
                    binding: 4,
                    visibility: wgpu::ShaderStages::FRAGMENT,
                    ty: wgpu::BindingType::Texture {
                        sample_type: wgpu::TextureSampleType::Float { filterable: true },
                        view_dimension: wgpu::TextureViewDimension::D3,
                        multisampled: false,
                    },
                    count: None,
                },
            ],
        });
        let pipeline_layout = device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
            label: Some("develop"),
            bind_group_layouts: &[Some(&layout)],
            ..Default::default()
        });
        let sampler = device.create_sampler(&wgpu::SamplerDescriptor {
            label: Some("photo"),
            mag_filter: wgpu::FilterMode::Linear,
            min_filter: wgpu::FilterMode::Linear,
            mipmap_filter: wgpu::MipmapFilterMode::Linear,
            ..Default::default()
        });
        let mips = crate::mips::MipBuilder::new(&device, wgpu::TextureFormat::Rgba8UnormSrgb);
        let curve_texture = device.create_texture(&wgpu::TextureDescriptor {
            label: Some("tone curve"),
            size: wgpu::Extent3d { width: TONE_CURVE_RESOLUTION as u32, height: 1, depth_or_array_layers: 1 },
            mip_level_count: 1,
            sample_count: 1,
            dimension: wgpu::TextureDimension::D2,
            format: wgpu::TextureFormat::Rgba32Float,
            usage: wgpu::TextureUsages::TEXTURE_BINDING | wgpu::TextureUsages::COPY_DST,
            view_formats: &[],
        });
        let lut_view = Self::lut_texture(&device, &queue, &CubeLut { size: 2, values: vec![0.0; 24], domain_min: [0.0; 3], domain_max: [1.0; 3], title: None });
        let brush_entry = |binding: u32| wgpu::BindGroupLayoutEntry {
            binding,
            visibility: wgpu::ShaderStages::FRAGMENT,
            ty: wgpu::BindingType::Texture { sample_type: wgpu::TextureSampleType::Float { filterable: true }, view_dimension: wgpu::TextureViewDimension::D2, multisampled: false },
            count: None,
        };
        let mask_layout = device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
            label: Some("masks"),
            entries: &[
                wgpu::BindGroupLayoutEntry {
                    binding: 0,
                    visibility: wgpu::ShaderStages::FRAGMENT,
                    ty: wgpu::BindingType::Buffer { ty: wgpu::BufferBindingType::Uniform, has_dynamic_offset: false, min_binding_size: None },
                    count: None,
                },
                brush_entry(1),
                brush_entry(2),
                brush_entry(3),
                brush_entry(4),
            ],
        });
        let plate_layout = device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
            label: Some("plate"),
            bind_group_layouts: &[Some(&layout), Some(&mask_layout)],
            ..Default::default()
        });
        let empty_brush = device
            .create_texture_with_data(
                &queue,
                &wgpu::TextureDescriptor {
                    label: Some("no brush"),
                    size: wgpu::Extent3d { width: 1, height: 1, depth_or_array_layers: 1 },
                    mip_level_count: 1,
                    sample_count: 1,
                    dimension: wgpu::TextureDimension::D2,
                    format: wgpu::TextureFormat::Rgba8Unorm,
                    usage: wgpu::TextureUsages::TEXTURE_BINDING,
                    view_formats: &[],
                },
                wgpu::util::TextureDataOrder::LayerMajor,
                &[0, 0, 0, 0],
            )
            .create_view(&Default::default());
        let post_source = concat!(include_str!("film.wgsl"), "\n", include_str!("display.wgsl"), "\n", include_str!("post.wgsl"));
        let post_shader = device.create_shader_module(wgpu::ShaderModuleDescriptor { label: Some("post"), source: wgpu::ShaderSource::Wgsl(post_source.into()) });
        let image_entry = |binding: u32| wgpu::BindGroupLayoutEntry {
            binding,
            visibility: wgpu::ShaderStages::FRAGMENT,
            ty: wgpu::BindingType::Texture { sample_type: wgpu::TextureSampleType::Float { filterable: true }, view_dimension: wgpu::TextureViewDimension::D2, multisampled: false },
            count: None,
        };
        let post_layout = device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
            label: Some("post"),
            entries: &[
                wgpu::BindGroupLayoutEntry {
                    binding: 0,
                    visibility: wgpu::ShaderStages::VERTEX_FRAGMENT,
                    ty: wgpu::BindingType::Buffer { ty: wgpu::BufferBindingType::Uniform, has_dynamic_offset: false, min_binding_size: None },
                    count: None,
                },
                image_entry(1),
                image_entry(2),
                wgpu::BindGroupLayoutEntry {
                    binding: 3,
                    visibility: wgpu::ShaderStages::FRAGMENT,
                    ty: wgpu::BindingType::Sampler(wgpu::SamplerBindingType::Filtering),
                    count: None,
                },
            ],
        });
        let post_pipeline_layout = device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
            label: Some("post"),
            bind_group_layouts: &[Some(&post_layout)],
            ..Default::default()
        });
        Ok(Self {
            device,
            queue,
            shader,
            layout,
            pipeline_layout,
            pipelines: HashMap::new(),
            sampler,
            mips,
            linear_mips: OnceLock::new(),
            curve_texture,
            curve_uploaded: None,
            lut_view,
            lut_info: None,
            mask_layout,
            plate_layout,
            plate_pipelines: HashMap::new(),
            images: RenderImages::default(),
            sample_images: RenderImages::default(),
            empty_brush,
            brush_cache: Vec::new(),
            post_shader,
            post_layout,
            post_pipeline_layout,
            post_pipelines: HashMap::new(),
            creative: CreativePipeline::new(),
            coverage: None,
            mask_sample_tile: None,
        })
    }

    fn pipeline(&mut self, fragment: &'static str, format: wgpu::TextureFormat) -> &wgpu::RenderPipeline {
        let Self { device, shader, pipeline_layout, .. } = self;
        self.pipelines.entry((fragment, format)).or_insert_with(|| {
            device.create_render_pipeline(&wgpu::RenderPipelineDescriptor {
                label: Some(fragment),
                layout: Some(pipeline_layout),
                vertex: wgpu::VertexState { module: shader, entry_point: Some("vs_main"), buffers: &[], compilation_options: Default::default() },
                fragment: Some(wgpu::FragmentState {
                    module: shader,
                    entry_point: Some(fragment),
                    targets: &[Some(wgpu::ColorTargetState { format, blend: None, write_mask: wgpu::ColorWrites::ALL })],
                    compilation_options: Default::default(),
                }),
                primitive: wgpu::PrimitiveState::default(),
                depth_stencil: None,
                multisample: wgpu::MultisampleState::default(),
                multiview_mask: None,
                cache: None,
            })
        })
    }

    fn plate_pipeline(&mut self, entry: &'static str, format: wgpu::TextureFormat) -> wgpu::RenderPipeline {
        let Self { device, shader, plate_layout, .. } = self;
        self.plate_pipelines
            .entry((entry, format))
            .or_insert_with(|| {
                let primary = Some(wgpu::ColorTargetState { format, blend: None, write_mask: wgpu::ColorWrites::ALL });
                let coverage_format = match entry {
                    "fs_plate_with_coverage" => Some(wgpu::TextureFormat::R8Unorm),
                    "fs_plate_with_sample" => Some(WORKING_FORMAT),
                    _ => None,
                };
                let coverage = coverage_format.map(|format| wgpu::ColorTargetState {
                    format, blend: None, write_mask: wgpu::ColorWrites::ALL,
                });
                let both = coverage.is_some();
                let targets = [primary, coverage];
                device.create_render_pipeline(&wgpu::RenderPipelineDescriptor {
                    label: Some(entry),
                    layout: Some(plate_layout),
                    vertex: wgpu::VertexState { module: shader, entry_point: Some("vs_main"), buffers: &[], compilation_options: Default::default() },
                    fragment: Some(wgpu::FragmentState {
                        module: shader,
                        entry_point: Some(entry),
                        targets: &targets[..if both { 2 } else { 1 }],
                        compilation_options: Default::default(),
                    }),
                    primitive: wgpu::PrimitiveState::default(),
                    depth_stencil: None,
                    multisample: wgpu::MultisampleState::default(),
                    multiview_mask: None,
                    cache: None,
                })
            })
            .clone()
    }

    fn working_pair(device: &wgpu::Device, slot: &mut ImagePair, size: (u32, u32), format: wgpu::TextureFormat) -> [wgpu::TextureView; 2] {
        if slot.as_ref().is_none_or(|(existing, _)| *existing != size) {
            let make = || {
                device
                    .create_texture(&wgpu::TextureDescriptor {
                        label: Some("working image"),
                        size: wgpu::Extent3d { width: size.0, height: size.1, depth_or_array_layers: 1 },
                        mip_level_count: 1,
                        sample_count: 1,
                        dimension: wgpu::TextureDimension::D2,
                        format,
                        usage: wgpu::TextureUsages::RENDER_ATTACHMENT | wgpu::TextureUsages::TEXTURE_BINDING,
                        view_formats: &[],
                    })
                    .create_view(&Default::default())
            };
            *slot = Some((size, [make(), make()]));
        }
        slot.as_ref().unwrap().1.clone()
    }

    fn intermediate_views(&mut self, size: (u32, u32)) -> [wgpu::TextureView; 2] {
        Self::working_pair(&self.device, &mut self.images.working, size, WORKING_FORMAT)
    }

    fn glow_views(&mut self, size: (u32, u32)) -> [wgpu::TextureView; 2] {
        Self::working_pair(&self.device, &mut self.images.glow, size, WORKING_FORMAT)
    }

    fn post_pipeline(&mut self, entry: &'static str, format: wgpu::TextureFormat) -> wgpu::RenderPipeline {
        let Self { device, post_shader, post_pipeline_layout, .. } = self;
        self.post_pipelines
            .entry((entry, format))
            .or_insert_with(|| {
                device.create_render_pipeline(&wgpu::RenderPipelineDescriptor {
                    label: Some(entry),
                    layout: Some(post_pipeline_layout),
                    vertex: wgpu::VertexState { module: post_shader, entry_point: Some("vs_post"), buffers: &[], compilation_options: Default::default() },
                    fragment: Some(wgpu::FragmentState {
                        module: post_shader,
                        entry_point: Some(entry),
                        targets: &[Some(wgpu::ColorTargetState { format, blend: None, write_mask: wgpu::ColorWrites::ALL })],
                        compilation_options: Default::default(),
                    }),
                    primitive: wgpu::PrimitiveState::default(),
                    depth_stencil: None,
                    multisample: wgpu::MultisampleState::default(),
                    multiview_mask: None,
                    cache: None,
                })
            })
            .clone()
    }

    fn post_group(&self, params: &PostParams, image: &wgpu::TextureView, extra: Option<&wgpu::TextureView>) -> wgpu::BindGroup {
        self.image_group(bytemuck::bytes_of(params), image, extra)
    }

    fn image_group(&self, uniforms: &[u8], image: &wgpu::TextureView, extra: Option<&wgpu::TextureView>) -> wgpu::BindGroup {
        let buffer = self.device.create_buffer_init(&wgpu::util::BufferInitDescriptor { label: Some("image pass params"), contents: uniforms, usage: wgpu::BufferUsages::UNIFORM });
        self.device.create_bind_group(&wgpu::BindGroupDescriptor {
            label: Some("post"),
            layout: &self.post_layout,
            entries: &[
                wgpu::BindGroupEntry { binding: 0, resource: buffer.as_entire_binding() },
                wgpu::BindGroupEntry { binding: 1, resource: wgpu::BindingResource::TextureView(image) },
                wgpu::BindGroupEntry { binding: 2, resource: wgpu::BindingResource::TextureView(extra.unwrap_or(&self.empty_brush)) },
                wgpu::BindGroupEntry { binding: 3, resource: wgpu::BindingResource::Sampler(&self.sampler) },
            ],
        })
    }

    fn curve_view_for(&self, table: Option<&Vec<f32>>) -> wgpu::TextureView {
        let Some(table) = table else { return self.curve_texture.create_view(&Default::default()) };
        self.device
            .create_texture_with_data(
                &self.queue,
                &wgpu::TextureDescriptor {
                    label: Some("layer tone curve"),
                    size: wgpu::Extent3d { width: TONE_CURVE_RESOLUTION as u32, height: 1, depth_or_array_layers: 1 },
                    mip_level_count: 1,
                    sample_count: 1,
                    dimension: wgpu::TextureDimension::D2,
                    format: wgpu::TextureFormat::Rgba32Float,
                    usage: wgpu::TextureUsages::TEXTURE_BINDING,
                    view_formats: &[],
                },
                wgpu::util::TextureDataOrder::LayerMajor,
                bytemuck::cast_slice(table),
            )
            .create_view(&Default::default())
    }

    /// Uploads 8-bit sRGB RGBA pixels (row-major, no padding).
    pub fn upload(&self, width: u32, height: u32, rgba: &[u8]) -> Photo {
        if width.max(height) > self.device.limits().max_texture_dimension_2d || u64::from(width) * u64::from(height) > 32_000_000 {
            return self.upload_owned(width, height, rgba.to_vec());
        }
        Photo { view: self.upload_texture(width, height, rgba, false), large: None, width, height }
    }

    pub fn upload_owned(&self, width: u32, height: u32, rgba: Vec<u8>) -> Photo {
        let max = self.device.limits().max_texture_dimension_2d;
        if width.max(height) <= max && u64::from(width) * u64::from(height) <= 32_000_000 {
            return self.upload(width, height, &rgba);
        }
        let (w, h, proxy) = source::proxy(width, height, &rgba, max.min(3072));
        Photo {
            view: self.upload_texture(w, h, &proxy, false),
            large: Some(LargePhoto { pixels: SourcePixels::Srgb(rgba), proxy_size: (w, h), resident: Mutex::new(None) }),
            width,
            height,
        }
    }

    /// Uploads linear-light RGB16 in sRGB primaries, as produced by RAW development.
    pub fn upload_linear(&self, width: u32, height: u32, rgb: Vec<u16>) -> Photo {
        let max = self.device.limits().max_texture_dimension_2d;
        // Match the memory budget of the eight-bit source's full texture.
        if width.max(height) <= max && u64::from(width) * u64::from(height) <= 16_000_000 {
            return Photo { view: self.upload_linear_texture(width, height, &rgb), large: None, width, height };
        }
        let (w, h, proxy) = source::linear_proxy(width, height, &rgb, max.min(3072));
        Photo {
            view: self.upload_linear_texture(w, h, &proxy),
            large: Some(LargePhoto { pixels: SourcePixels::Linear(rgb), proxy_size: (w, h), resident: Mutex::new(None) }),
            width,
            height,
        }
    }

    fn upload_linear_texture(&self, width: u32, height: u32, rgb: &[u16]) -> wgpu::TextureView {
        static HALF_FLOAT: OnceLock<Vec<u16>> = OnceLock::new();
        let table = HALF_FLOAT.get_or_init(|| (0..=u16::MAX).map(|value| half::f16::from_f32(f32::from(value) / 65535.0).to_bits()).collect());
        let rgba: Vec<_> = rgb.as_chunks::<3>().0.iter().map(|[r, g, b]| [table[*r as usize], table[*g as usize], table[*b as usize], half::f16::ONE.to_bits()]).collect();
        self.upload_texture(width, height, bytemuck::cast_slice(&rgba), true)
    }

    fn upload_texture(&self, width: u32, height: u32, rgba: &[u8], linear: bool) -> wgpu::TextureView {
        let (format, bytes_per_pixel, mips) = if linear {
            let mips = self.linear_mips.get_or_init(|| crate::mips::MipBuilder::new(&self.device, WORKING_FORMAT));
            (WORKING_FORMAT, 8, mips)
        } else {
            (wgpu::TextureFormat::Rgba8UnormSrgb, 4, &self.mips)
        };
        let size = wgpu::Extent3d { width, height, depth_or_array_layers: 1 };
        let texture = self.device.create_texture(&wgpu::TextureDescriptor {
            label: Some("photo"),
            size,
            mip_level_count: crate::mips::level_count(width, height),
            sample_count: 1,
            dimension: wgpu::TextureDimension::D2,
            format,
            usage: wgpu::TextureUsages::TEXTURE_BINDING | wgpu::TextureUsages::COPY_DST | wgpu::TextureUsages::RENDER_ATTACHMENT,
            view_formats: &[],
        });
        self.queue.write_texture(
            wgpu::TexelCopyTextureInfo { texture: &texture, mip_level: 0, origin: wgpu::Origin3d::ZERO, aspect: wgpu::TextureAspect::All },
            rgba,
            wgpu::TexelCopyBufferLayout { offset: 0, bytes_per_row: Some(bytes_per_pixel * width), rows_per_image: Some(height) },
            size,
        );
        mips.build(&self.device, &self.queue, &texture);
        texture.create_view(&Default::default())
    }

    fn source_view(&self, photo: &Photo, params: &mut DevelopParams, working: (u32, u32)) -> wgpu::TextureView {
        let Some(large) = &photo.large else { return photo.view.clone() };
        let needed = source::needed_source(params, photo.width, photo.height);
        let max = self.device.limits().max_texture_dimension_2d;
        // Keep allocation bounded even when lens correction asks for an
        // unusually large footprint. Fit and analysis use the small proxy.
        let cap = max.min(4096);
        let proxy_coverage = (
            needed.width as f32 * large.proxy_size.0 as f32 / photo.width as f32,
            needed.height as f32 * large.proxy_size.1 as f32 / photo.height as f32,
        );
        if needed.width > cap || needed.height > cap
            || needed.width == 0 || needed.height == 0
            || (working.0 as f32 <= proxy_coverage.0 && working.1 as f32 <= proxy_coverage.1)
        {
            return photo.view.clone();
        }
        let mut resident = large.resident.lock().unwrap_or_else(std::sync::PoisonError::into_inner);
        if resident.as_ref().is_none_or(|(rect, _)| !rect.contains(needed)) {
            let rect = needed.padded(photo.width, photo.height, cap);
            let view = match &large.pixels {
                SourcePixels::Srgb(bytes) => {
                    let tile = rect.pixels::<_, 4>(bytes, photo.width);
                    self.upload_texture(rect.width, rect.height, &tile, false)
                }
                SourcePixels::Linear(rgb) => {
                    let tile = rect.pixels::<_, 3>(rgb, photo.width);
                    self.upload_linear_texture(rect.width, rect.height, &tile)
                }
            };
            *resident = Some((rect, view));
        }
        let (rect, view) = resident.as_ref().unwrap();
        params.source_window = rect.window(photo.width, photo.height);
        view.clone()
    }

    fn lut_texture(device: &wgpu::Device, queue: &wgpu::Queue, lut: &CubeLut) -> wgpu::TextureView {
        let size = lut.size as u32;
        let extent = wgpu::Extent3d { width: size, height: size, depth_or_array_layers: size };
        let texture = device.create_texture(&wgpu::TextureDescriptor {
            label: Some("creative LUT"),
            size: extent,
            mip_level_count: 1,
            sample_count: 1,
            dimension: wgpu::TextureDimension::D3,
            format: wgpu::TextureFormat::Rgba16Float,
            usage: wgpu::TextureUsages::TEXTURE_BINDING | wgpu::TextureUsages::COPY_DST,
            view_formats: &[],
        });
        queue.write_texture(
            wgpu::TexelCopyTextureInfo { texture: &texture, mip_level: 0, origin: wgpu::Origin3d::ZERO, aspect: wgpu::TextureAspect::All },
            bytemuck::cast_slice(&lut.half_texels()),
            wgpu::TexelCopyBufferLayout { offset: 0, bytes_per_row: Some(8 * size), rows_per_image: Some(size) },
            extent,
        );
        texture.create_view(&Default::default())
    }

    /// Sets (or clears) the creative LUT. Its strength comes from `DevelopSettings::lut_strength`.
    pub fn set_lut(&mut self, lut: Option<&CubeLut>) {
        match lut {
            Some(lut) => {
                self.lut_view = Self::lut_texture(&self.device, &self.queue, lut);
                self.lut_info = Some((lut.size, lut.domain_min, lut.domain_max));
            }
            None => self.lut_info = None,
        }
    }

    fn upload_curves(&mut self, table: Option<&Vec<f32>>) {
        // Straight curves are switched off in the shader, so the old table can stay.
        let Some(table) = table else { return };
        if self.curve_uploaded.as_ref() == Some(table) {
            return;
        }
        self.queue.write_texture(
            wgpu::TexelCopyTextureInfo { texture: &self.curve_texture, mip_level: 0, origin: wgpu::Origin3d::ZERO, aspect: wgpu::TextureAspect::All },
            bytemuck::cast_slice(table),
            wgpu::TexelCopyBufferLayout { offset: 0, bytes_per_row: Some(16 * TONE_CURVE_RESOLUTION as u32), rows_per_image: Some(1) },
            wgpu::Extent3d { width: TONE_CURVE_RESOLUTION as u32, height: 1, depth_or_array_layers: 1 },
        );
        self.curve_uploaded = Some(table.clone());
    }

    /// Registers the red channel of a top-down 40×56-per-glyph canvas atlas.
    /// Only the glyph mask crosses the bridge; the source photo stays on the GPU.
    pub fn set_creative_atlas(&mut self, ramp: String, pixels: &[u8]) -> Result<(), EngineError> {
        let count = ramp.chars().count();
        if !(1..=64).contains(&count) || pixels.len() != 40 * 56 * count {
            return Err(EngineError("Invalid Creative Effects glyph atlas.".into()));
        }
        let texture = creative::upload_pattern(&self.device, &self.queue, (40 * count as u32, 56), wgpu::TextureFormat::R8Unorm, pixels);
        self.creative.atlases.insert(ramp, texture);
        Ok(())
    }

    /// Releases glyph resources no longer used by the current document.
    pub fn retain_creative_atlases(&mut self, ramps: &[String]) {
        self.creative.atlases.retain(|ramp, _| ramps.contains(ramp));
    }

    /// Develops `photo` into `target` (an sRGB-format view of `target_size`
    /// pixels), filling the rest with `background`. The photo lands at
    /// `edit.params.rect`. Adjustment layers render through half-float images
    /// at the size the photo covers on the target, so their cost follows the
    /// screen, not the file.
    pub fn render(&mut self, photo: &Photo, edit: &PreparedEdit, target: &wgpu::TextureView, target_size: (u32, u32), format: wgpu::TextureFormat, background: wgpu::Color) -> Result<(), EngineError> {
        self.render_image(photo, edit, (target, format, background), target_size, None)
    }

    /// Draws only the visible region, with an optional preview-only mask tint.
    pub fn render_preview(&mut self, photo: &Photo, edit: &PreparedEdit, target: &wgpu::TextureView, format: wgpu::TextureFormat, background: wgpu::Color, preview: PreviewStyle<'_>) -> Result<(), EngineError> {
        self.render_image(photo, edit, (target, format, background), (1, 1), Some(preview))
    }

    fn render_image(&mut self, photo: &Photo, edit: &PreparedEdit, destination: (&wgpu::TextureView, wgpu::TextureFormat, wgpu::Color), target_size: (u32, u32), preview: Option<PreviewStyle<'_>>) -> Result<(), EngineError> {
        let (target, format, background) = destination;
        self.upload_curves(edit.curve_table.as_ref());
        let aspect = photo.width as f32 / photo.height.max(1) as f32;
        let mut params = edit.params;
        params.geometry2[2] = aspect;
        if let Some((size, min, max)) = self.lut_info {
            params.lut = [params.lut[0], size as f32, if params.lut[0] > 0.0 { 1.0 } else { 0.0 }, 0.0];
            params.lut_domain_min = [min[0], min[1], min[2], 0.0];
            params.lut_domain_max = [max[0], max[1], max[2], 0.0];
        }
        let full = [-1.0, -1.0, 1.0, 1.0];
        let [left, bottom, right, top] = params.rect;
        let working = if let Some(PreviewStyle { tile, .. }) = preview {
            self.mask_sample_tile = None;
            params.rect = tile.rect;
            params.output_window = tile.window();
            tile.working_size()
        } else {
            (
                ((right - left) / 2.0 * target_size.0 as f32).round().max(1.0) as u32,
                ((top - bottom) / 2.0 * target_size.1 as f32).round().max(1.0) as u32,
            )
        };
        let global_size = preview.map_or([working.0, working.1], |style| style.tile.full);
        let size = [global_size[0] as f32, global_size[1] as f32, 1.0 / global_size[0] as f32, 1.0 / global_size[1] as f32];
        let (effect_width, effect_height) = edit.output_size(photo.width, photo.height);
        let effect_size = [effect_width as f32, effect_height as f32, 0.0, 0.0];
        let custom = edit.grade_nodes.is_some();
        let mut leading = 0;
        if let Some(nodes) = &edit.grade_nodes {
            for node in nodes.iter().take(8) {
                let Some(code) = node.kind.color_code().filter(|_| node.opacity == 1.0 && node.shares_global_settings) else { break; };
                params.leading_grade[leading / 4][leading % 4] = code;
                leading += 1;
            }
        }
        let remaining = edit.grade_nodes.as_ref().map(|nodes| &nodes[leading..]);
        // With only a full-opacity plate stack left, keep the same fused
        // 1:1 display path even if the leading color nodes were rearranged.
        let inline_plates = remaining.is_none_or(|nodes| {
            matches!(nodes, [node] if node.kind == crate::params::GradeKind::PlateComposite && node.opacity == 1.0)
        });
        let mask_plate = preview.and_then(|style| style.mask_plate)
            .filter(|_| edit.grade_nodes.as_ref().is_none_or(|nodes| nodes.iter().any(|node| node.kind == crate::params::GradeKind::PlateComposite)))
            .filter(|mask| edit.plates.iter().any(|plate| plate.id == *mask));
        let picking = preview.is_some_and(|style| style.pick_mask_color);
        let steps: &[PostStep] = if custom { &[] } else { &edit.post.steps };
        let has_creative = !edit.creative.is_empty();
        let direct_preview = preview.filter(|style| {
            inline_plates && (0.999..=1.001).contains(&style.tile.detail) && !picking && steps.is_empty() && !has_creative
                && edit.plates.last().is_some_and(|plate| mask_plate.is_none_or(|mask| plate.id == mask))
        });
        let coverage = if direct_preview.is_none() && mask_plate.is_some() {
            Some(self.coverage_view(working, picking))
        } else {
            None
        };
        let display = format.is_srgb() || has_creative || preview.is_some() || custom;
        for ramp in edit.creative.iter().filter_map(|layer| layer.glyphs.as_ref()) {
            if !self.creative.atlases.contains_key(ramp) {
                return Err(EngineError("The Creative Effects glyph atlas is missing.".into()));
            }
        }
        // Downstream passes read a half-float image at the photo's working size.
        let intermediates = (display || !edit.plates.is_empty() || !steps.is_empty()).then(|| self.intermediate_views(working));

        let mut encoder = self.device.create_command_encoder(&wgpu::CommandEncoderDescriptor { label: Some("develop") });
        let transparent = wgpu::Color::TRANSPARENT;

        // Base pass: geometry and the photo's own edits.
        let source_view = self.source_view(photo, &mut params, working);
        let base_params = if intermediates.is_some() { DevelopParams { rect: full, ..params } } else { params };
        let (base_target, base_format, base_clear) = match &intermediates {
            Some(views) => (&views[0], WORKING_FORMAT, transparent),
            None => (target, format, background),
        };
        let curve_view = self.curve_texture.create_view(&Default::default());
        let group0 = self.develop_group(&base_params, &source_view, &curve_view);
        let entry = if leading > 0 { "fs_leading_grade" } else if custom { "fs_source" } else { "fs_main" };
        let pipeline = self.pipeline(entry, base_format).clone();
        draw(&mut encoder, base_target, base_clear, &pipeline, &[&group0]);

        if let Some(views) = &intermediates {
            // The image so far is in `views[current]`; the last pass of all
            // draws into the target at the photo's place.
            let mut current = 0;
            let passes = edit.plates.len() + steps.len();
            let mut done = 0;
            let output = |done: usize, current: usize| -> (wgpu::TextureView, wgpu::TextureFormat, wgpu::Color, [f32; 4]) {
                if !display && done + 1 == passes { (target.clone(), format, background, params.rect) } else { (views[1 - current].clone(), WORKING_FORMAT, transparent, full) }
            };

            if let Some(nodes) = remaining.filter(|_| !inline_plates) {
                current = self.draw_grade_graph(&mut encoder, edit, nodes, grade_graph::GradeDraw {
                    views, working, size, effect_size, window: params.output_window, aspect, coverage: coverage.as_ref(), mask_plate, picking,
                });
            } else {
                // Adjustment layers.
                for plate in &edit.plates {
                    let direct = direct_preview.filter(|_| done + 1 == passes);
                    let (out, out_format, clear, rect) = if direct.is_some() {
                        (target.clone(), format, background, params.rect)
                    } else {
                        output(done, current)
                    };
                    let mut plate_params = plate.edit.params;
                    plate_params.rect = rect;
                    plate_params.output_window = params.output_window;
                    let selected = mask_plate == Some(plate.id.as_str());
                    if direct.is_none() && plate.opacity == 0.0 && !selected && (display || done + 1 < passes) {
                        done += 1;
                        continue;
                    }
                    if let Some(style) = direct {
                        plate_params.viewport_visible = style.tile.visible;
                        plate_params.viewport_image = [size[0], size[1], style.tile.detail, f32::from(style.show_clipping)];
                        plate_params.viewport_background = [background.r as f32, background.g as f32, background.b as f32, f32::from(selected)];
                    }
                    let [group0, group1] = self.plate_groups(plate, &plate_params, &views[current], aspect);
                    if direct.is_some() {
                        let pipeline = self.plate_pipeline("fs_plate_preview", out_format);
                        draw(&mut encoder, &out, clear, &pipeline, &[&group0, &group1]);
                    } else if let Some(mask) = coverage.as_ref().filter(|_| selected) {
                        let entry = if picking { "fs_plate_with_sample" } else { "fs_plate_with_coverage" };
                        let pipeline = self.plate_pipeline(entry, out_format);
                        draw_images(&mut encoder, &[(&out, wgpu::LoadOp::Clear(clear)), (mask, wgpu::LoadOp::Clear(transparent))], &pipeline, &[&group0, &group1]);
                    } else {
                        let pipeline = self.plate_pipeline("fs_plate", out_format);
                        draw(&mut encoder, &out, clear, &pipeline, &[&group0, &group1]);
                    }
                    current = 1 - current;
                    done += 1;
                }

                // Global passes.
                for step in steps {
                    let (out, out_format, clear, rect) = output(done, current);
                    let base = PostParams { size, effect_size, rect, window: params.output_window, ..edit.post.params };
                    let image = &views[current];
                    self.draw_post_step(&mut encoder, step, base, image, working, (&out, out_format, clear));
                    current = 1 - current;
                    done += 1;
                }
            }
            if display && direct_preview.is_none() {
                let mut post = PostParams {
                    size, rect: if has_creative { full } else { params.rect }, window: params.output_window,
                    display: [if has_creative { 0.0 } else { 1.0 }, 0.0, 0.0, 0.0],
                    ..edit.post.params
                };
                if picking { post.display[3] = 1.0; }
                if let Some(style) = preview {
                    post.preview_background = [background.r as f32, background.g as f32, background.b as f32, f32::from(style.show_clipping)];
                }
                let group = self.post_group(&post, &views[current], None);
                if has_creative {
                    let pipeline = self.post_pipeline("fs_display_encoded", WORKING_FORMAT);
                    draw(&mut encoder, &views[1 - current], transparent, &pipeline, &[&group]);
                    let mut input = views[1 - current].clone();
                    let creative_views = Self::working_pair(&self.device, &mut self.images.creative, working, CREATIVE_FORMAT);
                    for (index, layer) in edit.creative.iter().enumerate() {
                        let pattern = if layer.raster() {
                            let raster = self.creative_raster(encoder, &input, &post, working, layer)?;
                            encoder = new_encoder(&self.device, "creative effects");
                            Some(raster)
                        } else {
                            layer.glyphs.as_ref().and_then(|ramp| self.creative.atlases.get(ramp)).cloned()
                        };
                        let uniforms = layer.uniforms(working, full);
                        let group = self.image_group(bytemuck::bytes_of(&uniforms), &input, pattern.as_ref());
                        let pipeline = self.creative.pipeline(&self.device, &self.post_pipeline_layout, layer, CREATIVE_FORMAT);
                        let output = &creative_views[index % 2];
                        draw(&mut encoder, output, transparent, pipeline, &[&group]);
                        input = output.clone();
                    }
                    post.rect = params.rect;
                    let entry = if preview.is_some() { "fs_preview_encoded" } else { "fs_present_srgb" };
                    let group = self.preview_group(post, &input, coverage.as_ref(), preview.map(|style| style.tile));
                    let pipeline = self.post_pipeline(entry, format);
                    draw(&mut encoder, target, background, &pipeline, &[&group]);
                } else {
                    let entry = if preview.is_some() { "fs_preview_linear" } else { "fs_display_srgb" };
                    let group = self.preview_group(post, &views[current], coverage.as_ref(), preview.map(|style| style.tile));
                    let pipeline = self.post_pipeline(entry, format);
                    draw(&mut encoder, target, background, &pipeline, &[&group]);
                }
            }

        }
        if let Some(style) = preview {
            if let Some(comparison) = style.comparison {
                self.draw_comparison(&mut encoder, destination, photo, edit.params, style.tile, comparison);
            }
        }
        self.queue.submit([encoder.finish()]);
        if picking && coverage.is_some() {
            self.mask_sample_tile = preview.map(|style| style.tile);
        }
        Ok(())
    }

    fn draw_post_step(&mut self, encoder: &mut wgpu::CommandEncoder, step: &PostStep, base: PostParams, image: &wgpu::TextureView, working: (u32, u32), (out, out_format, clear): (&wgpu::TextureView, wgpu::TextureFormat, wgpu::Color)) {
        let transparent = wgpu::Color::TRANSPARENT;
        let full = [-1.0, -1.0, 1.0, 1.0];
        let entry = match step {
            PostStep::Film => "fs_film",
            PostStep::Optical => "fs_optical",
            PostStep::Sharpen => "fs_sharpen",
            PostStep::Glow(glow) => {
                // Keep the blur in document pixels through Fit, zoom, and export.
                let (width, dx) = crate::post::glow_axis(base.effect_size[0], base.window[2], working.0, glow.radius);
                let (height, dy) = crate::post::glow_axis(base.effect_size[1], base.window[3], working.1, glow.radius);
                let glow_views = self.glow_views((width, height));
                let small_params = |blur: [f32; 4]| PostParams { threshold: [glow.threshold, glow.mode, 0.0, 0.0], blur, rect: full, ..base };
                let blur_size = [width as f32, height as f32];
                let stages: [(&str, &wgpu::TextureView, &wgpu::TextureView, [f32; 4]); 3] = [
                    ("fs_threshold", image, &glow_views[0], [0.0, 0.0, blur_size[0], blur_size[1]]),
                    ("fs_blur", &glow_views[0], &glow_views[1], [dx, 0.0, blur_size[0], blur_size[1]]),
                    ("fs_blur", &glow_views[1], &glow_views[0], [0.0, dy, blur_size[0], blur_size[1]]),
                ];
                for (stage, from, to, blur) in stages {
                    let group = self.post_group(&small_params(blur), from, None);
                    let pipeline = self.post_pipeline(stage, WORKING_FORMAT);
                    draw(encoder, to, transparent, &pipeline, &[&group]);
                }
                let group = self.post_group(&PostParams { composite: [glow.strength, glow.mode, 0.0, 0.0], ..base }, image, Some(&glow_views[0]));
                let pipeline = self.post_pipeline("fs_composite", out_format);
                draw(encoder, out, clear, &pipeline, &[&group]);
                return;
            }
        };
        let group = self.post_group(&base, image, None);
        let pipeline = self.post_pipeline(entry, out_format);
        draw(encoder, out, clear, &pipeline, &[&group]);
    }

    fn draw_comparison(
        &mut self,
        encoder: &mut wgpu::CommandEncoder,
        (target, format, background): (&wgpu::TextureView, wgpu::TextureFormat, wgpu::Color),
        original: &Photo,
        mut params: DevelopParams,
        tile: PreviewTile,
        comparison: PreviewComparison<'_>,
    ) {
        let mut window = tile.visible_window();
        let width = (comparison.split - window[0]).clamp(0.0, window[2]);
        if width <= 0.0 { return; }
        let mut rect = tile.rect;
        rect[2] = rect[0] + (rect[2] - rect[0]) * (width / window[2]);
        window[2] = width;

        let source = comparison.snapshot.unwrap_or(original);
        let [_, _, crop_width, crop_height] = params.crop;
        // Match ImagePlane: only crop-aligned originals use the edit's geometry.
        if comparison.snapshot.is_some() || (crop_width == 1.0 && crop_height == 1.0) {
            params.geometry2[3] = 0.0;
        }
        let [full_width, full_height] = tile.full.map(|edge| edge as f32);
        params.geometry2[2] = original.width as f32 / original.height as f32;
        params.rect = rect;
        params.output_window = window;
        params.viewport_background = [background.r as f32, background.g as f32, background.b as f32, 0.0];
        params.viewport_image = [full_width, full_height, tile.detail, 0.0];
        let working = ((window[2] * full_width).ceil() as u32, (window[3] * full_height).ceil() as u32);
        let view = self.source_view(source, &mut params, working);
        let group = self.develop_group(&params, &view, &self.curve_texture.create_view(&Default::default()));
        let pipeline = self.pipeline("fs_comparison", format);
        draw_images(encoder, &[(target, wgpu::LoadOp::Load)], pipeline, &[&group]);
    }

    fn coverage_view(&mut self, size: (u32, u32), picking: bool) -> wgpu::TextureView {
        let format = if picking { WORKING_FORMAT } else { wgpu::TextureFormat::R8Unorm };
        if self.coverage.as_ref().is_none_or(|tile| tile.size != size || tile.format != format) {
            let texture = self.device.create_texture(&wgpu::TextureDescriptor {
                label: Some("preview mask coverage"),
                size: wgpu::Extent3d { width: size.0, height: size.1, depth_or_array_layers: 1 },
                mip_level_count: 1,
                sample_count: 1,
                dimension: wgpu::TextureDimension::D2,
                format,
                usage: wgpu::TextureUsages::RENDER_ATTACHMENT | wgpu::TextureUsages::TEXTURE_BINDING | wgpu::TextureUsages::COPY_SRC,
                view_formats: &[],
            });
            let view = texture.create_view(&Default::default());
            self.coverage = Some(CoverageTile { size, format, texture, view });
        }
        self.coverage.as_ref().unwrap().view.clone()
    }

    /// Reads one linear RGB pixel of the image entering the selected mask.
    pub fn pick_mask_color(&self, x: f32, y: f32) -> Option<[f32; 3]> {
        let tile = self.mask_sample_tile?;
        let coverage = self.coverage.as_ref()?;
        let [left, top, width, height] = tile.window();
        let u = (x - left) / width;
        let v = (y - top) / height;
        if !(0.0..=1.0).contains(&u) || !(0.0..=1.0).contains(&v) {
            return None;
        }
        let buffer = self.device.create_buffer(&wgpu::BufferDescriptor {
            label: Some("mask picker pixel"),
            size: 8,
            usage: wgpu::BufferUsages::MAP_READ | wgpu::BufferUsages::COPY_DST,
            mapped_at_creation: false,
        });
        let mut encoder = new_encoder(&self.device, "mask picker");
        let origin = wgpu::Origin3d {
            x: ((u * tile.size[0] as f32) as u32).min(tile.size[0] - 1),
            y: ((v * tile.size[1] as f32) as u32).min(tile.size[1] - 1),
            z: 0,
        };
        encoder.copy_texture_to_buffer(
            wgpu::TexelCopyTextureInfo { texture: &coverage.texture, origin, mip_level: 0, aspect: wgpu::TextureAspect::All },
            wgpu::TexelCopyBufferInfo { buffer: &buffer, layout: wgpu::TexelCopyBufferLayout::default() },
            wgpu::Extent3d { width: 1, height: 1, depth_or_array_layers: 1 },
        );
        self.queue.submit([encoder.finish()]);
        let slice = buffer.slice(..);
        slice.map_async(wgpu::MapMode::Read, |_| {});
        self.device.poll(wgpu::PollType::wait_indefinitely()).ok()?;
        let data = slice.get_mapped_range().ok()?;
        Some(std::array::from_fn(|index| half::f16::from_le_bytes([data[2 * index], data[2 * index + 1]]).to_f32()))
    }

    fn preview_group(&self, mut post: PostParams, image: &wgpu::TextureView, coverage: Option<&wgpu::TextureView>, tile: Option<PreviewTile>) -> wgpu::BindGroup {
        if let Some(tile) = tile {
            post.visible = tile.visible;
            post.display[1] = if coverage.is_some() { 1.0 } else { 0.0 };
            post.display[2] = tile.detail;
        }
        self.post_group(&post, image, coverage)
    }

    fn creative_raster(&mut self, mut encoder: wgpu::CommandEncoder, input: &wgpu::TextureView, post: &PostParams, size: (u32, u32), layer: &PreparedCreative) -> Result<wgpu::TextureView, EngineError> {
        let grid = crate::creative_raster::grid_size(size, layer);
        let texture = self.device.create_texture(&wgpu::TextureDescriptor {
            label: Some("creative logical grid"),
            size: wgpu::Extent3d { width: grid.0, height: grid.1, depth_or_array_layers: 1 },
            mip_level_count: 1,
            sample_count: 1,
            dimension: wgpu::TextureDimension::D2,
            format: CREATIVE_FORMAT,
            usage: wgpu::TextureUsages::RENDER_ATTACHMENT | wgpu::TextureUsages::COPY_SRC,
            view_formats: &[],
        });
        let group = self.post_group(post, input, None);
        let pipeline = self.post_pipeline("fs_copy", CREATIVE_FORMAT);
        draw(&mut encoder, &texture.create_view(&Default::default()), wgpu::Color::TRANSPARENT, &pipeline, &[&group]);
        let mut pixels = self.read_rgba8(encoder, &texture, grid, true)?;
        crate::creative_raster::apply(&mut pixels, grid, layer);
        // Return to the GPU's top-first order after the CPU's GL-order pass.
        let row = 4 * grid.0 as usize;
        for y in 0..grid.1 as usize / 2 {
            let last = (grid.1 as usize - 1 - y) * row;
            let (head, tail) = pixels.split_at_mut(last);
            head[y * row..][..row].swap_with_slice(&mut tail[..row]);
        }
        Ok(creative::upload_pattern(&self.device, &self.queue, grid, CREATIVE_FORMAT, &pixels))
    }

    fn develop_group(&self, params: &DevelopParams, source: &wgpu::TextureView, curves: &wgpu::TextureView) -> wgpu::BindGroup {
        let buffer = self.device.create_buffer_init(&wgpu::util::BufferInitDescriptor { label: Some("develop params"), contents: bytemuck::bytes_of(params), usage: wgpu::BufferUsages::UNIFORM });
        self.device.create_bind_group(&wgpu::BindGroupDescriptor {
            label: Some("develop"),
            layout: &self.layout,
            entries: &[
                wgpu::BindGroupEntry { binding: 0, resource: buffer.as_entire_binding() },
                wgpu::BindGroupEntry { binding: 1, resource: wgpu::BindingResource::TextureView(source) },
                wgpu::BindGroupEntry { binding: 2, resource: wgpu::BindingResource::Sampler(&self.sampler) },
                wgpu::BindGroupEntry { binding: 3, resource: wgpu::BindingResource::TextureView(curves) },
                wgpu::BindGroupEntry { binding: 4, resource: wgpu::BindingResource::TextureView(&self.lut_view) },
            ],
        })
    }

    fn mask_group(&mut self, block: &MaskBlock, brushes: &[&crate::masks::BrushParams]) -> wgpu::BindGroup {
        let buffer = self.device.create_buffer_init(&wgpu::util::BufferInitDescriptor { label: Some("masks"), contents: bytemuck::bytes_of(block), usage: wgpu::BufferUsages::UNIFORM });
        let aspect = block.header[1];
        let brush_views: Vec<wgpu::TextureView> = (0..MAX_BRUSH_PARTS)
            .map(|slot| match brushes.get(slot) {
                Some(brush) => self.brush_view(brush, aspect),
                None => self.empty_brush.clone(),
            })
            .collect();
        self.device.create_bind_group(&wgpu::BindGroupDescriptor {
            label: Some("masks"),
            layout: &self.mask_layout,
            entries: &[
                wgpu::BindGroupEntry { binding: 0, resource: buffer.as_entire_binding() },
                wgpu::BindGroupEntry { binding: 1, resource: wgpu::BindingResource::TextureView(&brush_views[0]) },
                wgpu::BindGroupEntry { binding: 2, resource: wgpu::BindingResource::TextureView(&brush_views[1]) },
                wgpu::BindGroupEntry { binding: 3, resource: wgpu::BindingResource::TextureView(&brush_views[2]) },
                wgpu::BindGroupEntry { binding: 4, resource: wgpu::BindingResource::TextureView(&brush_views[3]) },
            ],
        })
    }

    /// Brush coverage for a photo of `aspect`, rasterized once per change.
    fn brush_view(&mut self, brush: &crate::masks::BrushParams, aspect: f32) -> wgpu::TextureView {
        let aspect_key = aspect.to_bits();
        if let Some((_, _, view)) = self.brush_cache.iter().find(|(cached, key, _)| cached == brush && *key == aspect_key) {
            return view.clone();
        }
        let (width, height, rgba) = crate::brush::rasterize(brush, aspect);
        let view = self
            .device
            .create_texture_with_data(
                &self.queue,
                &wgpu::TextureDescriptor {
                    label: Some("brush mask"),
                    size: wgpu::Extent3d { width, height, depth_or_array_layers: 1 },
                    mip_level_count: 1,
                    sample_count: 1,
                    dimension: wgpu::TextureDimension::D2,
                    format: wgpu::TextureFormat::Rgba8Unorm,
                    usage: wgpu::TextureUsages::TEXTURE_BINDING,
                    view_formats: &[],
                },
                wgpu::util::TextureDataOrder::LayerMajor,
                &rgba,
            )
            .create_view(&Default::default());
        // Keep the few most recent; a layer has at most four brush slots.
        if self.brush_cache.len() >= 8 {
            self.brush_cache.remove(0);
        }
        self.brush_cache.push((brush.clone(), aspect_key, view.clone()));
        view
    }

    /// Fills `target` with `background` (no photo yet).
    pub fn clear(&self, target: &wgpu::TextureView, background: wgpu::Color) {
        let mut encoder = self.device.create_command_encoder(&wgpu::CommandEncoderDescriptor { label: Some("clear") });
        encoder.begin_render_pass(&wgpu::RenderPassDescriptor {
            label: Some("clear"),
            color_attachments: &[Some(wgpu::RenderPassColorAttachment {
                view: target,
                depth_slice: None,
                resolve_target: None,
                ops: wgpu::Operations { load: wgpu::LoadOp::Clear(background), store: wgpu::StoreOp::Store },
            })],
            ..Default::default()
        });
        self.queue.submit([encoder.finish()]);
    }

    /// Develops `photo` at its own size and reads the 8-bit sRGB result back.
    pub fn render_to_rgba8(&mut self, photo: &Photo, edit: &PreparedEdit) -> Result<Vec<u8>, EngineError> {
        self.render_to_rgba8_sized(photo, edit, photo.width, photo.height)
    }

    /// Develops `photo` stretched to `width`×`height` and reads the 8-bit sRGB result back.
    pub fn render_to_rgba8_sized(&mut self, photo: &Photo, edit: &PreparedEdit, width: u32, height: u32) -> Result<Vec<u8>, EngineError> {
        let format = wgpu::TextureFormat::Rgba8UnormSrgb;
        let texture = self.device.create_texture(&wgpu::TextureDescriptor {
            label: Some("offscreen"),
            size: wgpu::Extent3d { width, height, depth_or_array_layers: 1 },
            mip_level_count: 1,
            sample_count: 1,
            dimension: wgpu::TextureDimension::D2,
            format,
            usage: wgpu::TextureUsages::RENDER_ATTACHMENT | wgpu::TextureUsages::COPY_SRC,
            view_formats: &[],
        });
        let full = PreparedEdit { params: DevelopParams { rect: [-1.0, -1.0, 1.0, 1.0], ..edit.params }, ..edit.clone() };
        self.render(photo, &full, &texture.create_view(&Default::default()), (width, height), format, wgpu::Color::BLACK)?;
        self.read_rgba8(new_encoder(&self.device, "export readback"), &texture, (width, height), false)
    }

    /// A small whole-photo sample for scopes. It has its own working textures
    /// so a readback does not evict the resident viewport tile.
    pub fn render_sample(&mut self, photo: &Photo, edit: &PreparedEdit, width: u32, height: u32) -> Result<Vec<u8>, EngineError> {
        std::mem::swap(&mut self.images, &mut self.sample_images);
        let result = self.render_to_rgba8_sized(photo, edit, width, height);
        std::mem::swap(&mut self.images, &mut self.sample_images);
        result
    }

    fn read_rgba8(&self, mut encoder: wgpu::CommandEncoder, texture: &wgpu::Texture, (width, height): (u32, u32), bottom_first: bool) -> Result<Vec<u8>, EngineError> {
        let padded_row = (4 * width).div_ceil(wgpu::COPY_BYTES_PER_ROW_ALIGNMENT) * wgpu::COPY_BYTES_PER_ROW_ALIGNMENT;
        let buffer = self.device.create_buffer(&wgpu::BufferDescriptor {
            label: Some("readback"),
            size: (padded_row * height) as u64,
            usage: wgpu::BufferUsages::COPY_DST | wgpu::BufferUsages::MAP_READ,
            mapped_at_creation: false,
        });
        encoder.copy_texture_to_buffer(
            wgpu::TexelCopyTextureInfo { texture, mip_level: 0, origin: wgpu::Origin3d::ZERO, aspect: wgpu::TextureAspect::All },
            wgpu::TexelCopyBufferInfo {
                buffer: &buffer,
                layout: wgpu::TexelCopyBufferLayout { offset: 0, bytes_per_row: Some(padded_row), rows_per_image: Some(height) },
            },
            wgpu::Extent3d { width, height, depth_or_array_layers: 1 },
        );
        self.queue.submit([encoder.finish()]);

        let slice = buffer.slice(..);
        slice.map_async(wgpu::MapMode::Read, |_| {});
        self.device.poll(wgpu::PollType::wait_indefinitely()).map_err(|error| EngineError(format!("GPU readback failed: {error}")))?;
        let data = slice.get_mapped_range().map_err(|error| EngineError(format!("GPU readback failed: {error}")))?;
        let mut pixels = Vec::with_capacity((4 * width * height) as usize);
        for index in 0..height {
            let y = if bottom_first { height - 1 - index } else { index };
            let start = (y * padded_row) as usize;
            pixels.extend_from_slice(&data[start..start + (4 * width) as usize]);
        }
        Ok(pixels)
    }
}


#[cfg(test)]
mod preview_tests;
