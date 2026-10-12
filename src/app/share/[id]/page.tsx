"use client";

import React, { useEffect, useState, useRef, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowBigUp, Download, Share2, Sparkles, Layers, RotateCcw, Copy, Check } from "lucide-react";
import { toPng } from "html-to-image";
import { fetchSharedTierList, toggleUpvote } from "@/lib/community";
import { CommentsSection } from "@/components/share/CommentsSection";
import type { PublishedTierList } from "@/types";

function SharedTierListContent() {
  const params = useParams();
  const router = useRouter();
  const id = Array.isArray(params.id) ? params.id[0] : (params.id as string);

  const [ranking, setRanking] = useState<PublishedTierList | null>(null);
  const [loading, setLoading] = useState(true);
  const [upvotes, setUpvotes] = useState(0);
  const [isUpvoted, setIsUpvoted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const boardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    fetchSharedTierList(id).then((data) => {
      if (data) {
        setRanking(data);
        setUpvotes(data.upvotes || 1);
      }
      setLoading(false);
    });
  }, [id]);

  const handleUpvote = async () => {
    if (!ranking) return;
    const res = await toggleUpvote("tier_list", ranking.id);
    setIsUpvoted(res.isUpvoted);
    setUpvotes((prev) => (res.isUpvoted ? prev + 1 : Math.max(0, prev - 1)));
  };

  const handleCopyLink = () => {
    if (typeof window === "undefined") return;
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportPng = async () => {
    if (!boardRef.current || !ranking) return;
    setIsExporting(true);
    try {
      const dataUrl = await toPng(boardRef.current, { quality: 0.95, pixelRatio: 2 });
      const link = document.createElement("a");
      link.download = `${ranking.title.replace(/[^a-z0-9]/gi, "-").toLowerCase()}-tierlist.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Export failed", err);
    } finally {
      setIsExporting(false);
    }
  };

  const totalRanked = ranking?.tiers.reduce((sum, t) => sum + t.items.length, 0) || 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] text-zinc-400 flex items-center justify-center text-xs">
        Loading community tier list...
      </div>
    );
  }

  if (!ranking) {
    return (
      <div className="min-h-screen bg-[#09090b] text-[#f4f4f5] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-600">
          <Layers className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white">Tier List Not Found</h2>
        <p className="text-xs text-zinc-400 max-w-sm">
          This ranking link may have expired or been removed. Explore trending community templates to rank your own!
        </p>
        <Link
          href="/"
          className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30"
        >
          Explore Templates
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-[#f4f4f5] flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 glass-panel border-b border-zinc-800/80 px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/"
            className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors flex-shrink-0"
            title="Back to Home"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="truncate">
            <h1 className="font-bold text-sm sm:text-base text-zinc-100 truncate">
              {ranking.title}
            </h1>
            <span className="text-[11px] text-zinc-400 block truncate">
              Ranked by <span className="text-zinc-200 font-semibold">@{ranking.authorName}</span> •{" "}
              {totalRanked} items placed
            </span>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2">
          {/* Upvote Button */}
          <button
            onClick={handleUpvote}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
              isUpvoted
                ? "bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30"
                : "bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-700/80"
            }`}
          >
            <ArrowBigUp className={`w-4 h-4 ${isUpvoted ? "fill-white" : ""}`} />
            <span>{upvotes}</span>
          </button>

          {/* Copy Link */}
          <button
            onClick={handleCopyLink}
            className="p-2 sm:px-3 sm:py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700/80 flex items-center gap-1.5 text-xs font-medium cursor-pointer"
            title="Copy Share Link"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5 text-indigo-400" />}
            <span className="hidden sm:inline">{copied ? "Copied" : "Share"}</span>
          </button>

          {/* Export PNG */}
          <button
            onClick={handleExportPng}
            disabled={isExporting}
            className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700/80 flex items-center gap-1.5 text-xs font-medium cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export PNG</span>
          </button>

          {/* Remix / Create Own CTA */}
          <Link
            href={ranking.templateId ? `/template/${ranking.templateId}` : "/create"}
            className="px-3.5 sm:px-4 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Remix This</span>
          </Link>
        </div>
      </header>

      {/* Main Tier Board Display */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Tier Board Container */}
        <div
          ref={boardRef}
          className="space-y-3 p-3 rounded-2xl bg-zinc-950/80 border border-zinc-800 shadow-2xl"
        >
          {ranking.tiers.map((tier) => (
            <div
              key={tier.id}
              className="flex rounded-xl overflow-hidden bg-zinc-900/80 border border-zinc-800/90 min-h-[82px]"
            >
              {/* Tier Label Badge */}
              <div
                className={`w-20 sm:w-28 h-auto bg-gradient-to-br ${tier.color} flex items-center justify-center font-bold text-xl sm:text-2xl text-white select-none p-2 text-center break-words shadow-inner flex-shrink-0`}
              >
                <span>{tier.label}</span>
              </div>

              {/* Items in this tier */}
              <div className="flex-1 p-2.5 flex flex-wrap content-start gap-2.5 min-h-[82px]">
                {tier.items.length === 0 ? (
                  <span className="text-xs text-zinc-600 italic px-3 select-none flex items-center h-full">
                    No items in this tier
                  </span>
                ) : (
                  tier.items.map((item) => (
                    <div
                      key={item.id}
                      className={`rounded-lg border select-none overflow-hidden ${
                        item.imageUrl
                          ? "w-16 h-16 sm:w-20 sm:h-20 bg-zinc-950 flex items-center justify-center border-zinc-700/80 shadow-sm"
                          : "px-3 py-2 bg-zinc-800 text-zinc-100 text-xs font-semibold flex items-center border-zinc-700/80 shadow-sm"
                      }`}
                      title={item.name}
                    >
                      {item.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="truncate">{item.name}</span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Creator Footer Callout */}
        <div className="rounded-2xl bg-zinc-900/70 border border-zinc-800 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-white">Agree or disagree with @{ranking.authorName}?</h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Make your own customized ranking from this template in seconds with drag-and-drop!
            </p>
          </div>
          <Link
            href={ranking.templateId ? `/template/${ranking.templateId}` : "/create"}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 flex items-center gap-2 whitespace-nowrap"
          >
            <Sparkles className="w-4 h-4" />
            <span>Create Your Version</span>
          </Link>
        </div>

        {/* Community Comments & Takes */}
        <div className="pt-2">
          <CommentsSection tierListId={ranking.id} creatorName={ranking.authorName} />
        </div>
      </main>
    </div>
  );
}

export default function SharedTierListPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#09090b] text-zinc-400 flex items-center justify-center text-xs">
          Loading community tier list...
        </div>
      }
    >
      <SharedTierListContent />
    </Suspense>
  );
}
