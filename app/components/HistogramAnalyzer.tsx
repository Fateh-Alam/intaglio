import { useThree, useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import type { HistogramData } from "../types/editor";
import { computeHistogramMetrics } from "../utils/histogram";
import { extractDominantColors } from "../utils/swatch";

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
        const metrics = computeHistogramMetrics(data);
        const palette = extractDominantColors(data, 5, 10);
        
        onUpdate({
          ...metrics,
          palette,
        });
      }
    }
  });

  return null;
}
