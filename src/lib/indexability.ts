import type { Template } from "@/types";
import { TEMPLATE_EDITORIAL } from "@/data/template-editorial";
import { isDiscoverableTemplate } from "@/lib/catalog";

export const wordCount = (text: string) => text.trim().split(/\s+/u).filter(Boolean).length;
export function templateQuality(template: Template) {
  const editorial = TEMPLATE_EDITORIAL[template.slug] || TEMPLATE_EDITORIAL[template.id];
  const introWords = wordCount(editorial?.intro.join(" ") || "");
  const words = editorial ? wordCount([...editorial.intro, ...editorial.faqs.flatMap(f => [f.question, f.answer])].join(" ")) : 0;
  const namedRoster = template.items.every(i => i.name.trim() && !/^item\s*#?\d+$/i.test(i.name.trim()));
  const hasUniqueIntro = Boolean(editorial && introWords >= 120 && introWords <= 200);
  return { editorial, words, hasUniqueIntro, eligible: isDiscoverableTemplate(template) && template.items.length >= 8 && namedRoster && hasUniqueIntro && words >= 200 && editorial?.faqs.length === 3 };
}
export function isIndexableTemplate(template: Template) { return templateQuality(template).eligible; }
