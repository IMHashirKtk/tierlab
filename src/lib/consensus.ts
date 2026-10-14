import type { Item, TierRow, Template, PublishedTierList } from "@/types";
import type { Board } from "@/lib/board";
import { SEED_TEMPLATES } from "@/data/seed-templates";

export interface ConsensusItemRank {
  item: Item;
  avgScore: number;
  agreementPct: number;
  tierLabel: string;
}

export interface ConsensusTier {
  id: string;
  label: string;
  color: string;
  items: ConsensusItemRank[];
}

export interface ConsensusResult {
  templateId: string;
  templateTitle: string;
  totalSubmissions: number;
  overallAgreementPct: number;
  tiers: ConsensusTier[];
  mostControversial: {
    item: Item;
    note: string;
    varianceScore: number;
  };
}

export interface AlignmentComparison {
  alignmentPct: number;
  archetype: {
    title: string;
    description: string;
    badgeColor: string;
  };
  agreements: {
    item: Item;
    tier: string;
  }[];
  hotTakes: {
    item: Item;
    userTier: string;
    consensusTier: string;
    difference: number;
  }[];
}

const TIER_WEIGHTS: Record<string, number> = {
  S: 5.0,
  "S+": 5.2,
  A: 4.0,
  B: 3.0,
  C: 2.0,
  D: 1.0,
  F: 0.5,
};

const DEFAULT_TIER_COLORS: Record<string, string> = {
  S: "from-rose-500 to-red-600",
  A: "from-amber-500 to-orange-500",
  B: "from-emerald-500 to-teal-600",
  C: "from-sky-500 to-blue-600",
  D: "from-purple-500 to-indigo-600",
};

/**
 * Pre-calibrated baseline item scores for seed templates
 */
const SEED_ITEM_BASELINES: Record<string, { score: number; variance: number }> = {
  // Elden Ring
  "er-1": { score: 4.88, variance: 0.12 }, // Malenia
  "er-2": { score: 4.82, variance: 0.35 }, // Radahn
  "er-3": { score: 4.65, variance: 0.20 }, // Messmer
  "er-4": { score: 4.40, variance: 0.45 }, // Bayle
  "er-5": { score: 4.15, variance: 0.25 }, // Mohg
  "er-6": { score: 4.05, variance: 0.30 }, // Godfrey
  "er-7": { score: 3.85, variance: 0.32 }, // Maliketh
  "er-8": { score: 3.70, variance: 0.40 }, // Starscourge
  "er-9": { score: 3.35, variance: 0.28 }, // Midra
  "er-10": { score: 3.10, variance: 0.22 }, // Rellana

  // MCU Movies
  "mcu-1": { score: 4.90, variance: 0.10 }, // Infinity War
  "mcu-2": { score: 4.85, variance: 0.15 }, // Endgame
  "mcu-3": { score: 4.60, variance: 0.22 }, // Winter Soldier
  "mcu-4": { score: 4.30, variance: 0.28 }, // Civil War
  "mcu-5": { score: 4.25, variance: 0.30 }, // Guardians 1
  "mcu-6": { score: 4.15, variance: 0.38 }, // Deadpool & Wolverine
  "mcu-7": { score: 3.90, variance: 0.35 }, // No Way Home
  "mcu-8": { score: 3.85, variance: 0.20 }, // Iron Man
  "mcu-9": { score: 3.75, variance: 0.30 }, // Ragnarok
  "mcu-10": { score: 3.40, variance: 0.42 }, // Black Panther

  // Anime
  "an-1": { score: 4.92, variance: 0.08 }, // Frieren
  "an-2": { score: 4.75, variance: 0.25 }, // JJK
  "an-3": { score: 4.45, variance: 0.32 }, // Chainsaw Man
  "an-4": { score: 4.35, variance: 0.38 }, // Demon Slayer
  "an-5": { score: 4.20, variance: 0.26 }, // Bleach TYBW
  "an-6": { score: 3.95, variance: 0.42 }, // Solo Leveling
  "an-7": { score: 3.85, variance: 0.35 }, // Dandadan
  "an-8": { score: 3.45, variance: 0.30 }, // Kaiju No. 8
  "an-9": { score: 3.30, variance: 0.28 }, // Hell's Paradise
  "an-10": { score: 3.20, variance: 0.45 }, // Oshi no Ko

  // Fast Food Fries
  "ff-1": { score: 4.80, variance: 0.20 }, // McDonald's
  "ff-2": { score: 4.72, variance: 0.30 }, // Five Guys Cajun
  "ff-3": { score: 4.40, variance: 0.25 }, // Popeyes
  "ff-4": { score: 4.30, variance: 0.32 }, // Arby's
  "ff-5": { score: 3.70, variance: 0.38 }, // Wendy's
  "ff-6": { score: 3.60, variance: 0.40 }, // Chick-fil-A
  "ff-7": { score: 3.20, variance: 0.45 }, // Burger King
  "ff-8": { score: 3.15, variance: 0.35 }, // Shake Shack
  "ff-9": { score: 2.90, variance: 0.55 }, // In-N-Out
  "ff-10": { score: 2.80, variance: 0.48 }, // Taco Bell
};

