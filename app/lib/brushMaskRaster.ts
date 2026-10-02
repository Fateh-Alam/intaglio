import type { BrushStroke } from "../types/editor";

export function rasterizeBrushStrokes(strokes: readonly BrushStroke[], width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("The browser could not allocate a brush-mask cache.");
  const stamp = (stroke: BrushStroke, x: number, y: number, pressure: number) => {
    const radius = Math.max(0.5, stroke.size * Math.min(width, height) * 0.1 * pressure);
    context.globalCompositeOperation = stroke.mode === "erase" ? "destination-out" : "source-over";
    context.globalAlpha = stroke.opacity * stroke.flow;
    const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
    const featherStart = Math.max(0, Math.min(1, 1 - stroke.feather));
    gradient.addColorStop(0, "#fff");
    gradient.addColorStop(featherStart, "#fff");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  };
  for (const stroke of strokes) {
    for (let index = 0; index < stroke.points.length; index += 1) {
      const point = stroke.points[index];
      const x = point.x * width, y = point.y * height;
      const previous = stroke.points[index - 1];
      if (!previous) { stamp(stroke, x, y, point.pressure ?? 1); continue; }
      const px = previous.x * width, py = previous.y * height;
      const distance = Math.hypot(x - px, y - py);
      const spacing = Math.max(1, stroke.size * Math.min(width, height) * 0.03);
      const steps = Math.max(1, Math.ceil(distance / spacing));
      for (let step = 1; step <= steps; step += 1) {
        const t = step / steps;
        stamp(stroke, px + (x - px) * t, py + (y - py) * t, (previous.pressure ?? 1) + ((point.pressure ?? 1) - (previous.pressure ?? 1)) * t);
      }
    }
  }
  context.globalAlpha = 1;
  return canvas;
}
