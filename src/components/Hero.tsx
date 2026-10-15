"use client";

import React from "react";
import Link from "next/link";
import { Sparkles, Layers, Upload, Flame, Shuffle, BarChart3, Video } from "lucide-react";

interface HeroProps {
  onOpenPublish: () => void;
}

export function Hero({ onOpenPublish }: HeroProps) {
  const popularTags = [
    { name: "Roblox Games", href: "/categories/gaming" },
    { name: "Elden Ring Bosses", href: "/template/elden-ring-bosses" },
    { name: "Anime of the Year", href: "/categories/anime" },
    { name: "Fast Food French Fries", href: "/categories/food" },
    { name: "MCU Movie Phases", href: "/template/mcu-movies" },
  ];

  return (
    <section className="relative pt-12 pb-16 md:pt-16 md:pb-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center z-10">
      {/* Eyebrow badge */}
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-900/90 border border-zinc-800 text-xs text-zinc-300 mb-6">
        <span className="text-indigo-400 font-bold">100% Free • Zero Watermarks</span>
        <span className="text-zinc-600">•</span>
        <span>4K & 9:16 Video Export • Community Consensus</span>
      </div>

      {/* Main Headline */}
      <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-[1.1] mb-6">
        Free Tier List Maker — <br className="hidden sm:inline" />
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-300 to-cyan-300">
          Rank Anything & Spark Debates.
        </span>
      </h1>

      <p className="text-base sm:text-lg text-zinc-400 max-w-2xl mx-auto mb-8 leading-relaxed">
        Browse community templates, drag & drop your picks, vote against the crowd consensus, or publish your own template for the community to rank.
      </p>

      {/* Popular Fandom Tags */}
      <div className="flex flex-wrap items-center justify-center gap-2 max-w-3xl mx-auto mb-10">
        <span className="text-xs text-zinc-500 font-medium">Popular now:</span>
        {popularTags.map((tag) => (
          <Link
            key={tag.name}
            href={tag.href}
            className="px-3 py-1.5 min-h-[30px] inline-flex items-center rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-300 hover:text-white transition-colors"
          >
            {tag.name}
          </Link>
        ))}
      </div>

      {/* Hero CTAs */}
      <div className="flex flex-wrap justify-center items-center gap-3 sm:gap-4 mb-16">
        <Link
          href="/create"
          className="px-6 py-3.5 rounded-xl font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-xl shadow-indigo-600/30 flex items-center gap-2.5 transition-all text-sm sm:text-base group"
        >
          <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />
          <span>Launch Free Tier List Maker</span>
        </Link>
        <a
          href="#trending"
          className="px-6 py-3.5 rounded-xl font-semibold text-zinc-200 bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700/80 hover:border-zinc-600 flex items-center gap-2.5 transition-all text-sm sm:text-base"
        >
          <Layers className="w-5 h-5 text-indigo-400" />
          <span>Explore Community Templates</span>
        </a>
        <button
          onClick={onOpenPublish}
          className="px-6 py-3.5 rounded-xl font-semibold text-zinc-300 bg-zinc-900/50 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 flex items-center gap-2.5 transition-all text-sm sm:text-base cursor-pointer"
        >
          <Upload className="w-5 h-5 text-zinc-400" />
          <span>Publish Template</span>
        </button>
      </div>

      {/* UGC Feature Value Pillars */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto text-left">
        <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
          <div className="flex items-center gap-2 text-indigo-400 font-bold text-base sm:text-lg mb-1">
            <Flame className="w-4 h-4" />
            <span>100% Free UGC</span>
          </div>
          <p className="text-xs text-zinc-400">Templates created by passionate fans and creators.</p>
        </div>
        <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
          <div className="flex items-center gap-2 text-purple-400 font-bold text-base sm:text-lg mb-1">
            <Shuffle className="w-4 h-4" />
            <span>1-Click Remix</span>
          </div>
          <p className="text-xs text-zinc-400">Fork any public template and submit your ranking.</p>
        </div>
        <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-base sm:text-lg mb-1">
            <BarChart3 className="w-4 h-4" />
            <span>Consensus</span>
          </div>
          <p className="text-xs text-zinc-400">Compare your picks against the crowd mathematical average.</p>
        </div>
        <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-base sm:text-lg mb-1">
            <Video className="w-4 h-4" />
            <span>Drop FX</span>
          </div>
          <p className="text-xs text-zinc-400">Screen shake & boss particle effects built for clips.</p>
        </div>
      </div>
    </section>
  );
}
