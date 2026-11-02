import React from "react";
import { PageEditorial } from "@/components/PageEditorial";
import { canIndexSite } from "@/lib/seo";
import { pageQuality } from "@/lib/page-quality";
import { HomeHeader } from "@/components/HomeHeader";
import { Hero } from "@/components/Hero";
import { QuickRankBoard } from "@/components/QuickRankBoard";
import { TemplateDirectory } from "@/components/TemplateDirectory";
import { getPublicCatalog } from "@/lib/server/catalog";
import { LiveFeed } from "@/components/LiveFeed";
import { ConsensusShowcase } from "@/components/ConsensusShowcase";
import { DropFxTeaser } from "@/components/DropFxTeaser";
import { CategoryExplorer } from "@/components/CategoryExplorer";
import { SeoGuideSection } from "@/components/SeoGuideSection";
import { Footer } from "@/components/Footer";
import { templateQuality } from "@/lib/indexability";
import { TEMPLATE_COHORT } from "@/data/template-cohort";

export const metadata = { alternates: { canonical: "/" }, robots: { index: canIndexSite() && pageQuality("/").eligible, follow: true } };

export default async function Home() {
  const catalog = await getPublicCatalog();
  const cohort = TEMPLATE_COHORT;
  const reviewed = catalog.filter(t => templateQuality(t).eligible);
  const featured = [...reviewed.filter(t => cohort.includes(t.slug || t.id)), ...reviewed.filter(t => !cohort.includes(t.slug || t.id))].slice(0, 12);
  return (
    <div className="min-h-screen bg-[#09090b] text-[#f4f4f5] relative flex flex-col">
      {/* Ambient Radial Glow */}
      <div className="fixed inset-0 pointer-events-none ambient-glow z-0" />

      {/* Header & Navigation */}
      <HomeHeader />

      {/* Main Content */}
      <main className="flex-1 relative z-10">
        <Hero />
        <QuickRankBoard />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"><TemplateDirectory catalog={featured} featured /></div>
        <LiveFeed />
        <ConsensusShowcase />
        <DropFxTeaser />
        <CategoryExplorer />
        <SeoGuideSection />
        <div className="px-4"><PageEditorial path="/" /></div>
      </main>

      {/* Footer */}
      <Footer />

    </div>
  );
}
