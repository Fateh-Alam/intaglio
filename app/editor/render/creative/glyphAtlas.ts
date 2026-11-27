export function createGlyphCanvas(ramp: string): HTMLCanvasElement {
  const glyphs = Array.from(ramp);
  const glyphWidth = 40;
  const glyphHeight = 56;
  const canvas = document.createElement("canvas");
  canvas.width = glyphWidth * glyphs.length;
  canvas.height = glyphHeight;
  const context = canvas.getContext("2d")!;
  context.fillStyle = "#000";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#fff";
  context.font = "bold 46px monospace";
  context.textAlign = "center";
  context.textBaseline = "middle";
  glyphs.forEach((glyph, index) => {
    context.save();
    context.beginPath();
    context.rect(index * glyphWidth, 0, glyphWidth, glyphHeight);
    context.clip();
    context.fillText(glyph, (index + 0.5) * glyphWidth, glyphHeight * 0.51, glyphWidth);
    context.restore();
  });
  return canvas;
}

/** Native texture data for the same red-channel glyph mask that WebGL samples. */
export function glyphAtlasPixels(ramp: string): Uint8Array<ArrayBuffer> {
  const canvas = createGlyphCanvas(ramp);
  const context = canvas.getContext("2d")!;
  const rgba = context.getImageData(0, 0, canvas.width, canvas.height).data;
  const red = new Uint8Array(canvas.width * canvas.height);
  for (let index = 0; index < red.length; index += 1) red[index] = rgba[4 * index];
  return red;
}
