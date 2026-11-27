//! Native viewport spike (roadmap §10, phase D2).
//!
//! A Metal-backed `NSView` sits *under* the webview inside wry's container
//! view. The webview draws nothing where the page is transparent, so the
//! photo `etch-core` renders shows through, while the React panels stay on
//! top and keep handling input. Pixels never cross the bridge: the page sends
//! settings and the rectangle the photo should fill.
//!
//! Drawing happens on a dedicated render thread. Commands only post messages,
//! so a slider never waits for the GPU or for macOS to hand out a drawable;
//! the thread folds everything that arrived since the last frame into one.

use std::sync::{mpsc, Mutex};
use std::time::Instant;

use etch_core::{fit_rect, plan_preview, wgpu, CubeLut, CurvePoints, DevelopSettings, Engine, Photo, PreparedEdit, PreviewCamera, PreviewComparison, PreviewStyle};
use image::ImageDecoder;
use objc2::rc::Retained;
use objc2::{MainThreadMarker, MainThreadOnly};
use objc2_app_kit::{NSAutoresizingMaskOptions, NSView, NSWindowOrderingMode};
use objc2_quartz_core::CAMetalLayer;
use serde::{Deserialize, Serialize};
use tauri::ipc::{InvokeBody, Request, Response};
use tauri::{Manager, State, WebviewWindow};

/// Matches the editor's surround (#14130f), in linear light for the sRGB surface.
const BACKGROUND: wgpu::Color = wgpu::Color { r: 0.0070, g: 0.0065, b: 0.0048, a: 1.0 };

#[derive(Default)]
pub struct NativeViewport(Mutex<Option<Handle>>);

/// The open viewport, as seen from commands: a mailbox to its render thread.
struct Handle {
    mailbox: mpsc::Sender<Message>,
    info: OpenInfo,
    /// The NSView, so `close` can remove it (only touched on the main thread).
    view: usize,
}

enum Message {
    Update {
        settings: Option<Box<DevelopSettings>>,
        glyph_atlases: Option<Vec<GlyphAtlas>>,
        area: Option<[f32; 4]>,
        preview: Option<EditorPreview>,
        sent: Instant,
        reply: Option<tauri::async_runtime::Sender<Result<FrameTiming, String>>>,
    },
    Load { width: u32, height: u32, rgba: Vec<u8>, reply: mpsc::Sender<()> },
    LoadLinear { chunk: LinearChunk, reply: mpsc::Sender<Result<(), String>> },
    SetComparison { width: u32, height: u32, rgba: Vec<u8> },
    Resize { width: u32, height: u32, scale: f32 },
    SetLut(Option<Box<CubeLut>>),
    Sample(mpsc::Sender<Result<Vec<u8>, String>>),
    Snapshot(mpsc::Sender<Result<Vec<u8>, String>>),
    PickMask { x: f32, y: f32, reply: mpsc::Sender<Option<[f32; 3]>> },
    Close { reply: mpsc::Sender<()> },
}

struct Viewport {
    engine: Engine,
    surface: wgpu::Surface<'static>,
    config: wgpu::SurfaceConfiguration,
    photo: Option<Photo>,
    linear_upload: Option<LinearUpload>,
    comparison: Option<Photo>,
    /// The current edit, prepared once per settings change (curve table included).
    edit: PreparedEdit,
    curves: CurvePoints,
    /// Photo area in CSS pixels: x, y, width, height.
    area: [f32; 4],
    scale: f32,
    preview: Option<EditorPreview>,
    offscreen: Option<(wgpu::Texture, (u32, u32))>,
    frames: u64,
}

/// Chunks keep the WKWebView binary message and its temporary copies bounded.
const LINEAR_CHUNK_BYTES: usize = 8 * 1024 * 1024;

struct LinearChunk {
    size: [u32; 2],
    offset: usize,
    rgb: Vec<u16>,
}

