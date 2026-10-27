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
    const db = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      // Share public responses across prerender workers as well as page renders.
      global: { fetch: (input, init) => fetch(input, { ...init, next: { revalidate: 300 } }) },
    });
    // A larger database batch avoids repeated round trips during prerender.
    // Presentation remains strictly paginated at 100 entries per HTML page.
    const batchSize = 500;
    for (let offset = 0; ; offset += batchSize) {
      const query = () => db.from("templates")
        .select("id,slug,title,description,category,author_name,items,default_tiers,rank_count,upvotes,created_at")
        .order("id").range(offset, offset + batchSize - 1).abortSignal(AbortSignal.timeout(15000));
      let { data, error } = await query();
      // Retry a transient transport failure once, never an authorization failure.
      if (error && (!error.code || error.code === "57014")) ({ data, error } = await query());
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
      if (!data || data.length < batchSize) break;
    }
  }
  return [...catalog.values()].filter(isDiscoverableTemplate).map(presentTemplate)
    .sort((a, b) => a.title.localeCompare(b.title, "en") || a.id.localeCompare(b.id));
}
