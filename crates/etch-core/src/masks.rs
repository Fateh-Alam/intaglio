//! Adjustment layers and their masks, ported from MaskBlendPass.ts,
//! maskGeometry.ts and plateParams.ts.

use bytemuck::{Pod, Zeroable};
use serde::Deserialize;

use crate::params::{DevelopSettings, PreparedEdit};

/// Most mask parts one layer can combine, as `MAX_MASK_PARTS`.
pub const MAX_MASK_PARTS: usize = 32;
/// Most brush masks one layer can sample, as `MAX_BRUSH_PARTS`.
pub const MAX_BRUSH_PARTS: usize = 4;

#[derive(Debug, Clone, Copy, Default, PartialEq, Deserialize)]
pub struct Point {
    pub x: f32,
    pub y: f32,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RadialParams {
    pub center: Point,
    #[serde(default)]
    pub radius: f32,
    pub radius_x: Option<f32>,
    pub radius_y: Option<f32>,
    pub angle: Option<f32>,
    #[serde(default)]
    pub feather: f32,
    #[serde(default)]
    pub invert: bool,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
pub struct LinearParams {
    #[serde(default)]
    pub angle: f32,
    #[serde(default)]
    pub position: f32,
    #[serde(default)]
    pub feather: f32,
    #[serde(default)]
    pub invert: bool,
    pub start: Option<Point>,
    pub end: Option<Point>,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LuminosityParams {
    /// `Some("oklab")` on current projects; older ones use Rec. 709 luminance.
    pub color_space: Option<String>,
    pub target: f32,
    pub range: f32,
    #[serde(default)]
    pub feather: f32,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ColorRangeParams {
    /// `Some("oklch")` on current projects; older ones use HSV.
    pub color_space: Option<String>,
    pub target_hue: f32,
    pub hue_width: f32,
    #[serde(default)]
    pub target_chroma: f32,
    #[serde(default)]
    pub chroma_range: f32,
}

#[derive(Debug, Clone, Copy, PartialEq, Deserialize)]
pub struct StrokePoint {
    pub x: f32,
    pub y: f32,
    pub pressure: Option<f32>,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
pub struct BrushStroke {
    pub points: Vec<StrokePoint>,
    pub size: f32,
    pub feather: f32,
    pub flow: f32,
    pub opacity: f32,
    pub mode: String,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
pub struct BrushParams {
    #[serde(default)]
    pub strokes: Vec<BrushStroke>,
}

#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum MaskKind {
    Radial { params: RadialParams },
    Linear { params: LinearParams },
    Luminosity { params: LuminosityParams },
    ColorRange { params: ColorRangeParams },
    Brush { params: BrushParams },
}

/// One mask component, as `MaskLayer`.
#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MaskLayer {
    pub id: String,
    #[serde(default = "add")]
    pub blend_mode: String,
    #[serde(default = "one")]
    pub opacity: f32,
    #[serde(flatten)]
    pub kind: MaskKind,
}

fn add() -> String {
    "ADD".into()
}
fn one() -> f32 {
    1.0
}

/// One adjustment layer ("plate"), as `AdjustmentLayer`.
#[derive(Debug, Clone, PartialEq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AdjustmentLayer {
    pub id: String,
    #[serde(default)]
    pub mask_ids: Vec<String>,
    #[serde(default = "one")]
    pub opacity: f32,
    pub enabled: Option<bool>,
    /// The layer's own edit settings; everything else is neutral (`PLATE_NEUTRAL`).
    #[serde(default)]
    pub params: serde_json::Value,
}

/// One mask part as the shader reads it: five vec4s.
///  0: type (1 radial, 2 linear, 3 luminance, 4 brush, 5 colour, 6 legacy luminance, 7 legacy colour), blend (0 add, 1 subtract, 2 intersect), invert, brush slot
///  1: opacity, feather, angle, target
///  2: range, chroma target, chroma range, unused
///  3: centre x, y, radius x, y
///  4: start x, y, end x, y
#[repr(C)]
#[derive(Debug, Clone, Copy, PartialEq, Pod, Zeroable)]
pub struct MaskRecord(pub [[f32; 4]; 5]);

/// The mask uniform block for one layer.
#[repr(C)]
#[derive(Debug, Clone, Copy, PartialEq, Pod, Zeroable)]
pub struct MaskBlock {
    /// Mask count, photo aspect (the engine fills it), layer opacity, unused.
    pub header: [f32; 4],
    /// The photo's crop, so masks stay put on the photo when it is cropped.
    pub crop: [f32; 4],
    pub records: [MaskRecord; MAX_MASK_PARTS],
}

/// A layer ready to render: its settings and the mask parts it uses. Mask
/// geometry depends on the photo's aspect, so it is packed at render time.
#[derive(Debug, Clone, PartialEq)]
pub struct PreparedPlate {
    pub id: String,
    pub edit: PreparedEdit,
    /// The layer's mask parts, in order (at most `MAX_MASK_PARTS`).
    pub parts: Vec<MaskLayer>,
    /// Layer opacity (0 when the layer is switched off).
    pub opacity: f32,
    /// The photo's crop, so masks stay put on the photo when it is cropped.
    pub crop: [f32; 4],
}

fn clamp01(value: f32) -> f32 {
    value.clamp(0.0, 1.0)
}

/// `radialGeometry`: centre, radii (units of image height), angle (radians), feather, invert.
fn radial(params: &RadialParams, aspect: f32) -> ([f32; 2], [f32; 2], f32, f32, bool) {
    if let (Some(rx), Some(ry)) = (params.radius_x, params.radius_y) {
        return ([params.center.x, params.center.y], [rx.max(1e-4), ry.max(1e-4)], params.angle.unwrap_or(0.0).to_radians(), clamp01(params.feather), params.invert);
    }
    let radius = params.radius.max(1e-4);
    ([params.center.x, 1.0 - params.center.y], [radius * aspect, radius], 0.0, clamp01(params.feather / radius), params.invert)
}

/// `linearGeometry`: full effect at start, none at end.
fn linear(params: &LinearParams, aspect: f32) -> (Point, Point, bool) {
    if let (Some(start), Some(end)) = (params.start, params.end) {
        return (start, end, params.invert);
    }
    let angle = params.angle * std::f32::consts::PI * 2.0;
    let (x, y) = (angle.cos(), -angle.sin());
    let stretch = aspect.max(1e-4).powi(2);
    let length = x * x / stretch + y * y;
    let dir = Point { x: x / stretch / length, y: y / length };
    let full = params.position + params.feather - 0.5;
    let none = params.position - params.feather - 0.5;
    (Point { x: 0.5 + dir.x * full, y: 0.5 + dir.y * full }, Point { x: 0.5 + dir.x * none, y: 0.5 + dir.y * none }, params.invert)
}

impl PreparedPlate {
    /// Prepares `layer`, picking its parts out of `masks`, as `updateForPlate` does.
    pub fn new(layer: &AdjustmentLayer, masks: &[MaskLayer], crop: [f32; 4]) -> Self {
        let settings: DevelopSettings = serde_json::from_value(layer.params.clone()).unwrap_or_default();
        // Plates never carry a LUT texture (`PLATE_NEUTRAL.lutTexture` is null).
        let settings = DevelopSettings { lut_strength: 0.0, ..settings };
        let mut edit = PreparedEdit::from(&settings);
        edit.params.geometry2[3] = 0.0; // geometry happened before the plates
        let parts = layer.mask_ids.iter().filter_map(|id| masks.iter().find(|mask| &mask.id == id).cloned()).take(MAX_MASK_PARTS).collect();
        let opacity = if layer.enabled == Some(false) { 0.0 } else { layer.opacity };
        Self { id: layer.id.clone(), edit, parts, opacity, crop }
    }

    /// Brush masks in slot order (up to `MAX_BRUSH_PARTS`).
    pub fn brushes(&self) -> Vec<&BrushParams> {
        self.parts
            .iter()
            .filter_map(|mask| match &mask.kind {
                MaskKind::Brush { params } => Some(params),
                _ => None,
            })
            .take(MAX_BRUSH_PARTS)
            .collect()
    }

    /// The mask uniform block for a photo of `aspect` (width / height), as `bindMasks`.
    pub fn mask_block(&self, aspect: f32) -> MaskBlock {
        let mut block = MaskBlock { header: [self.parts.len() as f32, aspect, self.opacity, 0.0], crop: self.crop, records: [MaskRecord([[0.0; 4]; 5]); MAX_MASK_PARTS] };
        let mut brush_slot = 0usize;
        for (record, mask) in block.records.iter_mut().zip(&self.parts) {
            let blend = match mask.blend_mode.as_str() {
                "ADD" => 0.0,
                "SUBTRACT" => 1.0,
                _ => 2.0,
            };
            let mut r = [[0.0f32; 4]; 5];
            r[0] = [0.0, blend, 0.0, -1.0];
            r[1][0] = mask.opacity;
            match &mask.kind {
                MaskKind::Radial { params } => {
                    let (center, radii, angle, feather, invert) = radial(params, aspect);
                    r[0][0] = 1.0;
                    r[0][2] = if invert { 1.0 } else { 0.0 };
                    r[1][1] = feather;
                    r[1][2] = angle;
                    r[3] = [center[0], center[1], radii[0], radii[1]];
                }
                MaskKind::Linear { params } => {
                    let (start, end, invert) = linear(params, aspect);
                    r[0][0] = 2.0;
                    r[0][2] = if invert { 1.0 } else { 0.0 };
                    r[4] = [start.x, start.y, end.x, end.y];
                }
                MaskKind::Luminosity { params } => {
                    r[0][0] = if params.color_space.is_some() { 3.0 } else { 6.0 };
                    r[1][1] = params.feather;
                    r[1][3] = params.target;
                    r[2][0] = params.range;
                }
                MaskKind::ColorRange { params } => {
                    r[0][0] = if params.color_space.is_some() { 5.0 } else { 7.0 };
                    r[1][3] = if params.target_hue > 1.0 { params.target_hue / 360.0 } else { params.target_hue };
                    r[2] = [params.hue_width, params.target_chroma, params.chroma_range, 0.0];
                }
                MaskKind::Brush { .. } => {
                    r[0][0] = 4.0;
                    if brush_slot < MAX_BRUSH_PARTS {
                        r[0][3] = brush_slot as f32;
                        brush_slot += 1;
                    }
                }
            }
            *record = MaskRecord(r);
        }
        block
    }
}