impl LinearChunk {
    fn read(bytes: &[u8]) -> Result<Self, String> {
        let (header, rgb) = bytes.split_at_checked(12).ok_or("Missing RAW chunk dimensions.")?;
        let [width, height, offset] = std::array::from_fn(|index| u32::from_le_bytes(header[index * 4..index * 4 + 4].try_into().unwrap()));
        let pixel_count = u64::from(width) * u64::from(height);
        let (codes, remainder) = rgb.as_chunks::<2>();
        if !remainder.is_empty() || !(1..=160_000_000).contains(&pixel_count)
            || rgb.is_empty() || rgb.len() > LINEAR_CHUNK_BYTES
            || u64::from(offset) + codes.len() as u64 > pixel_count * 3
        {
            return Err("Invalid RAW dimensions or chunk length.".into());
        }
        Ok(Self { size: [width, height], offset: offset as usize, rgb: codes.iter().copied().map(u16::from_le_bytes).collect() })
    }
}

struct LinearUpload {
    size: [u32; 2],
    rgb: Vec<u16>,
}

impl LinearUpload {
    fn append(pending: &mut Option<Self>, chunk: LinearChunk) -> Result<Option<Self>, String> {
        let total = chunk.size[0] as usize * chunk.size[1] as usize * 3;
        if chunk.offset == 0 {
            let mut rgb = Vec::new();
            rgb.try_reserve_exact(total).map_err(|_| "Could not allocate the RAW image.".to_string())?;
            *pending = Some(Self { size: chunk.size, rgb });
        }
        let upload = pending.as_mut().filter(|upload| upload.size == chunk.size && upload.rgb.len() == chunk.offset)
            .ok_or("The RAW chunks were incomplete or out of order.")?;
        upload.rgb.extend(chunk.rgb);
        Ok((upload.rgb.len() == total).then(|| pending.take().unwrap()))
    }
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EditorPreview {
    camera: PreviewCamera,
    mask_plate: Option<String>,
    #[serde(default)]
    pick_mask_color: bool,
    #[serde(default)]
    show_clipping: bool,
    comparison_split: Option<f32>,
    surround: [u8; 3],
}

impl EditorPreview {
    fn background(&self) -> wgpu::Color {
        let linear = |channel: u8| {
            let srgb = f64::from(channel) / 255.0;
            if srgb <= 0.04045 { srgb / 12.92 } else { ((srgb + 0.055) / 1.055).powf(2.4) }
        };
        let [r, g, b] = self.surround.map(linear);
        wgpu::Color { r, g, b, a: 1.0 }
    }