/** Resolve a tier label (e.g. "S", "s tier", "A+") to a numeric weight; unknown labels → 3.0 (B). */
function resolveTierWeight(label: string | undefined): number {
  const clean = (label || "").trim().toUpperCase();
  if (TIER_WEIGHTS[clean] !== undefined) return TIER_WEIGHTS[clean];
  const first = clean.charAt(0);
  if (TIER_WEIGHTS[first] !== undefined) return TIER_WEIGHTS[first];
  return 3.0;
}

/**
 * Deterministic pseudo-score in [2.2, 4.7] for items with no baseline and no placements yet.
 * Stable across renders and SSR/CSR (no Math.random), so hydration never mismatches.
 */
function deterministicBaselineScore(item: Item, index: number): number {
  const seed = `${item.id}|${item.name || ""}`;
  let hash = 2166136261; // FNV-1a
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  // Blend hash with index so adjacent items spread out even with similar ids
  const fraction = (((hash >>> 0) % 1000) / 1000 + ((index * 0.618034) % 1)) % 1;
  return Number((2.2 + fraction * 2.5).toFixed(2));
}

/** Map standard deviation of tier weights (0 … ~2.35) into the 0–1 variance scale used by the UI. */
function normalizeVariance(values: number[]): number {
  if (values.length < 2) return 0.25;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const sqDiff = values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / values.length;
  return Math.min(1, Math.sqrt(sqDiff) / 2);
}

const SEED_TEMPLATE_IDS = new Set(SEED_TEMPLATES.map((t) => t.id));

/**
 * Calculates consensus tiers for a template
 */
