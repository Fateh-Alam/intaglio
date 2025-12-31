"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  IconMovie,
  IconUpload,
  IconPlayerPlay,
  IconPlayerPause,
  IconPlayerSkipBack,
  IconPlayerSkipForward,
  IconCamera,
  IconX,
  IconAdjustments,
} from "@tabler/icons-react";

interface VideoGradingPanelProps {
  isOpen: boolean;
  onClose: () => void;
  settings: Record<string, any>;
  onExtractFrame: (imageDataUrl: string) => void;
}

export default function VideoGradingPanel({
  isOpen,
  onClose,
  settings,
  onExtractFrame,
}: VideoGradingPanelProps) {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoName, setVideoName] = useState<string>("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Calculate CSS filters from settings
  const getCssFilters = useCallback(() => {
    const filters: string[] = [];

    // Brightness (base 100%, range -1 to 1 -> 0% to 200%)
    const brightness = 100 + (settings.brightness || 0) * 100;
    filters.push(`brightness(${brightness}%)`);

    // Contrast (base 100%, range -1 to 1 -> 0% to 200%)
    const contrast = 100 + (settings.contrast || 0) * 100;
    filters.push(`contrast(${contrast}%)`);

    // Saturation (base 100%, range 0 to 2 -> 0% to 200%)
    const saturation = 100 + (settings.vibrance || 0) * 50;
    filters.push(`saturate(${saturation}%)`);

    // Hue rotation (temperature approximation)
    const hueRotate = (settings.temperature || 0) * 30;
    filters.push(`hue-rotate(${hueRotate}deg)`);

    // Sepia for warming (if positive temperature)
    if ((settings.temperature || 0) > 0) {
      filters.push(`sepia(${(settings.temperature || 0) * 20}%)`);
    }

    return filters.join(" ");
  }, [settings]);

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setVideoUrl(url);
      setVideoName(file.name);
      setIsPlaying(false);
      setCurrentTime(0);
    }
  };

  const handlePlayPause = () => {
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return;
    const time = parseFloat(e.target.value);
    videoRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const handleSkip = (seconds: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(
      0,
      Math.min(duration, videoRef.current.currentTime + seconds)
    );
  };

  const handleExtractFrame = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL("image/png");
    onExtractFrame(dataUrl);
    onClose();
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleLoadedMetadata = () => setDuration(video.duration);
    const handleEnded = () => setIsPlaying(false);

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("ended", handleEnded);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("ended", handleEnded);
    };
  }, [videoUrl]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" />

      {/* Modal */}
      <div
        className="relative w-full max-w-4xl bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-rose-500/15 text-rose-400">
              <IconMovie size={20} />
            </div>
            <div>
              <h2 className="text-lg font-light text-white">
                Video Color Grading
              </h2>
              <p className="text-xs text-gray-500 font-mono uppercase tracking-widest">
                Preview & Extract Frames
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 text-gray-500 hover:text-white transition"
          >
            <IconX size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {!videoUrl ? (
            /* Upload Area */
            <label className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-white/10 rounded-xl hover:border-rose-500/50 hover:bg-rose-500/5 transition cursor-pointer">
              <IconUpload size={48} className="text-gray-600 mb-4" />
              <span className="text-gray-400 text-sm mb-2">
                Click to upload video
              </span>
              <span className="text-gray-600 text-xs">
                .mp4, .mov, .webm supported
              </span>
              <input
                type="file"
                accept="video/mp4,video/quicktime,video/webm"
                onChange={handleVideoUpload}
                className="hidden"
              />
            </label>
          ) : (
            <>
              {/* Video Preview */}
              <div className="relative bg-black rounded-xl overflow-hidden mb-4">
                <video
                  ref={videoRef}
                  src={videoUrl}
                  className="w-full max-h-[400px] object-contain"
                  style={{ filter: getCssFilters() }}
                  playsInline
                />

                {/* Grading Indicator */}
                <div className="absolute top-3 left-3 px-2 py-1 bg-black/70 rounded-lg flex items-center gap-1.5 text-[10px] text-rose-400 font-mono uppercase">
                  <IconAdjustments size={12} /> Live Grade
                </div>
              </div>

              {/* Hidden canvas for frame extraction */}
              <canvas ref={canvasRef} className="hidden" />

              {/* Video Info */}
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-gray-400 truncate max-w-md">
                  {videoName}
                </span>
                <span className="text-xs text-gray-500 font-mono">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <input
                  type="range"
                  min={0}
                  max={duration || 1}
                  step={0.01}
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full accent-rose-500"
                />
              </div>

              {/* Controls */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleSkip(-5)}
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition"
                    title="Skip back 5s"
                  >
                    <IconPlayerSkipBack size={18} />
                  </button>
                  <button
                    onClick={handlePlayPause}
                    className="p-3 rounded-xl bg-rose-500 hover:bg-rose-400 text-white transition"
                  >
                    {isPlaying ? (
                      <IconPlayerPause size={20} />
                    ) : (
                      <IconPlayerPlay size={20} />
                    )}
                  </button>
                  <button
                    onClick={() => handleSkip(5)}
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition"
                    title="Skip forward 5s"
                  >
                    <IconPlayerSkipForward size={18} />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExtractFrame}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 hover:bg-amber-500/25 transition font-mono text-xs uppercase"
                  >
                    <IconCamera size={16} /> Extract Frame
                  </button>
                  <label className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 transition font-mono text-xs uppercase cursor-pointer">
                    <IconUpload size={16} /> New Video
                    <input
                      type="file"
                      accept="video/mp4,video/quicktime,video/webm"
                      onChange={handleVideoUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Info Box */}
              <div className="mt-6 p-4 bg-white/5 rounded-xl border border-white/10">
                <p className="text-xs text-gray-500 leading-relaxed">
                  <strong className="text-gray-400">Live Preview:</strong> Your
                  current color grade is applied in real-time using CSS filters.
                  Use <strong className="text-amber-400">Extract Frame</strong>{" "}
                  to grab the current frame and edit it with full grading
                  controls.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
