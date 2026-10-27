import { CatalogPage } from "@/components/CatalogPage";
import { getPublicCatalog } from "@/lib/server/catalog";
import { CATEGORIES } from "@/data/categories";
import { directorySlice, directoryPath } from "@/lib/directory";

export async function generateStaticParams() {
  const catalog = await getPublicCatalog();
  const params = CATEGORIES.filter(c => c.id !== "all").flatMap(c => Array.from({ length: Math.max(0, directorySlice(catalog, c.id, 1).pages - 1) }, (_, i) => ({ category: c.id, page: String(i + 2) })));
  // Cache Components requires a validation path even for a small catalog.
  // CatalogPage already returns 404 when this second page does not exist.
  return params.length ? params : [{ category: "gaming", page: "2" }];
}
export async function generateMetadata({ params }: { params: Promise<{ category: string; page: string }> }) {
  const { category, page } = await params;
  return { title: `${category} Templates — Page ${page}`, alternates: { canonical: directoryPath(category, Number(page)) }, robots: { index: false, follow: true } };
}
export default async function Page({ params }: { params: Promise<{ category: string; page: string }> }) {
  const { category, page } = await params;
  return <CatalogPage category={category} page={Number(page)} />;
}
