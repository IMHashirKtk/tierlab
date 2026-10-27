import { CatalogPage } from "@/components/CatalogPage";
import { getPublicCatalog } from "@/lib/server/catalog";
import { directorySlice, directoryPath } from "@/lib/directory";

export async function generateStaticParams() {
  const { pages } = directorySlice(await getPublicCatalog(), "all", 1);
  return Array.from({ length: Math.max(0, pages - 1) }, (_, i) => ({ page: String(i + 2) }));
}
export async function generateMetadata({ params }: { params: Promise<{ page: string }> }) {
  const { page } = await params;
  return { title: `Tier List Templates — Page ${page}`, alternates: { canonical: directoryPath("all", Number(page)) }, robots: { index: false, follow: true } };
}
export default async function Page({ params }: { params: Promise<{ page: string }> }) {
  return <CatalogPage page={Number((await params).page)} />;
}
