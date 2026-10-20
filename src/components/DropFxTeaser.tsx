"use client";

import React, { useState } from "react";
import { Sparkles, Video } from "lucide-react";

export function DropFxTeaser() {
  const [fxState, setFxState] = useState(false);

  const triggerTestFx = async () => {
    setFxState(true);
    // Fire confetti particles
    const { default: confetti } = await import("canvas-confetti");
    confetti({
      zIndex: 20,
      disableForReducedMotion: true,
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#f43f5e", "#fbbf24", "#6366f1", "#06b6d4"],
    });
    setTimeout(() => setFxState(false), 1200);
  };

  return (
    <section id="dropfx" className="py-16 border-t border-zinc-800/80 bg-zinc-950/60 relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-semibold mb-3">
            <Video className="w-3.5 h-3.5" />
            <span>Content Creator Mode</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Drop FX: Engineered for YouTube & TikTok Clips
          </h2>
          <p className="text-zinc-400 text-sm sm:text-base mt-2">
            Add a confetti burst and a brief board shake when a card lands in the top tier. Turn effects off in the studio when you want a quieter workspace.
          </p>

          <div className="mt-6">
            <button
              onClick={triggerTestFx}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-zinc-950 bg-gradient-to-r from-amber-400 to-amber-300 hover:from-amber-300 hover:to-amber-200 shadow-lg shadow-amber-500/20 transition-all cursor-pointer inline-flex items-center gap-2 ${
                fxState ? "scale-95 ring-4 ring-amber-400/50" : "hover:scale-105"
              }`}
            >
              <Sparkles className="w-4 h-4 fill-zinc-950" />
              <span>Test Drop FX Explosion</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-2xl bg-zinc-900/50 border border-zinc-800 p-6 hover:border-zinc-700 transition-all">
            <div className="text-3xl mb-3">💥</div>
            <h3 className="text-base font-bold text-white mb-2">Game Impact Mode</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              A confetti burst celebrates cards placed in the top tier.
            </p>
          </div>

          <div className="rounded-2xl bg-zinc-900/50 border border-amber-500/30 bg-amber-500/5 p-6 transition-all">
            <div className="text-3xl mb-3">⚡</div>
            <h3 className="text-base font-bold text-amber-300 mb-2">Your choice of pacing</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Choose a fast, classic, or dramatic reveal when exporting an animated video.
            </p>
          </div>

          <div className="rounded-2xl bg-zinc-900/50 border border-zinc-800 p-6 hover:border-zinc-700 transition-all">
            <div className="text-3xl mb-3">🎥</div>
            <h3 className="text-base font-bold text-white mb-2">Presentation mode</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Open presentation mode for a focused board view with keyboard shortcuts.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
