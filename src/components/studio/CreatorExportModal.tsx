"use client";

import React, { useState, useRef, useEffect } from "react";
import { X, Download, Smartphone, Monitor, Square, Sparkles, Check, Image as ImageIcon, ShieldCheck, Film, AlertCircle } from "lucide-react";
import type { TierRow } from "@/types";

interface CreatorExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  boardTitle: string;
  authorName?: string;
  tiers: TierRow[];
  onSwitchToVideo?: () => void;
}

export type ExportRatio = "16:9" | "9:16" | "1:1";
export type ExportResolution = "2k" | "4k";

export function CreatorExportModal({
  isOpen,
  onClose,
  boardTitle,
  authorName = "Creator",
  tiers,
  onSwitchToVideo,
}: CreatorExportModalProps) {
  const [ratio, setRatio] = useState<ExportRatio>("16:9");
  const [resolution, setResolution] = useState<ExportResolution>("4k");
  const [showWatermark, setShowWatermark] = useState(false);
  const [showTitleHeader, setShowTitleHeader] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const captureRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleDownload = async () => {
    if (!captureRef.current) return;
    setIsExporting(true);
    setExportError(null);

    try {
      const { toPng } = await import("html-to-image");
      const pixelRatio = resolution === "4k" ? 2.5 : 1.5;
      const dataUrl = await toPng(captureRef.current, {
        quality: 0.98,
        pixelRatio,
        cacheBust: true,
      });

      const filename = `${boardTitle.replace(/[^a-z0-9]/gi, "-").toLowerCase()}-${ratio.replace(":", "x")}-${resolution}.png`;
      const link = document.createElement("a");
      link.download = filename;
      link.href = dataUrl;
      link.click();
      onClose();
    } catch (err: any) {
      console.error("Failed to render export image", err);
      setExportError(
        "Export failed: Some external images blocked cross-origin rendering (CORS). Try re-uploading or removing external images."
      );
    } finally {
      setIsExporting(false);
    }
  };

  // Dynamic dimensions for hidden high-res capture container
  const getContainerDimensions = () => {
    switch (ratio) {
      case "9:16":
        return "w-[1080px] min-h-[1920px] p-12";
      case "1:1":
        return "w-[1200px] min-h-[1200px] p-10";
      case "16:9":
      default:
        return "w-[1920px] min-h-[1080px] p-12";
    }
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl relative space-y-6 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Multi-Format 4K Exporter</span>
                <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[11px] font-semibold">
                  Creator Studio
                </span>
              </h3>
              <p className="text-xs text-zinc-400">
                Tailored aspect ratios for YouTube, TikTok, Reels, and Discord.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1.5 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {exportError && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">{exportError}</p>
            </div>
            <button
              type="button"
              onClick={() => setExportError(null)}
              className="text-rose-400 hover:text-rose-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Export Mode Switcher (Static 4K Image vs Animated Video) */}
        <div className="flex p-1 rounded-xl bg-zinc-950 border border-zinc-800 text-xs">
          <button
            type="button"
            className="flex-1 py-2 px-3 rounded-lg font-bold bg-zinc-800 text-white shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
            <span>Static 4K Image</span>
          </button>
          <button
            type="button"
            data-tab="video-export"
            onClick={() => {
              onClose();
              onSwitchToVideo?.();
            }}
            className="flex-1 py-2 px-3 rounded-lg font-bold text-zinc-400 hover:text-rose-300 hover:bg-zinc-900/60 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Film className="w-3.5 h-3.5 text-rose-400" />
            <span>🎬 Animated Video (TikTok / Shorts)</span>
          </button>
        </div>

        {/* Aspect Ratio Selector */}
        <div className="space-y-2.5">
          <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block">
            Select Target Format & Aspect Ratio
          </label>
          <div className="grid grid-cols-3 gap-3">
            {/* 16:9 Landscape */}
            <button
              type="button"
              onClick={() => setRatio("16:9")}
              className={`p-3.5 rounded-xl border flex flex-col items-center justify-center gap-2 text-center transition-all cursor-pointer ${
                ratio === "16:9"
                  ? "bg-indigo-600/15 border-indigo-500 text-white shadow-md shadow-indigo-600/20"
                  : "bg-zinc-800/60 border-zinc-750 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
              }`}
            >
              <Monitor className={`w-5 h-5 ${ratio === "16:9" ? "text-indigo-400" : ""}`} />
              <div>
                <span className="text-xs font-bold block">16:9 Landscape</span>
                <span className="text-[10px] text-zinc-400">YouTube & Desktop</span>
              </div>
            </button>

            {/* 9:16 Vertical Video */}
            <button
              type="button"
              onClick={() => setRatio("9:16")}
              className={`p-3.5 rounded-xl border flex flex-col items-center justify-center gap-2 text-center transition-all cursor-pointer ${
                ratio === "9:16"
                  ? "bg-indigo-600/15 border-indigo-500 text-white shadow-md shadow-indigo-600/20"
                  : "bg-zinc-800/60 border-zinc-750 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
              }`}
            >
              <Smartphone className={`w-5 h-5 ${ratio === "9:16" ? "text-indigo-400" : ""}`} />
              <div>
                <span className="text-xs font-bold block">9:16 Vertical</span>
                <span className="text-[10px] text-zinc-400">TikTok & Shorts</span>
              </div>
            </button>

            {/* 1:1 Square */}
            <button
              type="button"
              onClick={() => setRatio("1:1")}
              className={`p-3.5 rounded-xl border flex flex-col items-center justify-center gap-2 text-center transition-all cursor-pointer ${
                ratio === "1:1"
                  ? "bg-indigo-600/15 border-indigo-500 text-white shadow-md shadow-indigo-600/20"
                  : "bg-zinc-800/60 border-zinc-750 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
              }`}
            >
              <Square className={`w-5 h-5 ${ratio === "1:1" ? "text-indigo-400" : ""}`} />
              <div>
                <span className="text-xs font-bold block">1:1 Square</span>
                <span className="text-[10px] text-zinc-400">Instagram & Discord</span>
              </div>
            </button>
          </div>
        </div>

        {/* Toggles & Options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {/* Resolution Toggle */}
          <div className="p-3 rounded-xl bg-zinc-800/50 border border-zinc-750 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-zinc-200 block">Image Quality</span>
              <span className="text-[11px] text-zinc-400">
                {resolution === "4k" ? "Ultra-HD 4K (Crisp)" : "Standard 1080p (Fast)"}
              </span>
            </div>
            <div className="flex bg-zinc-900 border border-zinc-700/80 rounded-lg p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setResolution("2k")}
                className={`px-2.5 py-1 rounded font-semibold cursor-pointer ${
                  resolution === "2k" ? "bg-zinc-800 text-white" : "text-zinc-400"
                }`}
              >
                1080p
              </button>
              <button
                type="button"
                onClick={() => setResolution("4k")}
                className={`px-2.5 py-1 rounded font-semibold cursor-pointer ${
                  resolution === "4k" ? "bg-indigo-600 text-white" : "text-zinc-400"
                }`}
              >
                4K UHD
              </button>
            </div>
          </div>

          {/* Watermark Toggle */}
          <div className="p-3 rounded-xl bg-zinc-800/50 border border-zinc-750 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-zinc-200 block">Watermark</span>
              <span className="text-[11px] text-zinc-400">
                {showWatermark ? "Tier List Maker Badge included" : "100% Clean (No Watermark)"}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowWatermark(!showWatermark)}
              className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${
                showWatermark ? "bg-indigo-600" : "bg-zinc-700"
              }`}
            >
              <span
                className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${
                  showWatermark ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Title Header Toggle */}
        <div className="p-3 rounded-xl bg-zinc-800/50 border border-zinc-750 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-zinc-200 block">Display Title Header</span>
            <span className="text-[11px] text-zinc-400">
              Embed board title and author credit directly at top of the image
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowTitleHeader(!showTitleHeader)}
            className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${
              showTitleHeader ? "bg-indigo-600" : "bg-zinc-700"
            }`}
          >
            <span
              className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${
                showTitleHeader ? "translate-x-4" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
          <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>High-speed client-side rendering</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-750 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isExporting}
              onClick={handleDownload}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? "Rendering PNG..." : `Download ${resolution.toUpperCase()} PNG`}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Off-Screen High-Resolution Capture Element */}
      <div
        className="fixed left-[-9999px] top-[-9999px] pointer-events-none overflow-hidden"
        aria-hidden="true"
      >
        <div
          ref={captureRef}
          className={`bg-[#09090b] text-[#f4f4f5] flex flex-col justify-between ${getContainerDimensions()}`}
          style={{ fontFamily: "inherit" }}
        >
          {/* Header */}
          {showTitleHeader && (
            <div className="border-b border-zinc-800 pb-6 mb-8 flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-extrabold text-white tracking-tight">
                  {boardTitle}
                </h1>
                <p className="text-lg text-zinc-400 mt-1">
                  Ranked by <span className="text-zinc-200 font-semibold">@{authorName}</span>
                </p>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-zinc-900 border border-zinc-800">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                <span className="font-bold text-sm text-zinc-200">Tier List Maker Verified</span>
              </div>
            </div>
          )}

          {/* Tier Rows */}
          <div className="space-y-4 flex-1">
            {tiers.map((tier) => (
              <div
                key={tier.id}
                className="flex rounded-2xl overflow-hidden bg-zinc-900/90 border border-zinc-800 min-h-[110px]"
              >
                {/* Tier Label Badge */}
                <div
                  className={`w-36 bg-gradient-to-br ${tier.color} flex items-center justify-center font-extrabold text-3xl text-white select-none p-4 text-center break-words shadow-inner flex-shrink-0`}
                >
                  <span>{tier.label}</span>
                </div>

                {/* Tier Items */}
                <div className="flex-1 p-3 flex flex-wrap content-start gap-3 min-h-[110px]">
                  {tier.items.length === 0 ? (
                    <span className="text-sm text-zinc-600 italic px-4 select-none flex items-center h-full">
                      No items
                    </span>
                  ) : (
                    tier.items.map((item) => (
                      <div
                        key={item.id}
                        className={`rounded-xl border select-none overflow-hidden ${
                          item.imageUrl
                            ? "w-24 h-24 bg-zinc-950 flex items-center justify-center border-zinc-700/80 shadow-md"
                            : "px-4 py-3 bg-zinc-800 text-zinc-100 text-sm font-semibold flex items-center border-zinc-700/80 shadow-md"
                        }`}
                      >
                        {item.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-full h-full object-cover"
                            crossOrigin="anonymous"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                              if (e.currentTarget.parentElement) {
                                e.currentTarget.parentElement.innerText = item.name;
                              }
                            }}
                          />
                        ) : (
                          <span>{item.name}</span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Footer / Watermark */}
          {showWatermark && (
            <div className="pt-8 border-t border-zinc-800/80 flex items-center justify-between text-zinc-500 text-sm">
              <span>Made with Tier List Maker — The Next-Generation UGC Tier List Platform</span>
              <span className="font-bold text-zinc-400">tierlistmaker.app</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
