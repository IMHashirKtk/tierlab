import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://tierlistmaker.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Tier List Maker — The Next-Gen Community Tier List Platform",
    template: "%s | Tier List Maker",
  },
  description:
    "Create, rank, duel, and remix tier lists with images and text. 4K streamer exports, TikTok blind rank challenge, global community consensus, and zero watermarks.",
  keywords: [
    "tier list maker",
    "tier list",
    "tier list creator",
    "tiermaker alternative",
    "versus tier list",
    "community consensus tier list",
    "streamer tier list tool",
    "blind rank challenge",
    "tier list template",
  ],
  authors: [{ name: "Tier List Maker Team" }],
  creator: "Tier List Maker",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    title: "Tier List Maker — The Next-Gen Community Tier List Platform",
    description:
      "Create, rank, duel, and remix tier lists with images and text. 4K streamer exports, TikTok blind rank challenge, and global consensus.",
    siteName: "Tier List Maker",
    images: [
      {
        url: "/api/og?title=Tier%20List%20Maker%20-%20Next-Gen%20Tier%20List%20Platform&author=Tier%20List%20Maker&category=Platform",
        width: 1200,
        height: 630,
        alt: "Tier List Maker - Community Tier List Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Tier List Maker — The Next-Gen Community Tier List Platform",
    description:
      "Create, rank, duel, and remix tier lists with images and text. 4K streamer exports, TikTok blind rank challenge, and global consensus.",
    images: ["/api/og?title=Tier%20List%20Maker%20-%20Next-Gen%20Tier%20List%20Platform&author=Tier%20List%20Maker&category=Platform"],
  },
  robots: {
    index: true,
    follow: true,
  },
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
        {children}
      </body>
    </html>
  );
}
