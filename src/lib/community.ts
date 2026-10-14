import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { SEED_TEMPLATES, SEED_RECENT_RANKINGS } from "@/data/seed-templates";
import type { Template, PublishedTierList, UserRanking, Item, TierRow, Comment } from "@/types";
import { createId } from "@/lib/board";

const USER_TEMPLATES_KEY = "tl_user_templates";
const PUBLISHED_RANKINGS_KEY = "tl_published_rankings";
const USER_UPVOTES_KEY = "tl_user_upvotes";
const VOTER_ID_KEY = "tl_voter_id";
const COMMENTS_KEY = "tl_comments";
const COMMENT_UPVOTES_KEY = "tl_comment_upvotes";

export function getVoterId(): string {
  if (typeof window === "undefined") return "server-voter";
  let vid = localStorage.getItem(VOTER_ID_KEY);
  if (!vid) {
    vid = "voter-" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    localStorage.setItem(VOTER_ID_KEY, vid);
  }
  return vid;
}

function getLocalUserTemplates(): Template[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(USER_TEMPLATES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalUserTemplate(template: Template) {
  if (typeof window === "undefined") return;
  try {
    const existing = getLocalUserTemplates();
    const updated = [template, ...existing.filter((t) => t.id !== template.id)];
    localStorage.setItem(USER_TEMPLATES_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error("Failed to save local template", err);
  }
}

function getLocalPublishedRankings(): PublishedTierList[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PUBLISHED_RANKINGS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalPublishedRanking(ranking: PublishedTierList) {
  if (typeof window === "undefined") return;
  try {
    const existing = getLocalPublishedRankings();
    const updated = [ranking, ...existing.filter((r) => r.id !== ranking.id)];
    localStorage.setItem(PUBLISHED_RANKINGS_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error("Failed to save local published ranking", err);
  }
}

/**
 * Fetch templates with filtering, searching, and sorting
 */
export async function fetchTemplates(options?: {
  category?: string;
  sortBy?: "most-ranked" | "newest" | "top-rated";
  search?: string;
}): Promise<Template[]> {
  const category = options?.category || "all";
  const sortBy = options?.sortBy || "most-ranked";
  const search = options?.search?.toLowerCase().trim() || "";

  let cloudTemplates: Template[] = [];

  if (isSupabaseConfigured() && supabase) {
    try {
      let query = supabase.from("templates").select("*");
      if (category !== "all") {
        query = query.eq("category", category);
      }
      if (sortBy === "most-ranked") {
        query = query.order("rank_count", { ascending: false });
      } else if (sortBy === "top-rated") {
        query = query.order("upvotes", { ascending: false });
      } else {
        query = query.order("created_at", { ascending: false });
      }

      const { data, error } = await query.limit(50);
      if (!error && data) {
        cloudTemplates = data.map((d) => ({
          id: d.id,
          slug: d.id,
          title: d.title,
          description: d.description || "",
          category: d.category as any,
          author: { username: d.author_name || "Community" },
          itemCount: Array.isArray(d.items) ? d.items.length : 0,
          remixCount: d.rank_count || 0,
          upvotes: d.upvotes || 0,
          createdAt: new Date(d.created_at).toLocaleDateString(),
          items: d.items || [],
          defaultTiers: d.default_tiers || undefined,
        }));
      }
    } catch (err) {
      console.warn("Supabase templates query failed, falling back to local", err);
    }
  }

  const localUserTemplates = getLocalUserTemplates();
  // Merge cloud templates, local user templates, and seed templates (deduped by ID)
  const templateMap = new Map<string, Template>();
  cloudTemplates.forEach((t) => templateMap.set(t.id, t));
  localUserTemplates.forEach((t) => templateMap.set(t.id, t));
  SEED_TEMPLATES.forEach((t) => {
    if (!templateMap.has(t.id)) templateMap.set(t.id, t);
  });

  let result = Array.from(templateMap.values());

  // Category filter
  if (category !== "all") {
    result = result.filter((t) => t.category.toLowerCase() === category.toLowerCase());
  }

  // Search filter
  if (search) {
    result = result.filter(
      (t) =>
        t.title.toLowerCase().includes(search) ||
        t.description.toLowerCase().includes(search) ||
        t.category.toLowerCase().includes(search)
    );
  }

  // Sort
  result.sort((a, b) => {
    if (sortBy === "most-ranked") return b.remixCount - a.remixCount;
    if (sortBy === "top-rated") return b.upvotes - a.upvotes;
    if (sortBy === "newest") return b.id.localeCompare(a.id);
    return 0;
  });

  return result;
}

/**
 * Fetch a single template by ID
 */
export async function fetchTemplateById(id: string): Promise<Template | null> {
  // Check local cache/user templates first
  const local = getLocalUserTemplates().find((t) => t.id === id);
  if (local) return local;

  const seed = SEED_TEMPLATES.find((t) => t.id === id);
  if (seed) return seed;

  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase.from("templates").select("*").eq("id", id).maybeSingle();
      if (!error && data) {
        return {
          id: data.id,
          slug: data.id,
          title: data.title,
          description: data.description || "",
          category: data.category as any,
          author: { username: data.author_name || "Community" },
          itemCount: Array.isArray(data.items) ? data.items.length : 0,
          remixCount: data.rank_count || 0,
          upvotes: data.upvotes || 0,
          createdAt: new Date(data.created_at).toLocaleDateString(),
          items: data.items || [],
          defaultTiers: data.default_tiers || undefined,
        };
      }
    } catch (err) {
      console.warn("Supabase template lookup failed", err);
    }
  }

  return null;
}

/**
 * Publish a new template created by the user
 */
export async function publishTemplate(payload: {
  title: string;
  category: string;
  description?: string;
  items: Item[];
  defaultTiers?: { label: string; color: string }[];
  authorName?: string;
}): Promise<Template> {
  const id = `tpl-${createId("ugc")}`;
  const now = new Date();

  const newTemplate: Template = {
    id,
    slug: id,
    title: payload.title.trim(),
    description: payload.description?.trim() || `User-created template featuring ${payload.items.length} items.`,
    category: (payload.category as any) || "gaming",
    author: {
      username: payload.authorName?.trim() || "Creator",
      verified: true,
    },
    itemCount: payload.items.length,
    remixCount: 0,
    upvotes: 1,
    createdAt: "Just now",
    items: payload.items,
    defaultTiers: payload.defaultTiers,
  };

  saveLocalUserTemplate(newTemplate);

  if (isSupabaseConfigured() && supabase) {
    try {
      await supabase.from("templates").insert({
        id,
        title: newTemplate.title,
        description: newTemplate.description,
        category: newTemplate.category,
        items: newTemplate.items,
        default_tiers: newTemplate.defaultTiers || [],
        author_name: newTemplate.author.username,
        rank_count: 0,
        upvotes: 1,
      });
    } catch (err) {
      console.error("Failed to insert template into Supabase", err);
    }
  }

  return newTemplate;
}

/**
 * Publish a completed Tier List for public sharing & live feed
 */
export async function publishTierList(payload: {
  templateId?: string;
  title: string;
  authorName?: string;
  tiers: TierRow[];
  unranked: Item[];
}): Promise<PublishedTierList> {
  const id = `share-${createId("tier")}`;
  const authorName = payload.authorName?.trim() || "Ranker";
  const now = Date.now();

  const published: PublishedTierList = {
    id,
    templateId: payload.templateId,
    title: payload.title.trim(),
    authorName,
    tiers: payload.tiers,
    unranked: payload.unranked,
    upvotes: 1,
    createdAt: now,
  };

  saveLocalPublishedRanking(published);

  if (isSupabaseConfigured() && supabase) {
    try {
      await supabase.from("tier_lists").insert({
        id,
        template_id: payload.templateId || null,
        title: published.title,
        author_name: authorName,
        tiers: published.tiers,
        unranked: published.unranked,
        upvotes: 1,
      });

      if (payload.templateId) {
        // Increment template's rank count atomically
        await supabase.rpc("increment_template_rank", { t_id: payload.templateId });
      }
    } catch (err) {
      console.error("Failed to publish tier list to Supabase", err);
    }
  }

  return published;
}

/**
 * Fetch a shared tier list by ID
 */
export async function fetchSharedTierList(id: string): Promise<PublishedTierList | null> {
  const local = getLocalPublishedRankings().find((r) => r.id === id);
  if (local) return local;

  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase.from("tier_lists").select("*").eq("id", id).maybeSingle();
      if (!error && data) {
        return {
          id: data.id,
          templateId: data.template_id || undefined,
          title: data.title,
          authorName: data.author_name || "Community",
          tiers: data.tiers || [],
          unranked: data.unranked || [],
          upvotes: data.upvotes || 0,
          createdAt: new Date(data.created_at).getTime(),
        };
      }
    } catch (err) {
      console.warn("Failed to fetch shared tier list from Supabase", err);
    }
  }

  return null;
}

/**
 * Toggle upvote for a template or tier list
 */
export async function toggleUpvote(
  itemType: "template" | "tier_list",
  itemId: string
): Promise<{ isUpvoted: boolean; newCount: number }> {
  const voterId = getVoterId();

  // Handle local state tracking
  let localUpvotes: Record<string, boolean> = {};
  try {
    localUpvotes = JSON.parse(localStorage.getItem(USER_UPVOTES_KEY) || "{}");
  } catch {}

  const currentlyUpvoted = Boolean(localUpvotes[itemId]);
  const newUpvoted = !currentlyUpvoted;
  localUpvotes[itemId] = newUpvoted;
  try {
    localStorage.setItem(USER_UPVOTES_KEY, JSON.stringify(localUpvotes));
  } catch {}

  let newCount = 0;

  if (isSupabaseConfigured() && supabase) {
    try {
      const { data } = await supabase.rpc("toggle_upvote", {
        target_type: itemType,
        target_id: itemId,
        voter: voterId,
      });
      // Cloud handled the counter
    } catch (err) {
      console.warn("Supabase toggle_upvote RPC failed", err);
    }
  }

  return { isUpvoted: newUpvoted, newCount };
}

/** Format a timestamp (ms) into a compact relative label like "5m ago" / "2h ago". */
function formatRelativeTimestamp(ms: number): string {
  if (!Number.isFinite(ms)) return "Recently";
  const diffSec = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  return new Date(ms).toLocaleDateString();
}

/** Map a raw Supabase `tier_lists` row into a PublishedTierList. */
function mapTierListRow(d: any): PublishedTierList {
  return {
    id: d.id,
    templateId: d.template_id || undefined,
    title: d.title,
    authorName: d.author_name || "Community",
    tiers: Array.isArray(d.tiers) ? d.tiers : [],
    unranked: Array.isArray(d.unranked) ? d.unranked : [],
    upvotes: d.upvotes || 0,
    createdAt: new Date(d.created_at).getTime(),
  };
}

/** Convert a PublishedTierList into a compact UserRanking card for the live feed. */
function toUserRanking(p: PublishedTierList): UserRanking {
  const tiers = Array.isArray(p.tiers) ? p.tiers : [];
  const sTier = tiers.find((t) => t.label?.toUpperCase().startsWith("S")) || tiers[0];
  const totalItems = tiers.reduce((sum, t) => sum + (t.items?.length || 0), 0);

  return {
    id: p.id,
    templateId: p.templateId || "custom",
    templateTitle: p.title,
    title: p.title,
    author: { username: p.authorName },
    upvotes: p.upvotes,
    commentsCount: 0,
    createdAt: formatRelativeTimestamp(p.createdAt),
    tierSummary: [
      {
        tier: sTier?.label || "Top",
        items: sTier && sTier.items.length > 0 ? sTier.items.map((i) => i.name).slice(0, 3) : ["None"],
      },
    ],
    totalItems,
    totalTiers: tiers.length,
  };
}

/**
 * Fetch live activity feed (real cloud submissions first, then local, then seeds)
 */
export async function fetchLiveActivity(): Promise<UserRanking[]> {
  const convertedLocal: UserRanking[] = getLocalPublishedRankings().map(toUserRanking);

  let cloudRankings: UserRanking[] = [];
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from("tier_lists")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (!error && data) {
        cloudRankings = data.map((d) => toUserRanking(mapTierListRow(d)));
      }
    } catch (err) {
      console.warn("Supabase live activity query failed, using local fallback", err);
    }
  }

  // Deduplicate by id — first occurrence wins (local > cloud > seed ordering)
  const seen = new Set<string>();
  const merged: UserRanking[] = [];
  for (const r of [...convertedLocal, ...cloudRankings, ...SEED_RECENT_RANKINGS]) {
    if (seen.has(r.id)) continue;
    seen.add(r.id);
    merged.push(r);
  }
  return merged;
}

