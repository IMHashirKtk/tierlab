"use client";

import React from "react";
import { AnalyticsPreferencesButton } from "@/components/analytics/AnalyticsConsent";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { usePwa } from "@/components/pwa/PwaProvider";

export function Footer() {
  const { openPrivacyModal } = usePwa();

  return (
    <footer className="border-t border-zinc-800/80 bg-zinc-950 py-12 text-zinc-400 text-xs relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-10">
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-3 group">
              <BrandMark className="w-6 h-6" />
              <span className="text-white font-bold text-base">Tier List Maker</span>
            </Link>
            <p className="text-zinc-500 text-xs max-w-sm mb-4">
              The free user-generated tier list maker. Create, remix, and share rankings with zero watermarks. Built for content creators and fandom communities.
            </p>
            <div className="flex items-center gap-2 text-zinc-400 text-[11px]">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Create locally. Publish when you are ready.</span>
            </div>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-3">Explore</h4>
            <ul className="space-y-1 text-zinc-500">
              <li><Link href="/create" className="hover:text-zinc-300 py-1 inline-flex items-center min-h-[28px]">Free Tier List Maker</Link></li>
              <li><Link href="/tiermaker-alternative" className="hover:text-zinc-300 py-1 inline-flex items-center min-h-[28px]">TierMaker Alternative</Link></li>
              <li><Link href="/versus" className="hover:text-zinc-300 py-1 inline-flex items-center min-h-[28px]">Versus Arena</Link></li>
              <li><Link href="/#trending" className="hover:text-zinc-300 py-1 inline-flex items-center min-h-[28px]">Explore Templates</Link></li>
              <li><Link href="/#feed" className="hover:text-zinc-300 py-1 inline-flex items-center min-h-[28px]">Community Rankings</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-3">Fandoms</h4>
            <ul className="space-y-1 text-zinc-500">
              <li><Link href="/categories/gaming" className="hover:text-zinc-300 py-1 inline-flex items-center min-h-[28px]">Gaming Tier Lists</Link></li>
              <li><Link href="/categories/anime" className="hover:text-zinc-300 py-1 inline-flex items-center min-h-[28px]">Anime & Manga</Link></li>
              <li><Link href="/categories/food" className="hover:text-zinc-300 py-1 inline-flex items-center min-h-[28px]">Food & Fast Food</Link></li>
              <li><Link href="/categories/movies" className="hover:text-zinc-300 py-1 inline-flex items-center min-h-[28px]">MCU & Movies</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-3">Privacy & App</h4>
            <ul className="space-y-1 text-zinc-500">
              <li>
                <button
                  type="button"
                  onClick={openPrivacyModal}
                  className="hover:text-zinc-300 text-left cursor-pointer flex items-center gap-1.5 py-1 min-h-[28px]"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Privacy & Storage Hub</span>
                </button>
              </li>
              <li><AnalyticsPreferencesButton className="hover:text-zinc-300 py-1 min-h-[28px] text-left" /></li>
              <li>
                <Link href="/my-projects" className="hover:text-zinc-300 py-1 inline-flex items-center min-h-[28px]">
                  My Projects
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-zinc-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-zinc-600">
          <span>© 2026 Tier List Maker (tierlistmaker.app). All user uploads belong to their respective creators.</span>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
            <Link href="/terms" className="hover:text-zinc-300 py-1">Terms</Link>
            <Link href="/copyright" className="hover:text-zinc-300 py-1">Copyright</Link>
            <Link href="/privacy" className="hover:text-zinc-300 py-1">Privacy</Link>
            <Link href="/about" className="hover:text-zinc-300 py-1">About</Link>
            <Link href="/contact" className="hover:text-zinc-300 py-1">Contact & report</Link>
          </div>
        </div>
      </div>

    </footer>
  );
}
