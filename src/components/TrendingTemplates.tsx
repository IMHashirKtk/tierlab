"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowBigUp, RefreshCw, Layers, Sparkles } from "lucide-react";
import { CATEGORIES } from "@/data/seed-templates";
import { fetchTemplates, toggleUpvote } from "@/lib/community";
import type { Template } from "@/types";

export function TrendingTemplates() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [activeSort, setActiveSort] = useState<"most-ranked" | "newest" | "top-rated">("most-ranked");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [upvotedIds, setUpvotedIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let isCancelled = false;
    setLoading(true);
    fetchTemplates({ category: selectedCategory, sortBy: activeSort }).then((data) => {
      if (!isCancelled) {
        setTemplates(data);
        setLoading(false);
      }
    });
    return () => {
      isCancelled = true;
    };
  }, [selectedCategory, activeSort]);

  const handleUpvote = async (templateId: string) => {
    const isCurrentlyUpvoted = Boolean(upvotedIds[templateId]);
    setUpvotedIds((prev) => ({ ...prev, [templateId]: !isCurrentlyUpvoted }));

    // Optimistic count update
    setTemplates((prev) =>
      prev.map((t) => {
        if (t.id === templateId) {
          return {
            ...t,
            upvotes: isCurrentlyUpvoted ? Math.max(0, t.upvotes - 1) : t.upvotes + 1,
          };
        }
        return t;
      })
    );

    await toggleUpvote("template", templateId);
  };

  return (
    <section id="trending" className="py-14 border-t border-zinc-800/80 relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-1">
              <span>🔥 What&apos;s Hot This Week</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Trending Community Templates
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              Templates climbing fast with the most community remixes and votes.
            </p>
          </div>

          {/* Sort Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveSort("most-ranked")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeSort === "most-ranked"
                  ? "bg-zinc-800 text-white border border-zinc-700"
                  : "bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800"
              }`}
            >
              Most Ranked
            </button>
            <button
              onClick={() => setActiveSort("newest")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeSort === "newest"
                  ? "bg-zinc-800 text-white border border-zinc-700"
                  : "bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800"
              }`}
            >
              Newest
            </button>
            <button
              onClick={() => setActiveSort("top-rated")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeSort === "top-rated"
                  ? "bg-zinc-800 text-white border border-zinc-700"
                  : "bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800"
              }`}
            >
              Top Rated
            </button>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6 no-scrollbar">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat.id
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800"
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.name}</span>
            </button>
          ))}
        </div>

        {/* Template Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => {
            const isVoted = Boolean(upvotedIds[template.id]);

            return (
              <div
                key={template.id}
                className="rounded-2xl bg-zinc-900/70 border border-zinc-800/90 overflow-hidden hover:border-zinc-700 transition-all duration-300 hover:-translate-y-1 group flex flex-col justify-between"
              >
                <div>
                  {/* Header Visual preview */}
                  <div className="h-44 bg-gradient-to-tr from-indigo-950/40 via-zinc-900 to-zinc-950 p-4 relative overflow-hidden flex flex-col justify-between border-b border-zinc-800/50">
                    <div className="flex items-center justify-between z-10">
                      <span className="text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-zinc-900/90 text-indigo-300 border border-zinc-700/60 backdrop-blur-sm">
                        {template.category}
                      </span>
                      <span className="text-[11px] font-mono text-zinc-400 bg-zinc-900/80 px-2 py-0.5 rounded border border-zinc-800">
                        {template.itemCount} items
                      </span>
                    </div>

                    {/* Tier Row Preview Visual */}
                    <div className="space-y-1.5 z-10 opacity-90 group-hover:opacity-100 transition-opacity">
                      <div className="flex items-center gap-1.5">
                        <span className="w-6 h-6 rounded bg-rose-500 text-[10px] font-bold text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                          S
                        </span>
                        <div className="flex-1 flex gap-1.5 overflow-hidden">
                          {template.items.slice(0, 4).map((it, idx) => (
                            <div
                              key={idx}
                              className="w-7 h-7 rounded-md overflow-hidden bg-zinc-800 border border-zinc-700/80 flex items-center justify-center flex-shrink-0 shadow-sm"
                              title={it.name}
                            >
                              {it.imageUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={it.imageUrl} alt={it.name} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-[9px] text-zinc-300 px-1 truncate">{it.name}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-6 h-6 rounded bg-amber-500 text-[10px] font-bold text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                          A
                        </span>
                        <div className="flex-1 flex gap-1.5 overflow-hidden">
                          {template.items.slice(4, 8).map((it, idx) => (
                            <div
                              key={idx}
                              className="w-7 h-7 rounded-md overflow-hidden bg-zinc-800 border border-zinc-700/80 flex items-center justify-center flex-shrink-0 shadow-sm"
                              title={it.name}
                            >
                              {it.imageUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={it.imageUrl} alt={it.name} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-[9px] text-zinc-300 px-1 truncate">{it.name}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Gradient background accent */}
                    <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-all pointer-events-none" />
                  </div>

                  {/* Body Content */}
                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-5 h-5 rounded-full bg-indigo-600 text-[10px] font-bold flex items-center justify-center text-white">
                        {template.author.username[0]?.toUpperCase() || "C"}
                      </div>
                      <span className="text-xs text-zinc-400">
                        by <span className="text-zinc-200 font-semibold">@{template.author.username}</span>
                      </span>
                      <span className="text-[10px] text-zinc-500">• {template.createdAt}</span>
                    </div>

                    <h3 className="text-base font-bold text-white group-hover:text-indigo-400 transition-colors">
                      {template.title}
                    </h3>
                    <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
                      {template.description}
                    </p>
                  </div>
                </div>

                {/* Footer actions */}
                <div className="p-5 pt-0">
                  <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between">
                    <div className="flex items-center gap-3 text-xs text-zinc-400">
                      <button
                        onClick={() => handleUpvote(template.id)}
                        className={`flex items-center gap-1 font-medium transition-colors cursor-pointer ${
                          isVoted ? "text-emerald-400" : "hover:text-emerald-400 text-zinc-400"
                        }`}
                        title="Upvote template"
                      >
                        <ArrowBigUp className={`w-4 h-4 ${isVoted ? "fill-emerald-400" : ""}`} />
                        <span>{template.upvotes.toLocaleString()}</span>
                      </button>
                      <span className="flex items-center gap-1">
                        <RefreshCw className="w-3 h-3 text-zinc-500" />
                        <span>{template.remixCount.toLocaleString()} remixes</span>
                      </span>
                    </div>

                    <Link
                      href={`/template/${template.id}`}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-sm"
                    >
                      Rank This
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
