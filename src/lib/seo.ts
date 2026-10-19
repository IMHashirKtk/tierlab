/**
 * Safely serializes data to a JSON-LD string, escaping '<' and '>'
 * to prevent XSS script injection in inline <script type="application/ld+json"> tags.
 */
export function safeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e");
}
export function getSiteUrl(): string {
  return new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://tierlistmaker.app").origin;
}

export function canIndexSite(): boolean {
  return process.env.NEXT_PUBLIC_ALLOW_INDEXING !== "false" && process.env.VERCEL_ENV !== "preview" && process.env.VERCEL_ENV !== "development";
}
