"use client";

import React, { useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Swords,
  Flame,
  CheckCircle2,
  Sparkles,
  Layers,
  BrainCircuit,
  Share2,
  ExternalLink,
} from "lucide-react";
import { fetchSharedTierList, fetchTemplateById } from "@/lib/community";
import { calculateConsensus, compareTwoTierLists, type VersusMatchup } from "@/lib/consensus";
import { SEED_TEMPLATES } from "@/data/seed-templates";
import type { PublishedTierList, TierRow } from "@/types";

function VersusContent() {
  const searchParams = useSearchParams();
  const idA = searchParams.get("a") || "";
  const idB = searchParams.get("b") || "consensus";

  const [listA, setListA] = useState<PublishedTierList | null>(null);
  const [listB, setListB] = useState<PublishedTierList | null>(null);
  const [loading, setLoading] = useState(true);

  // Load data for side A and side B
  useEffect(() => {
    async function loadData() {
      setLoading(true);

      // Default demo ranking if none provided in query param
      let targetA = idA ? await fetchSharedTierList(idA) : null;
      if (!targetA) {
        // Fallback to Elden Ring template demonstration ranking
        const seedTpl = SEED_TEMPLATES[0];
        targetA = {
          id: "demo-a",
          templateId: seedTpl.id,
          title: seedTpl.title,
          authorName: "GamerOne",
          tiers: [
            {
              id: "t1",
              label: "S",
              color: "from-rose-500 to-red-600",
              items: seedTpl.items.slice(0, 3),
            },
            {
              id: "t2",
              label: "A",
              color: "from-amber-500 to-orange-500",
              items: seedTpl.items.slice(3, 6),
            },
            {
              id: "t3",
              label: "B",
              color: "from-emerald-500 to-teal-600",
              items: seedTpl.items.slice(6, 8),
            },
            {
              id: "t4",
              label: "C",
              color: "from-sky-500 to-blue-600",
              items: seedTpl.items.slice(8, 10),
            },
          ],
          unranked: [],
          upvotes: 42,
          createdAt: Date.now(),
        };
      }
      setListA(targetA);

      if (idB === "consensus" || !idB) {
        // Build consensus tier board from template
        const tplId = targetA.templateId || SEED_TEMPLATES[0].id;
        const tpl = (await fetchTemplateById(tplId)) || SEED_TEMPLATES[0];
        const consensusResult = calculateConsensus(tpl);

        const consensusTiers: TierRow[] = consensusResult.tiers.map((t) => ({
          id: t.id,
          label: t.label,
          color: t.color,
          items: t.items.map((it) => it.item),
        }));

        setListB({
          id: "consensus-b",
          templateId: tpl.id,
          title: `${tpl.title} (Crowd Consensus)`,
          authorName: "Global Crowd Consensus",
          tiers: consensusTiers,
          unranked: [],
          upvotes: 999,
          createdAt: Date.now(),
        });
      } else {
        const targetB = await fetchSharedTierList(idB);
        setListB(targetB);
      }

      setLoading(false);
    }

    loadData();
  }, [idA, idB]);

  const matchup: VersusMatchup | null = useMemo(() => {
    if (!listA || !listB) return null;
    return compareTwoTierLists(listA, listB);
  }, [listA, listB]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] text-zinc-400 flex items-center justify-center text-xs">
        Loading head-to-head matchup...
      </div>
    );
  }

  if (!listA || !listB || !matchup) {
    return (
      <div className="min-h-screen bg-[#09090b] text-white flex flex-col items-center justify-center p-6 text-center space-y-4">
        <Swords className="w-12 h-12 text-zinc-600" />
        <h2 className="text-xl font-bold">Matchup Not Found</h2>
        <p className="text-xs text-zinc-400 max-w-sm">
          Could not load rankings for this head-to-head comparison.
        </p>
        <Link
          href="/"
          className="px-4 py-2 rounded-xl bg-indigo-600 text-xs font-semibold text-white"
        >
          Explore Rankings
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-[#f4f4f5] flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 glass-panel border-b border-zinc-800/80 px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
            title="Back to Home"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="truncate">
            <h1 className="font-bold text-sm sm:text-base text-zinc-100 truncate flex items-center gap-2">
              <Swords className="w-4 h-4 text-rose-400" />
              <span>Head-to-Head Versus Duel</span>
            </h1>
            <span className="text-[11px] text-zinc-400">
              @{listA.authorName} vs @{listB.authorName}
            </span>
          </div>
        </div>

        <Link
          href={listA.templateId ? `/template/${listA.templateId}` : "/create"}
          className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white shadow-md shadow-rose-600/30 flex items-center gap-1.5"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Settle This Debate</span>
        </Link>
      </header>

      {/* Main Duel Stage */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Matchup Banner */}
        <div className="rounded-3xl bg-gradient-to-r from-rose-950/40 via-zinc-900 to-indigo-950/40 border border-zinc-800 p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
          {/* Player A (Left) */}
          <div className="text-center md:text-left space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-400">
              Player A
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white">@{listA.authorName}</h2>
            <p className="text-xs text-zinc-400 truncate max-w-xs">{listA.title}</p>
          </div>

          {/* Central Duel Gauge */}
          <div className="flex flex-col items-center justify-center text-center p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800 shadow-xl min-w-[200px]">
            <span className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-indigo-400">
              {matchup.similarityPct}%
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mt-0.5">
              Taste Similarity Score
            </span>
            <span
              className={`mt-2 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${matchup.verdict.badgeColor}`}
            >
              {matchup.verdict.title}
            </span>
          </div>

          {/* Player B (Right) */}
          <div className="text-center md:text-right space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400">
              Player B
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white">@{listB.authorName}</h2>
            <p className="text-xs text-zinc-400 truncate max-w-xs">{listB.title}</p>
          </div>
        </div>

        {/* Hot Disagreements & Common Ground */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Biggest Disagreements */}
          <div className="p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-rose-400">
              <Flame className="w-4 h-4 text-rose-400" />
              <span>Fiery Disagreements</span>
            </div>

            {matchup.divergences.length === 0 ? (
              <p className="text-xs text-zinc-500 italic p-3">
                No major disagreements! Their placements are in total harmony.
              </p>
            ) : (
              <div className="space-y-2">
                {matchup.divergences.slice(0, 4).map((div, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-zinc-800/60 border border-zinc-750 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      {div.item.imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={div.item.imageUrl}
                          alt={div.item.name}
                          className="w-6 h-6 rounded object-cover flex-shrink-0"
                        />
                      )}
                      <span className="font-semibold text-zinc-200 truncate">{div.item.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 whitespace-nowrap text-[11px] font-bold">
                      <span className="px-2 py-0.5 rounded bg-rose-600/80 text-white">
                        {div.tierA}
                      </span>
                      <span className="text-zinc-500">vs</span>
                      <span className="px-2 py-0.5 rounded bg-indigo-600/80 text-white">
                        {div.tierB}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Common Ground */}
          <div className="p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Undisputed Common Ground</span>
            </div>

            {matchup.agreements.length === 0 ? (
              <p className="text-xs text-zinc-500 italic p-3">
                None in identical tiers! Pure contrast across every pick.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {matchup.agreements.map((ag, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-1.5 bg-zinc-800/80 border border-zinc-700/80 rounded-xl px-2.5 py-1 text-xs text-zinc-200"
                  >
                    <span className="w-4 h-4 rounded bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-[10px]">
                      {ag.tier}
                    </span>
                    <span className="truncate max-w-[140px]">{ag.item.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Side-by-Side Dual Tier Boards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
          {/* Left Board: Player A */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-zinc-800">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span>@{listA.authorName}&apos;s Placements</span>
              </span>
              <Link
                href={`/user/${listA.authorName}`}
                className="text-[11px] text-zinc-400 hover:text-indigo-400 transition-colors"
              >
                View Profile
              </Link>
            </div>

            <div className="space-y-2 p-3 rounded-2xl bg-zinc-950/80 border border-zinc-850">
              {listA.tiers.map((tier) => (
                <div
                  key={tier.id}
                  className="flex rounded-xl overflow-hidden bg-zinc-900/80 border border-zinc-800 text-xs min-h-[64px]"
                >
                  <div
                    className={`w-16 bg-gradient-to-br ${tier.color} text-white font-bold flex items-center justify-center flex-shrink-0 text-sm`}
                  >
                    {tier.label}
                  </div>
                  <div className="p-2 flex-1 flex flex-wrap gap-1.5 items-center">
                    {tier.items.length === 0 ? (
                      <span className="text-[10px] text-zinc-600 italic">None</span>
                    ) : (
                      tier.items.map((it) => (
                        <div
                          key={it.id}
                          className="rounded-md overflow-hidden bg-zinc-800 border border-zinc-700 w-10 h-10 flex items-center justify-center"
                          title={it.name}
                        >
                          {it.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={it.imageUrl}
                              alt={it.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-[9px] text-zinc-300 px-1 truncate">{it.name}</span>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Board: Player B */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-zinc-800">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                <span>@{listB.authorName}&apos;s Placements</span>
              </span>
              {listB.id !== "consensus-b" && (
                <Link
                  href={`/user/${listB.authorName}`}
                  className="text-[11px] text-zinc-400 hover:text-indigo-400 transition-colors"
                >
                  View Profile
                </Link>
              )}
            </div>

            <div className="space-y-2 p-3 rounded-2xl bg-zinc-950/80 border border-zinc-850">
              {listB.tiers.map((tier) => (
                <div
                  key={tier.id}
                  className="flex rounded-xl overflow-hidden bg-zinc-900/80 border border-zinc-800 text-xs min-h-[64px]"
                >
                  <div
                    className={`w-16 bg-gradient-to-br ${tier.color} text-white font-bold flex items-center justify-center flex-shrink-0 text-sm`}
                  >
                    {tier.label}
                  </div>
                  <div className="p-2 flex-1 flex flex-wrap gap-1.5 items-center">
                    {tier.items.length === 0 ? (
                      <span className="text-[10px] text-zinc-600 italic">None</span>
                    ) : (
                      tier.items.map((it) => (
                        <div
                          key={it.id}
                          className="rounded-md overflow-hidden bg-zinc-800 border border-zinc-700 w-10 h-10 flex items-center justify-center"
                          title={it.name}
                        >
                          {it.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={it.imageUrl}
                              alt={it.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-[9px] text-zinc-300 px-1 truncate">{it.name}</span>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function VersusPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#09090b] text-zinc-400 flex items-center justify-center text-xs">
          Loading head-to-head versus duel...
        </div>
      }
    >
      <VersusContent />
    </Suspense>
  );
}
