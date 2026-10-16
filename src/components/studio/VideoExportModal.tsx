"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Video,
  Download,
  Smartphone,
  Square,
  Monitor,
  Volume2,
  VolumeX,
  Sparkles,
  Play,
  RotateCcw,
  CheckCircle2,
  Loader2,
  Film,
  Zap,
} from "lucide-react";
import { renderAnimatedTierListVideo } from "@/lib/video-renderer";
import type { TierRow } from "@/types";

interface VideoExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  boardTitle: string;
  authorName?: string;
  tiers: TierRow[];
}

export function VideoExportModal({
  isOpen,
  onClose,
  boardTitle,
  authorName = "Creator",
  tiers,
}: VideoExportModalProps) {
  const [ratio, setRatio] = useState<"9:16" | "1:1" | "16:9">("9:16");
  const [speed, setSpeed] = useState<"fast" | "normal" | "dramatic">("normal");
  const [withAudio, setWithAudio] = useState(true);
  const [withWatermark, setWithWatermark] = useState(false);

  const [isRendering, setIsRendering] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressStatus, setProgressStatus] = useState("");
  const [renderedVideoUrl, setRenderedVideoUrl] = useState<string | null>(null);
  const [renderedBlob, setRenderedBlob] = useState<Blob | null>(null);
  const [renderedMime, setRenderedMime] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isRendering) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isRendering, onClose]);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      if (renderedVideoUrl) URL.revokeObjectURL(renderedVideoUrl);
    };
  }, [renderedVideoUrl]);

  if (!isOpen) return null;

  const totalPlacedItems = tiers.reduce((sum, t) => sum + t.items.length, 0);

  const handleStartRender = async () => {
    if (totalPlacedItems === 0) {
      setError("Please place at least one item on the board before exporting a video.");
      return;
    }

    setIsRendering(true);
    setProgress(0);
    setError(null);
    setProgressStatus("Preloading board images & preparing canvas...");

    try {
      const result = await renderAnimatedTierListVideo({
        boardTitle,
        authorName,
        tiers,
        ratio,
        speed,
        withAudio,
        withWatermark,
        onProgress: (pct, frame, total) => {
          setProgress(pct);
          setProgressStatus(`Rendering frame ${frame} of ${total} (${pct}%)...`);
        },
      });

      setRenderedVideoUrl(result.url);
      setRenderedBlob(result.blob);
      setRenderedMime(result.mimeType);
      setIsRendering(false);
    } catch (err: unknown) {
      console.error("Video render failed:", err);
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || "Failed to render video. Please try again.");
      setIsRendering(false);
    }
  };

  const handleDownload = () => {
    if (!renderedVideoUrl) return;
    const isMp4 = renderedMime.includes("mp4");
    const ext = isMp4 ? "mp4" : "webm";
    const cleanTitle = boardTitle.replace(/[^a-z0-9]/gi, "-").toLowerCase();
    const filename = `${cleanTitle}-reveal-${ratio.replace(":", "x")}.${ext}`;

    const link = document.createElement("a");
    link.href = renderedVideoUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleReset = () => {
    if (renderedVideoUrl) URL.revokeObjectURL(renderedVideoUrl);
    setRenderedVideoUrl(null);
    setRenderedBlob(null);
    setProgress(0);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-auto relative animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-pink-500 to-rose-600 flex items-center justify-center text-white shadow-lg shadow-pink-500/20 flex-shrink-0">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-zinc-100 flex items-center gap-2">
                <span>Animated Video Export</span>
                <span className="px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[10px] font-bold uppercase tracking-wider">
                  TikTok / Shorts
                </span>
              </h3>
              <p className="text-xs text-zinc-400">
                Client-side video reveal animation. 100% private in-browser rendering.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isRendering}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 transition-colors cursor-pointer flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-5">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <span>⚠️ {error}</span>
            </div>
          )}

          {/* If video is already rendered: Show Preview Player */}
          {renderedVideoUrl ? (
            <div className="space-y-4">
              <div className="p-3 bg-zinc-950 rounded-2xl border border-zinc-800 flex flex-col items-center">
                <div
                  className={`w-full overflow-hidden rounded-xl bg-black flex items-center justify-center shadow-2xl relative ${
                    ratio === "9:16"
                      ? "max-w-[280px] aspect-[9/16]"
                      : ratio === "1:1"
                      ? "max-w-[360px] aspect-square"
                      : "max-w-[480px] aspect-video"
                  }`}
                >
                  <video
                    ref={videoRef}
                    src={renderedVideoUrl}
                    controls
                    autoPlay
                    loop
                    playsInline
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="mt-3 text-center">
                  <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Video Rendered Successfully!</span>
                  </div>
                  <span className="text-[11px] text-zinc-500">
                    {renderedBlob
                      ? `${(renderedBlob.size / (1024 * 1024)).toFixed(2)} MB • ${
                          renderedMime.includes("mp4") ? "MP4" : "WebM"
                        }`
                      : ""}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={handleReset}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-zinc-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Configure Another Style</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownload}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 via-pink-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-rose-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Video File</span>
                </button>
              </div>
            </div>
          ) : isRendering ? (
            /* Rendering Progress State */
            <div className="py-12 px-6 flex flex-col items-center justify-center text-center space-y-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 animate-pulse">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
              </div>

              <div className="space-y-1">
                <h4 className="text-base font-bold text-white">Rendering Animated Video</h4>
                <p className="text-xs text-zinc-400 max-w-sm">{progressStatus}</p>
              </div>

              {/* Progress Bar */}
              <div className="w-full max-w-md bg-zinc-800 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-rose-500 via-pink-500 to-indigo-500 h-full transition-all duration-150"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-xs font-mono font-bold text-zinc-300">{progress}%</span>
            </div>
          ) : (
            /* Video Configuration Form */
            <div className="space-y-5">
              {/* Aspect Ratio Selector */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
                  1. Choose Social Format
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setRatio("9:16")}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all cursor-pointer text-center relative ${
                      ratio === "9:16"
                        ? "bg-rose-500/10 border-rose-500/50 text-white shadow-md shadow-rose-500/10"
                        : "bg-zinc-800/60 border-zinc-750 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <span className="absolute -top-2 right-2 px-1.5 py-0.2 rounded bg-rose-500 text-[9px] font-bold text-white uppercase">
                      Viral
                    </span>
                    <Smartphone className="w-5 h-5 text-rose-400" />
                    <div>
                      <div className="text-xs font-bold">9:16 Vertical</div>
                      <div className="text-[10px] text-zinc-500">TikTok / Reels / Shorts</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRatio("1:1")}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all cursor-pointer text-center ${
                      ratio === "1:1"
                        ? "bg-rose-500/10 border-rose-500/50 text-white shadow-md shadow-rose-500/10"
                        : "bg-zinc-800/60 border-zinc-750 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <Square className="w-5 h-5 text-indigo-400" />
                    <div>
                      <div className="text-xs font-bold">1:1 Square</div>
                      <div className="text-[10px] text-zinc-500">Instagram / Discord</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRatio("16:9")}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all cursor-pointer text-center ${
                      ratio === "16:9"
                        ? "bg-rose-500/10 border-rose-500/50 text-white shadow-md shadow-rose-500/10"
                        : "bg-zinc-800/60 border-zinc-750 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <Monitor className="w-5 h-5 text-cyan-400" />
                    <div>
                      <div className="text-xs font-bold">16:9 Landscape</div>
                      <div className="text-[10px] text-zinc-500">YouTube / Twitter / X</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Reveal Pacing */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
                  2. Animation Pacing
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setSpeed("fast")}
                    className={`p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer text-left ${
                      speed === "fast"
                        ? "bg-zinc-800 border-indigo-500 text-white"
                        : "bg-zinc-800/40 border-zinc-750 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-zinc-100">
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      <span>Fast Blitz</span>
                    </div>
                    <div className="text-[10px] text-zinc-500 mt-0.5">~8s quick reveal</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSpeed("normal")}
                    className={`p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer text-left ${
                      speed === "normal"
                        ? "bg-zinc-800 border-indigo-500 text-white"
                        : "bg-zinc-800/40 border-zinc-750 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-zinc-100">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Classic Reveal</span>
                    </div>
                    <div className="text-[10px] text-zinc-500 mt-0.5">~14s balanced pacing</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSpeed("dramatic")}
                    className={`p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer text-left ${
                      speed === "dramatic"
                        ? "bg-zinc-800 border-indigo-500 text-white"
                        : "bg-zinc-800/40 border-zinc-750 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-zinc-100">
                      <Film className="w-3.5 h-3.5 text-rose-400" />
                      <span>Dramatic Suspense</span>
                    </div>
                    <div className="text-[10px] text-zinc-500 mt-0.5">~20s climax with pause</div>
                  </button>
                </div>
              </div>

              {/* Audio & Watermark Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Audio SFX Toggle */}
                <div className="p-3 rounded-xl bg-zinc-800/50 border border-zinc-750 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    {withAudio ? (
                      <Volume2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    ) : (
                      <VolumeX className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                    )}
                    <div>
                      <span className="text-xs font-bold text-zinc-200 block">Synthesized SFX</span>
                      <span className="text-[10px] text-zinc-400">
                        {withAudio ? "Impact drops & fanfare on" : "Silent (Add TikTok music)"}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    title="Toggle Synthesized SFX"
                    onClick={() => setWithAudio(!withAudio)}
                    className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${
                      withAudio ? "bg-emerald-600" : "bg-zinc-700"
                    }`}
                  >
                    <span
                      className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${
                        withAudio ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Watermark Toggle */}
                <div className="p-3 rounded-xl bg-zinc-800/50 border border-zinc-750 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-zinc-200 block">Watermark Badge</span>
                    <span className="text-[10px] text-zinc-400">
                      {withWatermark ? "Badge included" : "100% Clean (Zero Watermark)"}
                    </span>
                  </div>
                  <button
                    type="button"
                    title="Toggle Watermark Badge"
                    onClick={() => setWithWatermark(!withWatermark)}
                    className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${
                      withWatermark ? "bg-indigo-600" : "bg-zinc-700"
                    }`}
                  >
                    <span
                      className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${
                        withWatermark ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Render Launch Button */}
              <div className="pt-3 border-t border-zinc-800 flex items-center justify-between">
                <span className="text-xs text-zinc-400">
                  {totalPlacedItems} items will be animated onto the board.
                </span>

                <button
                  type="button"
                  onClick={handleStartRender}
                  disabled={totalPlacedItems === 0}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 via-pink-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold shadow-lg shadow-rose-600/25 flex items-center gap-2 transition-all cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Generate Animated Video</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
