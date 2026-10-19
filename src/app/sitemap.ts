import type { MetadataRoute } from "next";
import { CATEGORIES, SEED_TEMPLATES } from "@/data/seed-templates";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { isDiscoverableTemplate } from "@/lib/catalog";
import { canIndexSite, getSiteUrl } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!canIndexSite()) return [];
  const siteUrl = getSiteUrl();
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: siteUrl, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/tiermaker-alternative`, changeFrequency: "monthly", priority: 0.7 },
    ...["about", "contact", "privacy", "terms", "copyright"].map(path => ({
      url: `${siteUrl}/${path}`, changeFrequency: "monthly" as const, priority: 0.3,
    })),
  ];
  const categoryRoutes: MetadataRoute.Sitemap = CATEGORIES.filter(c => c.id !== "all").map(c => ({
    url: `${siteUrl}/categories/${encodeURIComponent(c.id)}`,
    changeFrequency: "weekly", priority: 0.8,
  }));
  // Do not invent modification times for static pages and bundled templates.
  const templates = new Map<string, { id: string; lastModified?: Date }>();
  SEED_TEMPLATES.forEach(t => templates.set(t.id, { id: t.id }));
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase.from("templates")
        .select("id, updated_at, items").order("rank_count", { ascending: false }).limit(500);
      if (error) console.warn("Sitemap: template query failed; using bundled templates");
      if (!error && data) {
        for (const row of data) {
          if (!isDiscoverableTemplate(row) || !Array.isArray(row.items) || row.items.length < 2) continue;
          const date = row.updated_at ? new Date(row.updated_at) : undefined;
          templates.set(row.id, {
            id: row.id,
            lastModified: date && Number.isFinite(date.getTime()) ? date : undefined,
          });
        }
      }
    } catch {
      console.warn("Sitemap: template query failed; using bundled templates");
    }
  }
  const templateRoutes: MetadataRoute.Sitemap = Array.from(templates.values())
    .filter(isDiscoverableTemplate).map(t => ({
      url: `${siteUrl}/template/${encodeURIComponent(t.id)}`,
      ...(t.lastModified ? { lastModified: t.lastModified } : {}),
      changeFrequency: "weekly", priority: 0.8,
    }));
  return [...staticRoutes, ...categoryRoutes, ...templateRoutes];
}
