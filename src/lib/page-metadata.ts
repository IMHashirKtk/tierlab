import type { Metadata } from "next";
import { pageQuality } from "@/lib/page-quality";
import { canIndexSite } from "@/lib/seo";

/** Keep social previews aligned with the actual page rather than the homepage. */
export function pageMetadata(title: string, description: string, path: string): Metadata {
  const brandedTitle = title.includes("Tier List Maker") ? title : `${title} | Tier List Maker`;
  const image = `/api/og?title=${encodeURIComponent(title)}&author=Tier%20List%20Maker&category=Platform`;
  return {
    title: { absolute: brandedTitle },
    description,
    robots: { index: canIndexSite() && pageQuality(path).eligible, follow: true },
    alternates: { canonical: path },
    openGraph: {
      type: "website", url: path, title: brandedTitle, description, siteName: "Tier List Maker",
      images: [{ url: image, width: 1200, height: 630, alt: title }],
    },
    twitter: { card: "summary_large_image", title: brandedTitle, description, images: [image] },
  };
}
