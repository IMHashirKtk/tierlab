"use client";

import React from "react";
import Link from "next/link";
import { Sparkles, Layers, Upload, Flame, Shuffle, BarChart3, Video } from "lucide-react";

interface HeroProps {
  onOpenPublish: () => void;
}

export function Hero({ onOpenPublish }: HeroProps) {
  const popularTags = [
    "Roblox Games",
    "Elden Ring Bosses",
    "Anime of the Year",
    "Fast Food French Fries",
    "MCU Movie Phases",
  ];

  return (
    <section className="relative pt-12 pb-16 md:pt-16 md:pb-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center z-10">
      {/* Eyebrow badge */}
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-900/90 border border-zinc-800 text-xs text-zinc-300 mb-6">
        <span className="text-indigo-400 font-bold">120,000+ Creators</span>
        <span className="text-zinc-600">•</span>
        <span>Zero Watermarks • 4K Export • Community Consensus</span>
      </div>

      {/* Main Headline */}
      <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-[1.1] mb-6">
        The community platform where <br className="hidden sm:inline" />
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-300 to-cyan-300">
          rankings become debates.
        </span>
      </h1>

      <p className="text-base sm:text-lg text-zinc-400 max-w-2xl mx-auto mb-8 leading-relaxed">
        Browse community templates, drag & drop your picks, vote against the crowd consensus, or publish your own template for millions of fans to rank.
      </p>

      {/* Popular Fandom Tags */}
      <div className="flex flex-wrap items-center justify-center gap-2 max-w-3xl mx-auto mb-10">
        <span className="text-xs text-zinc-500 font-medium">Popular now:</span>
        {popularTags.map((tag) => (
          <a
            key={tag}
            href="#trending"
            className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-300 hover:text-white transition-colors"
          >
            {tag}
          </a>
        ))}
      </div>

      {/* Dual Hero CTAs */}
      <div className="flex flex-wrap justify-center gap-4 mb-16">
        <a
          href="#trending"
          className="px-6 py-3.5 rounded-xl font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-xl shadow-indigo-600/30 flex items-center gap-2.5 transition-all text-sm sm:text-base"
        >
          <Layers className="w-5 h-5" />
          <span>Explore 45,000+ Templates</span>
        </a>
        <button
          onClick={onOpenPublish}
          className="px-6 py-3.5 rounded-xl font-semibold text-zinc-200 bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700/80 hover:border-zinc-600 flex items-center gap-2.5 transition-all text-sm sm:text-base cursor-pointer"
        >
          <Upload className="w-5 h-5 text-indigo-400" />
          <span>Publish Your Own Template</span>
        </button>
      </div>

      {/* UGC Feature Value Pillars */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto text-left">
        <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
          <div className="flex items-center gap-2 text-indigo-400 font-bold text-base sm:text-lg mb-1">
            <Flame className="w-4 h-4" />
            <span>45k+ UGC</span>
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
