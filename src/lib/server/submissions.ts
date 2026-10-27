import "server-only";
import { cacheLife } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { isDiscoverableRanking } from "@/lib/catalog";
import type { PublishedTierList, TierRow, Item } from "@/types";

export async function getPublicSubmissions(templateId: string): Promise<PublishedTierList[]> {
  "use cache";
  cacheLife({ stale: 60, revalidate: 300, expire: 600 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return [];
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  const { data, error } = await db.from("tier_lists").select("id,template_id,title,author_name,tiers,unranked,upvotes,created_at")
    .eq("template_id", templateId).order("created_at", { ascending: false }).limit(100).abortSignal(AbortSignal.timeout(15000));
  if (error) throw new Error("Public submissions unavailable");
  return (data || []).map(row => ({
    id: String(row.id), templateId: row.template_id, title: row.title || "", authorName: row.author_name || "Community",
    tiers: (Array.isArray(row.tiers) ? row.tiers : []) as TierRow[], unranked: (Array.isArray(row.unranked) ? row.unranked : []) as Item[],
    upvotes: Number(row.upvotes) || 0, createdAt: row.created_at ? Date.parse(row.created_at) : 0,
  })).filter(isDiscoverableRanking);
}
