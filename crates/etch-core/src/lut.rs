//! Creative 3D LUTs (.cube), ported from app/utils/lutParser.ts.

use half::f16;

#[derive(Debug, Clone, PartialEq)]
pub struct CubeLut {
    pub size: usize,
    /// RGB triplets, red varying fastest, as stored in .cube files.
    pub values: Vec<f32>,
    pub domain_min: [f32; 3],
    pub domain_max: [f32; 3],
    pub title: Option<String>,
}

fn three(parts: &[&str]) -> Option<[f32; 3]> {
    let values: Vec<f32> = parts.iter().take(3).map(|part| part.parse::<f32>()).collect::<Result<_, _>>().ok()?;
    (values.len() == 3 && values.iter().all(|value| value.is_finite())).then(|| [values[0], values[1], values[2]])
}

impl CubeLut {
    /// Parses a .cube file the way `parseCubeData` does; `None` if it isn't valid.
    pub fn parse(text: &str) -> Option<Self> {
        let (mut size, mut title) = (0usize, None);
        let (mut domain_min, mut domain_max) = ([0.0; 3], [1.0; 3]);
        let mut values = Vec::new();
        for raw in text.lines() {
            let line = raw.trim();
            if line.is_empty() || line.starts_with('#') {
                continue;
            }
            let parts: Vec<&str> = line.split_whitespace().collect();
            match parts[0] {
                "LUT_3D_SIZE" => size = parts.get(1)?.parse().ok()?,
                "TITLE" => title = Some(line[5..].trim().trim_matches('"').to_string()),
                "DOMAIN_MIN" => domain_min = three(&parts[1..])?,
                "DOMAIN_MAX" => domain_max = three(&parts[1..])?,
                keyword if keyword.starts_with(|c: char| c.is_ascii_uppercase() || c == '_') => {}
                _ => values.extend(three(&parts)?),
            }
        }
        let valid = (2..=256).contains(&size) && values.len() == size * size * size * 3 && (0..3).all(|i| domain_max[i] > domain_min[i]);
        valid.then_some(Self { size, values, domain_min, domain_max, title })
    }

    /// RGBA half-float texels (alpha 1), red fastest: the layout of the 3D texture.
    /// Half floats match the web renderer's `createLut3DTexture`.
    pub fn half_texels(&self) -> Vec<f16> {
        self.values.chunks(3).flat_map(|rgb| [f16::from_f32(rgb[0]), f16::from_f32(rgb[1]), f16::from_f32(rgb[2]), f16::ONE]).collect()
    }
}

#[cfg(test)]
mod tests {
    use super::CubeLut;

    #[test]
    fn parses_size_domain_title_and_values() {
        let text = "# comment\nTITLE \"Warm\"\nLUT_3D_SIZE 2\nDOMAIN_MIN 0 0 0\nDOMAIN_MAX 1 1 1\n0 0 0\n1 0 0\n0 1 0\n1 1 0\n0 0 1\n1 0 1\n0 1 1\n1 1 1\n";
        let lut = CubeLut::parse(text).expect("valid");
        assert_eq!((lut.size, lut.title.as_deref(), lut.values.len()), (2, Some("Warm"), 24));
        assert_eq!(lut.half_texels().len(), 32);
    }

    #[test]
    fn rejects_broken_files() {
        assert!(CubeLut::parse("LUT_3D_SIZE 2\n0 0 0\n").is_none(), "too few values");
        assert!(CubeLut::parse("LUT_3D_SIZE 2\nDOMAIN_MIN 1 1 1\nDOMAIN_MAX 0 0 0\n").is_none(), "inverted domain");
        assert!(CubeLut::parse("LUT_3D_SIZE 2\n0 0 x\n").is_none(), "not a number");
    }
}
