"use client";

import React, { useEffect, useState } from "react";
import { ArrowBigUp, ExternalLink, Sparkles, Layers, Users } from "lucide-react";
import { fetchSharedTierList, fetchTemplateById, toggleUpvote } from "@/lib/community";
import { calculateConsensus } from "@/lib/consensus";
import type { PublishedTierList, Template, TierRow } from "@/types";

interface EmbedClientProps {
  id: string;
}

export function EmbedClient({ id }: EmbedClientProps) {
  const [ranking, setRanking] = useState<PublishedTierList | null>(null);
  const [template, setTemplate] = useState<Template | null>(null);
  const [consensusTiers, setConsensusTiers] = useState<TierRow[] | null>(null);
  const [activeView, setActiveView] = useState<"ranking" | "consensus">("ranking");
  const [upvotes, setUpvotes] = useState(0);
  const [isUpvoted, setIsUpvoted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const foundRanking = await fetchSharedTierList(id);
        if (!isMounted) return;

        if (foundRanking) {
          setRanking(foundRanking);
          setUpvotes(foundRanking.upvotes || 1);

          if (foundRanking.templateId) {
            const foundTemplate = await fetchTemplateById(foundRanking.templateId);
            if (foundTemplate && isMounted) {
              setTemplate(foundTemplate);
              const consensus = calculateConsensus(foundTemplate, [foundRanking]);
              if (consensus?.tiers) {
                // Map consensus tiers into TierRow format
                const mapped: TierRow[] = consensus.tiers.map((t) => ({
                  id: t.id,
                  label: t.label,
                  color: t.color,
                  items: t.items.map((i) => i.item),
                }));
                setConsensusTiers(mapped);
              }
            }
          }
        } else {
          // Fallback: check if the id is a template directly
          const foundTemplate = await fetchTemplateById(id);
          if (foundTemplate && isMounted) {
            setTemplate(foundTemplate);
            const consensus = calculateConsensus(foundTemplate, []);
            if (consensus?.tiers) {
              const mapped: TierRow[] = consensus.tiers.map((t) => ({
                id: t.id,
                label: t.label,
                color: t.color,
                items: t.items.map((i) => i.item),
              }));
              setConsensusTiers(mapped);
              setActiveView("consensus");
            }
            setUpvotes(foundTemplate.upvotes || 10);
          }
        }
      } catch (err) {
        console.error("EmbedClient load error:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [id]);

  const handleToggleUpvote = async () => {
    if (ranking) {
      const res = await toggleUpvote("tier_list", ranking.id);
      setIsUpvoted(res.isUpvoted);
      setUpvotes((prev) => (res.isUpvoted ? prev + 1 : Math.max(0, prev - 1)));
    } else if (template) {
      const res = await toggleUpvote("template", template.id);
      setIsUpvoted(res.isUpvoted);
      setUpvotes((prev) => (res.isUpvoted ? prev + 1 : Math.max(0, prev - 1)));
    }
  };

  if (loading) {
    return (
      <div className="w-full min-h-[460px] bg-[#09090b] text-zinc-400 flex flex-col items-center justify-center gap-2 p-6 font-sans">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs">Loading embedded tier list...</span>
      </div>
    );
  }

  const title = ranking?.title || template?.title || "Community Tier List";
  const authorName = ranking?.authorName || template?.author?.username || "Creator";
  const templateId = ranking?.templateId || template?.id;
  const remixUrl = templateId
    ? `https://tierlistmaker.app/template/${templateId}`
    : ranking
    ? `https://tierlistmaker.app/share/${ranking.id}`
    : "https://tierlistmaker.app/create";

  const displayedTiers: TierRow[] =
    activeView === "consensus" && consensusTiers
      ? consensusTiers
      : ranking?.tiers || consensusTiers || [];

  return (
    <div className="w-full h-full min-h-screen sm:min-h-0 bg-[#09090b] text-[#f4f4f5] p-3 sm:p-4 rounded-xl font-sans border border-zinc-800/80 shadow-2xl flex flex-col justify-between overflow-hidden">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-zinc-800/80">
        <div className="min-w-0 pr-2">
          <div className="flex items-center gap-2">
            <h1 className="text-sm sm:text-base font-bold text-white truncate max-w-[280px] sm:max-w-md">
              {title}
            </h1>
            <span className="hidden sm:inline px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Interactive
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 truncate">
            Ranked by <span className="text-zinc-200 font-medium">@{authorName}</span>
          </p>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Consensus vs Ranking Toggle */}
          {consensusTiers && ranking && (
            <div className="flex bg-zinc-800/90 rounded-lg p-0.5 border border-zinc-700/60">
              <button
                type="button"
                onClick={() => setActiveView("ranking")}
                className={`min-h-[28px] px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer ${
                  activeView === "ranking"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-zinc-400 hover:text-white"
                }`}
                title="View Creator's Personal Ranking"
              >
                <Layers className="w-3 h-3" />
                <span className="hidden sm:inline">Creator</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveView("consensus")}
                className={`min-h-[28px] px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer ${
                  activeView === "consensus"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-zinc-400 hover:text-white"
                }`}
                title="View Mathematical Crowd Consensus"
              >
                <Users className="w-3 h-3" />
                <span className="hidden sm:inline">Consensus</span>
              </button>
            </div>
          )}

          {/* Upvote Button */}
          <button
            type="button"
            onClick={handleToggleUpvote}
            className={`min-h-[28px] px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer border ${
              isUpvoted
                ? "bg-rose-500/20 text-rose-400 border-rose-500/40"
                : "bg-zinc-800/90 text-zinc-300 border-zinc-700 hover:bg-zinc-750"
            }`}
            title="Upvote this ranking"
          >
            <ArrowBigUp className={`w-4 h-4 ${isUpvoted ? "fill-rose-400" : ""}`} />
            <span>{upvotes}</span>
          </button>
        </div>
      </div>

      {/* Tier Board View */}
      <div className="my-3 space-y-1.5 flex-1 overflow-y-auto max-h-[380px] pr-0.5">
        {displayedTiers.length === 0 ? (
          <div className="py-12 text-center text-xs text-zinc-500">
            No placed items found for this ranking.
          </div>
        ) : (
          displayedTiers.map((tier) => {
            const rowColor =
              tier.color.startsWith("from-") || tier.color.startsWith("bg-")
                ? tier.color
                : `bg-zinc-800`;

            return (
              <div
                key={tier.id}
                className="flex items-stretch rounded-lg bg-zinc-900/90 border border-zinc-800/90 overflow-hidden min-h-[56px]"
              >
                {/* Tier Label Box */}
                <div
                  className={`w-12 sm:w-16 flex-shrink-0 flex items-center justify-center p-1.5 text-center font-black text-sm sm:text-base text-white ${
                    tier.color.startsWith("from-")
                      ? `bg-gradient-to-br ${tier.color}`
                      : tier.color.startsWith("#")
                      ? ""
                      : rowColor
                  }`}
                  style={tier.color.startsWith("#") ? { backgroundColor: tier.color } : {}}
                >
                  <span className="drop-shadow-sm truncate">{tier.label}</span>
                </div>

                {/* Tier Items */}
                <div className="flex-1 p-1.5 sm:p-2 flex flex-wrap items-center gap-1.5 overflow-x-auto">
                  {tier.items.length === 0 ? (
                    <span className="text-[10px] text-zinc-600 italic px-2">No items</span>
                  ) : (
                    tier.items.map((item) => (
                      <div
                        key={item.id}
                        className="group relative w-10 h-10 sm:w-11 sm:h-11 rounded-md overflow-hidden bg-zinc-800 border border-zinc-700/80 flex-shrink-0 transition-transform hover:scale-105"
                        title={item.name}
                      >
                        {item.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            loading="lazy"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-zinc-300 p-0.5 text-center leading-tight">
                            {item.name.slice(0, 3)}
                          </div>
                        )}
                        {/* Hover item name tooltip */}
                        <div className="absolute inset-x-0 bottom-0 bg-black/85 text-[8px] text-zinc-200 px-0.5 truncate text-center opacity-0 group-hover:opacity-100 transition-opacity">
                          {item.name}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Sleek Bottom Attribution Footer Bar */}
      <div className="pt-2.5 border-t border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
        <a
          href="https://tierlistmaker.app"
          target="_blank"
          rel="noopener"
          className="flex items-center gap-1.5 text-zinc-400 hover:text-white transition-colors cursor-pointer group"
        >
          <div className="w-4 h-4 rounded bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-[9px] font-black group-hover:scale-110 transition-transform">
            T
          </div>
          <span className="font-semibold text-[11px]">
            Powered by <span className="text-zinc-200">TierListMaker.app</span>
          </span>
        </a>

        <a
          href={remixUrl}
          target="_blank"
          rel="noopener"
          className="w-full sm:w-auto min-h-[30px] px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-[11px] shadow-md shadow-indigo-600/30 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>⚡ Remix This Tier List & Vote on TierListMaker.app &rarr;</span>
        </a>
      </div>
    </div>
  );
}
