//! Native viewport spike (roadmap §10, phase D2).
//!
//! A Metal-backed `NSView` sits *under* the webview inside wry's container
//! view. The webview draws nothing where the page is transparent, so the
//! photo `etch-core` renders shows through, while the React panels stay on
//! top and keep handling input. Pixels never cross the bridge: the page sends
//! settings and the rectangle the photo should fill.

use std::sync::Mutex;
use std::time::Instant;

use etch_core::{fit_rect, wgpu, DevelopParams, DevelopSettings, Engine, Photo};
use objc2::rc::Retained;
use objc2::{MainThreadMarker, MainThreadOnly};
use objc2_app_kit::{NSAutoresizingMaskOptions, NSView, NSWindowOrderingMode};
use objc2_quartz_core::CAMetalLayer;
use serde::Serialize;
use tauri::ipc::{InvokeBody, Request};
use tauri::{Manager, State, WebviewWindow};

/// Matches the editor's surround (#14130f), in linear light for the sRGB surface.
const BACKGROUND: wgpu::Color = wgpu::Color { r: 0.0070, g: 0.0065, b: 0.0048, a: 1.0 };

#[derive(Default)]
pub struct NativeViewport(Mutex<Option<Viewport>>);

struct Viewport {
    engine: Engine,
    surface: wgpu::Surface<'static>,
    config: wgpu::SurfaceConfiguration,
    photo: Option<Photo>,
    settings: DevelopSettings,
    /// Photo area in CSS pixels: x, y, width, height.
    area: [f32; 4],
    scale: f32,
    /// The NSView, kept so `close` can remove it (only touched on the main thread).
    view: usize,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OpenInfo {
    gpu: String,
    backend: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FrameTiming {
    /// CPU time to encode and submit the frame.
    submit_ms: f64,
    /// Time until the GPU finished, when measured.
    gpu_done_ms: Option<f64>,
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
    fn render(&mut self, wait_for_gpu: bool) -> Result<FrameTiming, String> {
        let started = Instant::now();
        let frame = match self.surface.get_current_texture() {
            wgpu::CurrentSurfaceTexture::Success(frame) | wgpu::CurrentSurfaceTexture::Suboptimal(frame) => frame,
            other => {
                self.surface.configure(&self.engine.device, &self.config);
                return Err(format!("Surface not ready: {other:?}"));
            }
        };
        let view = frame.texture.create_view(&Default::default());
        if let Some(photo) = &self.photo {
            let target = (self.config.width, self.config.height);
            let area = self.area.map(|value| value * self.scale);
            let params = DevelopParams { rect: fit_rect(photo.width, photo.height, area, target), ..DevelopParams::from(&self.settings) };
            self.engine.render(photo, &params, &view, self.config.format, BACKGROUND);
        } else {
            self.engine.clear(&view, BACKGROUND);
        }
        let submit_ms = started.elapsed().as_secs_f64() * 1000.0;
        let gpu_done_ms = if wait_for_gpu {
            let _ = self.engine.device.poll(wgpu::PollType::wait_indefinitely());
            Some(started.elapsed().as_secs_f64() * 1000.0)
        } else {
            None
        };
        self.engine.queue.present(frame);
        Ok(FrameTiming { submit_ms, gpu_done_ms })
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

#[tauri::command]
pub async fn viewport_open(window: WebviewWindow, state: State<'_, NativeViewport>) -> Result<OpenInfo, String> {
    let mut guard = state.0.lock().unwrap();
    if guard.is_none() {
        let (layer, view) = insert_metal_view(&window)?;
        let mut descriptor = wgpu::InstanceDescriptor::new_without_display_handle();
        descriptor.backends = wgpu::Backends::METAL;
        let instance = wgpu::Instance::new(descriptor);
        // SAFETY: the layer is owned by the view we just inserted, which outlives the surface (see `viewport_close`).
        let surface = unsafe { instance.create_surface_unsafe(wgpu::SurfaceTargetUnsafe::CoreAnimationLayer(layer as *mut _)) }.map_err(|error| error.to_string())?;
        let engine = tauri::async_runtime::block_on(Engine::new(&instance, Some(&surface))).map_err(|error| error.to_string())?;
        let size = window.inner_size().map_err(|error| error.to_string())?;
        let scale = window.scale_factor().map_err(|error| error.to_string())? as f32;
        let config = wgpu::SurfaceConfiguration {
            usage: wgpu::TextureUsages::RENDER_ATTACHMENT,
            format: wgpu::TextureFormat::Bgra8UnormSrgb,
            color_space: wgpu::SurfaceColorSpace::Auto,
            width: size.width.max(1),
            height: size.height.max(1),
            present_mode: wgpu::PresentMode::Fifo,
            desired_maximum_frame_latency: 1,
            alpha_mode: wgpu::CompositeAlphaMode::Opaque,
            view_formats: vec![],
        };
        surface.configure(&engine.device, &config);
        let mut viewport = Viewport { engine, surface, config, photo: None, settings: DevelopSettings::default(), area: [0.0; 4], scale, view };
        viewport.render(false)?;
        *guard = Some(viewport);
    }
    let info = guard.as_ref().unwrap().engine.device.adapter_info();
    Ok(OpenInfo { gpu: info.name, backend: format!("{:?}", info.backend) })
}

/// Loads a JPEG or PNG (raw request body) as the viewport's photo.
#[tauri::command]
pub async fn viewport_load(state: State<'_, NativeViewport>, request: Request<'_>) -> Result<[u32; 2], String> {
    let InvokeBody::Raw(bytes) = request.body() else { return Err("Expected image bytes.".into()) };
    let decoded = image::load_from_memory(bytes).map_err(|error| format!("Could not read the photo: {error}"))?.into_rgba8();
    let (width, height) = decoded.dimensions();
    let mut guard = state.0.lock().unwrap();
    let viewport = guard.as_mut().ok_or("The native viewport isn't open.")?;
    viewport.photo = Some(viewport.engine.upload(width, height, &decoded));
    viewport.render(false)?;
    Ok([width, height])
}

/// Applies new settings and/or a new photo area, then draws a frame.
#[tauri::command]
pub async fn viewport_update(
    state: State<'_, NativeViewport>,
    settings: Option<DevelopSettings>,
    area: Option<[f32; 4]>,
    measure: Option<bool>,
) -> Result<FrameTiming, String> {
    let mut guard = state.0.lock().unwrap();
    let viewport = guard.as_mut().ok_or("The native viewport isn't open.")?;
    if let Some(settings) = settings {
        viewport.settings = settings;
    }
    if let Some(area) = area {
        viewport.area = area;
    }
    viewport.render(measure.unwrap_or(false))
}

#[tauri::command]
pub async fn viewport_close(window: WebviewWindow, state: State<'_, NativeViewport>) -> Result<(), String> {
    let closed = state.0.lock().unwrap().take();
    if let Some(viewport) = closed {
        let view = viewport.view;
        drop(viewport); // the surface goes before the layer it draws to
        remove_view(&window, view);
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
    let mut guard = state.0.lock().unwrap();
    if let Some(viewport) = guard.as_mut() {
        if let Ok(scale) = window.scale_factor() {
            viewport.scale = scale as f32;
        }
        viewport.resize(width, height);
        let _ = viewport.render(false);
    }
}
