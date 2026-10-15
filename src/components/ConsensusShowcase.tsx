"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { BrainCircuit, CheckCircle2, Zap, Sparkles, ChevronRight, HelpCircle, X } from "lucide-react";
import { SEED_TEMPLATES } from "@/data/seed-templates";
import { calculateConsensus } from "@/lib/consensus";
import { fetchSubmissionsForTemplate } from "@/lib/community";
import type { PublishedTierList } from "@/types";

export function ConsensusShowcase() {
  const [activeTemplateIndex, setActiveTemplateIndex] = useState(1); // Default to MCU
  const [showFormulaModal, setShowFormulaModal] = useState(false);
  const [submissions, setSubmissions] = useState<PublishedTierList[]>([]);

  const selectedTemplate = SEED_TEMPLATES[activeTemplateIndex] || SEED_TEMPLATES[0];

  useEffect(() => {
    if (!selectedTemplate?.id) return;
    let cancelled = false;
    fetchSubmissionsForTemplate(selectedTemplate.id).then((data) => {
      if (!cancelled) setSubmissions(data);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedTemplate?.id]);

  const consensus = useMemo(
    () => calculateConsensus(selectedTemplate, submissions),
    [selectedTemplate, submissions]
  );

  return (
    <section className="py-16 border-t border-zinc-800/80 relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-gradient-to-br from-indigo-950/60 via-zinc-900 to-zinc-950 border border-indigo-500/20 p-6 sm:p-10 lg:p-12 relative overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            {/* Left Copy */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold mb-4">
                <BrainCircuit className="w-3.5 h-3.5" />
                <span>Collective Intelligence Engine</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight mb-4">
                Community Consensus: See what the world thinks.
              </h2>
              <p className="text-sm sm:text-base text-zinc-300 leading-relaxed mb-6">
                When thousands of players rank a template, Tier List Maker calculates the mathematical average tier for every item. Compare your personal tier list directly against the crowd consensus to see how controversial your takes really are.
              </p>

              {/* Template Switcher Pills */}
              <div className="mb-6 space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block">
                  Select Live Consensus Stream:
                </span>
                <div className="flex flex-wrap gap-2">
                  {SEED_TEMPLATES.slice(0, 4).map((t, idx) => (
                    <button
                      key={t.id}
                      onClick={() => setActiveTemplateIndex(idx)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        activeTemplateIndex === idx
                          ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                          : "bg-zinc-850 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-750"
                      }`}
                    >
                      {t.title.split(":")[0]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href={`/template/${selectedTemplate.id}`}
                  className="px-5 py-2.5 rounded-xl font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md text-xs sm:text-sm transition-all flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Rank & Challenge This Consensus</span>
                </Link>
                <button
                  onClick={() => setShowFormulaModal(true)}
                  className="px-4 py-2.5 rounded-xl font-semibold text-zinc-300 bg-zinc-800/80 hover:bg-zinc-750 border border-zinc-700 text-xs sm:text-sm transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-zinc-400" />
                  <span>How It&apos;s Calculated</span>
                </button>
              </div>
            </div>

            {/* Right Card Visual */}
            <div className="rounded-2xl bg-zinc-950/80 border border-zinc-800 p-5 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="min-w-0 pr-2">
                  <span className="text-xs font-bold text-white block truncate">
                    {consensus.templateTitle}
                  </span>
                  <span className="text-[11px] text-zinc-500">
                    {consensus.totalSubmissions > 0
                      ? `Based on ${consensus.totalSubmissions.toLocaleString()} verified community rankings`
                      : "Awaiting first community submission"}
                  </span>
                </div>
                {consensus.totalSubmissions > 0 ? (
                  <span className="text-xs px-2 py-1 rounded bg-emerald-500/20 text-emerald-400 font-semibold flex items-center gap-1 flex-shrink-0 border border-emerald-500/30">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{consensus.overallAgreementPct}% Agreement</span>
                  </span>
                ) : (
                  <span className="text-[11px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 font-semibold border border-amber-500/20">
                    Demo Preview
                  </span>
                )}
              </div>

              {consensus.totalSubmissions === 0 ? (
                <div className="py-8 px-4 text-center rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-3">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[11px] font-semibold">
                    <span>Interactive Demo Preview (Sample Data)</span>
                  </div>
                  <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                    No community rankings submitted yet — publish the first ranking to establish the consensus!
                  </p>
                  <Link
                    href={`/template/${selectedTemplate.id}`}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Submit First Ranking</span>
                  </Link>
                </div>
              ) : (
                <>
                  {/* S Tier Consensus */}
                  {consensus.tiers.slice(0, 2).map((tier) => (
                    <div key={tier.id} className="flex items-center gap-3">
                      <span
                        className={`w-8 h-8 rounded-lg bg-gradient-to-br ${tier.color} font-bold text-white flex items-center justify-center text-xs flex-shrink-0 shadow-sm`}
                      >
                        {tier.label}
                      </span>
                      <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-xs flex flex-wrap gap-1.5 items-center min-h-[44px]">
                        {tier.items.length === 0 ? (
                          <span className="text-zinc-500 italic text-[11px]">No items</span>
                        ) : (
                          tier.items.map((it) => (
                            <div
                              key={it.item.id}
                              className="flex items-center gap-1.5 bg-zinc-800 border border-zinc-700/80 px-2 py-1 rounded-md text-zinc-200"
                            >
                              {it.item.imageUrl && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={it.item.imageUrl}
                                  alt={it.item.name}
                                  className="w-4 h-4 rounded object-cover"
                                />
                              )}
                              <span className="text-[11px] font-semibold truncate max-w-[120px]">
                                {it.item.name}
                              </span>
                              <span className="text-[10px] text-zinc-400 font-mono">
                                ({it.agreementPct}%)
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ))}
                </>
              )}

              {/* Controversy Callout */}
              {consensus.mostControversial && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-xs text-amber-300 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Zap className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <span className="truncate">
                      Most Controversial: <strong>{consensus.mostControversial.item.name}</strong> (Highest placement spread)
                    </span>
                  </div>
                  <Link
                    href={`/template/${selectedTemplate.id}`}
                    className="text-white hover:text-amber-200 underline font-semibold flex-shrink-0 text-[11px]"
                  >
                    Cast Vote &rarr;
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Formula Explanation Modal */}
      {showFormulaModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative space-y-4 text-xs">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <BrainCircuit className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">How Tier List Maker Calculates Consensus</h3>
              </div>
              <button
                onClick={() => setShowFormulaModal(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-zinc-300 leading-relaxed">
              Tier List Maker uses a weighted score aggregation algorithm to convert thousands of individual rankings into an undisputed mathematical hierarchy:
            </p>

            {/* Weights Breakdown */}
            <div className="grid grid-cols-5 gap-1.5 text-center font-mono">
              <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300">
                <span className="font-bold block text-sm">S Tier</span>
                <span className="text-[10px] text-zinc-400">5.0 pts</span>
              </div>
              <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300">
                <span className="font-bold block text-sm">A Tier</span>
                <span className="text-[10px] text-zinc-400">4.0 pts</span>
              </div>
              <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
                <span className="font-bold block text-sm">B Tier</span>
                <span className="text-[10px] text-zinc-400">3.0 pts</span>
              </div>
              <div className="p-2 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-300">
                <span className="font-bold block text-sm">C Tier</span>
                <span className="text-[10px] text-zinc-400">2.0 pts</span>
              </div>
              <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-300">
                <span className="font-bold block text-sm">D Tier</span>
                <span className="text-[10px] text-zinc-400">1.0 pt</span>
              </div>
            </div>

            <div className="space-y-2 text-zinc-300">
              <p>
                <strong>1. Mathematical Mean:</strong> Each item&apos;s score is averaged across all public submissions. Items with an average score &ge; 4.5 earn S-Tier placement.
              </p>
              <p>
                <strong>2. Tie-Breaking:</strong> Within each tier, items are sorted from left to right in descending order of their exact fractional score.
              </p>
              <p>
                <strong>3. Controversy Index:</strong> Items with high standard deviation (e.g. ranked S by some, D by others) are flagged as &ldquo;Controversial Hot Takes&rdquo;.
              </p>
            </div>

            <div className="flex justify-end pt-3 border-t border-zinc-800">
              <button
                onClick={() => setShowFormulaModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
