//! The GPU side: one device, the develop pipeline, and photos uploaded once.
//! Draws into any texture: a window's surface or an offscreen image.

use std::collections::HashMap;

use crate::params::DevelopParams;

/// A photo on the GPU. Uploaded once, developed many times.
pub struct Photo {
    view: wgpu::TextureView,
    pub width: u32,
    pub height: u32,
}

pub struct Engine {
    pub device: wgpu::Device,
    pub queue: wgpu::Queue,
    shader: wgpu::ShaderModule,
    layout: wgpu::BindGroupLayout,
    pipeline_layout: wgpu::PipelineLayout,
    pipelines: HashMap<wgpu::TextureFormat, wgpu::RenderPipeline>,
    sampler: wgpu::Sampler,
    params: wgpu::Buffer,
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
            source: wgpu::ShaderSource::Wgsl(include_str!("develop.wgsl").into()),
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
        let params = device.create_buffer(&wgpu::BufferDescriptor {
            label: Some("develop params"),
            size: std::mem::size_of::<DevelopParams>() as u64,
            usage: wgpu::BufferUsages::UNIFORM | wgpu::BufferUsages::COPY_DST,
            mapped_at_creation: false,
        });
        Ok(Self { device, queue, shader, layout, pipeline_layout, pipelines: HashMap::new(), sampler, params })
    }

    fn pipeline(&mut self, format: wgpu::TextureFormat) -> &wgpu::RenderPipeline {
        let Self { device, shader, pipeline_layout, .. } = self;
        self.pipelines.entry(format).or_insert_with(|| {
            device.create_render_pipeline(&wgpu::RenderPipelineDescriptor {
                label: Some("develop"),
                layout: Some(pipeline_layout),
                vertex: wgpu::VertexState { module: shader, entry_point: Some("vs_main"), buffers: &[], compilation_options: Default::default() },
                fragment: Some(wgpu::FragmentState {
                    module: shader,
                    entry_point: Some("fs_main"),
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

    /// Uploads 8-bit sRGB RGBA pixels (row-major, no padding).
    pub fn upload(&self, width: u32, height: u32, rgba: &[u8]) -> Photo {
        let size = wgpu::Extent3d { width, height, depth_or_array_layers: 1 };
        let texture = self.device.create_texture(&wgpu::TextureDescriptor {
            label: Some("photo"),
            size,
            mip_level_count: 1,
            sample_count: 1,
            dimension: wgpu::TextureDimension::D2,
            format: wgpu::TextureFormat::Rgba8UnormSrgb,
            usage: wgpu::TextureUsages::TEXTURE_BINDING | wgpu::TextureUsages::COPY_DST,
            view_formats: &[],
        });
        self.queue.write_texture(
            wgpu::TexelCopyTextureInfo { texture: &texture, mip_level: 0, origin: wgpu::Origin3d::ZERO, aspect: wgpu::TextureAspect::All },
            rgba,
            wgpu::TexelCopyBufferLayout { offset: 0, bytes_per_row: Some(4 * width), rows_per_image: Some(height) },
            size,
        );
        Photo { view: texture.create_view(&Default::default()), width, height }
    }

    /// Develops `photo` into `target` (an sRGB-format view), filling the rest with `background`.
    pub fn render(&mut self, photo: &Photo, params: &DevelopParams, target: &wgpu::TextureView, format: wgpu::TextureFormat, background: wgpu::Color) {
        self.queue.write_buffer(&self.params, 0, bytemuck::bytes_of(params));
        let bind_group = self.device.create_bind_group(&wgpu::BindGroupDescriptor {
            label: Some("develop"),
            layout: &self.layout,
            entries: &[
                wgpu::BindGroupEntry { binding: 0, resource: self.params.as_entire_binding() },
                wgpu::BindGroupEntry { binding: 1, resource: wgpu::BindingResource::TextureView(&photo.view) },
                wgpu::BindGroupEntry { binding: 2, resource: wgpu::BindingResource::Sampler(&self.sampler) },
            ],
        });
        let pipeline = self.pipeline(format).clone();
        let mut encoder = self.device.create_command_encoder(&wgpu::CommandEncoderDescriptor { label: Some("develop") });
        {
            let mut pass = encoder.begin_render_pass(&wgpu::RenderPassDescriptor {
                label: Some("develop"),
                color_attachments: &[Some(wgpu::RenderPassColorAttachment {
                    view: target,
                    depth_slice: None,
                    resolve_target: None,
                    ops: wgpu::Operations { load: wgpu::LoadOp::Clear(background), store: wgpu::StoreOp::Store },
                })],
                ..Default::default()
            });
            pass.set_pipeline(&pipeline);
            pass.set_bind_group(0, &bind_group, &[]);
            pass.draw(0..6, 0..1);
        }
        self.queue.submit([encoder.finish()]);
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
    pub fn render_to_rgba8(&mut self, photo: &Photo, params: &DevelopParams) -> Result<Vec<u8>, EngineError> {
        let (width, height) = (photo.width, photo.height);
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
        let full = DevelopParams { rect: [-1.0, -1.0, 1.0, 1.0], ..*params };
        self.render(photo, &full, &texture.create_view(&Default::default()), format, wgpu::Color::BLACK);

        let padded_row = (4 * width).div_ceil(wgpu::COPY_BYTES_PER_ROW_ALIGNMENT) * wgpu::COPY_BYTES_PER_ROW_ALIGNMENT;
        let buffer = self.device.create_buffer(&wgpu::BufferDescriptor {
            label: Some("readback"),
            size: (padded_row * height) as u64,
            usage: wgpu::BufferUsages::COPY_DST | wgpu::BufferUsages::MAP_READ,
            mapped_at_creation: false,
        });
        let mut encoder = self.device.create_command_encoder(&Default::default());
        encoder.copy_texture_to_buffer(
            wgpu::TexelCopyTextureInfo { texture: &texture, mip_level: 0, origin: wgpu::Origin3d::ZERO, aspect: wgpu::TextureAspect::All },
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
        for row in data.chunks(padded_row as usize) {
            pixels.extend_from_slice(&row[..(4 * width) as usize]);
        }
        Ok(pixels)
    }
}
