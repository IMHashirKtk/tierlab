"use client";

import React, { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { QuickRankBoard } from "@/components/QuickRankBoard";
import { TrendingTemplates } from "@/components/TrendingTemplates";
import { LiveFeed } from "@/components/LiveFeed";
import { ConsensusShowcase } from "@/components/ConsensusShowcase";
import { DropFxTeaser } from "@/components/DropFxTeaser";
import { CategoryExplorer } from "@/components/CategoryExplorer";
import { SeoGuideSection } from "@/components/SeoGuideSection";
import { Footer } from "@/components/Footer";
import { PublishModal } from "@/components/PublishModal";

export default function Home() {
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#09090b] text-[#f4f4f5] relative flex flex-col">
      {/* Ambient Radial Glow */}
      <div className="fixed inset-0 pointer-events-none ambient-glow z-0" />

      {/* Header & Navigation */}
      <Navbar onOpenPublish={() => setIsPublishModalOpen(true)} />

      {/* Main Content */}
      <main className="flex-1 relative z-10">
        <Hero />
        <QuickRankBoard />
        <TrendingTemplates />
        <LiveFeed />
        <ConsensusShowcase />
        <DropFxTeaser />
        <CategoryExplorer />
        <SeoGuideSection />
      </main>

      {/* Footer */}
      <Footer />

      {/* Interactive Publish Modal */}
      <PublishModal
        isOpen={isPublishModalOpen}
        onClose={() => setIsPublishModalOpen(false)}
      />
    </div>
  );
}
