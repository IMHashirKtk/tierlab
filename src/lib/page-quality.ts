import { PAGE_EDITORIAL, PAGE_CONTENT_CHANGED } from "@/data/page-editorial";
import { wordCount } from "@/lib/indexability";

export function pageQuality(path: string) {
  const content = PAGE_EDITORIAL[path];
  return { content, words: wordCount(content?.paragraphs.join(" ") || ""), updated: PAGE_CONTENT_CHANGED,
    eligible: Boolean(content && wordCount(content.paragraphs.join(" ")) >= 200) };
}
