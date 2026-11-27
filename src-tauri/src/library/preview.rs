use core_foundation::{
    base::{CFType, CFTypeRef, TCFType},
    boolean::CFBoolean,
    data::CFData,
    dictionary::CFDictionary,
    number::CFNumber,
    string::{CFString, CFStringRef},
    url::CFURL,
};
use image::{
    codecs::jpeg::{JpegDecoder, JpegEncoder},
    metadata::Orientation,
    DynamicImage, ImageDecoder,
};
use std::{
    fs::File,
    io::{Cursor, Read, Seek, SeekFrom},
    path::Path,
};

#[link(name = "ImageIO", kind = "framework")]
extern "C" {
    static kCGImageSourceCreateThumbnailFromImageIfAbsent: CFStringRef;
    static kCGImageSourceCreateThumbnailWithTransform: CFStringRef;
    static kCGImageSourceThumbnailMaxPixelSize: CFStringRef;
    static kCGImageDestinationLossyCompressionQuality: CFStringRef;
    fn CGImageSourceCreateWithURL(url: CFTypeRef, options: CFTypeRef) -> CFTypeRef;
    fn CGImageSourceCreateThumbnailAtIndex(
        source: CFTypeRef,
        index: usize,
        options: CFTypeRef,
    ) -> CFTypeRef;
    fn CGImageDestinationCreateWithData(
        data: CFTypeRef,
        kind: CFStringRef,
        count: usize,
        options: CFTypeRef,
    ) -> CFTypeRef;
    fn CGImageDestinationAddImage(destination: CFTypeRef, image: CFTypeRef, options: CFTypeRef);
    fn CGImageDestinationFinalize(destination: CFTypeRef) -> bool;
}

#[link(name = "CoreFoundation", kind = "framework")]
extern "C" {
    fn CFDataCreateMutable(
        allocator: CFTypeRef,
        capacity: isize,
    ) -> core_foundation::data::CFDataRef;
}

fn owned(pointer: CFTypeRef) -> Option<CFType> {
    // These ImageIO functions return a retained object or null.
    (!pointer.is_null()).then(|| unsafe { CFType::wrap_under_create_rule(pointer) })
}

/// ImageIO resizes the camera's embedded preview and applies its orientation.
/// RAW files without a readable embedded preview are left for the Develop decoder.
pub(super) fn jpeg(path: &Path, edge: u32, raw: bool) -> Option<Vec<u8>> {
    if raw {
        if let Some(bytes) = camera_jpeg(path, edge) {
            return Some(bytes);
        }
    }
    let url = CFURL::from_path(path, false)?;
    let null = std::ptr::null();
    unsafe {
        let source = owned(CGImageSourceCreateWithURL(url.as_CFTypeRef(), null))?;
        let generate = if raw {
            CFBoolean::false_value()
        } else {
            CFBoolean::true_value()
        };
        let options = CFDictionary::from_CFType_pairs(&[
            (
                CFString::wrap_under_get_rule(kCGImageSourceCreateThumbnailFromImageIfAbsent),
                generate.as_CFType(),
            ),
            (
                CFString::wrap_under_get_rule(kCGImageSourceCreateThumbnailWithTransform),
                CFBoolean::true_value().as_CFType(),
            ),
            (
                CFString::wrap_under_get_rule(kCGImageSourceThumbnailMaxPixelSize),
                CFNumber::from(edge as i64).as_CFType(),
            ),
        ]);
        let image = owned(CGImageSourceCreateThumbnailAtIndex(
            source.as_CFTypeRef(),
            0,
            options.as_CFTypeRef(),
        ))?;
        let data = CFDataCreateMutable(null, 0);
        if data.is_null() {
            return None;
        }
        let data = CFData::wrap_under_create_rule(data);
        let kind = CFString::new("public.jpeg");
        let destination = owned(CGImageDestinationCreateWithData(
            data.as_CFTypeRef(),
            kind.as_concrete_TypeRef(),
            1,
            null,
        ))?;
        let quality = CFDictionary::from_CFType_pairs(&[(
            CFString::wrap_under_get_rule(kCGImageDestinationLossyCompressionQuality),
            CFNumber::from(0.84_f64),
        )]);
        CGImageDestinationAddImage(
            destination.as_CFTypeRef(),
            image.as_CFTypeRef(),
            quality.as_CFTypeRef(),
        );
        CGImageDestinationFinalize(destination.as_CFTypeRef()).then(|| data.bytes().to_vec())
    }
}

