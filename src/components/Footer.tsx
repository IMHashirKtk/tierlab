import React from "react";
import Link from "next/link";
import { Layers } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-zinc-800/80 bg-zinc-950 py-12 text-zinc-400 text-xs relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-10">
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-3 group">
              <div className="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
                <Layers className="w-3.5 h-3.5" />
              </div>
              <span className="text-white font-bold text-base">TierLab</span>
            </Link>
            <p className="text-zinc-500 text-xs max-w-sm mb-4">
              The free user-generated tier list maker. Create, remix, and share rankings with zero watermarks. Built for content creators and fandom communities.
            </p>
            <div className="flex items-center gap-2 text-zinc-400 text-[11px]">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>45,210 public templates active today</span>
            </div>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-3">Explore</h4>
            <ul className="space-y-2 text-zinc-500">
              <li><a href="#trending" className="hover:text-zinc-300">Trending Templates</a></li>
              <li><a href="#feed" className="hover:text-zinc-300">Live Activity Feed</a></li>
              <li><a href="#categories" className="hover:text-zinc-300">All Categories</a></li>
              <li><a href="#dropfx" className="hover:text-zinc-300">Drop FX Mode</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-3">Fandoms</h4>
            <ul className="space-y-2 text-zinc-500">
              <li><a href="#trending" className="hover:text-zinc-300">Gaming Tier Lists</a></li>
              <li><a href="#trending" className="hover:text-zinc-300">Anime & Manga</a></li>
              <li><a href="#trending" className="hover:text-zinc-300">Food & Fast Food</a></li>
              <li><a href="#trending" className="hover:text-zinc-300">MCU & Movies</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-3">Creators</h4>
            <ul className="space-y-2 text-zinc-500">
              <li><a href="#trending" className="hover:text-zinc-300">Publish a Template</a></li>
              <li><a href="#dropfx" className="hover:text-zinc-300">Streamer OBS Mode</a></li>
              <li><a href="#" className="hover:text-zinc-300">Community Guidelines</a></li>
              <li><a href="#" className="hover:text-zinc-300">API & Embeds</a></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-zinc-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-zinc-600">
          <span>© 2026 TierLab (tierlistmaker.app). All user uploads belong to their respective creators.</span>
          <div className="flex gap-4">
            <a href="#" className="hover:text-zinc-400">Privacy</a>
            <a href="#" className="hover:text-zinc-400">Terms</a>
            <a href="#" className="hover:text-zinc-400">DMCA</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
