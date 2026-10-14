"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  Layers,
  Video,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  ChevronDown,
  HelpCircle,
  Flame,
  ArrowRight,
} from "lucide-react";

interface FaqItem {
  question: string;
  answer: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    question: "What is a tier list maker?",
    answer:
      "A tier list maker is a visual ranking tool that allows creators, gamers, and fandom communities to categorize items into hierarchical tiers—typically from 'S Tier' (the absolute best or elite tier) down through 'A', 'B', 'C', 'D', and 'F Tier'. TierListMaker.app lets you rank anything from video games, anime characters, and MCU movies to fast food chains and music albums using intuitive drag-and-drop or tap-to-place controls.",
  },
  {
    question: "Is TierListMaker.app 100% free with no watermark?",
    answer:
      "Yes! Unlike legacy ranking sites that slap low-resolution branding, forced watermarks, or intrusive popups over your finished graphics, TierListMaker.app is completely free and exports pristine, zero-watermark 4K PNG images and animated reveal videos without requiring any account or subscription.",
  },
  {
    question: "How do I export a tier list for TikTok, YouTube Shorts, or Reels?",
    answer:
      "Click the 'Video Export' button inside the Creator Studio toolbar. Our built-in client-side animation engine renders an eye-catching 9:16 vertical reveal video with falling card physics, tier landing sound effects, and dramatic pacing options ready for direct upload to TikTok, YouTube Shorts, or Instagram Reels.",
  },
  {
    question: "How is the Global Community Consensus calculated?",
    answer:
      "We aggregate thousands of public community submissions using an algorithmic Borda-count scoring model. Placements in S Tier are weighted highest down through F Tier, generating a democratic consensus ranking alongside agreement percentages and a 'Most Controversial Item' metric highlighting the items fans debate the most.",
  },
  {
    question: "Can I make a tier list offline or on mobile?",
    answer:
      "Absolutely. TierListMaker.app is engineered as an installable Progressive Web App (PWA) with 100% local-first storage. All images and draft state live securely in your browser's IndexedDB storage. You can install it on your home screen and build tier lists smoothly even without an active internet connection.",
  },
];

