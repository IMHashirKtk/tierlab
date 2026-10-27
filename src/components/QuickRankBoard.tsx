"use client";

import { ItemImage } from "@/components/ItemImage";
import React, { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  RotateCcw,
  Upload,
  ArrowRight,
  Flame,
  Check,
  Zap,
} from "lucide-react";

interface QuickItem {
  id: string;
  name: string;
  imageUrl?: string;
  category: "gaming" | "food" | "anime";
}

const PRESET_COLLECTIONS: Record<string, { label: string; items: QuickItem[] }> = {
  gaming: {
    label: "🎮 Gaming GOTY",
    items: [
      { id: "q-er", name: "Elden Ring", category: "gaming" },
      { id: "q-bg3", name: "Baldur's Gate 3", category: "gaming" },
      { id: "q-gow", name: "God of War Ragnarök", category: "gaming" },
      { id: "q-zelda", name: "Zelda: Tears of Kingdom", category: "gaming" },
      { id: "q-sm2", name: "Spider-Man 2", category: "gaming" },
      { id: "q-cp", name: "Cyberpunk 2077", category: "gaming" },
    ],
  },
  food: {
    label: "🍔 Fast Food",
    items: [
      { id: "q-mcd", name: "McDonald's", category: "food" },
      { id: "q-wnd", name: "Wendy's", category: "food" },
      { id: "q-cf", name: "Chick-fil-A", category: "food" },
      { id: "q-tb", name: "Taco Bell", category: "food" },
      { id: "q-sub", name: "Subway", category: "food" },
      { id: "q-popeyes", name: "Popeyes", category: "food" },
    ],
  },
  anime: {
    label: "🎌 Shonen Anime",
    items: [
      { id: "q-aot", name: "Attack on Titan", category: "anime" },
      { id: "q-fma", name: "Fullmetal Alchemist", category: "anime" },
      { id: "q-ds", name: "Demon Slayer", category: "anime" },
      { id: "q-jjk", name: "Jujutsu Kaisen", category: "anime" },
      { id: "q-op", name: "One Piece", category: "anime" },
      { id: "q-hxh", name: "Hunter x Hunter", category: "anime" },
    ],
  },
};

const TIERS = [
  { id: "S", label: "S", color: "from-rose-500 to-red-600", desc: "Top Tier / Masterpiece" },
  { id: "A", label: "A", color: "from-amber-500 to-orange-500", desc: "Great / Must-Experience" },
  { id: "B", label: "B", color: "from-yellow-400 to-amber-500 text-zinc-950 font-bold", desc: "Good / Solid" },
  { id: "C", label: "C", color: "from-emerald-500 to-green-600", desc: "Average / Mid" },
  { id: "D", label: "D", color: "from-blue-500 to-cyan-600", desc: "Pass / Low Tier" },
];