/**
 * Fetch all real published rankings for a given template (local + Supabase), newest first.
 * Used to drive the Community Consensus calculation with genuine user placements.
 */
export async function fetchSubmissionsForTemplate(templateId: string): Promise<PublishedTierList[]> {
  if (!templateId) return [];

  const local = getLocalPublishedRankings().filter((r) => r.templateId === templateId);

  let cloud: PublishedTierList[] = [];
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from("tier_lists")
        .select("*")
        .eq("template_id", templateId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (!error && data) {
        cloud = data.map(mapTierListRow);
      }
    } catch (err) {
      console.warn("Supabase submissions query failed, using local fallback", err);
    }
  }

  const map = new Map<string, PublishedTierList>();
  cloud.forEach((r) => map.set(r.id, r));
  local.forEach((r) => map.set(r.id, r));

  return Array.from(map.values()).sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Comments Storage & API
 */
function getLocalCommentsAll(): Record<string, Comment[]> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(COMMENTS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveLocalComment(comment: Comment) {
  if (typeof window === "undefined") return;
  try {
    const all = getLocalCommentsAll();
    const listComments = all[comment.tierListId] || [];
    all[comment.tierListId] = [comment, ...listComments.filter((c) => c.id !== comment.id)];
    localStorage.setItem(COMMENTS_KEY, JSON.stringify(all));
  } catch (err) {
    console.error("Failed to save local comment", err);
  }
}

export function hasUpvotedComment(commentId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const votes: Record<string, boolean> = JSON.parse(
      localStorage.getItem(COMMENT_UPVOTES_KEY) || "{}"
    );
    return Boolean(votes[commentId]);
  } catch {
    return false;
  }
}

