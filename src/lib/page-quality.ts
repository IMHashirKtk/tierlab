import { PAGE_EDITORIAL, PAGE_CONTENT_CHANGED } from "@/data/page-editorial";
import { wordCount } from "@/lib/indexability";

export function pageQuality(path: string) {
  const content = PAGE_EDITORIAL[path];
  const discoveryChanged = path === "/" || path === "/templates" || path.startsWith("/categories/");
  return { content, words: wordCount(content?.paragraphs.join(" ") || ""), updated: discoveryChanged ? "2026-11-02" : PAGE_CONTENT_CHANGED,
    eligible: Boolean(content && wordCount(content.paragraphs.join(" ")) >= 200) };
}
