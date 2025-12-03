import { useThree, useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";

export default function HistogramAnalyzer({
  onUpdate,
}: {
  onUpdate: (data: { r: number[]; g: number[]; b: number[] }) => void;
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

        for (let i = 0; i < data.length; i += 4) {
          r[data[i]]++;
          g[data[i + 1]]++;
          b[data[i + 2]]++;
        }

        onUpdate({ r, g, b });
      }
    }
  });

  return null;
}