/**
 * Fetch comments for a specific tier list
 */
export async function fetchComments(tierListId: string): Promise<Comment[]> {
  let cloudComments: Comment[] = [];

  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from("comments")
        .select("*")
        .eq("tier_list_id", tierListId)
        .order("created_at", { ascending: false });

      if (!error && data) {
        cloudComments = data.map((d) => ({
          id: d.id,
          tierListId: d.tier_list_id,
          authorName: d.author_name,
          content: d.content,
          upvotes: d.upvotes || 0,
          createdAt: new Date(d.created_at).getTime(),
        }));
      }
    } catch (err) {
      console.warn("Supabase comments query failed, using local fallback", err);
    }
  }

  const allLocal = getLocalCommentsAll();
  const localList = allLocal[tierListId] || [];

  // Combine and deduplicate
  const map = new Map<string, Comment>();
  cloudComments.forEach((c) => map.set(c.id, c));
  localList.forEach((c) => map.set(c.id, c));

  let results = Array.from(map.values());

  // If no comments exist yet, supply default conversational comments for lively UGC feel
  if (results.length === 0) {
    const seedTime = Date.now();
    results = [
      {
        id: `seed-c1-${tierListId}`,
        tierListId,
        authorName: "TierEnthusiast",
        content: "Honestly solid S-tier placements! That top pick has been carrying the category all year. 🔥",
        upvotes: 4,
        createdAt: seedTime - 1000 * 60 * 45, // 45m ago
      },
      {
        id: `seed-c2-${tierListId}`,
        tierListId,
        authorName: "VortexGamer",
        content: "B-tier has a few hot takes, but overall I respect the courage not to just follow the hype. W list! 👏",
        upvotes: 2,
        createdAt: seedTime - 1000 * 60 * 180, // 3h ago
      },
    ];
  }

  // Sort newest first
  results.sort((a, b) => b.createdAt - a.createdAt);
  return results;
}

