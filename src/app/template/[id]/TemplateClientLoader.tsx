"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { Template } from "@/types";

const Studio = dynamic(() => import("@/components/studio/Studio").then(module => module.Studio), {
  ssr: false,
  loading: () => <div aria-hidden="true" className="min-h-64 rounded-2xl border border-zinc-800 bg-zinc-950 animate-pulse" />,
});

export function TemplateClientLoader({ templateId, serverTemplate }: { templateId: string; serverTemplate: Template }) {
  const [opened, setOpened] = useState(false);
  if (opened) return <Studio initialTemplate={serverTemplate} />;
  return <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6" aria-label="Template editor">
    <div className="rounded-2xl border border-indigo-500/30 bg-zinc-900 p-6 flex flex-wrap items-center justify-between gap-5">
      <div><h2 className="text-xl font-bold">Rank {serverTemplate.items.length} items your way</h2><p className="mt-2 text-sm text-zinc-400">Open this roster in the drag-and-drop editor, then save or export your ranking.</p></div>
      <button type="button" onClick={() => setOpened(true)} className="rounded-xl bg-indigo-600 hover:bg-indigo-500 px-6 py-3 font-semibold cursor-pointer">Open the editor</button>
      <Link href={`/create?template=${encodeURIComponent(templateId)}`} prefetch={false} className="text-sm text-indigo-300">Create a tier list on a separate page →</Link>
    </div>
  </section>;
}