export function calculateConsensus(
  template: Template,
  userSubmissions: PublishedTierList[] = []
): ConsensusResult {
  const itemScores: Record<string, { sum: number; count: number; variance: number }> = {};
  const placements: Record<string, number[]> = {};
  const hasSubmissions = userSubmissions.length > 0;
  const items = Array.isArray(template.items) ? template.items : [];

  // 1. Initialise baselines
  items.forEach((item, index) => {
    const baseline = SEED_ITEM_BASELINES[item.id];
    placements[item.id] = [];

    if (baseline) {
      // Curated seed item: weighted as 50 historical submissions
      itemScores[item.id] = { sum: baseline.score * 50, count: 50, variance: baseline.variance };
    } else if (hasSubmissions) {
      // Custom item: let real user placements drive the score
      itemScores[item.id] = { sum: 0, count: 0, variance: 0.25 };
    } else {
      // Custom item with no data yet: realistic deterministic spread instead of everything in B
      itemScores[item.id] = {
        sum: deterministicBaselineScore(item, index),
        count: 1,
        variance: 0.25,
      };
    }
  });

  // 2. Incorporate real user submissions
  userSubmissions.forEach((submission) => {
    (submission.tiers || []).forEach((tier) => {
      const tierWeight = resolveTierWeight(tier.label);
      (tier.items || []).forEach((item) => {
        const entry = itemScores[item.id];
        if (!entry) return;
        entry.sum += tierWeight;
        entry.count += 1;
        placements[item.id].push(tierWeight);
      });
    });
  });

  // 3. Finalise custom items: real variance, or deterministic fallback for never-placed items
  items.forEach((item, index) => {
    if (SEED_ITEM_BASELINES[item.id]) return;
    const entry = itemScores[item.id];
    if (entry.count === 0) {
      entry.sum = deterministicBaselineScore(item, index);
      entry.count = 1;
      entry.variance = 0.25;
    } else {
      entry.variance = normalizeVariance(placements[item.id]);
    }
  });

  // Compute final scores and bucket into tiers
  const rankedItems: ConsensusItemRank[] = items.map((item) => {
    const data = itemScores[item.id];
    const avgScore = Number((data.sum / data.count).toFixed(2));
    const agreementPct = Math.max(50, Math.min(99, Math.round(75 + (1 - data.variance) * 22)));

    let tierLabel = "C";
    if (avgScore >= 4.5) tierLabel = "S";
    else if (avgScore >= 3.6) tierLabel = "A";
    else if (avgScore >= 2.6) tierLabel = "B";
    else if (avgScore >= 1.6) tierLabel = "C";
    else tierLabel = "D";

    return {
      item,
      avgScore,
      agreementPct,
      tierLabel,
    };
  });

  // Sort items within each tier by exact avgScore descending
  rankedItems.sort((a, b) => b.avgScore - a.avgScore);

  const tiers: ConsensusTier[] = ["S", "A", "B", "C", "D"].map((label) => ({
    id: `tier-${label.toLowerCase()}`,
    label,
    color: DEFAULT_TIER_COLORS[label] || "from-zinc-600 to-zinc-800",
    items: rankedItems.filter((i) => i.tierLabel === label),
  }));

  // Find most controversial item (highest variance)
  let mostControversialItem = items[0];
  let maxVariance = 0;
  items.forEach((it) => {
    const v = itemScores[it.id]?.variance || 0;
    if (v > maxVariance) {
      maxVariance = v;
      mostControversialItem = it;
    }
  });

  const overallAgreement =
    rankedItems.length > 0
      ? Math.round(rankedItems.reduce((acc, it) => acc + it.agreementPct, 0) / rankedItems.length)
      : 0;

  // Real submission count; legacy 12,450 fallback only for the curated seed templates
  const realCount = Math.max(template.remixCount || 0, userSubmissions.length);
  const totalSubmissions =
    realCount > 0 ? realCount : SEED_TEMPLATE_IDS.has(template.id) ? 12450 : 0;

  return {
    templateId: template.id,
    templateTitle: template.title,
    totalSubmissions,
    overallAgreementPct: overallAgreement,
    tiers,
    mostControversial: {
      item: mostControversialItem,
      note: `Split opinions across community with highest placement variance.`,
      varianceScore: Number(maxVariance.toFixed(2)),
    },
  };
}

/**
 * Compares a user's personal board against the consensus ranking
 */
export function compareUserBoardWithConsensus(
  userBoard: Board,
  consensus: ConsensusResult
): AlignmentComparison {
  const agreements: { item: Item; tier: string }[] = [];
  const hotTakes: {
    item: Item;
    userTier: string;
    consensusTier: string;
    difference: number;
  }[] = [];

  let totalScore = 0;
  let evaluatedCount = 0;

  // Build a lookup map for consensus item tiers
  const consensusItemMap = new Map<string, string>();
  consensus.tiers.forEach((ct) => {
    ct.items.forEach((ci) => {
      consensusItemMap.set(ci.item.id, ct.label.toUpperCase());
    });
  });

  userBoard.tiers.forEach((userTier) => {
    const uLabel = userTier.label.trim().toUpperCase();
    const uWeight = TIER_WEIGHTS[uLabel] || 3.0;

    userTier.items.forEach((item) => {
      const cLabel = consensusItemMap.get(item.id);
      if (!cLabel) return;

      const cWeight = TIER_WEIGHTS[cLabel] || 3.0;
      const diff = Math.abs(uWeight - cWeight);

      evaluatedCount++;
      if (diff < 0.4) {
        totalScore += 100;
        agreements.push({ item, tier: uLabel });
      } else {
        const itemScore = Math.max(10, 100 - Math.round(diff * 35));
        totalScore += itemScore;
        hotTakes.push({
          item,
          userTier: uLabel,
          consensusTier: cLabel,
          difference: Number(diff.toFixed(1)),
        });
      }
    });
  });

  const alignmentPct = evaluatedCount > 0 ? Math.round(totalScore / evaluatedCount) : 80;

  let archetype = {
    title: "Mainstream with Spice",
    description: "You generally align with the crowd, but you have a couple of unapologetic hot takes that defy the consensus.",
    badgeColor: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
  };

  if (alignmentPct >= 90) {
    archetype = {
      title: "Hivemind Consensus",
      description: "Your taste mirrors the community almost perfectly. Your placements represent the undisputed voice of the crowd.",
      badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    };
  } else if (alignmentPct < 65) {
    archetype = {
      title: "Total Chaos Rebel",
      description: "You fiercely reject the mainstream opinion! Your placements will trigger arguments in any comment section.",
      badgeColor: "bg-rose-500/20 text-rose-300 border-rose-500/30",
    };
  } else if (alignmentPct < 78) {
    archetype = {
      title: "Controversial Visionary",
      description: "You agree with the crowd on the obvious classics, but completely diverge on the mid-tier and underrated gems.",
      badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    };
  }

  // Sort hot takes by biggest difference first
  hotTakes.sort((a, b) => b.difference - a.difference);

  return {
    alignmentPct,
    archetype,
    agreements,
    hotTakes,
  };
}