/**
 * Post a new comment
 */
export async function postComment(payload: {
  tierListId: string;
  authorName: string;
  content: string;
}): Promise<Comment> {
  const id = `cmt-${createId("c")}`;
  const authorName = payload.authorName.trim() || "Anonymous Ranker";
  const now = Date.now();

  const newComment: Comment = {
    id,
    tierListId: payload.tierListId,
    authorName,
    content: payload.content.trim(),
    upvotes: 1,
    createdAt: now,
  };

  saveLocalComment(newComment);

  if (isSupabaseConfigured() && supabase) {
    try {
      await supabase.from("comments").insert({
        id,
        tier_list_id: payload.tierListId,
        author_name: authorName,
        content: newComment.content,
        upvotes: 1,
      });
    } catch (err) {
      console.warn("Failed to persist comment to Supabase", err);
    }
  }

  return newComment;
}

/**
 * Toggle comment upvote
 */
export async function toggleCommentUpvote(
  commentId: string
): Promise<{ isUpvoted: boolean; newCount: number }> {
  if (typeof window === "undefined") return { isUpvoted: false, newCount: 0 };

  let votes: Record<string, boolean> = {};
  try {
    votes = JSON.parse(localStorage.getItem(COMMENT_UPVOTES_KEY) || "{}");
  } catch {}

  const currentStatus = Boolean(votes[commentId]);
  const newStatus = !currentStatus;
  votes[commentId] = newStatus;

  try {
    localStorage.setItem(COMMENT_UPVOTES_KEY, JSON.stringify(votes));
  } catch {}

  // Update in local comments if present
  let newCount = 1;
  const all = getLocalCommentsAll();
  for (const tid of Object.keys(all)) {
    const list = all[tid];
    const match = list.find((c) => c.id === commentId);
    if (match) {
      match.upvotes = Math.max(0, match.upvotes + (newStatus ? 1 : -1));
      newCount = match.upvotes;
      localStorage.setItem(COMMENTS_KEY, JSON.stringify(all));
      break;
    }
  }

  if (isSupabaseConfigured() && supabase) {
    try {
      const { data } = await supabase.rpc("increment_comment_upvote", {
        c_id: commentId,
        delta: newStatus ? 1 : -1,
      });
      // Seed placeholder comments don't exist in Postgres (RPC returns 0) — keep local count for those.
      if (typeof data === "number" && !commentId.startsWith("seed-")) {
        newCount = data;
      }
    } catch (err) {
      console.warn("Supabase increment_comment_upvote RPC failed", err);
    }
  }

  return { isUpvoted: newStatus, newCount };
}

