import React, { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { SEED_TEMPLATES } from "@/data/seed-templates";
import { fetchTemplateById } from "@/lib/community";
import { calculateConsensus } from "@/lib/consensus";
import { TemplateClientLoader } from "./TemplateClientLoader";
import {
  ChevronRight,
  Layers,
  BarChart3,
  Flame,
  ArrowRight,
  Sparkles,
} from "lucide-react";

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
  const canonicalUrl = `/template/${id}`;

  return {
    title: pageTitle,
    description: pageDescription,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: `${pageTitle} | Tier List Maker`,
      description: pageDescription,
      url: canonicalUrl,
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

  if (!template) {
    return <TemplateClientLoader templateId={id} serverTemplate={null} />;
  }

  const consensus = calculateConsensus(template);
  const relatedTemplates = SEED_TEMPLATES.filter((t) => t.id !== id).slice(0, 3);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://tierlistmaker.app";

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: siteUrl,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: template.category.charAt(0).toUpperCase() + template.category.slice(1),
            item: `${siteUrl}/categories/${template.category}`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: template.title,
            item: `${siteUrl}/template/${id}`,
          },
        ],
      },
      {
        "@type": "ItemList",
        name: `${template.title} Items`,
        description: `Complete roster of rankable items for ${template.title}`,
        numberOfItems: template.items.length,
        itemListElement: template.items.map((item, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: item.name,
          image: item.imageUrl || undefined,
        })),
      },
    ],
  };

  return (
    <div>
      {/* JSON-LD Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Interactive Ranking Studio Experience */}
      <TemplateClientLoader templateId={id} serverTemplate={template} />

      {/* Crawlable Semantic SEO Content Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-zinc-800/80 space-y-12 text-zinc-300">
        {/* Breadcrumb Navigation */}
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-2 text-xs text-zinc-400 font-medium"
        >
          <Link href="/" className="hover:text-white transition-colors">
            Home
          </Link>
          <ChevronRight className="w-3 h-3 text-zinc-600" />
          <Link
            href={`/categories/${template.category}`}
            className="hover:text-white transition-colors capitalize"
          >
            {template.category}
          </Link>
          <ChevronRight className="w-3 h-3 text-zinc-600" />
          <span className="text-indigo-400 font-semibold truncate max-w-xs sm:max-w-md">
            {template.title}
          </span>
        </nav>

        {/* Template Overview */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 capitalize">
              {template.category}
            </span>
            <span className="text-xs text-zinc-500">•</span>
            <span className="text-xs text-zinc-400">
              Created by <span className="text-white font-medium">@{template.author.username}</span>
            </span>
            <span className="text-xs text-zinc-500">•</span>
            <span className="text-xs text-zinc-400">{template.items.length} rankable items</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            About the {template.title} Tier List Maker
          </h2>
          <p className="text-zinc-400 text-sm sm:text-base leading-relaxed max-w-4xl">
            {template.description} Use our drag-and-drop studio above to rank every item from S Tier down to F Tier. Once ranked, compare your results against our mathematical crowd consensus or export in 4K PNG and animated 9:16 TikTok video formats.
          </p>
        </div>

        {/* Complete Crawlable Item Roster */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-400" />
              <span>All {template.items.length} Rankable Items in {template.title}</span>
            </h3>
            <span className="text-xs text-zinc-400">Indexed Roster</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {template.items.map((item, index) => (
              <div
                key={item.id}
                className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center gap-2.5 hover:border-zinc-700 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-zinc-800 overflow-hidden flex-shrink-0 flex items-center justify-center border border-zinc-700/60">
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.imageUrl}
                      alt={`${item.name} - ${template.title} Tier List`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <span className="text-[10px] text-zinc-400 font-bold">#{index + 1}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-white truncate" title={item.name}>
                    {item.name}
                  </div>
                  <div className="text-[10px] text-zinc-500">Item #{index + 1}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Community Consensus Snapshot */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-cyan-400" />
              <span>Global Community Consensus for {template.title}</span>
            </h3>
            <span className="text-xs text-zinc-400">
              {consensus.totalSubmissions.toLocaleString()} submissions
            </span>
          </div>

          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-4 space-y-3">
            {consensus.tiers.map((row) => (
              <div key={row.id} className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-lg font-bold text-xs flex items-center justify-center text-white flex-shrink-0 bg-gradient-to-br ${row.color}`}
                >
                  {row.label}
                </div>
                <div className="flex-1 flex flex-wrap gap-1.5 min-h-[36px] items-center p-1.5 rounded-lg bg-zinc-900/80 border border-zinc-800/60">
                  {row.items.length === 0 ? (
                    <span className="text-[11px] text-zinc-600 px-2 italic">No items</span>
                  ) : (
                    row.items.map((it) => (
                      <span
                        key={it.item.id}
                        className="px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-800 border border-zinc-700 text-zinc-200"
                      >
                        {it.item.name} ({it.avgScore.toFixed(1)})
                      </span>
                    ))
                  )}
                </div>
              </div>
            ))}

            {consensus.mostControversial?.item && (
              <div className="pt-3 border-t border-zinc-800/60 flex items-center justify-between text-xs text-zinc-400">
                <span className="flex items-center gap-1.5 text-amber-400 font-semibold">
                  <Flame className="w-3.5 h-3.5" />
                  <span>Most Controversial Item:</span>
                  <span className="text-white">{consensus.mostControversial.item.name}</span>
                </span>
                <span>{consensus.overallAgreementPct}% Community Agreement</span>
              </div>
            )}
          </div>
        </div>

        {/* Related Templates Grid */}
        <div className="space-y-4">
          <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <span>More {template.category} Tier List Templates</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {relatedTemplates.map((rel) => (
              <Link
                key={rel.id}
                href={`/template/${rel.id}`}
                className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 hover:border-indigo-500/40 transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="text-[11px] font-mono text-zinc-400 mb-1">
                    {rel.itemCount} items • {rel.category}
                  </div>
                  <h4 className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors">
                    {rel.title}
                  </h4>
                  <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{rel.description}</p>
                </div>
                <div className="mt-3 pt-2 border-t border-zinc-800 flex items-center justify-between text-xs text-indigo-400 font-medium">
                  <span>Rank this template</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
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
