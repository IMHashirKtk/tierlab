import { pageQuality } from "@/lib/page-quality";

export function PageEditorial({ path }: { path: string }) {
  const { content } = pageQuality(path);
  if (!content) return null;
  return <section className="max-w-4xl mx-auto py-10 space-y-4 text-zinc-400" data-editorial={path}>
    <h2 className="text-2xl font-bold text-zinc-100">{content.heading}</h2>
    {content.paragraphs.map(p => <p key={p.slice(0, 50)} className="leading-relaxed text-sm sm:text-base">{p}</p>)}
  </section>;
}
