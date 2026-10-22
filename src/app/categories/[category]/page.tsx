import { templatePath } from "@/lib/template-url";
import { ItemImage } from "@/components/ItemImage";
import React, { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CATEGORIES, SEED_TEMPLATES } from "@/data/seed-templates";
import { fetchTemplates } from "@/lib/community";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { CATEGORY_GUIDES } from "@/data/category-guides";
import { safeJsonLd, getSiteUrl } from "@/lib/seo";
import {
  Layers,
  ChevronRight,
  Sparkles,
  ArrowRight,
  Flame,
  ArrowBigUp,
  RefreshCw,
} from "lucide-react";
import type { Template } from "@/types";

export function generateStaticParams() {
  const categories = CATEGORIES.filter((c) => c.id !== "all");
  const params = categories.map((c) => ({ category: c.id }));
  if (!params.some((p) => p.category === "pop-culture")) {
    params.push({ category: "pop-culture" });
  }
  return params;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  const catObj = CATEGORIES.find((c) => c.id === category && c.id !== "all");
  if (!catObj) notFound();
  const categoryName = catObj?.name || category.charAt(0).toUpperCase() + category.slice(1);

  const guide = CATEGORY_GUIDES[category];
  const title = guide.title;
  const description = guide.description;
  const canonicalUrl = `/categories/${category}`;
  const ogUrl = `/api/og?title=${encodeURIComponent(categoryName + " Tier Lists")}&category=${encodeURIComponent(categoryName)}&mode=template`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: `${title} | Tier List Maker`,
      description,
      url: canonicalUrl,
      images: [
        {
          url: ogUrl,
          width: 1200,
          height: 630,
          alt: `${categoryName} Tier List Maker`,
        },
      ],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogUrl],
    },
  };
}

