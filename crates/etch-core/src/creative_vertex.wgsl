// The web shader uses y-up UVs. Texture access in the generated fragment
// shader flips y to match the native textures' top-down rows.
struct CreativeVertex {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
};

@vertex
fn vs_creative(@builtin(vertex_index) index: u32) -> CreativeVertex {
  let corners = array(
    vec2(0.0, 0.0), vec2(1.0, 0.0), vec2(0.0, 1.0),
    vec2(0.0, 1.0), vec2(1.0, 0.0), vec2(1.0, 1.0),
  );
  let corner = corners[index];
  let rect = params.rect;
  return CreativeVertex(vec4(mix(rect.xy, rect.zw, corner), 0.0, 1.0), corner);
}
