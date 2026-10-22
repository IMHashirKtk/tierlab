import React, { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { fetchSharedTierList, fetchTemplateById } from "@/lib/community";
import { EmbedClient } from "./EmbedClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const ranking = await fetchSharedTierList(id);
  const template = !ranking ? await fetchTemplateById(id) : null;

  const title = ranking
    ? `${ranking.title} - Ranked by @${ranking.authorName} | Embed`
    : template
    ? `${template.title} | Interactive Tier List Embed`
    : "Interactive Tier List Embed | Tier List Maker";

  return {
    title,
    description: "Interactive chromeless tier list widget powered by TierListMaker.app.",
    alternates: { canonical: ranking ? `/share/${encodeURIComponent(id)}` : template ? `/template/${encodeURIComponent(template.slug || template.id)}` : `/embed/${encodeURIComponent(id)}` },
    robots: {
      index: false,
      follow: true,
    },
  };
}

async function EmbedContent({ params }: PageProps) {
  await connection();
  const { id } = await params;
  return <EmbedClient id={id} />;
}

export default function EmbedPage({ params }: PageProps) {
  return (
    <Suspense
      fallback={
        <div className="w-full min-h-[460px] bg-[#09090b] text-zinc-500 flex items-center justify-center text-xs font-mono">
          Loading embedded tier list...
        </div>
      }
    >
      <EmbedContent params={params} />
    </Suspense>
  );
}