async function CategoryContent({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const currentCat = CATEGORIES.find(
    (c) => c.id === category && c.id !== "all"
  );

  if (!currentCat) notFound();

  const categoryName =
    currentCat?.name || category.charAt(0).toUpperCase() + category.slice(1);
  const categoryIcon = currentCat?.icon || "🔥";

  // Fetch templates for this category
  const allTemplates = await fetchTemplates({
    category: category,
    sortBy: "most-ranked",
  });

  // Fallback to matching SEED_TEMPLATES if fetchTemplates is empty
  const categoryTemplates =
    allTemplates.length > 0
      ? allTemplates
      : SEED_TEMPLATES.filter(
          (t) => t.category.toLowerCase() === category.toLowerCase()
        );

  const siteUrl = getSiteUrl();
  const guide = CATEGORY_GUIDES[category];

  // Structured Data: CollectionPage & BreadcrumbList
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
            name: "Categories",
            item: `${siteUrl}/#categories`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: categoryName,
            item: `${siteUrl}/categories/${category}`,
          },
        ],
      },
      {
        "@type": "CollectionPage",
        "@id": `${siteUrl}/categories/${category}#collection`,
        isPartOf: { "@id": `${siteUrl}/#website` },
        about: { "@type": "Thing", name: categoryName },
        name: `${categoryName} Tier List Maker & Templates`,
        description: guide.description,
        url: `${siteUrl}/categories/${category}`,
        hasPart: categoryTemplates.map((t) => ({
          "@type": "CreativeWork",
          name: t.title,
          url: `${siteUrl}${templatePath(t)}`,
          creator: {
            "@type": "Person",
            name: t.author.username,
          },
        })),
      },
    ],
  };

  const otherCategories = CATEGORIES.filter(
    (c) => c.id !== "all" && c.id.toLowerCase() !== category.toLowerCase()
  );

  return (
    <div className="min-h-screen bg-[#09090b] text-[#f4f4f5] relative flex flex-col">
      {/* Ambient Glow */}
      <div className="fixed inset-0 pointer-events-none ambient-glow z-0" />

      {/* JSON-LD Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />

      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full relative z-10 space-y-12">
        {/* Breadcrumb Navigation */}
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-2 text-xs text-zinc-400 font-medium"
        >
          <Link href="/" className="hover:text-white transition-colors">
            Home
          </Link>
          <ChevronRight className="w-3 h-3 text-zinc-600" />
          <Link href="/#categories" className="hover:text-white transition-colors">
            Categories
          </Link>
          <ChevronRight className="w-3 h-3 text-zinc-600" />
          <span className="text-indigo-400 font-semibold">{categoryName}</span>
        </nav>

        {/* Category Hero Header */}
        <section className="text-center sm:text-left sm:flex sm:items-end sm:justify-between pb-8 border-b border-zinc-800/80 gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-3">
              <span className="text-base">{categoryIcon}</span>
              <span>Category Hub</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
              {categoryName} Tier List Maker & Templates
            </h1>
            <p className="text-zinc-400 text-sm sm:text-base mt-2 max-w-2xl leading-relaxed">
              {guide.intro}
            </p>
          </div>

          <div className="mt-6 sm:mt-0 flex-shrink-0">
            <Link
              href="/create"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-indigo-600/30 transition-all"
            >
              <Sparkles className="w-4 h-4" />
              <span>Create Custom Tier List</span>
            </Link>
          </div>
        </section>

        {/* Quick Category Switcher */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <span className="text-xs text-zinc-500 font-medium flex-shrink-0">Switch category:</span>
          {otherCategories.map((cat) => (
            <Link
              key={cat.id}
              href={`/categories/${cat.id}`}
              className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-300 hover:text-white transition-colors flex-shrink-0 flex items-center gap-1.5"
            >
              <span>{cat.icon}</span>
              <span>{cat.name}</span>
            </Link>
          ))}
        </div>

        {/* Template Grid */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <Flame className="w-5 h-5 text-indigo-400" />
              <span>Browse {categoryName} Tier Lists</span>
            </h2>
            <span className="text-xs text-zinc-400">
              Showing {categoryTemplates.length} templates
            </span>
          </div>

          {categoryTemplates.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-zinc-900/40 border border-zinc-800 space-y-4">
              <Layers className="w-12 h-12 text-zinc-600 mx-auto" />
              <h3 className="text-lg font-bold text-white">No {categoryName} templates yet</h3>
              <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto">
                Be the first creator to publish a public tier list template in the {categoryName} category!
              </p>
              <Link
                href="/create"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
              >
                <span>Create the First Template</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {categoryTemplates.map((template) => (
                <div
                  key={template.id}
                  className="rounded-2xl bg-zinc-900/70 border border-zinc-800/90 overflow-hidden hover:border-zinc-700 transition-all duration-300 hover:-translate-y-1 group flex flex-col justify-between"
                >
                  <div>
                    {/* Visual Preview Header */}
                    <div className="h-40 bg-gradient-to-tr from-indigo-950/40 via-zinc-900 to-zinc-950 p-4 relative overflow-hidden flex flex-col justify-between border-b border-zinc-800/50">
                      <div className="flex items-center justify-between z-10">
                        <span className="text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-zinc-900/90 text-indigo-300 border border-zinc-700/60">
                          {template.category}
                        </span>
                        <span className="text-[11px] font-mono text-zinc-400 bg-zinc-900/80 px-2 py-0.5 rounded border border-zinc-800">
                          {template.itemCount} items
                        </span>
                      </div>

                      {/* Tier Row Sample */}
                      <div className="space-y-1.5 z-10 opacity-90 group-hover:opacity-100 transition-opacity">
                        <div className="flex items-center gap-1.5">
                          <span className="w-6 h-6 rounded bg-rose-500 text-[10px] font-bold text-white flex items-center justify-center flex-shrink-0">
                            S
                          </span>
                          <div className="flex-1 flex gap-1.5 overflow-hidden">
                            {template.items.slice(0, 4).map((it, idx) => (
                              <div
                                key={idx}
                                className="w-7 h-7 rounded-md overflow-hidden bg-zinc-800 border border-zinc-700/80 flex items-center justify-center flex-shrink-0"
                                title={it.name}
                              >
                                {it.imageUrl ? (
                                  <ItemImage
                                    src={it.imageUrl}
                                    alt={it.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <span className="text-[9px] text-zinc-300 px-1 truncate">
                                    {it.name}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Ambient Accent */}
                      <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-all pointer-events-none" />
                    </div>

                    {/* Body */}
                    <div className="p-5">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-5 h-5 rounded-full bg-indigo-600 text-[10px] font-bold flex items-center justify-center text-white">
                          {template.author.username[0]?.toUpperCase() || "C"}
                        </div>
                        <span className="text-xs text-zinc-400">
                          <span className="text-zinc-200 font-semibold">{template.isStarter ? template.author.username : `@${template.author.username}`}</span>
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-white group-hover:text-indigo-400 transition-colors">
                        <Link href={templatePath(template)}>{template.title}</Link>
                      </h3>
                      <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
                        {template.description}
                      </p>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="p-5 pt-0">
                    <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between">
                      <div className="flex items-center gap-3 text-xs text-zinc-400">
                        {template.isStarter ? <span>Library template</span> : <><span className="flex items-center gap-1 font-medium text-emerald-400">
                          <ArrowBigUp className="w-4 h-4 fill-emerald-400" />
                          <span>{template.upvotes.toLocaleString()}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <RefreshCw className="w-3 h-3 text-zinc-500" />
                          <span>{template.remixCount.toLocaleString()}</span>
                        </span></>}
                      </div>

                      <Link
                        href={templatePath(template)}
                        aria-label={`Rank ${template.title}`}
                        className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-sm"
                      >
                        Rank This
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-3">
          <h2 className="text-lg font-semibold text-white">How to rank {categoryName.toLowerCase()}</h2>
          <p className="text-sm text-zinc-400 leading-relaxed">{guide.criteria}</p>
          <p className="text-sm text-zinc-400">Choose a template above, rename your tiers, and save a draft before exporting. <Link href="/#creator-guide" className="text-indigo-400 hover:text-indigo-300">Read the tier list creation guide</Link> for the full workflow.</p>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#09090b] text-zinc-400 flex items-center justify-center text-xs">
          Loading category hub...
        </div>
      }
    >
      <CategoryContent params={params} />
    </Suspense>
  );
}
