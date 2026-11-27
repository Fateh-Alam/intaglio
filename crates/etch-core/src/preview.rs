use serde::Deserialize;

/// Camera position in cropped image space. At 100% an image pixel covers
/// exactly one physical display pixel, regardless of the window's backing scale.
#[derive(Clone, Copy, Debug, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct PreviewCamera {
    pub zoom: f32,
    pub cx: f32,
    pub cy: f32,
    pub inset: f32,
    pub fit_pixel_ratio: f32,
}

impl Default for PreviewCamera {
    fn default() -> Self {
        Self {
            zoom: 1.0,
            cx: 0.5,
            cy: 0.5,
            inset: 0.9,
            fit_pixel_ratio: 1.0,
        }
    }
}

#[derive(Clone, Copy, Debug)]
pub struct PreviewTile {
    /// Destination in clip space, clipped to the editor's photo viewport.
    pub(crate) rect: [f32; 4],
    /// Resolution of the complete virtual image at the chosen detail level.
    pub(crate) full: [u32; 2],
    /// Integer origin and extent of the working tile, including its filter halo.
    pub(crate) origin: [u32; 2],
    pub(crate) size: [u32; 2],
    /// Visible part of the working tile in normalized tile coordinates.
    pub(crate) visible: [f32; 4],
    pub(crate) detail: f32,
}

impl PreviewTile {
    pub fn detail_scale(&self) -> f32 {
        self.detail
    }

    pub fn working_size(&self) -> (u32, u32) {
        (self.size[0], self.size[1])
    }

    pub(crate) fn window(self) -> [f32; 4] {
        [
            self.origin[0] as f32 / self.full[0] as f32,
            self.origin[1] as f32 / self.full[1] as f32,
            self.size[0] as f32 / self.full[0] as f32,
            self.size[1] as f32 / self.full[1] as f32,
        ]
    }

    pub(crate) fn visible_window(self) -> [f32; 4] {
        let [x, y, width, height] = self.window();
        let [left, top, visible_width, visible_height] = self.visible;
        [x + left * width, y + top * height, visible_width * width, visible_height * height]
    }
}

#[derive(Clone, Copy)]
pub struct PreviewComparison<'a> {
    /// Divider in full cropped-image coordinates. One shows the entire comparison.
    pub split: f32,
    /// A rendered comparison snapshot. When absent, display the original source.
    pub snapshot: Option<&'a crate::engine::Photo>,
}

/// Transient viewport state. Export and scope renders use no preview style.
#[derive(Clone, Copy)]
pub struct PreviewStyle<'a> {
    pub tile: PreviewTile,
    pub mask_plate: Option<&'a str>,
    pub pick_mask_color: bool,
    pub show_clipping: bool,
    pub comparison: Option<PreviewComparison<'a>>,
}

#[derive(Clone, Copy)]
struct Axis {
    visible_start: f32,
    visible_end: f32,
    uv_start: f32,
    uv_end: f32,
}

fn axis(start: f32, available: f32, photo: f32, center: f32) -> Axis {
    let allowed_center = (available / (2.0 * photo)).min(0.5);
    let center = center.clamp(allowed_center, 1.0 - allowed_center);
    let edge = start + available / 2.0 - center * photo;
    let visible_start = edge.max(start);
    let visible_end = (edge + photo).min(start + available);
    Axis {
        visible_start,
        visible_end,
        uv_start: ((visible_start - edge) / photo).clamp(0.0, 1.0),
        uv_end: ((visible_end - edge) / photo).clamp(0.0, 1.0),
    }
}

#[derive(Clone, Copy, Debug)]
pub struct PreviewEffects {
    pub full_frame: bool,
    pub local_padding: u32,
    pub relative_reach: [f32; 2],
}

impl Default for PreviewEffects {
    fn default() -> Self {
        Self {
            full_frame: false,
            local_padding: 2,
            relative_reach: [0.0; 2],
        }
    }
}

