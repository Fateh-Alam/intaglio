"use client";

import React, {
  Suspense,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { Canvas } from "@react-three/fiber";
import ImagePlane from "./ImagePlane";
import HistogramAnalyzer from "./HistogramAnalyzer";
import CinematicTextOverlay, {
  TextOverlaySettings,
} from "./CinematicTextOverlay";
import BrushMaskCanvas from "./BrushMaskCanvas";
import type {
  CompositionGuide,
  EditorSettings,
  HistogramData,
  ImageBounds,
  PerformanceMode,
  WatermarkPosition,
  WatermarkSettings,
} from "../types/editor";

export default function CinematicEditor({
  settings,
  imageUrl,
  onStatsUpdate,
  textOverlay,
  watermark,
  brushMaskActive,
  brushSize,
  brushFeather,
  brushErasing,
  brushMaskData,
  brushMaskExposure = 0,
  brushMaskContrast = 0,
  brushMaskSaturation = 0,
  brushMaskTemperature = 0,
  brushMaskClarity = 0,
  performanceMode = "balanced",
  compositionGuide = "off",
  onBrushMaskUpdate,
  onBoundsChange,
}: {
  settings: EditorSettings;
  imageUrl: string;
  onStatsUpdate: (data: HistogramData) => void;
  textOverlay?: TextOverlaySettings;
  watermark?: WatermarkSettings;
  brushMaskActive?: boolean;
  brushSize?: number;
  brushFeather?: number;
  brushErasing?: boolean;
  brushMaskData?: string;
  brushMaskExposure?: number;
  brushMaskContrast?: number;
  brushMaskSaturation?: number;
  brushMaskTemperature?: number;
  brushMaskClarity?: number;
  performanceMode?: PerformanceMode;
  compositionGuide?: CompositionGuide;
  onBrushMaskUpdate?: (maskDataUrl: string) => void;
  onBoundsChange?: (bounds: ImageBounds) => void;
}) {
  const [imageBounds, setImageBounds] = useState<ImageBounds | null>(null);
  const dpr = useMemo<[number, number]>(() => {
    if (performanceMode === "draft") return [0.75, 1];
    if (performanceMode === "quality") return [1.5, 2];
    return [1, 1.5];
  }, [performanceMode]);

  const containerRef = React.useRef<HTMLDivElement>(null);

  // Calculate image bounds when image loads
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      const container = containerRef.current;
      if (!container) return;

      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;
      const imgAspect = img.width / img.height;

      const maxWidth = containerWidth * 0.9;
      const maxHeight = containerHeight * 0.9;

      let displayWidth = maxWidth;
      let displayHeight = displayWidth / imgAspect;

      if (displayHeight > maxHeight) {
        displayHeight = maxHeight;
        displayWidth = displayHeight * imgAspect;
      }

      const bounds = {
        width: displayWidth,
        height: displayHeight,
        left: (containerWidth - displayWidth) / 2,
        top: (containerHeight - displayHeight) / 2,
      };

      setImageBounds(bounds);
      onBoundsChange?.(bounds);
    };
    img.src = imageUrl;
  }, [imageUrl, onBoundsChange]);

  // Update bounds on resize
  useEffect(() => {
    const handleResize = () => {
      const img = new Image();
      img.onload = () => {
        const container = containerRef.current;
        if (!container) return;

        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        const imgAspect = img.width / img.height;

        const maxWidth = containerWidth * 0.9;
        const maxHeight = containerHeight * 0.9;

        let displayWidth = maxWidth;
        let displayHeight = displayWidth / imgAspect;

        if (displayHeight > maxHeight) {
          displayHeight = maxHeight;
          displayWidth = displayHeight * imgAspect;
        }

        const bounds = {
          width: displayWidth,
          height: displayHeight,
          left: (containerWidth - displayWidth) / 2,
          top: (containerHeight - displayHeight) / 2,
        };

        setImageBounds(bounds);
        onBoundsChange?.(bounds);
      };
      img.src = imageUrl;
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [imageUrl, onBoundsChange]);

  const handleMaskUpdate = useCallback(
    (maskDataUrl: string) => {
      if (onBrushMaskUpdate) {
        onBrushMaskUpdate(maskDataUrl);
      }
    },
    [onBrushMaskUpdate]
  );

  const handleClear = useCallback(() => {
    // Clear handler
  }, []);

  // Wiper position tracking
  const [wiperPosition, setWiperPosition] = useState(0.5);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (settings.wiperActive && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        setWiperPosition(Math.max(0, Math.min(1, x)));
      }
    },
    [settings.wiperActive]
  );

  return (
    <div
      id="cinematic-editor-container"
      ref={containerRef}
      className="w-full h-full relative bg-gray-900 overflow-hidden"
      onMouseMove={handleMouseMove}
    >
      <Canvas
        id="main-editor-canvas"
        flat
        dpr={dpr}
        gl={{ preserveDrawingBuffer: true }}
        camera={{ position: [0, 0, 5], fov: 50 }}
        style={{ cursor: settings.wiperActive ? "ew-resize" : "default" }}
      >
        <Suspense fallback={null}>
          <ImagePlane
            key={imageUrl}
            imageUrl={imageUrl}
            settings={settings}
            wiperPosition={wiperPosition}
            brushMaskData={brushMaskData}
            brushMaskExposure={brushMaskExposure}
            brushMaskContrast={brushMaskContrast}
            brushMaskSaturation={brushMaskSaturation}
            brushMaskTemperature={brushMaskTemperature}
            brushMaskClarity={brushMaskClarity}
          />
          <HistogramAnalyzer onUpdate={onStatsUpdate} />
        </Suspense>
      </Canvas>

      {/* Brush Mask Canvas - positioned within image bounds */}
      {imageBounds && (
        <div
          data-export-ignore="true"
          className="absolute"
          style={{
            left: imageBounds.left,
            top: imageBounds.top,
            width: imageBounds.width,
            height: imageBounds.height,
          }}
        >
          <BrushMaskCanvas
            width={1024}
            height={Math.round(1024 * (imageBounds.height / imageBounds.width))}
            brushSize={brushSize || 0.5}
            brushFeather={brushFeather || 0.5}
            isErasing={brushErasing || false}
            isActive={brushMaskActive || false}
            onMaskUpdate={handleMaskUpdate}
            onClear={handleClear}
          />
        </div>
      )}

      {imageBounds && (
        <CompositionGuideOverlay guide={compositionGuide} bounds={imageBounds} />
      )}

      {/* Brush Mode Indicator */}
      {brushMaskActive && (
        <div
          data-export-ignore="true"
          className="absolute top-6 left-1/2 -translate-x-1/2 z-30 px-4 py-2 bg-cyan-500/20 backdrop-blur-xl border border-cyan-500/50 rounded-lg"
        >
          <span className="text-cyan-400 text-xs font-mono uppercase tracking-widest">
            {brushErasing ? "Eraser Mode" : "Brush Mode"} - Paint on image to
            create mask
          </span>
        </div>
      )}

      {/* Cinematic Text Overlay - positioned within image bounds */}
      {imageBounds && textOverlay && (
        <div
          id="text-overlay-container"
          className="absolute pointer-events-none"
          style={{
            left: imageBounds.left,
            top: imageBounds.top,
            width: imageBounds.width,
            height: imageBounds.height,
          }}
        >
          <CinematicTextOverlay settings={textOverlay} />
        </div>
      )}

      {imageBounds && watermark?.enabled && watermark.text.trim() && (
        <div
          id="watermark-overlay-container"
          className="absolute pointer-events-none"
          style={{
            left: imageBounds.left,
            top: imageBounds.top,
            width: imageBounds.width,
            height: imageBounds.height,
          }}
        >
          <WatermarkOverlay settings={watermark} />
        </div>
      )}
    </div>
  );
}