export interface UserProfileData {
  username: string;
  bio: string;
  joinedDate: string;
  totalUpvotes: number;
  templates: Template[];
  tierLists: PublishedTierList[];
}

/**
 * Fetch profile and portfolio for any user / creator handle
 */
export async function fetchUserProfile(username: string): Promise<UserProfileData> {
  const cleanUser = username.trim().toLowerCase();

  let cloudTemplates: Template[] = [];
  let cloudTierLists: PublishedTierList[] = [];

  if (isSupabaseConfigured() && supabase) {
    try {
      const { data: tData } = await supabase
        .from("templates")
        .select("*")
        .ilike("author_name", cleanUser);

      if (tData) {
        cloudTemplates = tData.map((d) => ({
          id: d.id,
          slug: d.id,
          title: d.title,
          description: d.description || "",
          category: d.category as any,
          author: { username: d.author_name || "Community" },
          itemCount: Array.isArray(d.items) ? d.items.length : 0,
          remixCount: d.rank_count || 0,
          upvotes: d.upvotes || 0,
          createdAt: new Date(d.created_at).toLocaleDateString(),
          items: d.items || [],
          defaultTiers: d.default_tiers || undefined,
        }));
      }

      const { data: rData } = await supabase
        .from("tier_lists")
        .select("*")
        .ilike("author_name", cleanUser);

      if (rData) {
        cloudTierLists = rData.map((d) => ({
          id: d.id,
          templateId: d.template_id || undefined,
          title: d.title,
          authorName: d.author_name || cleanUser,
          tiers: d.tiers || [],
          unranked: d.unranked || [],
          upvotes: d.upvotes || 0,
          createdAt: new Date(d.created_at).getTime(),
        }));
      }
    } catch (err) {
      console.warn("Failed to query user profile in Supabase", err);
    }
  }

  // Local templates & rankings
  const localTemplates = getLocalUserTemplates().filter(
    (t) => t.author.username.toLowerCase() === cleanUser
  );
  const localTierLists = getLocalPublishedRankings().filter(
    (r) => r.authorName.toLowerCase() === cleanUser
  );

  // Merge and deduplicate
  const tMap = new Map<string, Template>();
  cloudTemplates.forEach((t) => tMap.set(t.id, t));
  localTemplates.forEach((t) => tMap.set(t.id, t));

  const rMap = new Map<string, PublishedTierList>();
  cloudTierLists.forEach((r) => rMap.set(r.id, r));
  localTierLists.forEach((r) => rMap.set(r.id, r));

  const allTemplates = Array.from(tMap.values());
  const allTierLists = Array.from(rMap.values());

  const totalUpvotes =
    allTemplates.reduce((sum, t) => sum + (t.upvotes || 0), 0) +
    allTierLists.reduce((sum, r) => sum + (r.upvotes || 0), 0);

  return {
    username,
    bio: "Passionate Tier List Maker creator & ranker. Analyzing, debating, and ranking topics with the community.",
    joinedDate: "2026",
    totalUpvotes: Math.max(totalUpvotes, 1),
    templates: allTemplates,
    tierLists: allTierLists,
  };
}
