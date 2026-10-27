import type { MetadataRoute } from "next";
import { getPublicCatalog } from "@/lib/server/catalog";
import { templatePath } from "@/lib/template-url";
import { templateQuality } from "@/lib/indexability";
import { PAGE_EDITORIAL } from "@/data/page-editorial";
import { pageQuality } from "@/lib/page-quality";
import { canIndexSite, getSiteUrl } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!canIndexSite()) return [];
  const site = getSiteUrl();
  const pages = Object.keys(PAGE_EDITORIAL).filter(path => pageQuality(path).eligible).map(path => ({
    url: path === "/" ? site : `${site}${path}`, lastModified: pageQuality(path).updated,
  }));
  const templates = (await getPublicCatalog()).filter(t => templateQuality(t).eligible).map(t => ({
    url: `${site}${templatePath(t)}`,
    // Editorial revision, never a build timestamp or popularity counter.
    lastModified: templateQuality(t).editorial!.updated,
  }));
  return [...pages, ...templates];
}
