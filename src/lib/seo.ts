/**
 * Safely serializes data to a JSON-LD string, escaping '<' and '>'
 * to prevent XSS script injection in inline <script type="application/ld+json"> tags.
 */
export function safeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e");
}
