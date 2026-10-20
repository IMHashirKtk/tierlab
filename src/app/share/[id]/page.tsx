import React, { Suspense } from "react";
import type { Metadata } from "next";
import { getPublicRanking } from "@/lib/server/public-content";
import { SharedTierListClient } from "./SharedTierListClient";
import { isDiscoverableRanking } from "@/lib/catalog";
import { canIndexSite, getSiteUrl, safeJsonLd } from "@/lib/seo";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const ranking = await getPublicRanking(id);

  if (!ranking) {
    return {
      title: "Ranking not found",
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
  const ranking = await getPublicRanking(id);
  if (!ranking) notFound();
  const siteUrl = getSiteUrl();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    "@id": `${siteUrl}/share/${encodeURIComponent(id)}#ranking`,
    name: ranking.title,
    url: `${siteUrl}/share/${encodeURIComponent(id)}`,
    description: `A tier list ranked by ${ranking.authorName}.`,
    isPartOf: { "@id": `${siteUrl}/#website` },
    creator: { "@type": "Person", name: ranking.authorName, url: `${siteUrl}/user/${encodeURIComponent(ranking.authorName)}` },
    ...(ranking.templateId ? { isBasedOn: `${siteUrl}/template/${encodeURIComponent(ranking.templateId)}` } : {}),
  };
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
    <SharedTierListClient key={id} id={id} initialRanking={ranking} />
  </>;
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