    fn valid(&self) -> bool {
        let camera = self.camera;
        [camera.zoom, camera.cx, camera.cy, camera.inset, camera.fit_pixel_ratio].into_iter().all(f32::is_finite)
            && self.comparison_split.is_none_or(|split| (0.0..=1.0).contains(&split))
    }
}

#[derive(Deserialize)]
pub struct GlyphAtlas {
    ramp: String,
    pixels: Vec<u8>,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct OpenInfo {
    gpu: String,
    backend: String,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct FrameTiming {
    /// Which frame this was; inputs folded into one frame share it.
    frame: u64,
    /// From this input reaching Rust to its frame being done.
    latency_ms: f64,
    /// CPU time to encode and submit the frame.
    submit_ms: f64,
    drawable_ms: f64,
    /// Time until the GPU finished, when measured.
    gpu_done_ms: Option<f64>,
    /// False when the window was hidden and the frame was drawn offscreen.
    presented: bool,
    preview_detail: f32,
}

fn run_on_main<T: Send + 'static>(window: &WebviewWindow, task: impl FnOnce(MainThreadMarker) -> T + Send + 'static) -> Result<T, String> {
    let (send, receive) = std::sync::mpsc::channel();
    window
        .run_on_main_thread(move || {
            let marker = MainThreadMarker::new().expect("on the main thread");
            let _ = send.send(task(marker));
        })
        .map_err(|error| error.to_string())?;
    receive.recv().map_err(|error| error.to_string())
}

/// Creates the Metal view under the webview. Returns (CAMetalLayer, NSView) pointers.
fn insert_metal_view(window: &WebviewWindow) -> Result<(usize, usize), String> {
    let parent = window.ns_view().map_err(|error| error.to_string())? as usize;
    let scale = window.scale_factor().map_err(|error| error.to_string())?;
    run_on_main(window, move |marker| {
        // SAFETY: `ns_view` is the window's content view (wry's container), alive for the window's lifetime.
        let parent: &NSView = unsafe { &*(parent as *const NSView) };
        let view = NSView::initWithFrame(NSView::alloc(marker), parent.bounds());
        let layer = CAMetalLayer::new();
        layer.setContentsScale(scale);
        layer.setOpaque(true);
        view.setLayer(Some(&layer));
        view.setWantsLayer(true);
        view.setAutoresizingMask(NSAutoresizingMaskOptions::ViewWidthSizable | NSAutoresizingMaskOptions::ViewHeightSizable);
        // Below every sibling, so the webview stays on top and keeps all input.
        parent.addSubview_positioned_relativeTo(&view, NSWindowOrderingMode::Below, None);
        let layer_ptr = Retained::as_ptr(&layer) as usize;
        let view_ptr = Retained::into_raw(view) as usize; // released in `remove_view`
        (layer_ptr, view_ptr)
    })
}

fn remove_view(window: &WebviewWindow, view: usize) {
    let _ = run_on_main(window, move |_| {
        // SAFETY: `view` came from `Retained::into_raw` in `insert_metal_view` and is released exactly once.
        let view = unsafe { Retained::from_raw(view as *mut NSView) }.expect("view pointer");
        view.removeFromSuperview();
    });
}

impl Viewport {
    /// Same size and format as the window's drawable, for frames macOS won't show.
    fn offscreen_view(&mut self) -> wgpu::TextureView {
        let size = (self.config.width, self.config.height);
        if self.offscreen.as_ref().is_none_or(|(_, existing)| *existing != size) {
            let texture = self.engine.device.create_texture(&wgpu::TextureDescriptor {
                label: Some("hidden-window frame"),
                size: wgpu::Extent3d { width: size.0, height: size.1, depth_or_array_layers: 1 },
                mip_level_count: 1,
                sample_count: 1,
                dimension: wgpu::TextureDimension::D2,
                format: self.config.format,
                usage: wgpu::TextureUsages::RENDER_ATTACHMENT,
                view_formats: &[],
            });
            self.offscreen = Some((texture, size));
        }
        self.offscreen.as_ref().unwrap().0.create_view(&Default::default())
    }

