import type { Template } from "@/types";

export const DIRECTORY_PAGE_SIZE = 100;
export function directoryPath(category: string, page = 1) {
  const base = category === "all" ? "/templates" : `/categories/${category}`;
  return page === 1 ? base : `${base}/page/${page}`;
}
export function directorySlice(catalog: Template[], category: string, page: number) {
  const matching = category === "all" ? catalog : catalog.filter(t => t.category === category);
  return { total: matching.length, pages: Math.max(1, Math.ceil(matching.length / DIRECTORY_PAGE_SIZE)),
    templates: matching.slice((page - 1) * DIRECTORY_PAGE_SIZE, page * DIRECTORY_PAGE_SIZE) };
}
