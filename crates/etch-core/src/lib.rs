//! etch-core: Etch's native image engine (roadmap §10, phase D2).
//!
//! The edit pipeline written once in WGSL and run through wgpu: Metal on
//! macOS today, WebGPU in the browser later. Every pass has a CPU twin in
//! [`reference`] so tests can prove the GPU output matches the formulas.

pub mod engine;
pub mod params;
pub mod reference;

pub use engine::{fit_rect, Engine, EngineError, Photo};
pub use params::{DevelopParams, DevelopSettings};
pub use wgpu;
