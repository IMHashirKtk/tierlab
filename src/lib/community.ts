import { supabase, isSupabaseConfigured, ensureAuthenticatedSession } from "@/lib/supabase";
import { SEED_TEMPLATES } from "@/data/seed-templates";
import { isDiscoverableRanking, presentTemplate } from "@/lib/catalog";
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

export function getLocalUserTemplates(): Template[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(USER_TEMPLATES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalUserTemplate(template: Template) {
  if (typeof window === "undefined") return;
  try {
    const existing = getLocalUserTemplates();
    const updated = [template, ...existing.filter((t) => t.id !== template.id)];
    localStorage.setItem(USER_TEMPLATES_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error("Failed to save local template", err);
  }
}

export function getLocalPublishedRankings(): PublishedTierList[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PUBLISHED_RANKINGS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalPublishedRanking(ranking: PublishedTierList) {
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
      if (search) {
        query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,category.ilike.%${search}%`);
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
          category: (d.category || "gaming") as Template["category"],
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

  let result = Array.from(templateMap.values()).map(presentTemplate);

  // Category filter
  if (category !== "all") {
    result = result.filter((t) => t.category.toLowerCase() === category.toLowerCase());
  }

  // Client-side search filter safety net
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
  const local = getLocalUserTemplates().find((t) => t.id === id);
  if (local) return presentTemplate(local);

  const seed = SEED_TEMPLATES.find((t) => t.id === id);
  if (seed) return seed;

  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase.from("templates").select("*").eq("id", id).maybeSingle();
      if (!error && data) {
        return presentTemplate({
          id: data.id,
          slug: data.id,
          title: data.title,
          description: data.description || "",
          category: (data.category || "gaming") as Template["category"],
          author: { username: data.author_name || "Community" },
          itemCount: Array.isArray(data.items) ? data.items.length : 0,
          remixCount: data.rank_count || 0,
          upvotes: data.upvotes || 0,
          createdAt: new Date(data.created_at).toLocaleDateString(),
          items: data.items || [],
          defaultTiers: data.default_tiers || undefined,
        });
      }
    } catch (err) {
      console.warn("Supabase template lookup failed", err);
    }
  }

  return null;
}

/**
 * Generate a keyword-rich, SEO-friendly URL slug for user-published templates
 */
export function generateTemplateSlug(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  const suffix = Math.random().toString(36).slice(2, 6);
  return base ? `${base}-${suffix}` : `tpl-${createId("ugc")}`;
}

export function areSemanticJsonEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null || a === undefined || b === undefined) return a === b;
  if (typeof a !== typeof b) return false;
  if (typeof a !== "object") return a === b;

  if (Array.isArray(a) !== Array.isArray(b)) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!areSemanticJsonEqual(a[i], b[i])) return false;
    }
    return true;
  }

  const objA = a as Record<string, unknown>;
  const objB = b as Record<string, unknown>;
  const keysA = Object.keys(objA).filter((k) => objA[k] !== undefined);
  const keysB = Object.keys(objB).filter((k) => objB[k] !== undefined);
  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(objB, key)) return false;
    if (!areSemanticJsonEqual(objA[key], objB[key])) return false;
  }
  return true;
}

async function handleExistingTemplate(
  existing: Record<string, unknown>,
  targetId: string,
  sessionUserId: string,
  payload: {
    title: string;
    description: string;
    category: string;
    authorName: string;
    items: Item[];
    defaultTiers: unknown[];
  }
): Promise<Template> {
  if (!supabase) {
    throw new Error("Cloud database client is unavailable.");
  }

  // 1. Verify expected ID
  if (existing.id !== targetId) {
    throw new Error(`Lookup error: Returned template ID "${String(existing.id)}" did not match target "${targetId}".`);
  }

  // 2. Strict ownership check: accept only when existing.author_id === sessionUserId
  if (!existing.author_id || existing.author_id !== sessionUserId) {
    throw new Error(`Conflict: Template "${targetId}" already exists and is not owned by the current session.`);
  }

  // 3. Check if content changed (semantic JSON comparison for items and tiers)
  const existingAuthorName = typeof existing.author_name === "string" ? existing.author_name : "";
  const contentMatches =
    existing.title === payload.title &&
    (existing.description || "") === payload.description &&
    existing.category === payload.category &&
    existingAuthorName.trim() === payload.authorName &&
    areSemanticJsonEqual(existing.items || [], payload.items) &&
    areSemanticJsonEqual(existing.default_tiers || [], payload.defaultTiers);

  if (contentMatches) {
    // Idempotent retry: earlier attempt already succeeded and content is identical
    const confirmedTemplate: Template = {
      id: String(existing.id),
      slug: String(existing.id),
      title: String(existing.title || payload.title),
      description: typeof existing.description === "string" ? existing.description : "",
      category: (existing.category || payload.category) as Template["category"],
      author: { username: existingAuthorName || payload.authorName },
      itemCount: Array.isArray(existing.items) ? existing.items.length : 0,
      remixCount: Number(existing.rank_count) || 0,
      upvotes: Number(existing.upvotes) || 0,
      createdAt: typeof existing.created_at === "string" ? new Date(existing.created_at).toLocaleDateString() : "Just now",
      items: (existing.items as Item[]) || [],
      defaultTiers: (existing.default_tiers as { label: string; color: string }[]) || undefined,
    };
    saveLocalUserTemplate(confirmedTemplate);
    return confirmedTemplate;
  }

  // Content differs: perform authorized UPDATE of owned record
  const { data: updateData, error: updateError } = await supabase
    .from("templates")
    .update({
      title: payload.title,
      description: payload.description,
      category: payload.category,
      items: payload.items,
      default_tiers: payload.defaultTiers,
      author_name: payload.authorName,
      updated_at: new Date().toISOString(),
    })
    .eq("id", targetId)
    .eq("author_id", sessionUserId)
    .select();

  if (updateError) {
    throw new Error(`Cloud template update failed: ${updateError.message}`);
  }
  if (!updateData || updateData.length === 0) {
    throw new Error(`Cloud template update failed: No rows were updated for template "${targetId}". Check ownership permissions.`);
  }

  const row = updateData[0];
  if (row.id !== targetId) {
    throw new Error(`Cloud template update failed: Returned ID "${row.id}" did not match target ID "${targetId}".`);
  }

  const confirmedTemplate: Template = {
    id: row.id,
    slug: row.id,
    title: row.title,
    description: row.description || "",
    category: (row.category || payload.category) as Template["category"],
    author: { username: row.author_name || payload.authorName },
    itemCount: Array.isArray(row.items) ? row.items.length : 0,
    remixCount: row.rank_count || 0,
    upvotes: row.upvotes || 0,
    createdAt: row.created_at ? new Date(row.created_at).toLocaleDateString() : "Just now",
    items: row.items || [],
    defaultTiers: row.default_tiers || undefined,
  };
  saveLocalUserTemplate(confirmedTemplate);
  return confirmedTemplate;
}

/**
 * Publish a new template created by the user with real cloud persistence
 */
export async function publishTemplate(payload: {
  title: string;
  category: string;
  description?: string;
  items: Item[];
  defaultTiers?: { label: string; color: string }[];
  authorName?: string;
  existingId?: string;
  id?: string;
}): Promise<Template> {
  if (!isSupabaseConfigured() || !supabase) {
    throw new Error("Cloud publishing is unavailable because Supabase is not configured.");
  }

  const sessionUserId = await ensureAuthenticatedSession();
  if (!sessionUserId) {
    throw new Error("Cloud publishing is temporarily unavailable. Keep your draft on this device and try again later.");
  }

  const targetId = payload.existingId || payload.id || generateTemplateSlug(payload.title);
  const cleanTitle = payload.title.trim();
  const cleanDescription = payload.description?.trim() || `User-created template featuring ${payload.items.length} items.`;
  const cleanCategory = (payload.category as Template["category"]) || "gaming";
  const cleanAuthorName = payload.authorName?.trim() || "Creator";
  const defaultTiers = payload.defaultTiers || [];

  const templatePayload = {
    title: cleanTitle,
    description: cleanDescription,
    category: cleanCategory,
    authorName: cleanAuthorName,
    items: payload.items,
    defaultTiers,
  };

  try {
    // 1. Check if record already exists (retry of lost response, or edit)
    const { data: existing, error: fetchError } = await supabase
      .from("templates")
      .select("id, author_id, title, description, category, items, default_tiers, author_name, upvotes, rank_count, created_at")
      .eq("id", targetId)
      .maybeSingle();

    if (fetchError) {
      throw new Error(`Failed to check existing template: ${fetchError.message}`);
    }

    if (existing) {
      return await handleExistingTemplate(existing, targetId, sessionUserId, templatePayload);
    }

    // 2. Insert new record
    const insertPayload: Record<string, unknown> = {
      id: targetId,
      title: cleanTitle,
      description: cleanDescription,
      category: cleanCategory,
      items: payload.items,
      default_tiers: defaultTiers,
      author_name: cleanAuthorName,
      author_id: sessionUserId,
      rank_count: 0,
      upvotes: 0,
    };

    const { data: insertData, error: insertError } = await supabase
      .from("templates")
      .insert(insertPayload)
      .select();

    if (insertError) {
      if (
        insertError.code === "23505" ||
        insertError.message?.includes("duplicate key") ||
        insertError.message?.includes("unique constraint")
      ) {
        const { data: retryExisting, error: retryFetchError } = await supabase
          .from("templates")
          .select("id, author_id, title, description, category, items, default_tiers, author_name, upvotes, rank_count, created_at")
          .eq("id", targetId)
          .maybeSingle();

        if (retryFetchError) {
          throw new Error(`Failed to lookup duplicate template: ${retryFetchError.message}`);
        }
        if (retryExisting) {
          return await handleExistingTemplate(retryExisting, targetId, sessionUserId, templatePayload);
        }
      }
      throw new Error(`Cloud template publication failed: ${insertError.message}`);
    }

    if (!insertData || insertData.length === 0) {
      throw new Error(`Cloud template publication failed: Database did not return confirmed record for "${targetId}".`);
    }

    const row = insertData[0];
    if (row.id !== targetId) {
      throw new Error(`Cloud template publication failed: Returned ID "${row.id}" did not match target ID "${targetId}".`);
    }

    const confirmedTemplate: Template = {
      id: row.id,
      slug: row.id,
      title: row.title,
      description: row.description || "",
      category: (row.category as Template["category"]) || "gaming",
      author: { username: row.author_name || cleanAuthorName },
      itemCount: Array.isArray(row.items) ? row.items.length : 0,
      remixCount: row.rank_count || 0,
      upvotes: row.upvotes || 0,
      createdAt: row.created_at ? new Date(row.created_at).toLocaleDateString() : "Just now",
      items: row.items || [],
      defaultTiers: row.default_tiers || undefined,
    };
    saveLocalUserTemplate(confirmedTemplate);
    return confirmedTemplate;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(message || "Cloud template publication encountered an unexpected error.");
  }
}

async function handleExistingTierList(
  existing: Record<string, unknown>,
  targetId: string,
  sessionUserId: string,
  payload: {
    templateId: string | null;
    title: string;
    authorName: string;
    tiers: TierRow[];
    unranked: Item[];
  }
): Promise<PublishedTierList> {
  if (!supabase) {
    throw new Error("Cloud database client is unavailable.");
  }

  // 1. Verify expected ID
  if (existing.id !== targetId) {
    throw new Error(`Lookup error: Returned tier list ID "${String(existing.id)}" did not match target "${targetId}".`);
  }

  // 2. Strict ownership check: accept only when existing.author_id === sessionUserId
  if (!existing.author_id || existing.author_id !== sessionUserId) {
    throw new Error(`Conflict: Published ranking "${targetId}" already exists and is not owned by the current session.`);
  }

  // 3. Check if content changed (semantic JSON comparison for tiers and unranked)
  const existingAuthorName = typeof existing.author_name === "string" ? existing.author_name : "";
  const contentMatches =
    existing.title === payload.title &&
    existingAuthorName.trim() === payload.authorName &&
    (existing.template_id || null) === payload.templateId &&
    areSemanticJsonEqual((existing.tiers as TierRow[]) || [], payload.tiers) &&
    areSemanticJsonEqual((existing.unranked as Item[]) || [], payload.unranked);

  if (contentMatches) {
    // Idempotent retry: earlier attempt already succeeded and content is identical
    const confirmedTierList: PublishedTierList = {
      id: String(existing.id),
      templateId: typeof existing.template_id === "string" ? existing.template_id : undefined,
      title: String(existing.title || payload.title),
      authorName: existingAuthorName || payload.authorName,
      tiers: Array.isArray(existing.tiers) ? (existing.tiers as TierRow[]) : [],
      unranked: Array.isArray(existing.unranked) ? (existing.unranked as Item[]) : [],
      upvotes: Number(existing.upvotes) || 0,
      createdAt: existing.created_at ? new Date(String(existing.created_at)).getTime() : Date.now(),
    };
    saveLocalPublishedRanking(confirmedTierList);
    return confirmedTierList;
  }

  // Content differs: perform authorized UPDATE of owned record
  const { data: updateData, error: updateError } = await supabase
    .from("tier_lists")
    .update({
      template_id: payload.templateId,
      title: payload.title,
      author_name: payload.authorName,
      tiers: payload.tiers,
      unranked: payload.unranked,
    })
    .eq("id", targetId)
    .eq("author_id", sessionUserId)
    .select();

  if (updateError) {
    throw new Error(`Cloud tier list update failed: ${updateError.message}`);
  }
  if (!updateData || updateData.length === 0) {
    throw new Error(`Cloud tier list update failed: No rows were updated for tier list "${targetId}". Check ownership permissions.`);
  }

  const row = updateData[0];
  if (row.id !== targetId) {
    throw new Error(`Cloud tier list update failed: Returned ID "${row.id}" did not match target ID "${targetId}".`);
  }

  const confirmedTierList: PublishedTierList = {
    id: row.id,
    templateId: row.template_id || undefined,
    title: row.title,
    authorName: row.author_name || payload.authorName,
    tiers: row.tiers || [],
    unranked: row.unranked || [],
    upvotes: row.upvotes || 0,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
  };
  saveLocalPublishedRanking(confirmedTierList);
  return confirmedTierList;
}

/**
 * Publish a completed user ranking/tier list with cloud confirmation
 */
export async function publishTierList(payload: {
  templateId?: string;
  title: string;
  authorName: string;
  tiers: TierRow[];
  unranked?: Item[];
  existingId?: string;
  id?: string;
}): Promise<PublishedTierList> {
  if (!payload.tiers.some((tier) => tier.items.length > 0)) {
    throw new Error("Place at least one item in a tier before publishing.");
  }
  if (!isSupabaseConfigured() || !supabase) {
    throw new Error("Cloud publishing is unavailable because Supabase is not configured.");
  }

  const sessionUserId = await ensureAuthenticatedSession();
  if (!sessionUserId) {
    throw new Error("Cloud publishing is temporarily unavailable. Your board is still on this device; you can export an image instead.");
  }

  const targetId = payload.existingId || payload.id || `share-${createId("tier")}`;
  const cleanTitle = payload.title.trim();
  const cleanAuthorName = payload.authorName?.trim() || "Ranker";
  const templateId = payload.templateId || null;
  const unranked = payload.unranked || [];

  const tierListPayload = {
    templateId,
    title: cleanTitle,
    authorName: cleanAuthorName,
    tiers: payload.tiers,
    unranked,
  };

  try {
    // 1. Check if record already exists (retry of lost response, or edit)
    const { data: existing, error: fetchError } = await supabase
      .from("tier_lists")
      .select("id, author_id, template_id, title, author_name, tiers, unranked, upvotes, created_at")
      .eq("id", targetId)
      .maybeSingle();

    if (fetchError) {
      throw new Error(`Failed to check existing tier list: ${fetchError.message}`);
    }

    if (existing) {
      return await handleExistingTierList(existing, targetId, sessionUserId, tierListPayload);
    }

    // 2. Insert new record
    const insertPayload: Record<string, unknown> = {
      id: targetId,
      template_id: templateId,
      title: cleanTitle,
      author_name: cleanAuthorName,
      tiers: payload.tiers,
      unranked,
      author_id: sessionUserId,
      upvotes: 0,
    };

    const { data: insertData, error: insertError } = await supabase
      .from("tier_lists")
      .insert(insertPayload)
      .select();

    if (insertError) {
      if (
        insertError.code === "23505" ||
        insertError.message?.includes("duplicate key") ||
        insertError.message?.includes("unique constraint")
      ) {
        const { data: retryExisting, error: retryFetchError } = await supabase
          .from("tier_lists")
          .select("id, author_id, template_id, title, author_name, tiers, unranked, upvotes, created_at")
          .eq("id", targetId)
          .maybeSingle();

        if (retryFetchError) {
          throw new Error(`Failed to lookup duplicate tier list: ${retryFetchError.message}`);
        }
        if (retryExisting) {
          return await handleExistingTierList(retryExisting, targetId, sessionUserId, tierListPayload);
        }
      }
      throw new Error(`Cloud tier list publication failed: ${insertError.message}`);
    }

    if (!insertData || insertData.length === 0) {
      throw new Error(`Cloud tier list publication failed: Database did not return confirmed record for "${targetId}".`);
    }

    const row = insertData[0];
    if (row.id !== targetId) {
      throw new Error(`Cloud tier list publication failed: Returned ID "${row.id}" did not match target ID "${targetId}".`);
    }

    const confirmedTierList: PublishedTierList = {
      id: row.id,
      templateId: row.template_id || undefined,
      title: row.title,
      authorName: row.author_name || cleanAuthorName,
      tiers: row.tiers || [],
      unranked: row.unranked || [],
      upvotes: row.upvotes || 0,
      createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    };
    saveLocalPublishedRanking(confirmedTierList);
    return confirmedTierList;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(message || "Cloud tier list publication encountered an unexpected error.");
  }
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
 * Toggle upvote for a template or tier list via locked, idempotent set_vote RPC
 */
export async function toggleUpvote(
  itemType: "template" | "tier_list",
  itemId: string
): Promise<{ isUpvoted: boolean; newCount: number }> {
  let localUpvotes: Record<string, boolean> = {};
  try {
    localUpvotes = JSON.parse(localStorage.getItem(USER_UPVOTES_KEY) || "{}");
  } catch {}

  const currentlyUpvoted = Boolean(localUpvotes[itemId]);
  const desiredVote = !currentlyUpvoted;
  let isUpvotedResult = desiredVote;
  let newCount = 0;

  if (isSupabaseConfigured() && supabase) {
    const userId = await ensureAuthenticatedSession();
    if (!userId) throw new Error("Voting is temporarily unavailable.");
    try {
      const { data, error } = await supabase.rpc("set_vote", {
        target_type: itemType,
        target_id: itemId,
        desired_vote: desiredVote,
      });

      if (error) {
        console.warn("Supabase set_vote RPC error:", error.message);
        throw new Error("Voting is temporarily unavailable.");
      }

      if (data && typeof data === "object") {
        const voteData = data as { isUpvoted?: boolean; newCount?: number };
        isUpvotedResult = Boolean(voteData.isUpvoted);
        newCount = Number(voteData.newCount) || 0;
      }
    } catch (err) {
      console.warn("Supabase toggle upvote exception:", err);
      throw new Error("Voting is temporarily unavailable.");
    }
  }

  localUpvotes[itemId] = isUpvotedResult;
  try {
    localStorage.setItem(USER_UPVOTES_KEY, JSON.stringify(localUpvotes));
  } catch {}

  return { isUpvoted: isUpvotedResult, newCount };
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
function mapTierListRow(d: Record<string, unknown>): PublishedTierList {
  return {
    id: String(d.id),
    templateId: typeof d.template_id === "string" ? d.template_id : undefined,
    title: typeof d.title === "string" ? d.title : "",
    authorName: typeof d.author_name === "string" ? d.author_name : "Community",
    tiers: Array.isArray(d.tiers) ? (d.tiers as TierRow[]) : [],
    unranked: Array.isArray(d.unranked) ? (d.unranked as Item[]) : [],
    upvotes: Number(d.upvotes) || 0,
    createdAt: d.created_at ? new Date(String(d.created_at)).getTime() : Date.now(),
  };
}

/** Convert a PublishedTierList into a compact UserRanking card for the live feed. */
function toUserRanking(p: PublishedTierList, isDemo = false): UserRanking {
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
    isDemo,
  };
}

/**
 * Fetch genuine published activity, excluding known pre-launch audit fixtures.
 */
export async function fetchLiveActivity(): Promise<UserRanking[]> {
  const convertedLocal = getLocalPublishedRankings().filter(isDiscoverableRanking).map((r) => toUserRanking(r));

  let cloudRankings: UserRanking[] = [];
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from("tier_lists")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (!error && data) {
        cloudRankings = data.map(mapTierListRow).filter(isDiscoverableRanking).map((r) => toUserRanking(r));
      }
    } catch (err) {
      console.warn("Supabase live activity query failed, using local fallback", err);
    }
  }

  // Deduplicate by id — real user submissions take precedence
  const seen = new Set<string>();
  const merged: UserRanking[] = [];
  for (const r of [...cloudRankings, ...convertedLocal]) {
    if (seen.has(r.id)) continue;
    seen.add(r.id);
    merged.push(r);
  }
  return merged;
}

/**
 * Fetch all real published rankings for a given template (local + Supabase), newest first,
 * returning explicit error state so callers can distinguish empty data from fetch errors.
 */
export async function fetchSubmissionsForTemplateWithStatus(templateId: string): Promise<{
  submissions: PublishedTierList[];
  fetchError: string | null;
}> {
  if (!templateId) return { submissions: [], fetchError: null };

  const local = getLocalPublishedRankings().filter((r) => r.templateId === templateId);

  let cloud: PublishedTierList[] = [];
  let fetchError: string | null = null;

  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from("tier_lists")
        .select("*")
        .eq("template_id", templateId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) {
        fetchError = error.message || "Failed to fetch community submissions.";
      } else if (data) {
        cloud = data.map(mapTierListRow);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      fetchError = message || "Failed to fetch community submissions.";
    }
  }

  const map = new Map<string, PublishedTierList>();
  cloud.forEach((r) => map.set(r.id, r));
  local.forEach((r) => map.set(r.id, r));

  const submissions = Array.from(map.values()).filter(isDiscoverableRanking).sort((a, b) => b.createdAt - a.createdAt);
  // If we have local submissions, surface them; if we have zero submissions and cloud failed, report fetchError
  return {
    submissions,
    fetchError: submissions.length === 0 ? fetchError : null,
  };
}

/**
 * Fetch all real published rankings for a given template (local + Supabase), newest first.
 * Used to drive the Community Consensus calculation with genuine user placements.
 */
export async function fetchSubmissionsForTemplate(templateId: string): Promise<PublishedTierList[]> {
  const { submissions } = await fetchSubmissionsForTemplateWithStatus(templateId);
  return submissions;
}

/**
 * Comments Storage & API
 */
export function getLocalCommentsAll(): Record<string, Comment[]> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(COMMENTS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveLocalComment(comment: Comment) {
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
 * Fetch comments for a specific tier list — never injects fake/fabricated comments.
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

  const results = Array.from(map.values());
  // Sort newest first
  results.sort((a, b) => b.createdAt - a.createdAt);
  return results;
}

function handleExistingComment(
  existing: Record<string, unknown>,
  targetId: string,
  sessionUserId: string,
  payload: {
    tierListId: string;
    authorName: string;
    content: string;
  }
): Comment {
  // 1. Verify expected ID
  if (existing.id !== targetId) {
    throw new Error(`Lookup error: Returned comment ID "${String(existing.id)}" did not match target "${targetId}".`);
  }

  // 2. Strict ownership check: accept only when existing.author_id === sessionUserId
  if (!existing.author_id || existing.author_id !== sessionUserId) {
    throw new Error(`Conflict: Comment "${targetId}" already exists and is not owned by the current session.`);
  }

  // 3. Verify matching target tier list, author name, and content
  const existingAuthorName = typeof existing.author_name === "string" ? existing.author_name : "";
  const existingContent = typeof existing.content === "string" ? existing.content : "";
  const matches =
    existing.tier_list_id === payload.tierListId &&
    existingAuthorName.trim() === payload.authorName.trim() &&
    existingContent.trim() === payload.content.trim();

  if (!matches) {
    throw new Error(
      `Conflict: Existing comment "${targetId}" differs in content, author, or target tier list. Preserving current comment draft.`
    );
  }

  const confirmedComment: Comment = {
    id: String(existing.id),
    tierListId: String(existing.tier_list_id || payload.tierListId),
    authorName: existingAuthorName || payload.authorName,
    content: existingContent || payload.content,
    upvotes: Number(existing.upvotes) || 0,
    createdAt: existing.created_at ? new Date(String(existing.created_at)).getTime() : Date.now(),
  };
  saveLocalComment(confirmedComment);
  return confirmedComment;
}

/**
 * Post a new comment with true cloud verification and idempotent retries
 */
export async function postComment(payload: {
  tierListId: string;
  authorName: string;
  content: string;
  existingId?: string;
  id?: string;
}): Promise<Comment> {
  if (!isSupabaseConfigured() || !supabase) {
    throw new Error("Cloud comments are unavailable because Supabase is not configured.");
  }

  const sessionUserId = await ensureAuthenticatedSession();
  if (!sessionUserId) {
    throw new Error("Authentication required: A verified user session is required to post comments.");
  }

  const targetId = payload.existingId || payload.id || `cmt-${createId("c")}`;
  const cleanAuthorName = payload.authorName.trim() || "Anonymous Ranker";
  const cleanContent = payload.content.trim();

  if (!cleanContent) {
    throw new Error("Comment content cannot be empty.");
  }

  const commentPayload = {
    tierListId: payload.tierListId,
    authorName: cleanAuthorName,
    content: cleanContent,
  };

  try {
    // 1. Check if comment already exists (retry of lost response)
    const { data: existing, error: fetchError } = await supabase
      .from("comments")
      .select("id, tier_list_id, author_id, author_name, content, upvotes, created_at")
      .eq("id", targetId)
      .maybeSingle();

    if (fetchError) {
      throw new Error(`Failed to check existing comment: ${fetchError.message}`);
    }

    if (existing) {
      return handleExistingComment(existing, targetId, sessionUserId, commentPayload);
    }

    // 2. Insert comment
    const insertPayload: Record<string, unknown> = {
      id: targetId,
      tier_list_id: payload.tierListId,
      author_name: cleanAuthorName,
      content: cleanContent,
      author_id: sessionUserId,
      upvotes: 0,
    };

    const { data: insertData, error: insertError } = await supabase
      .from("comments")
      .insert(insertPayload)
      .select();

    if (insertError) {
      if (
        insertError.code === "23505" ||
        insertError.message?.includes("duplicate key") ||
        insertError.message?.includes("unique constraint")
      ) {
        const { data: retryExisting, error: retryFetchError } = await supabase
          .from("comments")
          .select("id, tier_list_id, author_id, author_name, content, upvotes, created_at")
          .eq("id", targetId)
          .maybeSingle();

        if (retryFetchError) {
          throw new Error(`Failed to lookup duplicate comment: ${retryFetchError.message}`);
        }
        if (retryExisting) {
          return handleExistingComment(retryExisting, targetId, sessionUserId, commentPayload);
        }
      }
      throw new Error(`Comment publication failed: ${insertError.message}`);
    }

    if (!insertData || insertData.length === 0) {
      throw new Error(`Comment publication failed: Database did not return confirmed record for "${targetId}".`);
    }

    const row = insertData[0];
    if (row.id !== targetId) {
      throw new Error(`Comment publication failed: Returned ID "${row.id}" did not match target ID "${targetId}".`);
    }

    const confirmedComment: Comment = {
      id: row.id,
      tierListId: row.tier_list_id,
      authorName: row.author_name || cleanAuthorName,
      content: row.content,
      upvotes: row.upvotes || 0,
      createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    };
    saveLocalComment(confirmedComment);
    return confirmedComment;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(message || "Comment publication encountered an unexpected error.");
  }
}

/**
 * Toggle comment upvote via set_vote RPC
 */
export async function toggleCommentUpvote(
  commentId: string
): Promise<{ isUpvoted: boolean; newCount: number }> {
  if (typeof window === "undefined") return { isUpvoted: false, newCount: 0 };

  let votes: Record<string, boolean> = {};
  try {
    votes = JSON.parse(localStorage.getItem(COMMENT_UPVOTES_KEY) || "{}");
  } catch {}

  const currentlyUpvoted = Boolean(votes[commentId]);
  const desiredVote = !currentlyUpvoted;
  let isUpvotedResult = desiredVote;
  let newCount = 0;

  if (isSupabaseConfigured() && supabase) {
    await ensureAuthenticatedSession();
    try {
      const { data, error } = await supabase.rpc("set_vote", {
        target_type: "comment",
        target_id: commentId,
        desired_vote: desiredVote,
      });

      if (error) {
        console.warn("Supabase set_vote for comment failed:", error.message);
        return { isUpvoted: currentlyUpvoted, newCount: 0 };
      }

      if (data && typeof data === "object") {
        const voteData = data as { isUpvoted?: boolean; newCount?: number };
        isUpvotedResult = Boolean(voteData.isUpvoted);
        newCount = Number(voteData.newCount) || 0;
      }
    } catch (err) {
      console.warn("Supabase toggle comment upvote exception:", err);
      return { isUpvoted: currentlyUpvoted, newCount: 0 };
    }
  }

  votes[commentId] = isUpvotedResult;
  try {
    localStorage.setItem(COMMENT_UPVOTES_KEY, JSON.stringify(votes));
  } catch {}

  // Update in local comments if present
  const all = getLocalCommentsAll();
  for (const tid of Object.keys(all)) {
    const list = all[tid];
    const match = list.find((c) => c.id === commentId);
    if (match) {
      if (newCount > 0) {
        match.upvotes = newCount;
      } else {
        match.upvotes = Math.max(0, match.upvotes + (isUpvotedResult ? 1 : -1));
        newCount = match.upvotes;
      }
      localStorage.setItem(COMMENTS_KEY, JSON.stringify(all));
      break;
    }
  }

  return { isUpvoted: isUpvotedResult, newCount };
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
          category: (d.category as Template["category"]) || "gaming",
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

  const allTemplates = Array.from(tMap.values()).map(presentTemplate).filter((t) => !t.isStarter);
  const allTierLists = Array.from(rMap.values()).filter(isDiscoverableRanking);

  const totalUpvotes =
    allTemplates.reduce((sum, t) => sum + (t.upvotes || 0), 0) +
    allTierLists.reduce((sum, r) => sum + (r.upvotes || 0), 0);

  return {
    username,
    bio: "Public rankings and templates shared under this creator name.",
    joinedDate: "",
    totalUpvotes,
    templates: allTemplates,
    tierLists: allTierLists,
  };
}
