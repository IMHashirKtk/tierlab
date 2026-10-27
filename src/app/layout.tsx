import { AnalyticsConsent } from "@/components/analytics/AnalyticsConsent";
import { Suspense } from "react";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { PwaProvider } from "@/components/pwa/PwaProvider";
import { safeJsonLd, getSiteUrl, canIndexSite } from "@/lib/seo";
import { SITE_OPERATOR, SUPPORT_EMAIL } from "@/lib/site-info";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Free Tier List Maker — Create, Rank & Share",
    template: "%s | Tier List Maker",
  },
  description:
    "Make a free tier list with images or text. Start from a template, customize your tiers, save local drafts, and export watermark-free images or reveal videos.",
  authors: [{ name: SITE_OPERATOR, url: `${siteUrl}/about` }],
  creator: "Tier List Maker",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    title: "Free Tier List Maker — Create, Rank & Share",
    description:
      "Create, rank, duel, and remix tier lists with images and text. 4K streamer exports, TikTok blind rank challenge, and global consensus.",
    siteName: "Tier List Maker",
    images: [
      {
        url: "/api/og?title=Free%20Tier%20List%20Maker&author=Tier%20List%20Maker&category=Platform",
        width: 1200,
        height: 630,
        alt: "Tier List Maker - Community Tier List Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Free Tier List Maker — Create, Rank & Share",
    description:
      "Create, rank, duel, and remix tier lists with images and text. 4K streamer exports, TikTok blind rank challenge, and global consensus.",
    images: ["/api/og?title=Free%20Tier%20List%20Maker&author=Tier%20List%20Maker&category=Platform"],
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/icon.svg?v=tier-board-1", type: "image/svg+xml" },
      { url: "/icons/icon-192.png?v=tier-board-1", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png?v=tier-board-1", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png?v=tier-board-1", sizes: "180x180", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Tier List Maker",
  },
  robots: {
    index: canIndexSite(),
    follow: true,
  },
};

const webAppJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      name: "Tier List Maker",
      alternateName: "TierListMaker.app",
      url: siteUrl,
      inLanguage: "en",
      publisher: { "@id": `${siteUrl}/#operator` },
    },
    {
      "@type": "Person",
      "@id": `${siteUrl}/#operator`,
      name: SITE_OPERATOR,
      url: `${siteUrl}/about`,
      email: SUPPORT_EMAIL,
    },
    {
      "@type": "WebApplication",
      "@id": `${siteUrl}/#application`,
      name: "Tier List Maker",
      alternateName: "TierListMaker.app",
      url: siteUrl,
      publisher: { "@id": `${siteUrl}/#operator` },
      isPartOf: { "@id": `${siteUrl}/#website` },
      applicationCategory: "EntertainmentApplication",
      operatingSystem: "Any",
      browserRequirements: "Requires JavaScript. Supports offline PWA mode.",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      featureList: [
        "Drag-and-drop S to F tier ranking",
        "Zero watermark 4K PNG export",
        "9:16 TikTok & Shorts animated reveal video export",
        "Global mathematical community consensus",
        "1v1 Versus Duel taste comparison",
        "Local drafts with optional cloud publishing",
      ],
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-[#09090b] text-[#f4f4f5]">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(webAppJsonLd) }}
        />
        <PwaProvider>{children}</PwaProvider>
        {process.env.VERCEL_ENV === "production" && canIndexSite() && <Suspense fallback={null}><AnalyticsConsent measurementId="G-EB8LN74C3Q" /></Suspense>}
      </body>
    </html>
  );
}
