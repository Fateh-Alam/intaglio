// Builds one mip level from the level above it. Linear sampling at the centre
// of each 2×2 block averages it; the sRGB texture format means that average is
// taken in linear light, which is how real light mixes.

@group(0) @binding(0) var source: texture_2d<f32>;
@group(0) @binding(1) var source_sampler: sampler;

struct VsOut {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
};

// One triangle that covers the whole target.
@vertex
fn vs_main(@builtin(vertex_index) index: u32) -> VsOut {
  let uv = vec2(f32((index << 1u) & 2u), f32(index & 2u));
  var out: VsOut;
  out.position = vec4(uv * vec2(2.0, -2.0) + vec2(-1.0, 1.0), 0.0, 1.0);
  out.uv = uv;
  return out;
}

@fragment
fn fs_main(in: VsOut) -> @location(0) vec4<f32> {
  return textureSampleLevel(source, source_sampler, in.uv, 0.0);
}
