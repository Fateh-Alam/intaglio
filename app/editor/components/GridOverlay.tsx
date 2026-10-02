import React from "react";
import type { GridOverlayMode, ImageBounds } from "../../types/editor";

export function GridOverlay({
  mode,
  bounds,
}: {
  mode: GridOverlayMode;
  bounds: ImageBounds | null;
}) {
  if (mode === "none" || !bounds) return null;

  const overlayStyle: React.CSSProperties = {
    position: "absolute",
    pointerEvents: "none",
    border: "2px solid rgba(255, 255, 255, 0.4)",
    boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.5)",
    zIndex: 10,
    transition: "all 0.3s ease",
  };

  // Default to full bounds, then we adjust based on aspect ratio constraint
  let width = bounds.width;
  let height = bounds.height;
  let left = bounds.left;
  let top = bounds.top;

  const currentAspect = width / height;
  let targetAspect = currentAspect;

  if (mode === "1:1") targetAspect = 1;
  if (mode === "4:5") targetAspect = 4 / 5;
  if (mode === "9:16") targetAspect = 9 / 16;
  if (mode === "carousel-4:5-2") targetAspect = 8 / 5; // two 4:5 images side by side
  if (mode === "carousel-4:5-3") targetAspect = 12 / 5; // three 4:5 images side by side

  if (currentAspect > targetAspect) {
    // Image is wider than target. Constrain width.
    const newWidth = height * targetAspect;
    left += (width - newWidth) / 2;
    width = newWidth;
  } else {
    // Image is taller than target. Constrain height.
    const newHeight = width / targetAspect;
    top += (height - newHeight) / 2;
    height = newHeight;
  }

  overlayStyle.width = width;
  overlayStyle.height = height;
  overlayStyle.left = left;
  overlayStyle.top = top;

  return (
    <div style={overlayStyle}>
      {mode.startsWith("carousel") && (
        <div className="absolute inset-0 flex">
          {mode === "carousel-4:5-2" && (
            <>
              <div className="h-full flex-1 border-r border-white/40 border-dashed" />
              <div className="h-full flex-1" />
            </>
          )}
          {mode === "carousel-4:5-3" && (
            <>
              <div className="h-full flex-1 border-r border-white/40 border-dashed" />
              <div className="h-full flex-1 border-r border-white/40 border-dashed" />
              <div className="h-full flex-1" />
            </>
          )}
        </div>
      )}
      
      {/* Broadcast Safe Overlays */}
      {(mode === "title-safe" || mode === "action-safe") && (
        <>
          <div 
            className="absolute border border-red-500/80 border-dashed pointer-events-none" 
            style={{ inset: '5%' }} 
          />
          {mode === "title-safe" && (
            <div 
              className="absolute border border-green-500/80 pointer-events-none" 
              style={{ inset: '10%' }} 
            />
          )}
          <div className="absolute top-1/2 left-0 w-full h-[1px] bg-white/20" />
          <div className="absolute top-0 left-1/2 w-[1px] h-full bg-white/20" />
        </>
      )}
    </div>
  );
}
