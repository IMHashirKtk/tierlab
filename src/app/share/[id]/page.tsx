import React, { Suspense } from "react";
import type { Metadata } from "next";
import { fetchSharedTierList } from "@/lib/community";
import { SharedTierListClient } from "./SharedTierListClient";
import { isDiscoverableRanking } from "@/lib/catalog";
import { canIndexSite } from "@/lib/seo";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const ranking = await fetchSharedTierList(id);

  if (!ranking) {
    return {
      title: "Shared Tier List | Tier List Maker",
      description: "Explore community tier lists and rankings on Tier List Maker.",
      robots: { index: false, follow: true },
      alternates: { canonical: `/share/${encodeURIComponent(id)}` },
    };
  }

  const topItems = ranking.tiers[0]?.items.slice(0, 3).map((i) => i.name).join(",") || "";
  const totalRanked = ranking.tiers.reduce((sum, t) => sum + t.items.length, 0);

  const ogUrl = `/api/og?title=${encodeURIComponent(ranking.title)}&author=${encodeURIComponent(
    ranking.authorName
  )}&topTier=${encodeURIComponent(ranking.tiers[0]?.label || "S")}&topItems=${encodeURIComponent(
    topItems
  )}&totalRanked=${encodeURIComponent(totalRanked + " items ranked")}&mode=ranking`;

  const pageTitle = `${ranking.title} - Ranked by @${ranking.authorName}`;
  const pageDescription = `Check out @${ranking.authorName}'s "${ranking.title}" tier list. View placements, duel head-to-head, or remix your own version on Tier List Maker.`;

  return {
    title: pageTitle,
    description: pageDescription,
    alternates: { canonical: `/share/${encodeURIComponent(id)}` },
    robots: { index: canIndexSite() && isDiscoverableRanking(ranking), follow: true },
    openGraph: {
      url: `/share/${encodeURIComponent(id)}`,
      title: `${pageTitle} | Tier List Maker`,
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

import { connection } from "next/server";

async function SharedContent({ params }: PageProps) {
  await connection();
  const { id } = await params;
  if (!await fetchSharedTierList(id)) notFound();
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
