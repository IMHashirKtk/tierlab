import React, { Suspense } from "react";
import type { Metadata } from "next";
import { SEED_TEMPLATES } from "@/data/seed-templates";
import { fetchTemplateById } from "@/lib/community";
import { TemplateClientLoader } from "./TemplateClientLoader";

export function generateStaticParams() {
  return SEED_TEMPLATES.map((t) => ({ id: t.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const template = await fetchTemplateById(id);

  if (!template) {
    return {
      title: "Custom Template | Tier List Maker",
      description: "Create and rank custom tier lists with Tier List Maker.",
    };
  }

  const ogUrl = `/api/og?title=${encodeURIComponent(template.title)}&author=${encodeURIComponent(
    template.author.username
  )}&category=${encodeURIComponent(template.category)}&totalRanked=${encodeURIComponent(
    template.items.length + " items"
  )}&mode=template`;

  const pageTitle = `${template.title} Tier List Maker & Ranking`;
  const pageDescription = `Rank ${template.title} with drag-and-drop tiers. View community consensus, compare similarity, and duel friends on Tier List Maker.`;

  return {
    title: pageTitle,
    description: pageDescription,
    openGraph: {
      title: `${pageTitle} | Tier List Maker`,
      description: pageDescription,
      images: [
        {
          url: ogUrl,
          width: 1200,
          height: 630,
          alt: `${template.title} Tier List Maker`,
        },
      ],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: pageTitle,
      description: pageDescription,
      images: [ogUrl],
    },
  };
}

async function TemplateContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const template = await fetchTemplateById(id);

  return <TemplateClientLoader templateId={id} serverTemplate={template} />;
}

export default function TemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#09090b] text-zinc-400 flex items-center justify-center text-xs">
          Loading template studio...
        </div>
      }
    >
      <TemplateContent params={params} />
    </Suspense>
  );
}
