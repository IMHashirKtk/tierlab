"use client";

import React from "react";
import { Flame, Sparkles } from "lucide-react";

export function ActivityTicker() {
  const tickerItems = [
    { type: "rank", user: "@alex_tv", text: 'ranked "Elden Ring Bosses" (36 items)' },
    { type: "trending", text: '🔥 Trending: "MCU Movie Phases" reached 22,000 remixes' },
    { type: "new", user: "@BloxRanker", text: 'published new template "Roblox Top Games 2026"' },
    { type: "rank", user: "@sultan_a", text: 'ranked "Fast Food French Fries Showdown"' },
    { type: "upvote", user: "@danica2005", text: 'upvoted "Hip-Hop Albums of 2020s"' },
  ];

  return (
    <div className="bg-zinc-950/90 border-b border-zinc-800/80 text-[11px] text-zinc-400 py-1.5 overflow-hidden z-40 relative select-none">
      <div className="flex items-center gap-8 whitespace-nowrap ticker-track">
        {tickerItems.concat(tickerItems).map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            {item.type === "rank" && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            )}
            {item.type === "trending" && <Flame className="w-3.5 h-3.5 text-amber-400" />}
            {item.type === "new" && <Sparkles className="w-3.5 h-3.5 text-cyan-400" />}
            <span className="text-zinc-300 font-medium">{item.user}</span>
            <span className="text-zinc-400">{item.text}</span>
            <span className="text-zinc-700 ml-4">•</span>
          </div>
        ))}
      </div>
    </div>
  );
}
