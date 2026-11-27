//! Import into the same sRGB working space as the web editor. The original
//! encoded photograph stays in the document with its embedded profile.

use moxcms::{ColorProfile, Layout, RenderingIntent, TransformOptions};

pub fn import_profiled_rgba(rgba: Vec<u8>, icc: &[u8]) -> Result<Vec<u8>, moxcms::CmsError> {
    let source = ColorProfile::new_from_slice(icc)?;
    let target = ColorProfile::new_srgb();
    let options = TransformOptions {
        rendering_intent: RenderingIntent::RelativeColorimetric,
        // Match browser matrix-profile conversion closely in dark colors,
        // where fixed-point rounding can step over an 8-bit output boundary.
        prefer_fixed_point: false,
        ..Default::default()
    };
    let transform = source.create_transform_8bit(Layout::Rgba, &target, Layout::Rgba, options)?;
    let mut output = vec![0; rgba.len()];
    transform.transform(&rgba, &mut output)?;
    Ok(output)
}
