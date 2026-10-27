import "server-only";
import { cacheLife } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { SEED_TEMPLATES } from "@/data/seed-templates";
import { isDiscoverableTemplate, presentTemplate } from "@/lib/catalog";
import type { Template } from "@/types";

/** Public RLS reads only. Never mix browser drafts or sessions into crawlable pages. */
export async function getPublicCatalog(): Promise<Template[]> {
  "use cache";
  cacheLife({ stale: 60, revalidate: 300, expire: 600 });
  const catalog = new Map(SEED_TEMPLATES.map(t => [t.id, t]));
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url && key) {
    const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
    for (let offset = 0; ; offset += 100) {
      const { data, error } = await db.from("templates")
        .select("id,slug,title,description,category,author_name,items,default_tiers,rank_count,upvotes,created_at")
        .order("id").range(offset, offset + 99).abortSignal(AbortSignal.timeout(15000));
      if (error) throw new Error(`Public catalog unavailable: ${error.code || "network"}`);
      for (const row of data || []) {
        if (!isDiscoverableTemplate(row)) continue;
        catalog.set(row.id, presentTemplate({
          id: row.id, slug: row.slug || row.id, title: row.title, description: row.description || "",
          category: row.category as Template["category"], author: { username: row.author_name || "Community" },
          items: row.items || [], itemCount: row.items?.length || 0,
          remixCount: row.rank_count || 0, upvotes: row.upvotes || 0,
          createdAt: row.created_at?.slice(0, 10) || "", defaultTiers: row.default_tiers || undefined,
        }));
      }
      if (!data || data.length < 100) break;
    }
  }
  return [...catalog.values()].filter(isDiscoverableTemplate).map(presentTemplate)
    .sort((a, b) => a.title.localeCompare(b.title, "en") || a.id.localeCompare(b.id));
}