export interface VersusMatchup {
  similarityPct: number;
  verdict: {
    title: string;
    description: string;
    badgeColor: string;
  };
  totalCompared: number;
  agreements: {
    item: Item;
    tier: string;
  }[];
  divergences: {
    item: Item;
    tierA: string;
    tierB: string;
    difference: number;
  }[];
}

/**
 * Compare two separate user tier lists head-to-head
 */
export function compareTwoTierLists(
  listA: { title: string; authorName: string; tiers: TierRow[] },
  listB: { title: string; authorName: string; tiers: TierRow[] }
): VersusMatchup {
  const itemTierA = new Map<string, { tier: string; item: Item }>();
  listA.tiers.forEach((t) => {
    t.items.forEach((it) => {
      itemTierA.set(it.id, { tier: t.label.trim().toUpperCase(), item: it });
    });
  });

  const itemTierB = new Map<string, { tier: string; item: Item }>();
  listB.tiers.forEach((t) => {
    t.items.forEach((it) => {
      itemTierB.set(it.id, { tier: t.label.trim().toUpperCase(), item: it });
    });
  });

  const agreements: { item: Item; tier: string }[] = [];
  const divergences: { item: Item; tierA: string; tierB: string; difference: number }[] = [];
  let totalCompared = 0;
  let totalScore = 0;

  itemTierA.forEach((valA, itemId) => {
    const valB = itemTierB.get(itemId);
    if (!valB) return;

    totalCompared++;
    const weightA = TIER_WEIGHTS[valA.tier] || 3.0;
    const weightB = TIER_WEIGHTS[valB.tier] || 3.0;
    const diff = Math.abs(weightA - weightB);

    if (diff < 0.4) {
      totalScore += 100;
      agreements.push({ item: valA.item, tier: valA.tier });
    } else {
      const itemScore = Math.max(10, 100 - Math.round(diff * 35));
      totalScore += itemScore;
      divergences.push({
        item: valA.item,
        tierA: valA.tier,
        tierB: valB.tier,
        difference: Number(diff.toFixed(1)),
      });
    }
  });

  const similarityPct = totalCompared > 0 ? Math.round(totalScore / totalCompared) : 75;

  let verdict = {
    title: "Kindred Spirits",
    description: "You share remarkably similar tastes across the board!",
    badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  };

  if (similarityPct < 55) {
    verdict = {
      title: "Total Taste War",
      description: "You completely disagree on what is top-tier and what is trash!",
      badgeColor: "bg-rose-500/20 text-rose-300 border-rose-500/30",
    };
  } else if (similarityPct < 75) {
    verdict = {
      title: "Friendly Rivals",
      description: "You share core favorites, but have fiery disagreements on the rest.",
      badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    };
  }

  divergences.sort((a, b) => b.difference - a.difference);

  return {
    similarityPct,
    verdict,
    totalCompared,
    agreements,
    divergences,
  };
}
