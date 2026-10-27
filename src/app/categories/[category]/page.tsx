import { CatalogPage } from "@/components/CatalogPage";
import { CATEGORIES } from "@/data/categories";
import { CATEGORY_GUIDES } from "@/data/category-guides";
import { pageQuality } from "@/lib/page-quality";
import { canIndexSite } from "@/lib/seo";
import { notFound } from "next/navigation";

export function generateStaticParams() { return CATEGORIES.filter(c => c.id !== "all").map(c => ({ category: c.id })); }
export async function generateMetadata({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  const guide = CATEGORY_GUIDES[category];
  if (!guide) notFound();
  return { title: guide.title, description: guide.description, robots: { index: canIndexSite() && pageQuality(`/categories/${category}`).eligible, follow: true }, alternates: { canonical: `/categories/${category}` } };
}
export default async function Page({ params }: { params: Promise<{ category: string }> }) {
  return <CatalogPage category={(await params).category} />;
}
