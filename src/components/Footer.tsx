"use client";

import React from "react";
import Link from "next/link";
import { Layers, ShieldCheck } from "lucide-react";
import { usePwa } from "@/components/pwa/PwaProvider";

export function Footer() {
  const { openPrivacyModal } = usePwa();

  return (
    <footer className="border-t border-zinc-800/80 bg-zinc-950 py-12 text-zinc-400 text-xs relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-10">
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-3 group">
              <div className="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
                <Layers className="w-3.5 h-3.5" />
              </div>
              <span className="text-white font-bold text-base">Tier List Maker</span>
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
            <h4 className="text-white font-semibold mb-3">Privacy & App</h4>
            <ul className="space-y-2 text-zinc-500">
              <li>
                <button
                  onClick={openPrivacyModal}
                  className="hover:text-zinc-300 text-left cursor-pointer flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Privacy & Storage Hub</span>
                </button>
              </li>
              <li>
                <button
                  onClick={openPrivacyModal}
                  className="hover:text-zinc-300 text-left cursor-pointer"
                >
                  Export Data Backup
                </button>
              </li>
              <li>
                <button
                  onClick={openPrivacyModal}
                  className="hover:text-zinc-300 text-left cursor-pointer"
                >
                  Install PWA App
                </button>
              </li>
              <li><a href="#" className="hover:text-zinc-300">Zero Cloud Uploads</a></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-zinc-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-zinc-600">
          <span>© 2026 Tier List Maker (tierlistmaker.app). All user uploads belong to their respective creators.</span>
          <div className="flex items-center gap-4">
            <button
              onClick={openPrivacyModal}
              className="hover:text-emerald-400 text-zinc-400 cursor-pointer flex items-center gap-1 transition-colors"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Local-First Privacy</span>
            </button>
            <a href="#" className="hover:text-zinc-400">Terms</a>
            <a href="#" className="hover:text-zinc-400">DMCA</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