    /// Draws a frame. When the window is hidden (another Space, minimized,
    /// covered), macOS hands out no drawable; the frame is still developed,
    /// offscreen, so timings stay honest and `presented` says it wasn't shown.
    fn render(&mut self, wait_for_gpu: bool, oldest_input: Instant) -> Result<FrameTiming, String> {
        let started = Instant::now();
        self.frames += 1;
        let frame = match self.surface.get_current_texture() {
            wgpu::CurrentSurfaceTexture::Success(frame) | wgpu::CurrentSurfaceTexture::Suboptimal(frame) => Some(frame),
            wgpu::CurrentSurfaceTexture::Outdated | wgpu::CurrentSurfaceTexture::Lost => {
                self.surface.configure(&self.engine.device, &self.config);
                None
            }
            wgpu::CurrentSurfaceTexture::Validation => return Err("The GPU rejected the frame.".into()),
            _ => None, // Occluded or Timeout
        };
        let drawable_ms = started.elapsed().as_secs_f64() * 1000.0;
        let view = match &frame {
            Some(frame) => frame.texture.create_view(&Default::default()),
            None => self.offscreen_view(),
        };
        let mut preview_detail = 0.0;
        if let Some(photo) = &self.photo {
            let target = (self.config.width, self.config.height);
            let area = self.area.map(|value| value * self.scale);
            let dimensions = self.edit.output_size(photo.width, photo.height);
            if let Some(preview) = &self.preview {
                let max_edge = self.engine.device.limits().max_texture_dimension_2d;
                if let Some(tile) = plan_preview(dimensions, area, target, preview.camera, max_edge, self.edit.preview_effects()) {
                    preview_detail = tile.detail_scale();
                    self.engine.render_preview(photo, &self.edit, &view, self.config.format, preview.background(), PreviewStyle {
                        tile,
                        mask_plate: preview.mask_plate.as_deref(),
                        pick_mask_color: preview.pick_mask_color,
                        show_clipping: preview.show_clipping,
                        comparison: preview.comparison_split.map(|split| PreviewComparison { split, snapshot: self.comparison.as_ref() }),
                    })
                        .map_err(|error| error.to_string())?;
                } else {
                    self.engine.clear(&view, preview.background());
                }
            } else {
                self.edit.params.rect = fit_rect(dimensions.0, dimensions.1, area, target);
                self.engine.render(photo, &self.edit, &view, target, self.config.format, BACKGROUND)
                    .map_err(|error| error.to_string())?;
            }
        } else {
            self.engine.clear(&view, BACKGROUND);
        }
        let presented = frame.is_some();
        if let Some(frame) = frame {
            self.engine.queue.present(frame);
        }
        let submit_ms = started.elapsed().as_secs_f64() * 1000.0;
        let gpu_done_ms = if wait_for_gpu {
            self.engine.device.poll(wgpu::PollType::wait_indefinitely()).map_err(|error| error.to_string())?;
            Some(started.elapsed().as_secs_f64() * 1000.0)
        } else {
            None
        };
        let latency_ms = oldest_input.elapsed().as_secs_f64() * 1000.0;
        Ok(FrameTiming { frame: self.frames, latency_ms, submit_ms, drawable_ms, gpu_done_ms, presented, preview_detail })
    }

    /// Renders the whole edit without transient viewport overlays.
    fn sample(&mut self, max_edge: f32, enlarge: bool) -> Result<Vec<u8>, String> {
        let photo = self.photo.as_ref().ok_or("No photo is open.")?;
        let (width, height) = self.edit.output_size(photo.width, photo.height);
        let scale = max_edge / width.max(height) as f32;
        let scale = if enlarge { scale } else { scale.min(1.0) };
        let width = (width as f32 * scale).round().max(1.0) as u32;
        let height = (height as f32 * scale).round().max(1.0) as u32;
        let mut data = self.engine.render_sample(photo, &self.edit, width, height).map_err(|error| error.to_string())?;
        data.extend_from_slice(&width.to_le_bytes());
        data.extend_from_slice(&height.to_le_bytes());
        Ok(data)
    }

    fn resize(&mut self, width: u32, height: u32) {
        if width == 0 || height == 0 {
            return;
        }
        self.config.width = width;
        self.config.height = height;
        self.surface.configure(&self.engine.device, &self.config);
    }
}

impl NativeViewport {
    /// A panic elsewhere must not take the viewport down for good.
    fn lock(&self) -> std::sync::MutexGuard<'_, Option<Handle>> {
        self.0.lock().unwrap_or_else(std::sync::PoisonError::into_inner)
    }

    fn send(&self, message: Message) -> Result<(), String> {
        let guard = self.lock();
        let handle = guard.as_ref().ok_or("The native viewport isn't open.")?;
        handle.mailbox.send(message).map_err(|_| "The native viewport stopped.".to_string())
    }
}

/// Waits for the render thread's answer without blocking the async runtime.
async fn answer<T: Send + 'static>(reply: mpsc::Receiver<T>) -> Result<T, String> {
    tauri::async_runtime::spawn_blocking(move || reply.recv())
        .await
        .map_err(|error| error.to_string())?
        .map_err(|_| "The native viewport stopped.".to_string())
}

