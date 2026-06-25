import { useThree, useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import type { HistogramData } from "../types/editor";

export default function HistogramAnalyzer({
  onUpdate,
}: {
  onUpdate: (data: HistogramData) => void;
}) {
  const { gl } = useThree();
  const frameCount = useRef(0);
  const tempCanvas = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    tempCanvas.current = document.createElement("canvas");
    tempCanvas.current.width = 128; // Low res is enough for histogram
    tempCanvas.current.height = 72;
  }, []);

  useFrame(() => {
    frameCount.current++;
    // Update every 15 frames (approx 4 times per second at 60fps)
    if (frameCount.current % 15 === 0 && tempCanvas.current) {
      const ctx = tempCanvas.current.getContext("2d");
      if (ctx) {
        // Draw WebGL canvas to temp 2D canvas (downscaling)
        // This is much faster than gl.readPixels on the full buffer
        ctx.drawImage(
          gl.domElement,
          0,
          0,
          tempCanvas.current.width,
          tempCanvas.current.height
        );
        const imageData = ctx.getImageData(
          0,
          0,
          tempCanvas.current.width,
          tempCanvas.current.height
        );
        const data = imageData.data;

        const r = new Array(256).fill(0);
        const g = new Array(256).fill(0);
        const b = new Array(256).fill(0);
        const luma = new Array(256).fill(0);
        let shadowClips = 0;
        let highlightClips = 0;
        let rTotal = 0;
        let gTotal = 0;
        let bTotal = 0;
        const pixelCount = data.length / 4;

        for (let i = 0; i < data.length; i += 4) {
          const red = data[i];
          const green = data[i + 1];
          const blue = data[i + 2];
          const luminance = Math.round(red * 0.2126 + green * 0.7152 + blue * 0.0722);

          r[red]++;
          g[green]++;
          b[blue]++;
          luma[luminance]++;
          rTotal += red;
          gTotal += green;
          bTotal += blue;

          if (luminance <= 2) shadowClips++;
          if (luminance >= 253) highlightClips++;
        }

        onUpdate({
          r,
          g,
          b,
          luma,
          clipping: {
            shadows: shadowClips / pixelCount,
            highlights: highlightClips / pixelCount,
          },
          average: {
            r: rTotal / pixelCount,
            g: gTotal / pixelCount,
            b: bTotal / pixelCount,
          },
        });
      }
    }
  });

  return null;
}
