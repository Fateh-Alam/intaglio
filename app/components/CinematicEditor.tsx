"use client";

import React, {
  Suspense,
  useState,
  useEffect,
  useMemo,
} from "react";
import { Canvas } from "@react-three/fiber";
import ImagePlane from "./ImagePlane";
import type { LinearSourceBuffer } from "../editor/render/sourceTexture";
import CinematicTextOverlay, {
  TextOverlaySettings,
} from "./CinematicTextOverlay";
import RenderedOverlayCanvas from "./RenderedOverlayCanvas";
import type { MaskColorSampler } from "../lib/maskGeometry";
import { cropSize, fitPhoto } from "../lib/cropGeometry";
import type {
  CompositionGuide,
  EditorSettings,
  HistogramData,
  ImageBounds,
  PerformanceMode,
  WatermarkSettings,
} from "../types/editor";

export default function CinematicEditor({
  settings,
  gradeGraph,
  imageUrl,
  onStatsUpdate,
  textOverlay,
  setTextOverlay,
  watermark,
  performanceMode = "balanced",
  compositionGuide = "off",
  onBoundsChange,
  maskOverlayPlateId = null,
  maskColorSamplerRef,
  pickingMaskColor = false,
  split = -1,
  showClipping = false,
  rawSource = null,
}: {
  gradeGraph?: import("../types/document").GradeGraph;
  settings: EditorSettings;
  imageUrl: string;
  onStatsUpdate: (data: HistogramData) => void;
  textOverlay?: TextOverlaySettings;
  setTextOverlay?: React.Dispatch<React.SetStateAction<TextOverlaySettings>>;
  watermark?: WatermarkSettings;
  performanceMode?: PerformanceMode;
  compositionGuide?: CompositionGuide;
  onBoundsChange?: (bounds: ImageBounds) => void;
  maskOverlayPlateId?: string | null;
  maskColorSamplerRef?: React.RefObject<MaskColorSampler | null>;
  pickingMaskColor?: boolean;
  split?: number;
  showClipping?: boolean;
  rawSource?: LinearSourceBuffer | null;
}) {
  const [imageBounds, setImageBounds] = useState<ImageBounds | null>(null);
  const dpr = useMemo<[number, number]>(() => {
    if (performanceMode === "draft") return [0.75, 1];
    if (performanceMode === "quality") return [1.5, 2];
    return [1, 1.5];
  }, [performanceMode]);

  const containerRef = React.useRef<HTMLDivElement>(null);
  const { crop } = settings;

  // Image bounds drive every DOM overlay (brush, guides, compare). Recompute
  // whenever the container changes size, not only on window resize, so side
  // panels opening or closing keep overlays aligned with the WebGL photo.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let aspect: number | null = null;
    let cancelled = false;
    const measure = () => {
      if (!aspect || cancelled) return;
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;
      const { width: displayWidth, height: displayHeight } = fitPhoto(containerWidth * 0.9, containerHeight * 0.9, aspect);
      const bounds = {
        width: displayWidth,
        height: displayHeight,
        left: (containerWidth - displayWidth) / 2,
        top: (containerHeight - displayHeight) / 2,
      };
      setImageBounds(bounds);
      onBoundsChange?.(bounds);
    };
    const img = new Image();
    img.onload = () => {
      const dimensions = cropSize(img.naturalWidth, img.naturalHeight, crop);
      aspect = dimensions.width / dimensions.height;
      measure();
    };
    img.src = imageUrl;
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [crop, imageUrl, onBoundsChange]);

  return (
    <div
      id="cinematic-editor-container"
      ref={containerRef}
      className="relative h-full w-full overflow-hidden"
    >
      <Canvas
        id="main-editor-canvas"
        flat
        frameloop="demand"
        dpr={dpr}
        gl={{ preserveDrawingBuffer: true }}
        camera={{ position: [0, 0, 5], fov: 50 }}
      >
        <Suspense fallback={null}>
          <ImagePlane
            imageUrl={imageUrl}
            settings={settings}
            gradeGraph={gradeGraph}
            maskOverlayPlateId={maskOverlayPlateId}
            maskColorSamplerRef={maskColorSamplerRef}
            pickingMaskColor={pickingMaskColor}
            split={split}
            showClipping={showClipping}
            rawSource={rawSource}
            onStatsUpdate={onStatsUpdate}
          />
        </Suspense>
      </Canvas>

      {imageBounds && (
        <CompositionGuideOverlay guide={compositionGuide} bounds={imageBounds} />
      )}

      {/* Cinematic Text Overlay - positioned within image bounds */}
      {imageBounds && textOverlay && (
        <div
          id="text-overlay-container"
          className="absolute pointer-events-auto"
          style={{
            left: imageBounds.left,
            top: imageBounds.top,
            width: imageBounds.width,
            height: imageBounds.height,
          }}
        >
          <RenderedOverlayCanvas text={textOverlay} watermark={watermark ?? { enabled: false, text: "", position: "bottom-right", opacity: 0, size: 0 }} />
          <div className="absolute inset-0 opacity-0 focus-within:opacity-100 hover:opacity-100">
            <CinematicTextOverlay settings={textOverlay} setSettings={setTextOverlay} />
          </div>
        </div>
      )}
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