/// The render thread: waits for messages, folds every message that is waiting
/// into one frame, draws it, and answers whoever asked to measure it.
fn run(mut viewport: Viewport, mailbox: mpsc::Receiver<Message>) {
    while let Ok(first) = mailbox.recv() {
        let mut dirty = false;
        let mut oldest_input = Instant::now();
        let mut measured = Vec::new();
        let mut loaded: Vec<mpsc::Sender<()>> = Vec::new();
        let mut samples = Vec::new();
        let mut snapshots = Vec::new();
        let mut picks = Vec::new();
        for message in std::iter::once(first).chain(mailbox.try_iter()) {
            match message {
                Message::Update { settings, glyph_atlases, area, preview, sent, reply } => {
                    if let Some(atlases) = glyph_atlases {
                        let ramps: Vec<_> = atlases.iter().map(|atlas| atlas.ramp.clone()).collect();
                        viewport.engine.retain_creative_atlases(&ramps);
                        for atlas in atlases {
                            if let Err(error) = viewport.engine.set_creative_atlas(atlas.ramp, &atlas.pixels) {
                                eprintln!("Etch native viewport: {error}");
                            }
                        }
                    }
                    if let Some(settings) = settings {
                        viewport.edit.update(&settings, &mut viewport.curves);
                    }
                    if let Some(area) = area {
                        viewport.area = area;
                    }
                    if preview.is_some() {
                        viewport.preview = preview;
                    }
                    oldest_input = oldest_input.min(sent);
                    measured.extend(reply.map(|reply| (reply, sent)));
                    dirty = true;
                }
                Message::Load { width, height, rgba, reply } => {
                    viewport.photo = Some(viewport.engine.upload_owned(width, height, rgba));
                    viewport.linear_upload = None;
                    viewport.comparison = None;
                    loaded.push(reply);
                    dirty = true;
                }
                Message::LoadLinear { chunk, reply } => {
                    let appended = LinearUpload::append(&mut viewport.linear_upload, chunk).map(|complete| {
                        if let Some(LinearUpload { size: [width, height], rgb }) = complete {
                            viewport.photo = Some(viewport.engine.upload_linear(width, height, rgb));
                            viewport.comparison = None;
                            dirty = true;
                        }
                    });
                    let _ = reply.send(appended);
                }
                Message::SetComparison { width, height, rgba } => {
                    viewport.comparison = (!rgba.is_empty()).then(|| viewport.engine.upload_owned(width, height, rgba));
                }
                Message::Sample(reply) => samples.push(reply),
                Message::Snapshot(reply) => snapshots.push(reply),
                Message::PickMask { x, y, reply } => picks.push((x, y, reply)),
                Message::SetLut(lut) => {
                    viewport.engine.set_lut(lut.as_deref());
                    dirty = true;
                }
                Message::Resize { width, height, scale } => {
                    viewport.scale = scale;
                    viewport.resize(width, height);
                    dirty = true;
                }
                Message::Close { reply } => {
                    drop(viewport); // the surface goes before the layer it draws to
                    let _ = reply.send(());
                    return;
                }
            }
        }
        if dirty {
            match viewport.render(!measured.is_empty(), oldest_input) {
                Ok(timing) => {
                    for (reply, sent) in measured {
                        let latency_ms = sent.elapsed().as_secs_f64() * 1000.0;
                        let _ = reply.try_send(Ok(FrameTiming { latency_ms, ..timing.clone() }));
                    }
                }
                Err(error) => {
                    eprintln!("Etch native viewport: {error}");
                    for (reply, _) in measured {
                        let _ = reply.try_send(Err(error.clone()));
                    }
                }
            }
        }
        for reply in loaded {
            let _ = reply.send(());
        }
        for (x, y, reply) in picks {
            let _ = reply.send(viewport.engine.pick_mask_color(x, y));
        }
        if !samples.is_empty() {
            let sample = viewport.sample(192.0, true);
            for reply in samples {
                let _ = reply.send(sample.clone());
            }
        }
        if let Some(last) = snapshots.pop() {
            let snapshot = viewport.sample(2048.0, false);
            for reply in snapshots {
                let _ = reply.send(snapshot.clone());
            }
            let _ = last.send(snapshot);
        }
    }
}

