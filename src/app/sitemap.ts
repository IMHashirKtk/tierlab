import { MetadataRoute } from "next";
import { CATEGORIES, SEED_TEMPLATES } from "@/data/seed-templates";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://tierlistmaker.app";

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${siteUrl}/create`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${siteUrl}/versus`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.85,
    },
  ];

  // Category Hub Routes
  const categoryRoutes: MetadataRoute.Sitemap = CATEGORIES.filter(
    (c) => c.id !== "all"
  ).map((c) => ({
    url: `${siteUrl}/categories/${c.id}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 0.85,
  }));

  // Fetch Supabase templates + SEED_TEMPLATES deduplicated
  const templateMap = new Map<string, { id: string; lastModified: Date }>();

  SEED_TEMPLATES.forEach((t) => {
    templateMap.set(t.id, { id: t.id, lastModified: new Date() });
  });

  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from("templates")
        .select("id, updated_at, items")
        .order("rank_count", { ascending: false })
        .limit(500);

      if (!error && data) {
        data.forEach((row) => {
          if (!Array.isArray(row.items) || row.items.length >= 3) {
            templateMap.set(row.id, {
              id: row.id,
              lastModified: row.updated_at ? new Date(row.updated_at) : new Date(),
            });
          }
        });
      }
    } catch (err) {
      console.warn("Sitemap: Supabase query failed, falling back to seed templates", err);
    }
  }

  const templateRoutes: MetadataRoute.Sitemap = Array.from(templateMap.values()).map(
    (item) => ({
      url: `${siteUrl}/template/${item.id}`,
      lastModified: item.lastModified,
      changeFrequency: "weekly",
      priority: 0.8,
    })
  );

  return [...staticRoutes, ...categoryRoutes, ...templateRoutes];
}
