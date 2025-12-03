"use client";

import React, { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import ImagePlane from "./ImagePlane";
import HistogramAnalyzer from "./HistogramAnalyzer";

export default function CinematicEditor({
  settings,
  imageUrl,
  onStatsUpdate,
}: {
  settings: any;
  imageUrl: string;
  onStatsUpdate: (data: any) => void;
}) {
  return (
    <div className="w-full h-full relative bg-gray-900 overflow-hidden">
      <Canvas
        gl={{ preserveDrawingBuffer: true }} // Important for export and histogram
        camera={{ position: [0, 0, 5], fov: 50 }}
      >
        <Suspense fallback={null}>
          <ImagePlane key={imageUrl} imageUrl={imageUrl} settings={settings} />
          <HistogramAnalyzer onUpdate={onStatsUpdate} />
        </Suspense>
      </Canvas>

      {/* Loading State or Overlays could go here */}
    </div>
  );
}