async fn create_viewport(window: &WebviewWindow, layer: usize) -> Result<Viewport, String> {
    let mut descriptor = wgpu::InstanceDescriptor::new_without_display_handle();
    descriptor.backends = wgpu::Backends::METAL;
    let instance = wgpu::Instance::new(descriptor);
    // SAFETY: the layer is owned by the view we just inserted, which outlives the surface (see `viewport_close`).
    let surface = unsafe { instance.create_surface_unsafe(wgpu::SurfaceTargetUnsafe::CoreAnimationLayer(layer as *mut _)) }.map_err(|error| error.to_string())?;
    let engine = Engine::new(&instance, Some(&surface)).await.map_err(|error| error.to_string())?;
    let size = window.inner_size().map_err(|error| error.to_string())?;
    let scale = window.scale_factor().map_err(|error| error.to_string())? as f32;
    let config = wgpu::SurfaceConfiguration {
        usage: wgpu::TextureUsages::RENDER_ATTACHMENT,
        format: wgpu::TextureFormat::Bgra8UnormSrgb,
        color_space: wgpu::SurfaceColorSpace::Auto,
        width: size.width.max(1),
        height: size.height.max(1),
        // The editor composites one frame at a time. Avoid waiting for the
        // display refresh before acquiring its next drawable where supported.
        present_mode: wgpu::PresentMode::AutoNoVsync,
        desired_maximum_frame_latency: 2,
        alpha_mode: wgpu::CompositeAlphaMode::Opaque,
        view_formats: vec![],
    };
    surface.configure(&engine.device, &config);
    let mut viewport = Viewport { engine, surface, config, photo: None, linear_upload: None, comparison: None, edit: PreparedEdit::from(&DevelopSettings::default()), curves: CurvePoints::default(), area: [0.0; 4], scale, preview: None, offscreen: None, frames: 0 };
    viewport.render(false, Instant::now())?;
    Ok(viewport)
}

#[tauri::command]
pub async fn viewport_open(window: WebviewWindow, state: State<'_, NativeViewport>) -> Result<OpenInfo, String> {
    if let Some(handle) = state.lock().as_ref() {
        return Ok(handle.info.clone());
    }
    let (layer, view) = insert_metal_view(&window)?;
    let viewport = match create_viewport(&window, layer).await {
        Ok(viewport) => viewport,
        Err(error) => {
            remove_view(&window, view);
            return Err(error);
        }
    };
    let adapter = viewport.engine.device.adapter_info();
    let info = OpenInfo { gpu: adapter.name, backend: format!("{:?}", adapter.backend) };
    let (mailbox, inbox) = mpsc::channel();
    std::thread::Builder::new().name("etch-viewport".into()).spawn(move || run(viewport, inbox)).map_err(|error| error.to_string())?;
    *state.lock() = Some(Handle { mailbox, info: info.clone(), view });
    Ok(info)
}

fn decode_photo(bytes: &[u8]) -> Result<image::RgbaImage, String> {
    let mut decoder = image::ImageReader::new(std::io::Cursor::new(bytes))
        .with_guessed_format().map_err(|error| error.to_string())?
        .into_decoder().map_err(|error| format!("Could not read the photo: {error}"))?;
    let profile = decoder.icc_profile().map_err(|error| error.to_string())?;
    let orientation = decoder.orientation().map_err(|error| error.to_string())?;
    let mut decoded = image::DynamicImage::from_decoder(decoder).map_err(|error| error.to_string())?;
    if decoded.color().bits_per_pixel() / u16::from(decoded.color().channel_count()) > 8 {
        return Err("The photo needs a higher-precision source decoder.".into());
    }
    decoded.apply_orientation(orientation);
    let rgba = decoded.into_rgba8();
    let Some(profile) = profile else { return Ok(rgba) };
    let (width, height) = rgba.dimensions();
    let rgba = etch_core::color::import_profiled_rgba(rgba.into_raw(), &profile)
        .map_err(|error| format!("Could not convert the embedded ICC profile: {error}"))?;
    image::RgbaImage::from_raw(width, height, rgba).ok_or("Invalid color-managed image size.".into())
}

