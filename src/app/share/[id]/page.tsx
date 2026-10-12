import React, { Suspense } from "react";
import type { Metadata } from "next";
import { fetchSharedTierList } from "@/lib/community";
import { SharedTierListClient } from "./SharedTierListClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const ranking = await fetchSharedTierList(id);

  if (!ranking) {
    return {
      title: "Shared Tier List | TierLab",
      description: "Explore community tier lists and rankings on TierLab.",
    };
  }

  const topItems = ranking.tiers[0]?.items.slice(0, 3).map((i) => i.name).join(",") || "";
  const totalRanked = ranking.tiers.reduce((sum, t) => sum + t.items.length, 0);

  const ogUrl = `/api/og?title=${encodeURIComponent(ranking.title)}&author=${encodeURIComponent(
    ranking.authorName
  )}&topTier=${encodeURIComponent(ranking.tiers[0]?.label || "S")}&topItems=${encodeURIComponent(
    topItems
  )}&totalRanked=${encodeURIComponent(totalRanked + " items ranked")}&mode=ranking`;

  const pageTitle = `${ranking.title} - Ranked by @${ranking.authorName} | TierLab`;
  const pageDescription = `Check out @${ranking.authorName}'s "${ranking.title}" tier list. View placements, duel head-to-head, or remix your own version on TierLab.`;

  return {
    title: pageTitle,
    description: pageDescription,
    openGraph: {
      title: pageTitle,
      description: pageDescription,
      images: [
        {
          url: ogUrl,
          width: 1200,
          height: 630,
          alt: `${ranking.title} Tier List`,
        },
      ],
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: pageTitle,
      description: pageDescription,
      images: [ogUrl],
    },
  };
}

async function SharedContent({ params }: PageProps) {
  const { id } = await params;
  return <SharedTierListClient id={id} />;
}

export default function SharedTierListPage({ params }: PageProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#09090b] text-zinc-400 flex items-center justify-center text-xs">
          Loading community tier list...
        </div>
      }
    >
      <SharedContent params={params} />
    </Suspense>
  );
}