function WatermarkOverlay({ settings }: { settings: WatermarkSettings }) {
  const positionStyles: Record<WatermarkPosition, React.CSSProperties> = {
    "top-left": { top: "4%", left: "4%" },
    "top-right": { top: "4%", right: "4%" },
    "bottom-left": { bottom: "4%", left: "4%" },
    "bottom-right": { bottom: "4%", right: "4%" },
    center: { top: "50%", left: "50%", transform: "translate(-50%, -50%)" },
  };

  return (
    <div
      className="absolute select-none whitespace-nowrap font-mono font-semibold uppercase text-white"
      style={{
        ...positionStyles[settings.position],
        opacity: settings.opacity,
        fontSize: `${Math.round(13 + settings.size * 44)}px`,
        letterSpacing: "0.08em",
        textShadow:
          "0 2px 18px rgba(0,0,0,0.92), 0 0 2px rgba(255,255,255,0.35)",
      }}
    >
      {settings.text}
    </div>
  );
}

function CompositionGuideOverlay({
  guide,
  bounds,
}: {
  guide: CompositionGuide;
  bounds: ImageBounds;
}) {
  if (guide === "off") return null;

  const line = "absolute bg-white/35 shadow-[0_0_12px_rgba(0,0,0,0.55)]";
  const verticalLine = (left: string) => (
    <div key={`v-${left}`} className={`${line} top-0 bottom-0 w-px`} style={{ left }} />
  );
  const horizontalLine = (top: string) => (
    <div key={`h-${top}`} className={`${line} left-0 right-0 h-px`} style={{ top }} />
  );

  let children: React.ReactNode = null;

  if (guide === "thirds") {
    children = (
      <>
        {verticalLine("33.333%")}
        {verticalLine("66.666%")}
        {horizontalLine("33.333%")}
        {horizontalLine("66.666%")}
      </>
    );
  }

  if (guide === "center") {
    children = (
      <>
        {verticalLine("50%")}
        {horizontalLine("50%")}
      </>
    );
  }

  if (guide === "golden") {
    children = (
      <>
        {verticalLine("38.2%")}
        {verticalLine("61.8%")}
        {horizontalLine("38.2%")}
        {horizontalLine("61.8%")}
      </>
    );
  }

  if (guide === "safe") {
    children = (
      <>
        <div className="absolute inset-[6%] border border-white/35" />
        <div className="absolute inset-[12%] border border-amber-300/40" />
      </>
    );
  }

  return (
    <div
      data-export-ignore="true"
      className="pointer-events-none absolute z-20"
      style={{
        left: bounds.left,
        top: bounds.top,
        width: bounds.width,
        height: bounds.height,
      }}
    >
      {children}
    </div>
  );
}