export function QuickRankBoard() {
  const [activePreset, setActivePreset] = useState<string>("gaming");
  const [selectedItem, setSelectedItem] = useState<QuickItem | null>(null);

  // Placements state: tierId -> QuickItem[]
  const [placements, setPlacements] = useState<Record<string, QuickItem[]>>({
    S: [],
    A: [],
    B: [],
    C: [],
    D: [],
  });

  const [unranked, setUnranked] = useState<QuickItem[]>(PRESET_COLLECTIONS.gaming.items);

  const switchPreset = (presetKey: string) => {
    setActivePreset(presetKey);
    setSelectedItem(null);
    setPlacements({ S: [], A: [], B: [], C: [], D: [] });
    setUnranked(PRESET_COLLECTIONS[presetKey].items);
  };

  const resetBoard = () => {
    setSelectedItem(null);
    setPlacements({ S: [], A: [], B: [], C: [], D: [] });
    setUnranked(PRESET_COLLECTIONS[activePreset].items);
  };

  const handleSelectItem = (item: QuickItem) => {
    setSelectedItem((prev) => (prev?.id === item.id ? null : item));
  };

  const assignItemToTier = (tierId: string) => {
    if (!selectedItem) return;

    // Remove from unranked
    setUnranked((prev) => prev.filter((it) => it.id !== selectedItem.id));

    // Remove from any other tier
    setPlacements((prev) => {
      const next: Record<string, QuickItem[]> = {};
      Object.keys(prev).forEach((k) => {
        next[k] = prev[k].filter((it) => it.id !== selectedItem.id);
      });
      next[tierId] = [...(next[tierId] || []), selectedItem];
      return next;
    });

    if (tierId === "S") {
      try {
        void import("canvas-confetti").then(({ default: confetti }) => confetti({
          zIndex: 20,
          disableForReducedMotion: true,
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
          colors: ["#f43f5e", "#fbbf24", "#6366f1"],
        })).catch(() => {});
      } catch {}
    }

    // Auto-advance to the next unranked item if available
    const remaining = unranked.filter((it) => it.id !== selectedItem.id);
    setSelectedItem(remaining.length > 0 ? remaining[0] : null);
  };

  const returnToUnranked = (item: QuickItem) => {
    setPlacements((prev) => {
      const next: Record<string, QuickItem[]> = {};
      Object.keys(prev).forEach((k) => {
        next[k] = prev[k].filter((it) => it.id !== item.id);
      });
      return next;
    });
    setUnranked((prev) => (prev.some((it) => it.id === item.id) ? prev : [...prev, item]));
    if (selectedItem?.id === item.id) setSelectedItem(null);
  };

  return (
    <section className="py-12 border-t border-zinc-800/80 bg-zinc-950/40 relative z-10 overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Title & Preset Switcher */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-2">
              <Zap className="w-3.5 h-3.5 text-indigo-400" />
              <span>Instant Quick-Rank Mini Studio</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Tap or Drag to Rank in Seconds
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-xl">
              Select any card below, then tap a tier row to place it. No login or install required.
            </p>
          </div>

          {/* Quick Presets & Full Studio Links */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl bg-zinc-900 border border-zinc-800 p-1">
              {Object.entries(PRESET_COLLECTIONS).map(([key, preset]) => (
                <button
                  key={key}
                  onClick={() => switchPreset(key)}
                  className={`min-h-[32px] px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    activePreset === key
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <button
              onClick={resetBoard}
              className="min-h-[32px] px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-400 hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Reset quick board"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>

            <Link
              href="/create"
              className="min-h-[32px] px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white flex items-center gap-1.5 shadow-md shadow-indigo-600/30 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Open the editor</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* The Quick Tier Board */}
        <div className="rounded-2xl border border-zinc-800/90 bg-zinc-900/60 overflow-hidden shadow-2xl mb-6">
          <div className="divide-y divide-zinc-800/60">
            {TIERS.map((tier) => {
              const itemsInTier = placements[tier.id] || [];
              const isSelectedTierTarget = Boolean(selectedItem);

              return (
                <div
                  key={tier.id}
                  onClick={() => selectedItem && assignItemToTier(tier.id)}
                  className={`flex items-stretch min-h-[64px] transition-colors ${
                    isSelectedTierTarget
                      ? "cursor-pointer hover:bg-indigo-500/5 group"
                      : ""
                  }`}
                >
                  {/* Tier Label Box */}
                  <div
                    className={`w-16 sm:w-20 flex-shrink-0 flex flex-col items-center justify-center p-2 text-white bg-gradient-to-br ${tier.color}`}
                  >
                    <span className="text-xl sm:text-2xl font-black">{tier.label}</span>
                  </div>

                  {/* Tier Drop Zone / Content */}
                  <div className="flex-1 p-2 sm:p-3 flex flex-wrap items-center gap-2 overflow-x-auto">
                    {itemsInTier.length === 0 ? (
                      <div className="text-[11px] text-zinc-600 italic px-2 select-none flex items-center gap-1.5">
                        {selectedItem ? (
                          <span className="text-indigo-400/80 font-medium group-hover:text-indigo-300">
                            Tap here to place &ldquo;{selectedItem.name}&rdquo; in {tier.label} Tier
                          </span>
                        ) : (
                          <span>Empty tier</span>
                        )}
                      </div>
                    ) : (
                      itemsInTier.map((item) => (
                        <div
                          key={item.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            returnToUnranked(item);
                          }}
                          className="min-h-[38px] p-1.5 pr-2 rounded-xl bg-zinc-900 border border-zinc-700/80 hover:border-rose-500/60 flex items-center gap-2 transition-all cursor-pointer group/item shadow-sm"
                          title="Click to remove from tier"
                        >
                          <div className="w-7 h-7 rounded-lg overflow-hidden bg-zinc-800 flex-shrink-0">
                            {item.imageUrl ? (
                              <ItemImage
                                src={item.imageUrl}
                                alt={item.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-zinc-400">
                                {item.name[0]}
                              </div>
                            )}
                          </div>
                          <span className="text-xs font-semibold text-zinc-200 group-hover/item:text-white truncate max-w-[110px]">
                            {item.name}
                          </span>
                          <span className="text-[10px] text-zinc-500 group-hover/item:text-rose-400 font-bold ml-0.5">
                            ✕
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Unranked Items Tray & Quick Selection Dock */}
        <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800/80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Unranked Items ({unranked.length})
              </span>
              <span className="text-[11px] text-zinc-500">
                — {selectedItem ? `Selected: "${selectedItem.name}" (Now tap a tier row above)` : "Tap an item to begin ranking"}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/create"
                className="min-h-[30px] px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-indigo-300 hover:text-white transition-colors flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Create a tier list</span>
              </Link>
            </div>
          </div>

          {unranked.length === 0 ? (
            <div className="py-6 text-center space-y-2">
              <div className="text-emerald-400 text-xs font-semibold flex items-center justify-center gap-1.5">
                <Check className="w-4 h-4" />
                <span>All items ranked! Great taste.</span>
              </div>
              <p className="text-xs text-zinc-400">
                Ready to create custom lists with your own images, 4K lossless export, and TikTok video drops?
              </p>
              <div className="pt-2">
                <Link
                  href="/create"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Open the editor</span>
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
              {unranked.map((item) => {
                const isSelected = selectedItem?.id === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectItem(item)}
                    className={`min-h-[44px] p-2 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                      isSelected
                        ? "bg-indigo-950/60 border-indigo-500 ring-2 ring-indigo-500/50 scale-[1.02] shadow-lg shadow-indigo-500/20"
                        : "bg-zinc-900 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/80"
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg overflow-hidden bg-zinc-800 flex-shrink-0 border border-zinc-700/60">
                      {item.imageUrl ? (
                        <ItemImage
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs font-bold text-zinc-400">
                          {item.name[0]}
                        </div>
                      )}
                    </div>
                    <span className="text-xs font-semibold text-white truncate flex-1">
                      {item.name}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
