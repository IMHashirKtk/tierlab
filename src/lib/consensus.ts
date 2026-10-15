import type { Item, TierRow, Template, PublishedTierList } from "@/types";
import type { Board } from "@/lib/board";

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
  status?: "ready" | "empty" | "error";
  mostControversial: {
    item: Item;
    note: string;
    varianceScore: number;
  } | null;
}

export interface AlignmentComparison {
  alignmentPct: number | null;
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

const DEFAULT_TIER_COLORS: Record<string, string> = {
  S: "from-rose-500 to-red-600",
  A: "from-amber-500 to-orange-500",
  B: "from-emerald-500 to-teal-600",
  C: "from-sky-500 to-blue-600",
  D: "from-purple-500 to-indigo-600",
};

/**
 * Computes tier weight exclusively from row position index (0 = top tier 5.0, last = bottom tier 1.0).
 * Fully decoupled from arbitrary label strings, preserving custom presets ("GOAT" vs "Trash").
 */
export function getPositionalTierWeight(rowIndex: number, totalRows: number): number {
  if (totalRows <= 1) return 5.0;
  return Number((5.0 - (rowIndex / (totalRows - 1)) * 4.0).toFixed(4));
}

/** Map standard deviation of placement weights (0 … ~2.0) into the 0–1 variance scale. */
function normalizeVariance(values: number[]): number {
  if (values.length < 2) return 0.2;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const sqDiff = values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / values.length;
  return Math.min(1, Math.sqrt(sqDiff) / 2);
}

/**
 * Calculates genuine mathematical consensus tiers from verified user submissions.
 * Never fabricates synthetic baselines when submissions are empty.
 */
export function calculateConsensus(
  template: Template,
  userSubmissions: PublishedTierList[] = [],
  options?: { fetchError?: boolean }
): ConsensusResult {
  if (options?.fetchError) {
    return {
      templateId: template.id,
      templateTitle: template.title,
      totalSubmissions: 0,
      overallAgreementPct: 0,
      tiers: [],
      status: "error",
      mostControversial: null,
    };
  }

  if (!userSubmissions || userSubmissions.length === 0) {
    return {
      templateId: template.id,
      templateTitle: template.title,
      totalSubmissions: 0,
      overallAgreementPct: 0,
      tiers: [],
      status: "empty",
      mostControversial: null,
    };
  }

  const itemPlacements: Record<string, number[]> = {};
  const itemMap = new Map<string, Item>();

  (template.items || []).forEach((it) => itemMap.set(it.id, it));

  userSubmissions.forEach((submission) => {
    const totalRows = (submission.tiers || []).length;
    (submission.tiers || []).forEach((tier, rowIndex) => {
      const weight = getPositionalTierWeight(rowIndex, totalRows);
      (tier.items || []).forEach((item) => {
        if (!itemPlacements[item.id]) {
          itemPlacements[item.id] = [];
        }
        itemPlacements[item.id].push(weight);
        if (!itemMap.has(item.id)) {
          itemMap.set(item.id, item);
        }
      });
    });
  });

  const rankedItems: { item: Item; avgScore: number; variance: number }[] = [];

  for (const [itemId, weights] of Object.entries(itemPlacements)) {
    const item = itemMap.get(itemId);
    if (!item) continue;
    const avgScore = Number((weights.reduce((a, b) => a + b, 0) / weights.length).toFixed(2));
    const variance = normalizeVariance(weights);
    rankedItems.push({ item, avgScore, variance });
  }

  rankedItems.sort((a, b) => b.avgScore - a.avgScore);

  // Map into target template tiers (or standard 5-tier S-D structure)
  const templateTiers =
    template.defaultTiers && template.defaultTiers.length > 0
      ? template.defaultTiers
      : [
          { label: "S", color: DEFAULT_TIER_COLORS.S },
          { label: "A", color: DEFAULT_TIER_COLORS.A },
          { label: "B", color: DEFAULT_TIER_COLORS.B },
          { label: "C", color: DEFAULT_TIER_COLORS.C },
          { label: "D", color: DEFAULT_TIER_COLORS.D },
        ];

  const totalTiers = templateTiers.length;
  const tiersResult: ConsensusTier[] = templateTiers.map((t, idx) => ({
    id: `consensus-tier-${idx}`,
    label: t.label,
    color: t.color,
    items: [],
  }));

  // Distribute items into tiers based on positional weight thresholds
  rankedItems.forEach((ri) => {
    let closestTierIdx = 0;
    let minDiff = Infinity;
    for (let i = 0; i < totalTiers; i++) {
      const tierTargetWeight = getPositionalTierWeight(i, totalTiers);
      const diff = Math.abs(ri.avgScore - tierTargetWeight);
      if (diff < minDiff) {
        minDiff = diff;
        closestTierIdx = i;
      }
    }

    const agreementPct = Math.max(50, Math.round((1 - ri.variance) * 100));
    tiersResult[closestTierIdx].items.push({
      item: ri.item,
      avgScore: ri.avgScore,
      agreementPct,
      tierLabel: tiersResult[closestTierIdx].label,
    });
  });

  // Calculate most controversial item
  let mostControversial: ConsensusResult["mostControversial"] = null;
  if (rankedItems.length > 0) {
    const sortedByVariance = [...rankedItems].sort((a, b) => b.variance - a.variance);
    const topControversial = sortedByVariance[0];
    mostControversial = {
      item: topControversial.item,
      varianceScore: Number(topControversial.variance.toFixed(2)),
      note: "Highest placement standard deviation across community submissions",
    };
  }

  const allAgreements = tiersResult.flatMap((t) => t.items.map((i) => i.agreementPct));
  const overallAgreementPct =
    allAgreements.length > 0
      ? Math.round(allAgreements.reduce((a, b) => a + b, 0) / allAgreements.length)
      : 80;

  return {
    templateId: template.id,
    templateTitle: template.title,
    totalSubmissions: userSubmissions.length,
    overallAgreementPct,
    tiers: tiersResult,
    status: "ready",
    mostControversial,
  };
}

/**
 * Compares a user's personal board against consensus using purely positional weights.
 * Returns alignmentPct: null ("No Ranked Items") when 0 items are placed.
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

  // Build a lookup map for consensus item positional weights
  const consensusItemMap = new Map<string, { tier: string; weight: number }>();
  const totalConsensusRows = consensus.tiers.length;
  consensus.tiers.forEach((ct, rowIndex) => {
    const weight = getPositionalTierWeight(rowIndex, totalConsensusRows);
    ct.items.forEach((ci) => {
      consensusItemMap.set(ci.item.id, { tier: ct.label, weight });
    });
  });

  const totalUserRows = userBoard.tiers.length;
  userBoard.tiers.forEach((userTier, uRowIndex) => {
    const uWeight = getPositionalTierWeight(uRowIndex, totalUserRows);

    userTier.items.forEach((item) => {
      const cInfo = consensusItemMap.get(item.id);
      if (!cInfo) return;

      const diff = Math.abs(uWeight - cInfo.weight);
      evaluatedCount++;

      const itemScore = Math.max(0, Math.round((1.0 - diff / 4.0) * 100));
      totalScore += itemScore;

      if (diff < 0.4) {
        agreements.push({ item, tier: userTier.label });
      } else {
        hotTakes.push({
          item,
          userTier: userTier.label,
          consensusTier: cInfo.tier,
          difference: Number(diff.toFixed(1)),
        });
      }
    });
  });

  if (evaluatedCount === 0) {
    return {
      alignmentPct: null,
      archetype: {
        title: "No Ranked Items",
        description: "Place items into tiers on your board to compare your taste against the community consensus.",
        badgeColor: "bg-zinc-800 text-zinc-400 border-zinc-700",
      },
      agreements: [],
      hotTakes: [],
    };
  }

  const alignmentPct = Math.round(totalScore / evaluatedCount);

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
  } else if (alignmentPct < 60) {
    archetype = {
      title: "Total Chaos Rebel",
      description: "You fiercely reject the mainstream opinion! Your placements will trigger debates across the community.",
      badgeColor: "bg-rose-500/20 text-rose-300 border-rose-500/30",
    };
  } else if (alignmentPct < 78) {
    archetype = {
      title: "Controversial Visionary",
      description: "You agree with the crowd on the obvious classics, but completely diverge on mid-tier and underrated gems.",
      badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    };
  }

  hotTakes.sort((a, b) => b.difference - a.difference);

  return {
    alignmentPct,
    archetype,
    agreements,
    hotTakes,
  };
}

export interface VersusMatchup {
  similarityPct: number | null;
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
 * Compare two separate user tier lists head-to-head using purely positional weights.
 * Returns similarityPct: null ("No Overlapping Picks") when 0 items overlap.
 */
export function compareTwoTierLists(
  listA: { title: string; authorName: string; tiers: TierRow[] },
  listB: { title: string; authorName: string; tiers: TierRow[] }
): VersusMatchup {
  const itemTierA = new Map<string, { tier: string; weight: number; item: Item }>();
  const totalRowsA = listA.tiers.length;
  listA.tiers.forEach((t, rowIndex) => {
    const weight = getPositionalTierWeight(rowIndex, totalRowsA);
    t.items.forEach((it) => {
      itemTierA.set(it.id, { tier: t.label, weight, item: it });
    });
  });

  const itemTierB = new Map<string, { tier: string; weight: number; item: Item }>();
  const totalRowsB = listB.tiers.length;
  listB.tiers.forEach((t, rowIndex) => {
    const weight = getPositionalTierWeight(rowIndex, totalRowsB);
    t.items.forEach((it) => {
      itemTierB.set(it.id, { tier: t.label, weight, item: it });
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
    const diff = Math.abs(valA.weight - valB.weight);
    const itemScore = Math.max(0, Math.round((1.0 - diff / 4.0) * 100));
    totalScore += itemScore;

    if (diff < 0.4) {
      agreements.push({ item: valA.item, tier: valA.tier });
    } else {
      divergences.push({
        item: valA.item,
        tierA: valA.tier,
        tierB: valB.tier,
        difference: Number(diff.toFixed(1)),
      });
    }
  });

  if (totalCompared === 0) {
    return {
      similarityPct: null,
      verdict: {
        title: "No Overlapping Picks",
        description: "Neither tier list shares ranked items in common yet.",
        badgeColor: "bg-zinc-800 text-zinc-400 border-zinc-700",
      },
      totalCompared: 0,
      agreements: [],
      divergences: [],
    };
  }

  const similarityPct = Math.round(totalScore / totalCompared);

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
