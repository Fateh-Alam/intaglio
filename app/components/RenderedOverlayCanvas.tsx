"use client";

import { useEffect, useRef } from "react";
import type { TextOverlaySettings } from "./CinematicTextOverlay";
import type { WatermarkSettings } from "../types/editor";
import { ensureOverlayFonts, renderOverlays } from "../editor/render/overlayCompositor";

export default function RenderedOverlayCanvas({ text, watermark }: { text: TextOverlaySettings; watermark: WatermarkSettings }): React.ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const redraw = async () => {
      await ensureOverlayFonts({ text, watermark });
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(rect.width * ratio));
      canvas.height = Math.max(1, Math.round(rect.height * ratio));
      const context = canvas.getContext("2d");
      if (!context) return;
      context.clearRect(0, 0, canvas.width, canvas.height);
      renderOverlays(context, canvas.width, canvas.height, { text, watermark });
    };
    void redraw();
    const observer = new ResizeObserver(() => void redraw());
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [text, watermark]);
  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-label="Rendered text and watermark overlay" />;
}
