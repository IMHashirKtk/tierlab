import Link from "next/link";
import { TemplateCover } from "@/components/TemplateCover";
import { templatePath } from "@/lib/template-url";
import { directoryPath, directorySlice } from "@/lib/directory";
import type { Template } from "@/types";

export function TemplateDirectory({ catalog, category = "all", page = 1 }: { catalog: Template[]; category?: string; page?: number }) {
  const result = directorySlice(catalog, category, page);
  return <section id="trending" className="py-10 space-y-6" aria-label="Template directory">
    <div className="flex flex-wrap justify-between items-center gap-3">
      <h2 className="text-2xl font-bold text-white">{category === "all" ? "Explore tier list templates" : "Choose a template"}</h2>
      <p className="text-sm text-zinc-400">{result.total} templates · Page {page} of {result.pages}</p>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {result.templates.map(t => <article key={t.id} className="rounded-2xl bg-zinc-900/70 border border-zinc-800 overflow-hidden flex flex-col">
        <TemplateCover template={t} />
        <div className="p-5 flex flex-col flex-1 gap-3">
          <h3 className="font-bold text-white"><Link href={templatePath(t)} prefetch={false} className="hover:text-indigo-300">{t.title}</Link></h3>
          <p className="text-xs text-zinc-400 line-clamp-2">{t.description}</p>
          <Link href={templatePath(t)} prefetch={false} className="mt-auto text-sm text-indigo-300">Rank this template →</Link>
        </div>
      </article>)}
    </div>
    <nav aria-label="Template pages" className="flex flex-wrap items-center gap-3 text-sm text-indigo-300">
      {Array.from({ length: result.pages }, (_, i) => i + 1).map(n => <Link key={n} href={directoryPath(category, n)} prefetch={false} aria-current={n === page ? "page" : undefined} className="rounded-lg border border-zinc-700 px-3 py-2">Page {n}</Link>)}
    </nav>
  </section>;
}