// Read only the head and, where necessary, the tail of the RAW container. This
// bypasses RAW development and ImageIO's slow fallback on some camera models.
fn camera_jpeg(path: &Path, edge: u32) -> Option<Vec<u8>> {
    const HEAD: u64 = 4 * 1024 * 1024;
    const TAIL: u64 = 4 * 1024 * 1024;
    let mut file = File::open(path).ok()?;
    let size = file.metadata().ok()?.len();
    let mut head = Vec::new();
    (&mut file).take(HEAD).read_to_end(&mut head).ok()?;
    let orientation = Orientation::from_exif_chunk(&head);
    let mut selected = embedded(&head, edge);
    let mut tail = Vec::new();
    if selected
        .as_ref()
        .is_none_or(|(_, _, longest)| *longest < edge)
        && size > HEAD
    {
        let from = size.saturating_sub(TAIL).max(HEAD.saturating_sub(1 << 20));
        file.seek(SeekFrom::Start(from)).ok()?;
        file.take(TAIL).read_to_end(&mut tail).ok()?;
        if let Some(candidate) = embedded(&tail, edge) {
            if selected
                .as_ref()
                .is_none_or(|(_, _, longest)| *longest < candidate.2)
            {
                selected = Some(candidate);
            }
        }
    }
    let (bytes, _, _) = selected?;
    let mut decoder = JpegDecoder::new(Cursor::new(bytes)).ok()?;
    let orientation = orientation.or_else(|| decoder.orientation().ok());
    let mut image = DynamicImage::from_decoder(decoder).ok()?;
    if let Some(orientation) = orientation {
        image.apply_orientation(orientation);
    }
    let image = image.thumbnail(edge, edge);
    let mut bytes = Vec::new();
    JpegEncoder::new_with_quality(&mut bytes, 84)
        .encode_image(&image)
        .ok()?;
    Some(bytes)
}

fn embedded(data: &[u8], edge: u32) -> Option<(&[u8], u32, u32)> {
    let mut best = None;
    for offset in memchr::memmem::find_iter(data, &[0xff, 0xd8, 0xff]) {
        let jpeg = &data[offset..];
        let Some((width, height, end)) = jpeg_frame(jpeg) else {
            continue;
        };
        let short = width.min(height);
        let longest = width.max(height);
        let pixels = width * height;
        if short < 96 || pixels > 18_000_000 {
            continue;
        }
        // Prefer a JPEG large enough for the requested preview. Among those,
        // decode the smallest. Otherwise use the highest available detail.
        let better = best.as_ref().is_none_or(|&(_, best_pixels, best_longest)| {
            if longest >= edge {
                best_longest < edge || pixels < best_pixels
            } else {
                best_longest < edge && longest > best_longest
            }
        });
        if better {
            best = Some((&jpeg[..end], pixels, longest));
        }
    }
    best
}

fn jpeg_frame(bytes: &[u8]) -> Option<(u32, u32, usize)> {
    let mut cursor = 2;
    let mut size = None;
    let mut scanned_pixels = false;
    while *bytes.get(cursor)? == 0xff {
        while bytes.get(cursor) == Some(&0xff) {
            cursor += 1;
        }
        let marker = *bytes.get(cursor)?;
        cursor += 1;
        if marker == 0xd9 {
            let (width, height) = size?;
            return scanned_pixels.then_some((width, height, cursor));
        }
        let length = usize::from(u16::from_be_bytes(
            bytes.get(cursor..cursor + 2)?.try_into().ok()?,
        ));
        if length < 2 {
            return None;
        }
        if matches!(marker, 0xc0..=0xc2) {
            if length < 8 {
                return None;
            }
            let height = u16::from_be_bytes(bytes.get(cursor + 3..cursor + 5)?.try_into().ok()?);
            let width = u16::from_be_bytes(bytes.get(cursor + 5..cursor + 7)?.try_into().ok()?);
            size = Some((u32::from(width), u32::from(height)));
        }
        cursor += length;
        if marker == 0xda {
            // Skip entropy data until the next actual marker, ignoring stuffed
            // bytes and restart sentinels. APP segments above may contain a
            // second JPEG and must never terminate the outer preview.
            scanned_pixels = true;
            loop {
                cursor += memchr::memchr(0xff, bytes.get(cursor..)?)?;
                match bytes.get(cursor + 1)? {
                    0x00 | 0xd0..=0xd7 => cursor += 2,
                    0xff => cursor += 1,
                    _ => break,
                }
            }
        }
    }
    None
}
