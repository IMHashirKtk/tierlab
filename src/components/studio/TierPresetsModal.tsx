"use client";

import React from "react";
import { X, Wand2, Gamepad2, ShoppingBag, Utensils, Tv, Trophy, Check } from "lucide-react";

export interface TierPresetConfig {
  id: string;
  name: string;
  category: string;
  icon: React.ReactNode;
  tiers: { label: string; color: string }[];
}

export const TIER_PRESETS: TierPresetConfig[] = [
  {
    id: "classic",
    name: "Classic S to F",
    category: "Standard",
    icon: <Trophy className="w-4 h-4 text-amber-400" />,
    tiers: [
      { label: "S", color: "from-rose-500 to-red-600" },
      { label: "A", color: "from-amber-500 to-orange-500" },
      { label: "B", color: "from-emerald-500 to-teal-600" },
      { label: "C", color: "from-sky-500 to-blue-600" },
      { label: "D", color: "from-purple-500 to-indigo-600" },
      { label: "F", color: "from-zinc-600 to-zinc-800" },
    ],
  },
  {
    id: "gaming",
    name: "Gaming & Masterpiece",
    category: "Gaming",
    icon: <Gamepad2 className="w-4 h-4 text-indigo-400" />,
    tiers: [
      { label: "GOAT", color: "from-amber-400 to-yellow-600" },
      { label: "Masterpiece", color: "from-rose-500 to-red-600" },
      { label: "Great", color: "from-emerald-500 to-teal-600" },
      { label: "Mid", color: "from-sky-500 to-blue-600" },
      { label: "Trash", color: "from-zinc-600 to-zinc-800" },
    ],
  },
  {
    id: "review",
    name: "Buyer's Guide",
    category: "Reviews",
    icon: <ShoppingBag className="w-4 h-4 text-emerald-400" />,
    tiers: [
      { label: "Must Buy", color: "from-emerald-500 to-teal-600" },
      { label: "Wait for Sale", color: "from-sky-500 to-blue-600" },
      { label: "Deep Discount", color: "from-amber-500 to-orange-500" },
      { label: "Skip", color: "from-rose-500 to-red-600" },
    ],
  },
  {
    id: "food",
    name: "Food & Taste",
    category: "Food",
    icon: <Utensils className="w-4 h-4 text-orange-400" />,
    tiers: [
      { label: "Heavenly", color: "from-amber-400 to-yellow-600" },
      { label: "Elite", color: "from-rose-500 to-red-600" },
      { label: "Decent", color: "from-emerald-500 to-teal-600" },
      { label: "Questionable", color: "from-sky-500 to-blue-600" },
      { label: "Biohazard", color: "from-zinc-700 to-zinc-900" },
    ],
  },
  {
    id: "anime",
    name: "Anime & Fiction",
    category: "Anime",
    icon: <Tv className="w-4 h-4 text-pink-400" />,
    tiers: [
      { label: "Peak Fiction", color: "from-purple-500 to-indigo-600" },
      { label: "God Tier", color: "from-rose-500 to-red-600" },
      { label: "Solid", color: "from-emerald-500 to-teal-600" },
      { label: "Overrated", color: "from-amber-500 to-orange-500" },
      { label: "Flop", color: "from-zinc-600 to-zinc-800" },
    ],
  },
  {
    id: "sports",
    name: "Sports & All-Star",
    category: "Sports",
    icon: <Trophy className="w-4 h-4 text-cyan-400" />,
    tiers: [
      { label: "All-Time GOAT", color: "from-amber-400 to-yellow-600" },
      { label: "Superstar", color: "from-rose-500 to-red-600" },
      { label: "All-Star", color: "from-emerald-500 to-teal-600" },
      { label: "Role Player", color: "from-sky-500 to-blue-600" },
      { label: "Benchwarmer", color: "from-zinc-600 to-zinc-800" },
    ],
  },
];

interface TierPresetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyPreset: (preset: TierPresetConfig) => void;
}

export function TierPresetsModal({ isOpen, onClose, onApplyPreset }: TierPresetsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl relative space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Wand2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>1-Click Tier Label Presets</span>
                <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[11px] font-semibold">
                  Studio Tools
                </span>
              </h3>
              <p className="text-xs text-zinc-400">
                Change row names and colors instantly while keeping your placed items intact.
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

        {/* Presets Grid */}
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          {TIER_PRESETS.map((preset) => (
            <div
              key={preset.id}
              onClick={() => {
                onApplyPreset(preset);
                onClose();
              }}
              className="p-4 rounded-2xl bg-zinc-800/50 hover:bg-zinc-800/90 border border-zinc-750 hover:border-indigo-500 transition-all cursor-pointer group space-y-2.5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-zinc-900 border border-zinc-750 flex items-center justify-center">
                    {preset.icon}
                  </div>
                  <span className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">
                    {preset.name}
                  </span>
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-750">
                  {preset.category}
                </span>
              </div>

              {/* Tier Row Preview Chips */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {preset.tiers.map((t, idx) => (
                  <span
                    key={idx}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold text-white bg-gradient-to-r ${t.color} shadow-sm`}
                  >
                    {t.label}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-zinc-800 text-xs text-zinc-500">
          <span>Items already placed in tiers will safely remain in position.</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-zinc-300 text-xs font-semibold cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
