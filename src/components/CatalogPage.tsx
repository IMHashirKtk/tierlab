import Link from "next/link";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { TemplateDirectory } from "@/components/TemplateDirectory";
import { getPublicCatalog } from "@/lib/server/catalog";
import { directorySlice } from "@/lib/directory";
import { CATEGORIES } from "@/data/categories";
import { CATEGORY_GUIDES } from "@/data/category-guides";

export async function CatalogPage({ category = "all", page = 1 }: { category?: string; page?: number }) {
  const cat = CATEGORIES.find(c => c.id === category);
  if (!cat || !Number.isInteger(page) || page < 1) notFound();
  const catalog = await getPublicCatalog();
  if (page > directorySlice(catalog, category, page).pages) notFound();
  const guide = CATEGORY_GUIDES[category];
  return <div className="min-h-screen bg-[#09090b] text-zinc-100"><Navbar />
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <nav aria-label="Breadcrumb" className="flex gap-3 text-sm text-zinc-400"><Link href="/">Home</Link><Link href="/templates">Templates</Link></nav>
      <h1 className="mt-8 text-3xl sm:text-5xl font-bold">{category === "all" ? "Tier List Templates" : guide.title}{page > 1 ? ` — Page ${page}` : ""}</h1>
      {guide && <div className="mt-5 max-w-3xl space-y-3 text-zinc-400"><p>{guide.intro}</p><p>{guide.criteria}</p></div>}
      <nav aria-label="Template categories" className="flex flex-wrap gap-3 my-8 text-sm text-indigo-300">
        {CATEGORIES.filter(c => c.id !== "all").map(c => <Link key={c.id} href={`/categories/${c.id}`} className="rounded-lg border border-zinc-800 px-3 py-2">{c.name}</Link>)}
      </nav>
      <Link href="/create" className="text-indigo-300">Open the editor →</Link>
      <TemplateDirectory catalog={catalog} category={category} page={page} />
    </main><Footer />
  </div>;
}
