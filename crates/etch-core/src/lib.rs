//! etch-core: Etch's native image engine (roadmap §10, phase D2).
//!
//! The edit pipeline written once in WGSL and run through wgpu: Metal on
//! macOS today, WebGPU in the browser later. The develop passes have a CPU
//! reference in [`reference`]. The full pipeline is compared with the web renderer.

pub mod creative;
pub mod color;
mod creative_raster;
pub mod curves;
pub mod brush;
pub mod engine;
pub mod lut;
pub mod masks;
mod mips;
pub mod params;
pub mod post;
pub mod preview;
pub mod reference;
mod source;

pub use engine::{fit_rect, Engine, EngineError, Photo};
pub use lut::CubeLut;
pub use masks::{AdjustmentLayer, MaskLayer, PreparedPlate};
pub use curves::{CurvePoint, CurvePoints};
pub use post::{PostEffects, PostStep};
pub use params::{ColorGrading, Crop, DevelopParams, DevelopSettings, PreparedEdit, Wheel};
pub use wgpu;

pub use preview::{plan_preview, PreviewCamera, PreviewComparison, PreviewEffects, PreviewStyle, PreviewTile};
