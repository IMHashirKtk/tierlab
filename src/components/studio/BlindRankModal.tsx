"use client";

import React, { useState, useEffect } from "react";
import { X, Dices, Sparkles, CheckCircle2, RotateCcw, ArrowRight } from "lucide-react";
import confetti from "canvas-confetti";
import type { Item, TierRow } from "@/types";
import type { Board } from "@/lib/board";

interface BlindRankModalProps {
  isOpen: boolean;
  onClose: () => void;
  board: Board;
  onPlaceBlindItem: (tierId: string, item: Item) => void;
  onOpenConsensus?: () => void;
}

export function BlindRankModal({
  isOpen,
  onClose,
  board,
  onPlaceBlindItem,
  onOpenConsensus,
}: BlindRankModalProps) {
  const [deck, setDeck] = useState<Item[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [placedHistory, setPlacedHistory] = useState<{ item: Item; tier: TierRow }[]>([]);

  // Collect and shuffle candidate items
  useEffect(() => {
    if (!isOpen) return;

    queueMicrotask(() => {
      // Use unranked items first, or if unranked is empty, shuffle all items on the board
      const pool: Item[] = board.unranked.length > 0
        ? [...board.unranked]
        : board.tiers.flatMap((t) => t.items);

      // Fisher-Yates shuffle
      const shuffled = [...pool].sort(() => Math.random() - 0.5);
      setDeck(shuffled);
      setCurrentIndex(0);
      setIsCompleted(false);
      setPlacedHistory([]);
    });
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentItem = deck[currentIndex];
  const totalCards = deck.length;
  const progressPct = totalCards > 0 ? Math.round((currentIndex / totalCards) * 100) : 0;

  const handleSelectTier = (tier: TierRow) => {
    if (!currentItem) return;

    // Commit to board
    onPlaceBlindItem(tier.id, currentItem);

    const updatedHistory = [...placedHistory, { item: currentItem, tier }];
    setPlacedHistory(updatedHistory);

    const nextIndex = currentIndex + 1;
    if (nextIndex >= totalCards) {
      setIsCompleted(true);
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 },
        colors: ["#6366f1", "#f43f5e", "#fbbf24", "#10b981", "#38bdf8"],
      });
    } else {
      setCurrentIndex(nextIndex);
    }
  };

  const handleRestart = () => {
    const shuffled = [...deck].sort(() => Math.random() - 0.5);
    setDeck(shuffled);
    setCurrentIndex(0);
    setIsCompleted(false);
    setPlacedHistory([]);
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl relative space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Dices className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>TikTok Blind Rank Mode</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[11px] font-semibold">
                  Viral Game Mode
                </span>
              </h3>
              <p className="text-xs text-zinc-400">
                Items are revealed one by one. Once placed, you cannot change your pick!
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

        {totalCards === 0 ? (
          <div className="p-8 text-center space-y-3">
            <p className="text-sm text-zinc-300">No items available in this template to blind rank.</p>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-zinc-800 text-xs font-semibold text-white"
            >
              Close
            </button>
          </div>
        ) : !isCompleted ? (
          <div className="space-y-6">
            {/* Progress bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-zinc-400">
                  Card {currentIndex + 1} of {totalCards}
                </span>
                <span className="text-indigo-400 font-mono">{progressPct}% Complete</span>
              </div>
              <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-amber-500 transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>

            {/* Current Revealed Card */}
            <div className="rounded-2xl bg-gradient-to-br from-zinc-850 to-zinc-950 border border-zinc-750 p-6 flex flex-col items-center justify-center text-center space-y-4 shadow-xl">
              <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-700 shadow-2xl flex items-center justify-center relative">
                {currentItem.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={currentItem.imageUrl}
                    alt={currentItem.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="p-4 text-sm font-bold text-zinc-200">{currentItem.name}</span>
                )}
                <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-sm text-[10px] font-bold text-amber-400 border border-amber-400/30">
                  #{currentIndex + 1}
                </div>
              </div>

              <div>
                <h4 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  {currentItem.name}
                </h4>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Choose a tier below to permanently place this card:
                </p>
              </div>
            </div>

            {/* Tier Buttons Selection Grid */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block text-center">
                Lock into a tier:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {board.tiers.map((tier) => {
                  const itemsInTier = tier.items.length;
                  return (
                    <button
                      key={tier.id}
                      onClick={() => handleSelectTier(tier)}
                      className="group relative overflow-hidden rounded-xl border border-zinc-750 p-3 flex flex-col items-center justify-center gap-1.5 transition-all hover:scale-[1.03] active:scale-[0.98] cursor-pointer shadow-md bg-zinc-800/80 hover:border-indigo-500"
                    >
                      <div
                        className={`w-9 h-9 rounded-lg bg-gradient-to-br ${tier.color} flex items-center justify-center font-bold text-base text-white shadow-sm`}
                      >
                        {tier.label}
                      </div>
                      <span className="text-[11px] font-medium text-zinc-300 truncate max-w-full">
                        {tier.label} Tier
                      </span>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {itemsInTier} items
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          /* Completion Screen */
          <div className="py-4 text-center space-y-6">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-xl">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h4 className="text-2xl font-black text-white">Blind Challenge Completed!</h4>
              <p className="text-xs text-zinc-400 max-w-md mx-auto">
                You placed all {totalCards} items without knowing what card was coming next. Check out your resulting board!
              </p>
            </div>

            {/* Placed summary preview */}
            <div className="max-h-52 overflow-y-auto space-y-1.5 p-3 rounded-2xl bg-zinc-950/70 border border-zinc-800 text-left text-xs">
              {placedHistory.map((h, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded-xl bg-zinc-900/60 border border-zinc-800"
                >
                  <div className="flex items-center gap-2 truncate">
                    {h.item.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={h.item.imageUrl}
                        alt={h.item.name}
                        className="w-6 h-6 rounded object-cover flex-shrink-0"
                      />
                    )}
                    <span className="font-semibold text-zinc-200 truncate">{h.item.name}</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-bold text-white bg-gradient-to-r ${h.tier.color} shadow-sm`}
                  >
                    {h.tier.label}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
              <button
                onClick={handleRestart}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-xs font-semibold text-zinc-300 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Play Again</span>
              </button>

              {onOpenConsensus && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenConsensus();
                  }}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Compare with Crowd Consensus</span>
                </button>
              )}

              <button
                onClick={onClose}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>View Final Board</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