/// Loads a JPEG or PNG (raw request body) as the viewport's photo.
#[tauri::command]
pub async fn viewport_load(state: State<'_, NativeViewport>, request: Request<'_>) -> Result<[u32; 2], String> {
    let InvokeBody::Raw(bytes) = request.body() else { return Err("Expected image bytes.".into()) };
    let bytes = bytes.to_vec();
    let rgba = tauri::async_runtime::spawn_blocking(move || decode_photo(&bytes)).await
        .map_err(|error| error.to_string())??;
    let (width, height) = rgba.dimensions();
    let (reply, done) = mpsc::channel();
    state.send(Message::Load { width, height, rgba: rgba.into_raw(), reply })?;
    answer(done).await?;
    Ok([width, height])
}

/// Receives an already-developed linear RGB16 RAW photo in row-major order.
#[tauri::command]
pub async fn viewport_load_linear(state: State<'_, NativeViewport>, request: Request<'_>) -> Result<(), String> {
    let InvokeBody::Raw(bytes) = request.body() else { return Err("Expected RAW pixels.".into()) };
    let chunk = LinearChunk::read(bytes)?;
    let (reply, done) = mpsc::channel();
    state.send(Message::LoadLinear { chunk, reply })?;
    answer(done).await?
}

/// Uploads decoded sRGB snapshot pixels. An empty body restores the original.
#[tauri::command]
pub async fn viewport_set_comparison(state: State<'_, NativeViewport>, request: Request<'_>) -> Result<(), String> {
    let InvokeBody::Raw(bytes) = request.body() else { return Err("Expected comparison pixels.".into()) };
    if bytes.is_empty() {
        return state.send(Message::SetComparison { width: 0, height: 0, rgba: Vec::new() });
    }
    let (header, rgba) = bytes.split_at_checked(8).ok_or("Missing comparison dimensions.")?;
    let width = u32::from_le_bytes(header[..4].try_into().unwrap());
    let height = u32::from_le_bytes(header[4..].try_into().unwrap());
    if !(1..=4096).contains(&width) || !(1..=4096).contains(&height) || rgba.len() != (width * height * 4) as usize {
        return Err("Invalid comparison dimensions or pixels.".into());
    }
    state.send(Message::SetComparison { width, height, rgba: rgba.to_vec() })
}

/// Posts new settings and/or a new photo area. Returns at once, unless
/// `measure` is set: then it waits for the frame and reports its timing.
#[tauri::command]
pub async fn viewport_update(
    state: State<'_, NativeViewport>,
    settings: Option<DevelopSettings>,
    glyph_atlases: Option<Vec<GlyphAtlas>>,
    area: Option<[f32; 4]>,
    preview: Option<EditorPreview>,
    measure: Option<bool>,
) -> Result<Option<FrameTiming>, String> {
    if glyph_atlases.as_ref().is_some_and(|atlases| atlases.iter().any(|atlas| {
        let count = atlas.ramp.chars().count();
        !(1..=64).contains(&count) || atlas.pixels.len() != 40 * 56 * count
    })) {
        return Err("Invalid Creative Effects glyph atlas.".into());
    }
    if preview.as_ref().is_some_and(|preview| !preview.valid()) || area.is_some_and(|area| area.iter().any(|value| !value.is_finite())) {
        return Err("Invalid viewport geometry.".into());
    }
    let sent = Instant::now();
    if measure.unwrap_or(false) {
        let (reply, mut timing) = tauri::async_runtime::channel(1);
        state.send(Message::Update { settings: settings.map(Box::new), glyph_atlases, area, preview, sent, reply: Some(reply) })?;
        return timing.recv().await.ok_or("The native viewport stopped.")?.map(Some);
    }
    state.send(Message::Update { settings: settings.map(Box::new), glyph_atlases, area, preview, sent, reply: None })?;
    Ok(None)
}