/// Plans a screen-sized tile, aligned to the full image's pixel grid. Only
/// effects that can sample anywhere (such as mirror effects) need a full frame.
pub fn plan_preview(
    image: (u32, u32),
    area: [f32; 4],
    target: (u32, u32),
    camera: PreviewCamera,
    max_edge: u32,
    effects: PreviewEffects,
) -> Option<PreviewTile> {
    let [x, y, width, height] = area;
    if width < 1.0 || height < 1.0 || !area.iter().all(|value| value.is_finite()) {
        return None;
    }
    let zoom = camera.zoom.clamp(1.0, 1024.0);
    let inset = camera.inset.clamp(0.05, 1.0);
    let fit = inset * (width / image.0 as f32).min(height / image.1 as f32);
    let screen_scale = fit * zoom;
    let level = if zoom > 1.0001 {
        screen_scale
    } else {
        fit * camera.fit_pixel_ratio.clamp(0.25, 1.0)
    };
    let mut level = level.min(1.0);
    if effects.full_frame && zoom > 1.0001 {
        // The pass reads the complete image. Quantize during pinch zoom to
        // keep its working allocation stable and cap it at interactive size.
        level = level
            .log2()
            .ceil()
            .exp2()
            .min(1.0)
            .min(max_edge.min(2560) as f32 / image.0.max(image.1) as f32);
    } else if zoom <= 1.0001 {
        level = level.min(max_edge.min(2560) as f32 / image.0.max(image.1) as f32);
    } else {
        // On a display wider than a device allocation, use the highest detail
        // that can cover the entire visible rectangle without cropping it.
        level = level.min(screen_scale * max_edge.saturating_sub(8) as f32 / width.max(height));
    }
    let full = [
        (image.0 as f32 * level).round().max(1.0) as u32,
        (image.1 as f32 * level).round().max(1.0) as u32,
    ];
    let axes = [
        axis(x, width, image.0 as f32 * screen_scale, camera.cx),
        axis(y, height, image.1 as f32 * screen_scale, camera.cy),
    ];
    let [mut origin, mut end] = [[0, 0], full];
    if zoom > 1.0001 && !effects.full_frame {
        for (axis, bounds) in axes.iter().enumerate() {
            let margin = effects.local_padding
                + (full[axis] as f32 * effects.relative_reach[axis]).ceil() as u32;
            let first = (bounds.uv_start * full[axis] as f32).floor() as u32;
            let last = (bounds.uv_end * full[axis] as f32).ceil() as u32;
            let allocation = max_edge.max(last - first);
            let halo = margin.min((allocation - (last - first)) / 2);
            origin[axis] = first.saturating_sub(halo) / 4 * 4;
            end[axis] = last
                .saturating_add(halo)
                .div_ceil(4)
                .saturating_mul(4)
                .min(full[axis])
                .min(origin[axis].saturating_add(max_edge));
        }
    }
    let size = [
        end[0].checked_sub(origin[0])?,
        end[1].checked_sub(origin[1])?,
    ];
    if size.contains(&0) || size.iter().any(|edge| *edge > max_edge) {
        return None;
    }
    let local =
        |axis: usize, uv: f32| (uv * full[axis] as f32 - origin[axis] as f32) / size[axis] as f32;
    let [h, v] = axes;
    let rect = [
        h.visible_start / target.0 as f32 * 2.0 - 1.0,
        1.0 - v.visible_end / target.1 as f32 * 2.0,
        h.visible_end / target.0 as f32 * 2.0 - 1.0,
        1.0 - v.visible_start / target.1 as f32 * 2.0,
    ];
    let left = local(0, h.uv_start);
    let top = local(1, v.uv_start);
    Some(PreviewTile {
        rect,
        full,
        origin,
        size,
        visible: [
            left,
            top,
            local(0, h.uv_end) - left,
            local(1, v.uv_end) - top,
        ],
        detail: if zoom > 1.0001 && level >= 0.999 {
            screen_scale
        } else {
            0.0
        },
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_panorama_at_one_to_one_allocates_only_the_visible_tile() {
        let camera = PreviewCamera {
            zoom: 20.0,
            cx: 0.9,
            ..Default::default()
        };
        let tile = plan_preview(
            (20000, 2000),
            [0.0, 0.0, 1200.0, 800.0],
            (1200, 800),
            camera,
            8192,
            PreviewEffects::default(),
        )
        .unwrap();
        assert_eq!(tile.full, [20000, 2000]);
        assert!(tile.origin[0] > 16_000);
        assert!(tile.size[0] < 1300 && tile.size[1] < 900);
        assert!(tile.detail > 1.0);
        assert_eq!(tile.rect, [-1.0, -1.0, 1.0, 1.0]);
    }

    #[test]
    fn whole_frame_effects_stay_bounded_when_zoomed() {
        let camera = PreviewCamera {
            zoom: 20.0,
            ..PreviewCamera::default()
        };
        let tile = plan_preview(
            (12000, 8000),
            [0.0, 0.0, 1200.0, 800.0],
            (1200, 800),
            camera,
            8192,
            PreviewEffects {
                full_frame: true,
                ..Default::default()
            },
        )
        .unwrap();
        assert_eq!(tile.origin, [0, 0]);
        assert_eq!(tile.full, tile.size);
        assert_eq!(tile.size[0], 2560);
        assert!(tile.visible[2] < 1.0);
    }
}
