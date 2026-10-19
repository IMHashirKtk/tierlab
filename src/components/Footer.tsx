"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Layers, ShieldCheck, FileText } from "lucide-react";
import { usePwa } from "@/components/pwa/PwaProvider";

export function Footer() {
  const { openPrivacyModal } = usePwa();
  const [legalModal, setLegalModal] = useState<"terms" | "dmca" | null>(null);

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
                  onClick={openPrivacyModal}
                  className="hover:text-zinc-300 text-left cursor-pointer flex items-center gap-1.5 py-1 min-h-[28px]"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Privacy & Storage Hub</span>
                </button>
              </li>
              <li>
                <button
                  onClick={openPrivacyModal}
                  className="hover:text-zinc-300 text-left cursor-pointer py-1 inline-flex items-center min-h-[28px]"
                >
                  Export Data Backup
                </button>
              </li>
              <li>
                <button
                  onClick={openPrivacyModal}
                  className="hover:text-zinc-300 text-left cursor-pointer py-1 inline-flex items-center min-h-[28px]"
                >
                  Install PWA App
                </button>
              </li>
              <li>
                <button
                  onClick={openPrivacyModal}
                  className="hover:text-zinc-300 text-left cursor-pointer py-1 inline-flex items-center min-h-[28px]"
                >
                  Local-First Drafts
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-zinc-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-zinc-600">
          <span>© 2026 Tier List Maker (tierlistmaker.app). All user uploads belong to their respective creators.</span>
          <div className="flex items-center gap-4">
            <button
              onClick={openPrivacyModal}
              className="hover:text-emerald-400 text-zinc-400 cursor-pointer flex items-center gap-1 transition-colors py-1 min-h-[28px]"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Local-First Privacy</span>
            </button>
            <button
              onClick={() => setLegalModal("terms")}
              className="hover:text-zinc-400 cursor-pointer transition-colors py-1 min-h-[28px] inline-flex items-center"
            >
              Terms
            </button>
            <button
              onClick={() => setLegalModal("dmca")}
              className="hover:text-zinc-400 cursor-pointer transition-colors py-1 min-h-[28px] inline-flex items-center"
            >
              DMCA
            </button>
          </div>
        </div>
      </div>

      {/* Legal & Compliance Modal */}
      {legalModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
        >
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-400" />
                <span>{legalModal === "terms" ? "Terms of Service" : "DMCA Copyright Notice"}</span>
              </h3>
              <button
                onClick={() => setLegalModal(null)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-850 cursor-pointer"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-zinc-400 leading-relaxed space-y-3 max-h-[60vh] overflow-y-auto">
              {legalModal === "terms" ? (
                <>
                  <p>
                    <strong className="text-zinc-200">Free & Unrestricted Use:</strong> Tier List Maker is a free platform for creating, ranking, and sharing tier lists. All exported 4K PNGs and animated reveal videos are 100% watermark-free and free for personal, commercial, and streamer broadcast use.
                  </p>
                  <p>
                    <strong className="text-zinc-200">Local-First Privacy:</strong> Your unranked and in-progress tier boards are stored in your device&apos;s sandboxed browser storage. We do not inspect, sell, or track personal draft rankings.
                  </p>
                  <p>
                    <strong className="text-zinc-200">User Content Standards:</strong> When publicly publishing templates or rankings to the community feed, you agree not to submit hateful, defamatory, or unlawful content.
                  </p>
                </>
              ) : (
                <>
                  <p>
                    <strong className="text-zinc-200">Copyright Respect:</strong> Tier List Maker respects intellectual property rights. User-generated tier lists feature logos, character art, and screenshots under fair-use commentary, parody, and ranking paradigms. All rights belong to their respective copyright owners.
                  </p>
                  <p>
                    <strong className="text-zinc-200">Notice & Takedown:</strong> If you are a copyright owner or authorized agent and believe content hosted on our service infringes your copyright, please contact us with proof of ownership and the exact URL at:
                  </p>
                  <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 font-mono text-[11px] text-indigo-300">
                    dmca@tierlistmaker.app
                  </div>
                  <p className="text-[11px] text-zinc-500">
                    Valid takedown notices are processed promptly within 24 to 48 business hours.
                  </p>
                </>
              )}
            </div>

            <div className="pt-3 border-t border-zinc-800 flex justify-end">
              <button
                onClick={() => setLegalModal(null)}
                className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs font-medium cursor-pointer transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </footer>
  );
}
