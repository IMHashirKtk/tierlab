import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ItemImage } from "@/components/ItemImage";
import { getPublicCatalog } from "@/lib/server/catalog";
import { templatePath } from "@/lib/template-url";
import { templateQuality } from "@/lib/indexability";
import { CATEGORIES } from "@/data/categories";
import { safeJsonLd, canIndexSite, getSiteUrl } from "@/lib/seo";
import { TemplateClientLoader } from "./TemplateClientLoader";
import { TemplateConsensusSection } from "./TemplateConsensusSection";

export async function generateStaticParams() {
  // Prebuild the reviewed search landing pages. Other public templates stay
  // reachable and render on demand with the same explicit noindex gate.
  return (await getPublicCatalog()).filter(t => templateQuality(t).eligible).map(t => ({ id: t.slug || t.id }));
}

async function findTemplate(id: string) {
  const catalog = await getPublicCatalog();
  return catalog.find(t => (t.slug || t.id) === id) || catalog.find(t => t.id === id);
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const template = await findTemplate((await params).id);
  if (!template) return { title: "Template not found", robots: { index: false, follow: true } };
  const quality = templateQuality(template);
  const topic = quality.editorial?.topic || template.title.replace(/ tier list.*$/i, "");
  const suffix = " Tier List Maker (Free Template)";
  const title = topic.length + suffix.length <= 60 ? topic + suffix : topic.slice(0, 60 - suffix.length).trim() + suffix;
  const description = quality.editorial?.intro[0].split(/(?<=[.!?]) /)[0] || template.description;
  const canonical = templatePath(template);
  return {
    title: { absolute: title }, description,
    robots: { index: canIndexSite() && quality.eligible, follow: true },
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: "website", images: [{
      url: `/api/og?title=${encodeURIComponent(topic)}&category=${encodeURIComponent(template.category)}&mode=template`,
      width: 1200, height: 630, alt: `${topic} Tier List Template`,
    }] },
    twitter: { card: "summary_large_image", title, description },
  };
}

async function TemplateContent({ id }: { id: string }) {
  const template = await findTemplate(id);
  if (!template) notFound();
  const { editorial, eligible } = templateQuality(template);
  const topic = editorial?.topic || template.title.replace(/ tier list.*$/i, "");
  const catalog = await getPublicCatalog();
  const related = catalog.filter(t => t.id !== template.id && t.category === template.category)
    .sort((a, b) => Number(templateQuality(b).eligible) - Number(templateQuality(a).eligible)).slice(0, 6);
  const site = getSiteUrl();
  const url = `${site}${templatePath(template)}`;
  const category = CATEGORIES.find(c => c.id === template.category)?.name || template.category;
  const graph = [
    { "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: site },
      { "@type": "ListItem", position: 2, name: category, item: `${site}/categories/${template.category}` },
      { "@type": "ListItem", position: 3, name: topic, item: url },
    ] },
    { "@type": "CreativeWork", "@id": `${url}#template`, name: `${topic} Tier List Template`, url,
      description: editorial?.intro.join(" ") || template.description,
      ...(editorial ? { dateModified: editorial.updated } : {}),
      mainEntity: { "@id": `${url}#items` },
    },
    { "@type": "ItemList", "@id": `${url}#items`, name: `${topic} roster`, numberOfItems: template.items.length,
      itemListOrder: "https://schema.org/ItemListUnordered", itemListElement: template.items.map((item, i) => ({
        "@type": "ListItem", position: i + 1, name: item.name, ...(item.imageUrl ? { image: item.imageUrl } : {}),
      })),
    },
    ...(editorial ? [{ "@type": "FAQPage", mainEntity: editorial.faqs.map(f => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })) }] : []),
  ];
  return <div className="min-h-screen bg-[#09090b] text-zinc-100"><Navbar />
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd({ "@context": "https://schema.org", "@graph": graph }) }} />
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-5" data-template-overview>
        <nav aria-label="Breadcrumb" className="flex flex-wrap gap-3 text-sm text-zinc-400"><Link prefetch={false} href="/">Home</Link><Link prefetch={false} href="/templates">Templates</Link><Link prefetch={false} href={`/categories/${template.category}`}>{category}</Link></nav>
        <h1 className="text-3xl sm:text-4xl font-extrabold">{topic} Tier List Template</h1>
        <p className="text-xs text-zinc-400">{template.items.length} items · {template.isStarter ? "Template Library" : `By @${template.author.username}`}</p>
        <div className="max-w-4xl space-y-4 text-sm sm:text-base leading-relaxed text-zinc-300" data-template-intro data-reviewed={eligible ? "true" : "false"}>
          {(editorial?.intro || [template.description]).filter(Boolean).map(p => <p key={p.slice(0, 60)}>{p}</p>)}
        </div>
        <Link prefetch={false} href="/create" className="inline-flex text-indigo-300">Open the editor →</Link>
      </section>
      <Suspense fallback={<div aria-hidden="true" className="min-h-64 bg-zinc-950" />}>
        <TemplateClientLoader templateId={template.id} serverTemplate={template} />
      </Suspense>
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
        <section aria-label="Complete template roster" className="space-y-4">
          <h2 className="text-2xl font-bold">{template.items.length} items in this roster</h2>
          <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {template.items.map(item => <li key={item.id} className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3 flex gap-3 items-center">
              {item.imageUrl && <ItemImage src={item.imageUrl} alt={item.name} width={48} height={48} loading="lazy" className="w-12 h-12 shrink-0 rounded-lg object-cover" />}
              <span className="text-xs font-medium break-words min-w-0">{item.name}</span>
            </li>)}
          </ul>
        </section>
        {editorial && <section aria-label="Topic questions" className="max-w-4xl space-y-6" data-template-faq>
          <h2 className="text-2xl font-bold">Questions about this {topic} template</h2>
          {editorial.faqs.map(f => <div key={f.question} className="space-y-2"><h3 className="font-semibold">{f.question}</h3><p className="text-sm leading-relaxed text-zinc-400">{f.answer}</p></div>)}
        </section>}
        <TemplateConsensusSection template={template} />
        <section className="space-y-4" data-related-templates>
          <h2 className="text-2xl font-bold">More {category} templates</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{related.map(t => <Link key={t.id} href={templatePath(t)} prefetch={false} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-indigo-300">{t.title}</Link>)}</div>
          <div className="flex flex-wrap gap-5 text-sm text-indigo-300"><Link prefetch={false} href={`/categories/${template.category}`}>Browse {category} templates</Link><Link prefetch={false} href="/create">Create a tier list</Link><Link prefetch={false} href="/contact">Report a template problem</Link></div>
        </section>
      </section>
    </main><Footer />
  </div>;
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TemplateContent id={id} />;
}