export function SeoGuideSection() {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <section className="py-20 border-t border-zinc-800/80 bg-zinc-950/60 relative z-10">
      {/* FAQPage JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-24">
        {/* Step-by-Step Guide Section */}
        <div>
          <div className="text-center max-w-3xl mx-auto mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Step-by-Step Creator Guide</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              How to Make a Tier List Online for Free
            </h2>
            <p className="text-zinc-400 text-sm sm:text-base mt-3 leading-relaxed">
              Create, rank, customize, and share professional tier lists in under 60 seconds with zero design experience required.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700 transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 font-bold text-lg flex items-center justify-center mb-5 border border-indigo-500/30">
                  1
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Pick a Template or Upload</h3>
                <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed mb-4">
                  Choose from over 45,000 community templates across Gaming, Anime, Movies, Food, and Sports—or upload your own images and photos straight from your device.
                </p>
              </div>
              <div className="text-xs text-indigo-400 font-medium flex items-center gap-1.5 pt-4 border-t border-zinc-800/60">
                <Layers className="w-4 h-4" />
                <span>Supports bulk PNG, JPEG, WebP & GIF</span>
              </div>
            </div>

            {/* Step 2 */}
            <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700 transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-purple-600/20 text-purple-400 font-bold text-lg flex items-center justify-center mb-5 border border-purple-500/30">
                  2
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Drag, Drop & Rank Tiers</h3>
                <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed mb-4">
                  Sort cards into customizable S, A, B, C, D, and F tier rows. Customize tier labels, colors, and order, or try the TikTok Blind Rank challenge for high-stakes decisions.
                </p>
              </div>
              <div className="text-xs text-purple-400 font-medium flex items-center gap-1.5 pt-4 border-t border-zinc-800/60">
                <Flame className="w-4 h-4" />
                <span>Full touch & mobile drag support</span>
              </div>
            </div>

            {/* Step 3 */}
            <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700 transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-cyan-600/20 text-cyan-400 font-bold text-lg flex items-center justify-center mb-5 border border-cyan-500/30">
                  3
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Export 4K & Viral Reveal Video</h3>
                <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed mb-4">
                  Download zero-watermark 4K PNG graphics, generate 9:16 vertical video animations for TikTok, or share a live link to compare your taste against friends in a 1v1 duel.
                </p>
              </div>
              <div className="text-xs text-cyan-400 font-medium flex items-center gap-1.5 pt-4 border-t border-zinc-800/60">
                <Video className="w-4 h-4" />
                <span>Zero watermarks • Instant download</span>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Comparison Table */}
        <div>
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Why Creators Choose TierListMaker.app
            </h2>
            <p className="text-zinc-400 text-xs sm:text-sm mt-2">
              Compare TierListMaker.app against legacy ranking tools and see why modern creators switch.
            </p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-zinc-800/80 bg-zinc-900/40">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/80 text-zinc-400">
                  <th className="py-4 px-6 font-semibold">Feature & Capability</th>
                  <th className="py-4 px-6 font-bold text-indigo-400">TierListMaker.app</th>
                  <th className="py-4 px-6 font-semibold text-zinc-500">Legacy Tier Makers</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                <tr>
                  <td className="py-4 px-6 font-medium text-white">Watermark-Free Exports</td>
                  <td className="py-4 px-6 text-emerald-400 font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>100% Clean (Zero Watermarks)</span>
                  </td>
                  <td className="py-4 px-6 text-zinc-500 flex items-center gap-1.5">
                    <XCircle className="w-4 h-4 text-rose-500/80" />
                    <span>Forced corner logos & low-res</span>
                  </td>
                </tr>
                <tr>
                  <td className="py-4 px-6 font-medium text-white">No Signup or Login Required</td>
                  <td className="py-4 px-6 text-emerald-400 font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Instant creation, 0 login walls</span>
                  </td>
                  <td className="py-4 px-6 text-zinc-500 flex items-center gap-1.5">
                    <XCircle className="w-4 h-4 text-rose-500/80" />
                    <span>Requires social logins or accounts</span>
                  </td>
                </tr>
                <tr>
                  <td className="py-4 px-6 font-medium text-white">Animated 9:16 TikTok / Shorts Video Export</td>
                  <td className="py-4 px-6 text-emerald-400 font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Built-in MP4/WebM video generator</span>
                  </td>
                  <td className="py-4 px-6 text-zinc-500 flex items-center gap-1.5">
                    <XCircle className="w-4 h-4 text-rose-500/80" />
                    <span>Static PNG only</span>
                  </td>
                </tr>
                <tr>
                  <td className="py-4 px-6 font-medium text-white">Mathematical Crowd Consensus</td>
                  <td className="py-4 px-6 text-emerald-400 font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Algorithmic Borda-count aggregation</span>
                  </td>
                  <td className="py-4 px-6 text-zinc-500 flex items-center gap-1.5">
                    <XCircle className="w-4 h-4 text-rose-500/80" />
                    <span>None or basic unweighted averages</span>
                  </td>
                </tr>
                <tr>
                  <td className="py-4 px-6 font-medium text-white">100% Local-First Device Privacy</td>
                  <td className="py-4 px-6 text-emerald-400 font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Private IndexedDB storage & backup</span>
                  </td>
                  <td className="py-4 px-6 text-zinc-500 flex items-center gap-1.5">
                    <XCircle className="w-4 h-4 text-rose-500/80" />
                    <span>Uploads all media to remote servers</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-4 text-center">
            <Link
              href="/tiermaker-alternative"
              className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-semibold transition-colors py-1 min-h-[28px]"
            >
              <span>See our in-depth 10-point TierMaker Alternative breakdown &rarr;</span>
            </Link>
          </div>
        </div>

        {/* Frequently Asked Questions (FAQ) Accordion */}
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-3">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Answers to Common Questions</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Frequently Asked Questions About Tier List Making
            </h2>
            <p className="text-zinc-400 text-xs sm:text-sm mt-2">
              Everything you need to know about creating, ranking, and sharing tier lists.
            </p>
          </div>

          <div className="space-y-4">
            {FAQ_ITEMS.map((faq, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div
                  key={index}
                  className="rounded-xl border border-zinc-800/80 bg-zinc-900/50 overflow-hidden transition-colors"
                >
                  <button
                    onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                    className="w-full py-4 px-6 flex items-center justify-between text-left font-semibold text-white hover:text-indigo-300 transition-colors cursor-pointer text-sm sm:text-base"
                    aria-expanded={isOpen}
                  >
                    <span>{faq.question}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-zinc-400 transition-transform duration-200 flex-shrink-0 ml-4 ${
                        isOpen ? "rotate-180 text-indigo-400" : ""
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-5 pt-1 text-xs sm:text-sm text-zinc-400 leading-relaxed border-t border-zinc-800/40">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Quick CTA inside FAQ */}
          <div className="mt-12 text-center">
            <Link
              href="/create"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all shadow-lg shadow-indigo-600/30"
            >
              <span>Start Making a Tier List Now</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
