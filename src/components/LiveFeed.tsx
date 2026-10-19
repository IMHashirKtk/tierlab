"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowBigUp, ExternalLink, Sparkles } from "lucide-react";
import { fetchLiveActivity, toggleUpvote } from "@/lib/community";
import type { UserRanking } from "@/types";

export function LiveFeed() {
  const [rankings, setRankings] = useState<UserRanking[]>([]);
  const [voteError, setVoteError] = useState("");
  const [voting, setVoting] = useState(false);
  const [upvotedIds, setUpvotedIds] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;
    fetchLiveActivity().then((data) => {
      if (!isCancelled) { setRankings(data); setLoading(false); }
    });
    return () => {
      isCancelled = true;
    };
  }, []);

  const handleUpvote = async (id: string) => {
    if (voting) return;
    setVoting(true);
    setVoteError("");
    try {
      const result = await toggleUpvote("tier_list", id);
      setUpvotedIds((prev) => ({ ...prev, [id]: result.isUpvoted }));
      setRankings((prev) => prev.map((item) => item.id === id ? { ...item, upvotes: result.newCount } : item));
    } catch {
      setVoteError("Voting is temporarily unavailable. Please try again later.");
    } finally { setVoting(false); }
  };

  return (
    <section id="feed" className="py-14 border-t border-zinc-800/80 bg-zinc-950/40 relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Made by the community</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Community Rankings
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              Explore published boards, compare placements, and share your own take.
            </p>
          </div>

          <a href="#trending" className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
            <span>Explore All Templates</span>
            <span>&rarr;</span>
          </a>
        </div>

        {voteError && <p role="alert" className="mb-4 text-sm text-rose-300">{voteError}</p>}
        {/* Feed Rows */}
        <div className="space-y-3">
          {rankings.length === 0 && <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8 text-center">
            <p className="font-semibold text-zinc-200">{loading ? 'Loading community rankings…' : 'Your ranking could be the first.'}</p>
            {!loading && <><p className="mt-2 text-sm text-zinc-400">Create a board and publish it to start a conversation.</p><Link href="/create" className="inline-flex mt-5 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white">Create a tier list</Link></>}
          </div>}
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
                        disabled={voting}
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
