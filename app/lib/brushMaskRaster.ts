import type { BrushStroke } from "../types/editor";

type Context2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

/** Stamp radius in pixels for a stroke at a given pressure on a canvas of the given size. */
const brushRadius = (stroke: BrushStroke, pressure: number, width: number, height: number) =>
  Math.max(0.5, stroke.size * Math.min(width, height) * 0.1 * pressure);

function stamp(context: Context2D, stroke: BrushStroke, x: number, y: number, pressure: number, width: number, height: number) {
  const radius = brushRadius(stroke, pressure, width, height);
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
}

/**
 * Paints points [from, end) of a stroke, interpolating dabs from the previous
 * point. Painting a stroke in pieces gives the same result as painting it whole,
 * which lets live brushing update incrementally.
 */
export function paintStroke(context: Context2D, stroke: BrushStroke, width: number, height: number, from = 0) {
  for (let index = Math.max(0, from); index < stroke.points.length; index += 1) {
    const point = stroke.points[index];
    const x = point.x * width;
    const y = point.y * height;
    const previous = stroke.points[index - 1];
    if (!previous) {
      stamp(context, stroke, x, y, point.pressure ?? 1, width, height);
      continue;
    }
    const px = previous.x * width;
    const py = previous.y * height;
    const distance = Math.hypot(x - px, y - py);
    const pressure = Math.min(previous.pressure ?? 1, point.pressure ?? 1);
    const spacing = Math.max(0.5, brushRadius(stroke, pressure, width, height) * 0.3);
    const steps = Math.max(1, Math.ceil(distance / spacing));
    for (let step = 1; step <= steps; step += 1) {
      const t = step / steps;
      stamp(context, stroke, px + (x - px) * t, py + (y - py) * t, (previous.pressure ?? 1) + ((point.pressure ?? 1) - (previous.pressure ?? 1)) * t, width, height);
    }
  }
  context.globalAlpha = 1;
  context.globalCompositeOperation = "source-over";
}
