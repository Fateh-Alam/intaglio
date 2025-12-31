"use client";

import React, { Suspense, useState, useEffect, useCallback } from "react";
import { Canvas } from "@react-three/fiber";
import ImagePlane from "./ImagePlane";
import HistogramAnalyzer from "./HistogramAnalyzer";
import CinematicTextOverlay, {
  TextOverlaySettings,
} from "./CinematicTextOverlay";
import BrushMaskCanvas from "./BrushMaskCanvas";

export default function CinematicEditor({
  settings,
  imageUrl,
  onStatsUpdate,
  textOverlay,
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
  onBrushMaskUpdate,
  onBoundsChange,
}: {
  settings: any;
  imageUrl: string;
  onStatsUpdate: (data: any) => void;
  textOverlay?: TextOverlaySettings;
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
  onBrushMaskUpdate?: (maskDataUrl: string) => void;
  onBoundsChange?: (bounds: {
    width: number;
    height: number;
    left: number;
    top: number;
  }) => void;
}) {
  const [imageBounds, setImageBounds] = useState<{
    width: number;
    height: number;
    left: number;
    top: number;
  } | null>(null);

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

      {/* Brush Mode Indicator */}
      {brushMaskActive && (
        <div
          data-export-ignore="true"
          className="absolute top-6 left-1/2 -translate-x-1/2 z-30 px-4 py-2 bg-cyan-500/20 backdrop-blur-xl border border-cyan-500/50 rounded-lg"
        >
          <span className="text-cyan-400 text-xs font-mono uppercase tracking-widest">
            {brushErasing ? "🧹 Eraser Mode" : "🖌️ Brush Mode"} — Paint on image
            to create mask
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
    </div>
  );
}
