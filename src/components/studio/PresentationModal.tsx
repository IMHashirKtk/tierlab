"use client";

import React, { useEffect, useState } from "react";
import { X, Maximize, Minimize, Download, Sparkles, Layers } from "lucide-react";
import type { TierRow } from "@/types";

interface PresentationModalProps {
  isOpen: boolean;
  onClose: () => void;
  boardTitle: string;
  authorName?: string;
  tiers: TierRow[];
  onOpenExport?: () => void;
}

export function PresentationModal({
  isOpen,
  onClose,
  boardTitle,
  authorName = "Creator",
  tiers,
  onOpenExport,
}: PresentationModalProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = React.useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  }, []);

  // Esc key listener
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        } else {
          onClose();
        }
      } else if (e.key === "f" || e.key === "F") {
        toggleFullscreen();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, toggleFullscreen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[#09090b] z-50 flex flex-col p-4 sm:p-8 overflow-y-auto select-none">
      {/* Floating Presenter Toolbar (fades in on top) */}
      <div className="flex items-center justify-between pb-6 border-b border-zinc-800/80 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {boardTitle}
            </h1>
            <p className="text-xs text-zinc-400">
              Ranked by <span className="text-zinc-200 font-semibold">@{authorName}</span> • Presenter View
            </p>
          </div>
        </div>

        {/* Action Pills */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleFullscreen}
            className="p-2 sm:px-3 sm:py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700/80 flex items-center gap-1.5 text-xs font-semibold cursor-pointer transition-colors"
            title="Toggle Fullscreen (F)"
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            <span className="hidden sm:inline">{isFullscreen ? "Exit Fullscreen" : "Fullscreen (F)"}</span>
          </button>

          {onOpenExport && (
            <button
              onClick={() => {
                onClose();
                onOpenExport();
              }}
              className="px-3 sm:px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Export 4K</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors cursor-pointer"
            title="Close Presenter Mode (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main High-Contrast Tier Board Presentation Stage */}
      <div className="flex-1 max-w-6xl w-full mx-auto space-y-4">
        {tiers.map((tier) => (
          <div
            key={tier.id}
            className="flex rounded-2xl overflow-hidden bg-zinc-900/90 border border-zinc-800 min-h-[96px] shadow-2xl transition-all"
          >
            {/* Tier Label Badge */}
            <div
              className={`w-28 sm:w-36 bg-gradient-to-br ${tier.color} flex items-center justify-center font-black text-2xl sm:text-3xl text-white select-none p-3 text-center break-words shadow-inner flex-shrink-0`}
            >
              <span>{tier.label}</span>
            </div>

            {/* Items */}
            <div className="flex-1 p-3 flex flex-wrap content-start gap-3 min-h-[96px]">
              {tier.items.length === 0 ? (
                <span className="text-xs text-zinc-600 italic px-4 select-none flex items-center h-full">
                  Empty Tier
                </span>
              ) : (
                tier.items.map((item) => (
                  <div
                    key={item.id}
                    className={`rounded-xl border select-none overflow-hidden transition-transform duration-200 hover:scale-105 ${
                      item.imageUrl
                        ? "w-20 h-20 sm:w-24 sm:h-24 bg-zinc-950 flex items-center justify-center border-zinc-700/80 shadow-md"
                        : "px-4 py-3 bg-zinc-800 text-zinc-100 text-xs sm:text-sm font-semibold flex items-center border-zinc-700/80 shadow-md"
                    }`}
                    title={item.name}
                  >
                    {item.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="truncate">{item.name}</span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Presentation Footer */}
      <div className="pt-8 text-center text-xs text-zinc-500">
        Press <kbd className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono">Esc</kbd> to exit presentation mode • Press <kbd className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono">F</kbd> for fullscreen
      </div>
    </div>
  );
}
