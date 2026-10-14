import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import {
  Sparkles,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowRight,
  ShieldCheck,
  Video,
  Download,
  Smartphone,
  Layers,
  Zap,
  Globe,
  Share2,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Best Free TierMaker Alternative (2026) — No Login, Zero Watermarks & 4K Export",
  description:
    "Looking for a better TierMaker alternative? Create tier lists on TierListMaker.app with zero watermarks, no Twitter/X login wall, 4K PNGs, 9:16 TikTok reveal videos, and crowd consensus.",
  alternates: {
    canonical: "/tiermaker-alternative",
  },
  openGraph: {
    title: "Best Free TierMaker Alternative (2026) — No Login, Zero Watermarks & 4K Export",
    description:
      "Looking for a better TierMaker alternative? Create tier lists on TierListMaker.app with zero watermarks, no Twitter/X login wall, 4K PNGs, 9:16 TikTok reveal videos, and crowd consensus.",
    url: "https://tierlistmaker.app/tiermaker-alternative",
    images: [
      {
        url: "/api/og?title=Best%20Free%20TierMaker%20Alternative%20(2026)&author=TierListMaker.app&category=Comparison&mode=versus",
        width: 1200,
        height: 630,
        alt: "Best Free TierMaker Alternative",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Best Free TierMaker Alternative (2026) — No Login, Zero Watermarks & 4K Export",
    description:
      "Looking for a better TierMaker alternative? Create tier lists on TierListMaker.app with zero watermarks, no Twitter/X login wall, 4K PNGs, 9:16 TikTok reveal videos, and crowd consensus.",
    images: [
      "/api/og?title=Best%20Free%20TierMaker%20Alternative%20(2026)&author=TierListMaker.app&category=Comparison&mode=versus",
    ],
  },
};

const COMPARISON_ROWS = [
  {
    feature: "Account / Social Login Required",
    ours: "Never (100% Free & Anonymous)",
    oursGood: true,
    legacy: "Required (Twitter/X or Email wall)",
    canva: "Required (Signup to start)",
  },
  {
    feature: "Export Watermarks",
    ours: "100% Clean / Zero Forced Watermarks",
    oursGood: true,
    legacy: "Forced Logo Stamp on every export",
    canva: "Paywalled elements or watermark",
  },
  {
    feature: "Max Image Export Resolution",
    ours: "Lossless 4K UHD (16:9, 9:16, 1:1)",
    oursGood: true,
    legacy: "Low-resolution 720p compressed PNG",
    canva: "Requires paid Pro for high-res PNG",
  },
  {
    feature: "Animated 9:16 TikTok / Shorts Video Export",
    ours: "Built-in 30fps Canvas & Audio Engine",
    oursGood: true,
    legacy: "None (Static images only)",
    canva: "Manual keyframing required",
  },
  {
    feature: "Mobile Ranking UX",
    ours: "Tap-Item → Tap-Tier Rapid Dock",
    oursGood: true,
    legacy: "Clunky mobile drag-and-drop & scroll fatigue",
    canva: "Pinch-zoom canvas required",
  },
  {
    feature: "Clipboard Paste (Ctrl+V) & Instant Web Search",
    ours: "Native paste + Wikipedia/Anime/Music APIs",
    oursGood: true,
    legacy: "Manual file download & upload only",
    canva: "Manual upload required",
  },
  {
    feature: "Global Crowd Consensus & 1v1 Versus Duels",
    ours: "Algorithmic Borda average + Match % duels",
    oursGood: true,
    legacy: "Basic unweighted static averages",
    canva: "None",
  },
  {
    feature: "Streamer & YouTuber Mode",
    ours: "Fullscreen Presenter + Blind Rank Mystery + Confetti",
    oursGood: true,
    legacy: "Ad-heavy clutter with no streamer canvas",
    canva: "Basic slide presentation",
  },
  {
    feature: "Offline & Local-First Privacy",
    ours: "Installable PWA + IndexedDB Browser Vault",
    oursGood: true,
    legacy: "Cloud-only (Stores all media remotely)",
    canva: "Cloud-only",
  },
  {
    feature: "Intrusive Banner Ads",
    ours: "Zero intrusive overlays or video interstitials",
    oursGood: true,
    legacy: "Heavy banner ads & redirect popups",
    canva: "Constant Pro subscription upsells",
  },
];

const FAQS = [
  {
    q: "Why are creators switching from TierMaker to TierListMaker.app?",
    a: "TierMaker forces users to log in with Twitter/X or an email account, plasters heavy logo watermarks over finished image exports, and displays aggressive banner ads that slow down mobile devices. TierListMaker.app removes every single barrier: zero accounts, zero watermarks, 4K lossless downloads, instant TikTok video generation, and lightning-fast tap-to-rank mobile controls.",
  },
  {
    q: "Do I need an account to create and publish templates?",
    a: "No! You can create, edit, customize, download, and publish public templates completely anonymously with zero login walls. If you wish to attach a handle, simply type in your creator username.",
  },
  {
    q: "Can I paste images straight from my clipboard (Ctrl+V)?",
    a: "Yes. TierListMaker.app supports global clipboard pasting. Take a screenshot or copy any image from Google Images, Discord, or Reddit, press Ctrl+V (or Cmd+V on Mac) in the Creator Studio, and the image is instantly compressed into WebP and added to your board.",
  },
  {
    q: "How does the animated 9:16 TikTok video export work?",
    a: "Inside the Studio, click 'Video Export'. Our client-side rendering engine turns your tier placements into an animated 9:16 vertical reveal sequence with realistic card drops, audio SFX, and confetti for S-Tier items, perfectly formatted for TikTok, YouTube Shorts, and Instagram Reels.",
  },
  {
    q: "Can I embed tier lists on my blog, website, or Substack?",
    a: "Yes! Every shared tier list features a dedicated chromeless <iframe> embed widget with live voting, consensus toggles, and clean HTML backlinks that render smoothly on WordPress, Ghost, Substack, Medium, and custom websites.",
  },
];

export default function TierMakerAlternativePage() {
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://tierlistmaker.app",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "TierMaker Alternative",
        item: "https://tierlistmaker.app/tiermaker-alternative",
      },
    ],
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.a,
      },
    })),
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-white flex flex-col selection:bg-indigo-500 selection:text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <Navbar />

      <main className="flex-1">
        {/* Breadcrumb Navigation */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-2">
          <nav className="flex items-center gap-2 text-xs text-zinc-500">
            <Link href="/" className="hover:text-zinc-300 transition-colors">
              Home
            </Link>
            <span>/</span>
            <span className="text-zinc-300 font-medium">TierMaker Alternative</span>
          </nav>
        </div>

        {/* Hero Section */}
        <section className="relative pt-8 pb-16 px-4 sm:px-6 lg:px-8 text-center max-w-5xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            <span>The Modern, Watermark-Free Tier List Creator</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.15] mb-6">
            The #1 Free TierMaker Alternative — <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-300 to-cyan-300">
              Zero Watermarks, No Login Required.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-zinc-400 max-w-3xl mx-auto leading-relaxed mb-8">
            Frustrated by forced Twitter/X logins, blurry watermarked graphics, and slow ad-cluttered interfaces?
            TierListMaker.app is the modern open platform with 4K lossless downloads, instant 9:16 TikTok reveal videos,
            and real-time mathematical crowd consensus.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/create"
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all min-h-[48px]"
            >
              <span>Launch Studio Instantly</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/#trending"
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-zinc-200 hover:text-white font-semibold text-sm border border-zinc-700/80 flex items-center justify-center gap-2 transition-all min-h-[48px]"
            >
              <Layers className="w-4 h-4 text-indigo-400" />
              <span>Browse 45,000+ Community Templates</span>
            </Link>
          </div>
        </section>

        {/* 10-Point Comparison Table */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              10-Point Feature Comparison
            </h2>
            <p className="text-zinc-400 text-sm mt-2">
              See how TierListMaker.app stacks up against legacy tier list websites and generic graphic tools.
            </p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-zinc-800/90 bg-zinc-900/60 shadow-2xl">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/95 text-zinc-400">
                  <th className="py-4 px-5 font-semibold">Capability & Workflow</th>
                  <th className="py-4 px-5 font-bold text-indigo-400 bg-indigo-950/20">
                    TierListMaker.app
                  </th>
                  <th className="py-4 px-5 font-semibold text-zinc-500">
                    Legacy TierMaker
                  </th>
                  <th className="py-4 px-5 font-semibold text-zinc-500 hidden md:table-cell">
                    Canva / Generic Design
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                {COMPARISON_ROWS.map((row, idx) => (
                  <tr key={idx} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="py-3.5 px-5 font-medium text-white">
                      {row.feature}
                    </td>
                    <td className="py-3.5 px-5 font-semibold text-emerald-400 bg-indigo-950/10">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        <span>{row.ours}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-5 text-zinc-400">
                      <div className="flex items-center gap-1.5">
                        <XCircle className="w-4 h-4 text-rose-500/80 flex-shrink-0" />
                        <span>{row.legacy}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-5 text-zinc-500 hidden md:table-cell">
                      {row.canva}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Key Advantages Grid */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Built for Modern Creators, Streamers & Fandoms
            </h2>
            <p className="text-zinc-400 text-sm mt-2">
              Every detail has been redesigned from the ground up for speed, quality, and engagement.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700 transition-all">
              <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center mb-4 border border-indigo-500/30">
                <Download className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Pristine 4K UHD Downloads</h3>
              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                Download lossless 3840×2160 PNG graphics in 16:9 YouTube thumbnail, 1:1 Instagram/Twitter, or 9:16 mobile formats. Never crop out an annoying bottom watermark again.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700 transition-all">
              <div className="w-10 h-10 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center mb-4 border border-purple-500/30">
                <Video className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">9:16 TikTok Reveal Videos</h3>
              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                Turn any tier list into a viral animated video in seconds. Features dynamic card drop physics, sound effects, dramatic pause pacing, and S-tier confetti ready for TikTok, Shorts, and Reels.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700 transition-all">
              <div className="w-10 h-10 rounded-xl bg-cyan-600/20 text-cyan-400 flex items-center justify-center mb-4 border border-cyan-500/30">
                <Smartphone className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Rapid Mobile Tap-to-Rank</h3>
              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                Dragging items on mobile phones across tall screens causes thumb fatigue. Our floating Tap-Item-to-Tap-Tier dock lets you rank entire 20-item boards in under 15 seconds.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700 transition-all">
              <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center mb-4 border border-emerald-500/30">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Zero Social Login Walls</h3>
              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                Never hand over your Twitter/X account credentials or personal email address just to rank video games or anime. Create, customize, and publish anonymously with complete privacy.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700 transition-all">
              <div className="w-10 h-10 rounded-xl bg-amber-600/20 text-amber-400 flex items-center justify-center mb-4 border border-amber-500/30">
                <Globe className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Live Public API Search</h3>
              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                Search Wikipedia, MyAnimeList characters, and iTunes album art directly from within the Studio. Add full casts of characters and discographies in seconds without downloading single image files.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700 transition-all">
              <div className="w-10 h-10 rounded-xl bg-rose-600/20 text-rose-400 flex items-center justify-center mb-4 border border-rose-500/30">
                <Share2 className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Mathematical Crowd Consensus</h3>
              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                Compare your personal hot takes against thousands of community members with algorithmic Borda scoring, taste similarity gauges, and head-to-head 1v1 debate duels.
              </p>
            </div>
          </div>
        </section>

        {/* Creator Migration FAQ Section */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-zinc-800/80">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-3">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Migration FAQs</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Frequently Asked Questions About Switching
            </h2>
            <p className="text-zinc-400 text-xs sm:text-sm mt-2">
              Everything you need to know about making the switch to TierListMaker.app.
            </p>
          </div>

          <div className="space-y-4">
            {FAQS.map((faq, idx) => (
              <div
                key={idx}
                className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 text-left"
              >
                <h3 className="text-sm sm:text-base font-bold text-white mb-2 flex items-center gap-2">
                  <span className="text-indigo-400 font-mono text-xs">Q{idx + 1}.</span>
                  <span>{faq.q}</span>
                </h3>
                <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed pl-6">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Final CTA Banner */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-br from-indigo-950/60 via-zinc-900 to-zinc-950 border border-indigo-500/30 shadow-2xl relative overflow-hidden">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-3">
              Ready to Upgrade Your Tier Lists?
            </h2>
            <p className="text-zinc-400 text-xs sm:text-sm max-w-xl mx-auto mb-6">
              Start ranking in seconds with zero logins, zero watermarks, and full 4K and animated video exports.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/create"
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 min-h-[44px]"
              >
                <span>Launch Free Studio</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/"
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-zinc-200 font-semibold text-xs sm:text-sm border border-zinc-700 min-h-[44px] flex items-center justify-center"
              >
                <span>Explore Homepage</span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