#[tauri::command]
pub async fn viewport_sample(state: State<'_, NativeViewport>) -> Result<Response, String> {
    let (reply, done) = mpsc::channel();
    state.send(Message::Sample(reply))?;
    Ok(Response::new(answer(done).await??))
}

#[tauri::command]
pub async fn viewport_capture_snapshot(state: State<'_, NativeViewport>) -> Result<Response, String> {
    let (reply, done) = mpsc::channel();
    state.send(Message::Snapshot(reply))?;
    Ok(Response::new(answer(done).await??))
}

#[tauri::command]
pub async fn viewport_pick_mask_color(state: State<'_, NativeViewport>, x: f32, y: f32) -> Result<Option<[f32; 3]>, String> {
    let (reply, done) = mpsc::channel();
    state.send(Message::PickMask { x, y, reply })?;
    answer(done).await
}

/// Sets the creative LUT from a .cube file's text, or clears it with `None`.
/// How strongly it applies comes with the settings (`lutStrength`).
#[tauri::command]
pub async fn viewport_set_lut(state: State<'_, NativeViewport>, cube: Option<String>) -> Result<(), String> {
    let lut = match cube {
        Some(text) => Some(Box::new(CubeLut::parse(&text).ok_or("That .cube file isn't a valid 3D LUT.")?)),
        None => None,
    };
    state.send(Message::SetLut(lut))
}

#[tauri::command]
pub async fn viewport_close(window: WebviewWindow, state: State<'_, NativeViewport>) -> Result<(), String> {
    let closed = state.lock().take();
    if let Some(handle) = closed {
        let (reply, done) = mpsc::channel();
        if handle.mailbox.send(Message::Close { reply }).is_ok() {
            let _ = answer(done).await;
        }
        remove_view(&window, handle.view);
    }
    Ok(())
}

/// Lets the developer test page write measurements to the app's log.
#[tauri::command]
pub fn viewport_log(message: String) {
    eprintln!("Etch native viewport: {message}");
}

/// Keeps the drawable in step with the window size.
pub fn on_resize(window: &tauri::Window, width: u32, height: u32) {
    let Some(state) = window.try_state::<NativeViewport>() else { return };
    let scale = window.scale_factor().unwrap_or(1.0) as f32;
    let _ = state.send(Message::Resize { width, height, scale });
}

#[cfg(test)]
mod tests {
    use super::{LinearChunk, LinearUpload};

    fn packet(width: u32, height: u32, offset: u32, pixels: &[u16]) -> Vec<u8> {
        let header = [width, height, offset].into_iter().flat_map(u32::to_le_bytes);
        header.chain(pixels.iter().copied().flat_map(u16::to_le_bytes)).collect()
    }

    #[test]
    fn raw_upload_is_atomic_ordered_and_keeps_all_sixteen_bits() {
        let mut pending = None;
        let first = LinearChunk::read(&packet(2, 1, 0, &[1, 500, 65535])).unwrap();
        assert!(LinearUpload::append(&mut pending, first).unwrap().is_none());
        let wrong_offset = LinearChunk::read(&packet(2, 1, 4, &[7, 12])).unwrap();
        assert!(LinearUpload::append(&mut pending, wrong_offset).is_err());
        let second = LinearChunk::read(&packet(2, 1, 3, &[4, 127, 256])).unwrap();
        let completed = LinearUpload::append(&mut pending, second).unwrap().unwrap();
        assert_eq!(completed.size, [2, 1]);
        assert_eq!(completed.rgb, [1, 500, 65535, 4, 127, 256]);
        assert!(pending.is_none());
        assert!(LinearChunk::read(&packet(1, 1, 2, &[0, 1024])).is_err());
    }
}
