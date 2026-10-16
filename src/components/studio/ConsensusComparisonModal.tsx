"use client";

import React, { useMemo, useState, useEffect } from "react";
import { X, BrainCircuit, CheckCircle2, Flame, AlertCircle } from "lucide-react";
import type { Board } from "@/lib/board";
import type { Template, PublishedTierList } from "@/types";
import { calculateConsensus, compareUserBoardWithConsensus } from "@/lib/consensus";
import { fetchSubmissionsForTemplateWithStatus } from "@/lib/community";

interface ConsensusComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  board: Board;
  template: Template;
}

export function ConsensusComparisonModal({
  isOpen,
  onClose,
  board,
  template,
}: ConsensusComparisonModalProps) {
  const [submissions, setSubmissions] = useState<PublishedTierList[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !template?.id) return;
    let cancelled = false;
    fetchSubmissionsForTemplateWithStatus(template.id).then(({ submissions: data, fetchError: err }) => {
      if (!cancelled) {
        setSubmissions(data);
        setFetchError(err);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen, template?.id]);

  const consensus = useMemo(
    () => calculateConsensus(template, submissions, { fetchError: Boolean(fetchError) }),
    [template, submissions, fetchError]
  );
  const comparison = useMemo(
    () => compareUserBoardWithConsensus(board, consensus),
    [board, consensus]
  );

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto space-y-5">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-2">
            <BrainCircuit className="w-5 h-5 text-indigo-400" />
            <div>
              <h3 className="text-base font-bold text-white">Community Consensus Analysis</h3>
              <span className="text-[11px] text-zinc-400">
                {consensus.status === "error"
                  ? "Error loading community submissions"
                  : consensus.totalSubmissions > 0
                  ? `Based on ${consensus.totalSubmissions.toLocaleString()} community rankings`
                  : "Awaiting first community submission"}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {fetchError && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>Failed to load community rankings: {fetchError}</span>
          </div>
        )}

        {/* Alignment Gauge Banner */}
        <div className="rounded-xl bg-gradient-to-r from-indigo-950/60 via-zinc-900 to-zinc-950 border border-indigo-500/30 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${comparison.archetype.badgeColor}`}>
                {comparison.archetype.title}
              </span>
              <span className="text-xs font-semibold text-zinc-400">• Archetype</span>
            </div>
            <p className="text-xs text-zinc-300 max-w-sm">
              {comparison.archetype.description}
            </p>
          </div>

          <div className="flex flex-col items-center justify-center w-20 h-20 rounded-2xl bg-zinc-900 border border-zinc-700/80 shadow-inner flex-shrink-0">
            <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">
              {comparison.alignmentPct !== null ? `${comparison.alignmentPct}%` : "N/A"}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              Aligned
            </span>
          </div>
        </div>

        {/* Hot Takes vs Consensus */}
        <div className="space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-400">
            <Flame className="w-4 h-4 text-amber-400" />
            <span>Your Biggest Hot Takes (Divergences)</span>
          </div>

          {comparison.hotTakes.length === 0 ? (
            <div className="p-3 bg-zinc-800/40 rounded-xl text-xs text-zinc-400 text-center">
              No major hot takes! You are in total harmony with the community consensus.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {comparison.hotTakes.slice(0, 4).map((take, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl bg-zinc-800/60 border border-zinc-750 flex items-center justify-between text-xs gap-2"
                >
                  <div className="flex items-center gap-2 truncate">
                    {take.item.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={take.item.imageUrl}
                        alt={take.item.name}
                        className="w-7 h-7 rounded object-cover flex-shrink-0"
                      />
                    )}
                    <span className="font-semibold text-zinc-200 truncate">{take.item.name}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] whitespace-nowrap flex-shrink-0 font-bold">
                    <span className="px-1.5 py-0.5 rounded bg-indigo-600 text-white">
                      You: {take.userTier}
                    </span>
                    <span className="text-zinc-500">vs</span>
                    <span className="px-1.5 py-0.5 rounded bg-zinc-700 text-zinc-300">
                      Crowd: {take.consensusTier}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Where You Agree with the Crowd */}
        <div className="space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-400">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Undisputed Consensus Agreements</span>
          </div>

          <div className="p-3 bg-zinc-950/60 rounded-xl border border-zinc-800 flex flex-wrap gap-2">
            {comparison.agreements.length === 0 ? (
              <span className="text-xs text-zinc-500 italic">None yet</span>
            ) : (
              comparison.agreements.slice(0, 6).map((ag, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-1.5 bg-zinc-800 border border-zinc-700/80 rounded-lg px-2 py-1 text-xs text-zinc-200"
                >
                  <span className="w-4 h-4 rounded bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-[10px]">
                    {ag.tier}
                  </span>
                  <span className="truncate max-w-[130px]">{ag.item.name}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Consensus Tiers Preview Table */}
        <div className="space-y-2 pt-2 border-t border-zinc-800">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 block">
            Crowd Consensus Ranking ({template.title})
          </span>
          <div className="space-y-1.5">
            {consensus.tiers.map((tier) => (
              <div
                key={tier.id}
                className="flex rounded-lg overflow-hidden bg-zinc-800/60 border border-zinc-750 text-xs"
              >
                <div
                  className={`w-10 bg-gradient-to-br ${tier.color} text-white font-bold flex items-center justify-center select-none flex-shrink-0 text-xs`}
                >
                  {tier.label}
                </div>
                <div className="p-2 flex-1 flex flex-wrap gap-1.5 items-center">
                  {tier.items.length === 0 ? (
                    <span className="text-[11px] text-zinc-500 italic">No items</span>
                  ) : (
                    tier.items.map((it) => (
                      <span
                        key={it.item.id}
                        className="px-2 py-0.5 rounded bg-zinc-900 text-zinc-300 text-[11px] font-medium"
                      >
                        {it.item.name} ({it.avgScore.toFixed(1)})
                      </span>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer"
          >
            Back to Editing
          </button>
        </div>
      </div>
    </div>
  );
}
