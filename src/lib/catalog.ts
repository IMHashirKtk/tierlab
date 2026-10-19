import type { PublishedTierList, Template } from "@/types";

// These records were installed by the bundled seed scripts, including their
// invented engagement counters. Keep them useful without presenting that
// engagement or fictional authors as community activity.
export const STARTER_TEMPLATE_IDS = new Set([
  "elden-ring-bosses", "mcu-movies", "modern-shonen-anime", "fast-food-fries",
  "roblox-games", "hip-hop-2020s", "nba-all-time-goat", "world-football-goats",
  "ai-models-and-tools-2026", "programming-languages-meta", "gta-franchise-games",
  "energy-drinks-showdown", "one-piece-characters-tier-list",
  "naruto-shippuden-characters-tier-list", "attack-on-titan-characters-tier-list",
  "jujutsu-kaisen-characters-tier-list", "valorant-agents-meta-tier-list",
  "pokemon-starters-all-gens", "taylor-swift-eras-albums-ranked",
  "kanye-west-discography-tier-list",
]);

export function presentTemplate(template: Template): Template {
  if (!STARTER_TEMPLATE_IDS.has(template.id)) return template;
  return {
    ...template,
    isStarter: true,
    author: { username: "Template Library" },
    upvotes: 0,
    remixCount: 0,
    createdAt: "Starter template",
    featured: false,
    items: template.items.map((item) => ({
      ...item,
      // Generic stock photography is not artwork of the named subject.
      imageUrl: item.imageUrl?.includes("images.unsplash.com") ? undefined : item.imageUrl,
    })),
  };
}

// Exclude the known pre-launch audit records from discovery and consensus.
// This is a presentation filter, not a destructive database cleanup.
const AUDIT_RANKING_IDS = new Set([
  "share-tier-mv9mh45c-89727d0d", "share-tier-mv9mfkqn-65aafb5c",
  "share-tier-mv9mb83t-4f0d49b8", "share-tier-mv8cfkd0-517a85cc",
  "share-tier-mv8azxzu-d7bbba49", "share-tier-mv8a9tir-d05c6536",
  "share-tier-mv88wdz4-84fad7e6", "share-tier-mv5gu7kp-73e9addb",
]);

export function isDiscoverableRanking(ranking: PublishedTierList): boolean {
  return !AUDIT_RANKING_IDS.has(ranking.id) &&
    ranking.tiers.some((tier) => tier.items.length > 0);
}
