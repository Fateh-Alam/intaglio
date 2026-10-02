import React, { useRef } from 'react';
import { useEditorState } from '../hooks/useEditorState';
import { IconMaximize, IconDownload, IconMinus, IconAdjustmentsHorizontal, IconHistory, IconLayersIntersect, IconInfoCircle, IconX, IconMenu2, IconMinimize } from "@tabler/icons-react";
import { AnimatePresence, motion } from "framer-motion";
import dynamic from "next/dynamic";
import { GridOverlay } from "./GridOverlay";
const CinematicEditor = dynamic(() => import("../../components/CinematicEditor"), { ssr: false });


export function EditorWorkspaceCanvas() {
  const editorState = useEditorState();
  const {
    settings,
    textOverlay, setTextOverlay,
    assetMetadata,
    watermark,
    imageSrc,
    rawSource,
    setHistogram,
    activeTab, setActiveTab,
    history,
    settingsSnapshots,
    isMobileMenuOpen, setIsMobileMenuOpen,
    isLookIntensityOpen, setIsLookIntensityOpen,
    isFocusMode, setIsFocusMode,
    setIsExportModalOpen,
    setIsMobileControlsExpanded,
    roiMode,
    sourceROI, setSourceROI,
    brushMaskActive,
    brushSize,
    brushFeather,
    brushErasing,
    brushCanvas, setBrushCanvas,
    brushCanvasDirty, setBrushCanvasDirty,
    updateSetting,
    compositionGuide,
    performanceMode,
    imageBounds, setImageBounds,
    handleCreateVirtualCopy,
    activeExportRecipeId,
    exportFormat,
    exportQuality,
    gridOverlayMode,
    activePlateId,
    rawProgress,
    cancelRawDecode,
  } = editorState;
  
  // Zoom & Pan State
  const [zoom, setZoom] = React.useState(1);
  const [pan, setPan] = React.useState({ x: 0, y: 0 });
  const [wiperPosition, setWiperPosition] = React.useState(0.5);
  const isDragging = useRef(false);
  const isDraggingWiper = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });

  const handleWheel = (e: React.WheelEvent) => {
    if (e.metaKey || e.ctrlKey) {
      e.preventDefault();
      setZoom((z) => Math.min(Math.max(0.2, z - e.deltaY * 0.01), 10));
    } else {
      setPan((p) => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    // Only pan on middle click OR if spacebar is held? Let's just allow it on canvas if we aren't brushing.
    if (brushMaskActive) return; 
    isDragging.current = true;
    dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDraggingWiper.current) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      setWiperPosition(x);
      return;
    }
    if (!isDragging.current || brushMaskActive) return;
    setPan({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDragging.current = false;
    isDraggingWiper.current = false;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  return (
    <>
      {/* CENTER - EDITOR CANVAS */}
      <div
        onClick={() => setIsMobileControlsExpanded(false)}
        className="relative z-0 flex flex-1 h-full w-full min-h-0 min-w-0 flex-col overflow-hidden bg-[var(--intaglio-charcoal-2)] md:border-r md:border-white/5"
      >


        {/* Canvas Area */}
        <div 
          className="relative flex flex-1 items-center justify-center overflow-hidden bg-[#0f0f0f] touch-none"
          onWheel={handleWheel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          {rawProgress && (
            <div role="status" aria-live="polite" className="absolute inset-0 z-[70] flex items-center justify-center bg-black/75 backdrop-blur-sm">
              <div className="w-[min(420px,calc(100%-48px))] border border-[var(--intaglio-line)] bg-[#15130f] p-6 shadow-2xl">
                <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--intaglio-paper)]">Developing supported-camera RAW</div>
                <div className="mt-4 h-1 overflow-hidden bg-white/10"><div className="h-full bg-[var(--intaglio-brass)] transition-[width]" style={{ width: `${Math.round(rawProgress.progress * 100)}%` }} /></div>
                <div className="mt-3 flex items-center justify-between gap-4"><span className="text-xs text-white/55">{rawProgress.stage}</span><button type="button" onClick={cancelRawDecode} className="font-mono text-[9px] uppercase tracking-widest text-white/55 hover:text-white">Cancel</button></div>
              </div>
            </div>
          )}
          {/* Zoom Reset Button */}
          <AnimatePresence>
            {(zoom !== 1 || pan.x !== 0 || pan.y !== 0) && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={resetView}
                className="absolute bottom-6 left-6 z-50 flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-4 py-2 text-[10px] font-mono tracking-widest text-white/70 backdrop-blur-md transition-colors hover:bg-black/60 hover:text-white"
              >
                RESET VIEW ({(zoom * 100).toFixed(0)}%)
              </motion.button>
            )}
          </AnimatePresence>
          {/* Exit Focus Mode Button */}
          <AnimatePresence>
            {isFocusMode && (
              <motion.button
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
                onClick={() => setIsFocusMode(false)}
                className="absolute top-6 right-6 z-50 flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-4 py-2 text-[11px] font-mono tracking-widest text-white/70 backdrop-blur-md transition-colors hover:bg-black/60 hover:text-[rgba(231,223,208,1)]"
              >
                <IconMinimize className="intaglio-icon"/>
                EXIT FOCUS MODE
              </motion.button>
            )}
          </AnimatePresence>

          {/* Toolbar Overlay */}

          {/* Look Intensity Overlay - Only show when image is loaded */}
          {imageSrc && !isFocusMode && isLookIntensityOpen && (
            <div
              className={`absolute bottom-6 right-6 z-10 hidden overflow-hidden border border-[var(--intaglio-line)] bg-[#151515]/90 backdrop-blur-md transition-all duration-300 ease-out md:block ${
                isLookIntensityOpen
                  ? "w-[calc(100%-48px)] p-5"
                  : "w-[240px] border-white/20 bg-[#151515]/95 p-3"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-mono intaglio-label text-white/60 whitespace-nowrap">
                    Look Intensity
                  </span>
                  <span className="font-mono intaglio-label text-amber-500/70">
                    {Math.round((settings.lutStrength || 0) * 100)}
                  </span>
                </div>
                <div role="button" tabIndex={0}
                  onClick={() => setIsLookIntensityOpen(!isLookIntensityOpen)}
                  className="ml-4 text-white/40 hover:text-white transition"
                >
                  {isLookIntensityOpen ? (
                    <IconMinus className="intaglio-icon"/>
                  ) : (
                    <IconMaximize className="intaglio-icon"/>
                  )}
                </div>
              </div>

              {isLookIntensityOpen && (
                <div className="mt-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="relative h-2 w-full bg-white/10">
                    <div
                      className="absolute inset-0 bg-gradient-to-r from-amber-700/40 via-amber-500/35 to-blue-500/30"
                      style={{ width: `${(settings.lutStrength || 0) * 100}%` }}
                    />
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={settings.lutStrength || 0}
                      onChange={(e) =>
                        updateSetting("lutStrength", parseFloat(e.target.value))
                      }
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-3">
                    <div className="border border-[var(--intaglio-line)] bg-black/25 px-4 py-3">
                      <div className="font-mono intaglio-label text-white/30">
                        Grain
                      </div>
                      <div className="mt-1 text-sm font-light text-white/70">
                        {(settings.grain * 100).toFixed(0)}
                      </div>
                    </div>
                    <div className="border border-[var(--intaglio-line)] bg-black/25 px-4 py-3">
                      <div className="font-mono intaglio-label text-white/30">
                        Bloom
                      </div>
                      <div className="mt-1 text-sm font-light text-white/70">
                        {(settings.halation * 100).toFixed(0)}
                      </div>
                    </div>
                    <div className="border border-[var(--intaglio-line)] bg-black/25 px-4 py-3">
                      <div className="font-mono intaglio-label text-white/30">
                        Temp
                      </div>
                      <div className="mt-1 text-sm font-light text-white/70">
                        {settings.temperature > 0 ? "+" : ""}
                        {(settings.temperature * 100).toFixed(0)}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Canvas Area with Zoom/Pan - Only show when image is loaded */}
          {imageSrc && (
            <div 
              className="w-full h-full origin-center transition-transform ease-out duration-75 relative"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                cursor: brushMaskActive ? "crosshair" : "grab"
              }}
            >
              {settings.wiperActive && (
                <div 
                  className="absolute top-0 bottom-0 z-10 w-1 bg-white shadow-[0_0_10px_rgba(0,0,0,0.5)] cursor-col-resize hover:bg-amber-400 transition-colors"
                  style={{ left: `${wiperPosition * 100}%` }}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    isDraggingWiper.current = true;
                    (e.target as HTMLElement).setPointerCapture(e.pointerId);
                  }}
                  onPointerMove={(e) => {
                    if (!isDraggingWiper.current) return;
                    e.stopPropagation();
                    const parentRect = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
                    const x = Math.max(0, Math.min(1, (e.clientX - parentRect.left) / parentRect.width));
                    setWiperPosition(x);
                  }}
                  onPointerUp={(e) => {
                    isDraggingWiper.current = false;
                    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
                  }}
                >
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-8 bg-white rounded-full flex items-center justify-center shadow-md">
                    <div className="flex gap-0.5">
                      <div className="w-[1px] h-3 bg-black/30" />
                      <div className="w-[1px] h-3 bg-black/30" />
                    </div>
                  </div>
                </div>
              )}
              <CinematicEditor
                settings={settings}
                imageUrl={imageSrc}
                rawSource={rawSource}
                wiperPosition={wiperPosition}
                onStatsUpdate={setHistogram}
                textOverlay={textOverlay}
                setTextOverlay={setTextOverlay}
                onCanvasReady={setBrushCanvas}
                watermark={watermark}
                brushMaskActive={brushMaskActive}
                brushSize={brushSize}
                brushFeather={brushFeather}
                brushErasing={brushErasing}
                brushCanvas={brushCanvas}
                brushCanvasDirty={brushCanvasDirty}
                performanceMode={performanceMode}
                compositionGuide={compositionGuide}
                onBrushMaskUpdate={() => setBrushCanvasDirty((v: number) => v + 1)}
                onBrushStrokeComplete={(stroke) => {
                  const plate = settings.adjustmentLayers.find((layer) => layer.id === activePlateId);
                  const brushMaskId = plate?.maskIds.find((id) => settings.masks.find((mask) => mask.id === id)?.type === "brush");
                  if (!brushMaskId) return;
                  updateSetting("masks", settings.masks.map((mask) => mask.id === brushMaskId && mask.type === "brush" ? { ...mask, params: { strokes: [...mask.params.strokes, stroke] } } : mask));
                }}
                onBoundsChange={setImageBounds}
              />
              
              <GridOverlay mode={gridOverlayMode} bounds={imageBounds} />

              {/* ROI Selection Overlay */}
              {imageBounds && roiMode === "source" && (
                <div
                  className="absolute z-20 cursor-crosshair border-2 border-amber-500/50 bg-amber-500/10"
                  style={{
                    left: imageBounds.left,
                    top: imageBounds.top,
                    width: imageBounds.width,
                    height: imageBounds.height,
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    const rect = e.currentTarget.getBoundingClientRect();
                    const startX = (e.clientX - rect.left) / rect.width;
                    const startY = (e.clientY - rect.top) / rect.height;

                    // Start new ROI
                    setSourceROI({ x: startX, y: startY, w: 0, h: 0 });

                    const handleMouseMove = (ev: MouseEvent) => {
                      const currX = (ev.clientX - rect.left) / rect.width;
                      const currY = (ev.clientY - rect.top) / rect.height;

                      const minX = Math.min(startX, currX);
                      const minY = Math.min(startY, currY);
                      const w = Math.abs(currX - startX);
                      const h = Math.abs(currY - startY);

                      setSourceROI({ x: minX, y: minY, w, h });
                    };

                    const handleMouseUp = () => {
                      window.removeEventListener("mousemove", handleMouseMove);
                      window.removeEventListener("mouseup", handleMouseUp);
                      // Remain in ROI mode to allow adjustments? Or exit?
                      // Let's stay in ROI mode until user clicks "Done" or toggles off.
                    };

                    window.addEventListener("mousemove", handleMouseMove);
                    window.addEventListener("mouseup", handleMouseUp);
                  }}
                >
                  {/* Render the ROI Box */}
                  {sourceROI && (
                    <div
                      className="absolute border border-white boxShadow-xl bg-white/10 backdrop-invert"
                      style={{
                        left: `${sourceROI.x * 100}%`,
                        top: `${sourceROI.y * 100}%`,
                        width: `${sourceROI.w * 100}%`,
                        height: `${sourceROI.h * 100}%`,
                      }}
                    >
                      <div className="absolute -top-6 left-0 bg-amber-500 text-black text-[10px] font-bold px-1 rounded-sm uppercase">
                        Source Region
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <div role="button" tabIndex={0}
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="hidden"
        >
          {isMobileMenuOpen ? <IconX className="intaglio-icon"/> : <IconMenu2 className="intaglio-icon"/>}
        </div>

        {/* Bottom Actions Panel - Hidden on Mobile */}
        <div className={`${isFocusMode ? "hidden" : "hidden md:grid"} h-[112px] grid-cols-5 gap-px border-t border-[var(--intaglio-line)] bg-white/10`}>
          <div role="button" tabIndex={0}
            onClick={() => updateSetting("wiperActive", !settings.wiperActive)}
            className={`group bg-[#0d0c0a] p-4 text-left transition-all ${settings.wiperActive ? "text-amber-100" : "text-white/65 hover:bg-[#15130f]"}`}
          >
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.28em] text-white/60 group-hover:text-white/70">
              <IconAdjustmentsHorizontal className="intaglio-icon"/> Before / After
            </div>
            <div className="mt-3 text-xs font-light leading-5 text-white/60">
              {settings.wiperActive ? "Split compare active" : "Original compare off"}
            </div>
          </div>
          <div role="button" tabIndex={0}
            onClick={() => setActiveTab("history")}
            className={`group bg-[#0d0c0a] p-4 text-left transition-all ${activeTab === "history" ? "text-amber-100" : "text-white/65 hover:bg-[#15130f]"}`}
          >
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.28em] text-white/60 group-hover:text-white/70">
              <IconHistory className="intaglio-icon"/> History
            </div>
            <div className="mt-3 text-xs font-light leading-5 text-white/60">
              {history.length} states recorded.
            </div>
          </div>
          <div role="button" tabIndex={0}
            onClick={handleCreateVirtualCopy}
            className="group bg-[#0d0c0a] p-4 text-left text-white/65 transition-all hover:bg-[#15130f]"
          >
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.28em] text-white/60 group-hover:text-white/70">
              <IconLayersIntersect className="intaglio-icon"/> Versions
            </div>
            <div className="mt-3 text-xs font-light leading-5 text-white/60">
              {settingsSnapshots.length} virtual copies
            </div>
          </div>
          <div role="button" tabIndex={0}
            onClick={() => setActiveTab("metadata")}
            className="group bg-[#0d0c0a] p-4 text-left text-white/65 transition-all hover:bg-[#15130f]"
          >
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.28em] text-white/60 group-hover:text-white/70">
              <IconInfoCircle className="intaglio-icon"/> Culling
            </div>
            <div className="mt-3 text-xs font-light leading-5 text-white/60">
              {assetMetadata.rating > 0 ? `${assetMetadata.rating}/5` : "No rating"} /{" "}
              {assetMetadata.flagStatus}
            </div>
          </div>
          <div role="button" tabIndex={0}
            onClick={() => setIsExportModalOpen(true)}
            className="group bg-[#0d0c0a] p-4 text-left text-white/65 transition-all hover:bg-[#15130f]"
          >
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.28em] text-white/60 group-hover:text-white/70">
              <IconDownload className="intaglio-icon"/> Export
            </div>
            <div className="mt-3 text-xs font-light leading-5 text-white/60">
              {activeExportRecipeId ?? exportFormat.split("/")[1].toUpperCase()}{" "}
              • {exportQuality}%
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
