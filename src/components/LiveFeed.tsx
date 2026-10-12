"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowBigUp, MessageSquare, ExternalLink, Sparkles } from "lucide-react";
import { fetchLiveActivity, toggleUpvote } from "@/lib/community";
import type { UserRanking } from "@/types";

export function LiveFeed() {
  const [rankings, setRankings] = useState<UserRanking[]>([]);
  const [upvotedIds, setUpvotedIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let isCancelled = false;
    fetchLiveActivity().then((data) => {
      if (!isCancelled) setRankings(data);
    });
    return () => {
      isCancelled = true;
    };
  }, []);

  const handleUpvote = async (id: string) => {
    const isCurrentlyUpvoted = Boolean(upvotedIds[id]);
    setUpvotedIds((prev) => ({ ...prev, [id]: !isCurrentlyUpvoted }));

    setRankings((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          return {
            ...r,
            upvotes: isCurrentlyUpvoted ? Math.max(0, r.upvotes - 1) : r.upvotes + 1,
          };
        }
        return r;
      })
    );

    await toggleUpvote("tier_list", id);
  };

  return (
    <section id="feed" className="py-14 border-t border-zinc-800/80 bg-zinc-950/40 relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Real-Time Community Stream</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Live Community Activity Stream
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              Watch how other players rank templates in real time. Upvote or explore their placements.
            </p>
          </div>

          <a href="#trending" className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
            <span>Explore All Templates</span>
            <span>&rarr;</span>
          </a>
        </div>

        {/* Feed Rows */}
        <div className="space-y-3">
          {rankings.map((rank) => {
            const isUpvoted = Boolean(upvotedIds[rank.id]);
            const isShareable = rank.id.startsWith("share-");

            return (
              <div
                key={rank.id}
                className="rounded-xl bg-zinc-900/60 border border-zinc-800/80 p-4 hover:border-zinc-700 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                  {/* Upvote Button with Live Counter */}
                  <button
                    onClick={() => handleUpvote(rank.id)}
                    className={`flex flex-col items-center justify-center w-11 h-11 rounded-lg border transition-all flex-shrink-0 cursor-pointer ${
                      isUpvoted
                        ? "bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/30 scale-105"
                        : "bg-zinc-800 hover:bg-zinc-750 border-zinc-700/80 text-zinc-300 hover:text-white"
                    }`}
                  >
                    <ArrowBigUp className={`w-4 h-4 ${isUpvoted ? "fill-white" : ""}`} />
                    <span className="text-[11px] font-bold">{rank.upvotes}</span>
                  </button>

                  {/* Ranking Details */}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                      <span className="text-zinc-200 font-semibold">@{rank.author.username}</span>
                      <span>ranked</span>
                      <span className="px-2 py-0.5 rounded bg-zinc-800 text-indigo-300 text-[11px] font-medium truncate max-w-[200px] sm:max-w-none">
                        {rank.templateTitle}
                      </span>
                      <span className="text-zinc-600 hidden sm:inline">•</span>
                      <span className="text-zinc-500 hidden sm:inline">{rank.createdAt}</span>
                    </div>

                    {/* S-Tier highlights */}
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[11px] font-bold">
                        S: {rank.tierSummary[0]?.items.join(", ")}
                      </span>
                      <span className="text-xs text-zinc-500">
                        | {rank.totalTiers} tiers • {rank.totalItems} items
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-2.5 self-end md:self-center">
                  {isShareable && (
                    <Link
                      href={`/share/${rank.id}`}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-800 hover:bg-zinc-750 text-zinc-300 hover:text-white transition-colors flex items-center gap-1.5 border border-zinc-700"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-indigo-400" />
                      <span>View Board</span>
                    </Link>
                  )}

                  <Link
                    href={rank.templateId !== "custom" ? `/template/${rank.templateId}` : "/create"}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-sm flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Rank This</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
