"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Studio } from "@/components/studio/Studio";
import { fetchTemplateById } from "@/lib/community";
import { editorStart, resolveTemplateStart, type EditorStart, type TemplateStartResult } from "@/lib/editor-start";
import { trackProductEvent } from "@/lib/analytics";

function TemplateEditor({ id }: { id: string }) {
  const [result, setResult] = useState<TemplateStartResult | { status: "loading" }>({ status: "loading" });
  const attempted = useRef<string | null>(null);
  const openReported = useRef(false);
  useEffect(() => {
    let active = true;
    if (result.status !== "loading") return;
    if (!openReported.current) {
      openReported.current = true;
      trackProductEvent("template_open", { start_type: "template", entry_point: "separate_page" });
    }
    resolveTemplateStart(id, fetchTemplateById).then(resolved => {
      if (!active) return;
      setResult(resolved);
      if (resolved.status === "error" && attempted.current !== id) {
        attempted.current = id;
        trackProductEvent("editor_ready", { start_type: "template", result: "failure", reason: resolved.reason });
      }
    });
    return () => { active = false; };
  }, [id, result.status]);
  if (result.status === "loading") return <div className="min-h-64 flex items-center justify-center text-sm text-zinc-400" role="status">Opening your template…</div>;
  if (result.status === "error") return <section className="max-w-xl mx-auto px-5 py-20 space-y-5 text-zinc-300" role="alert">
    <h1 className="text-2xl font-bold text-white">Template could not be opened</h1>
    <p>It may have been removed, or the connection may be unavailable. Your existing projects have not been changed.</p>
    <div className="flex flex-wrap gap-5 text-indigo-300"><Link href="/templates">Choose another template</Link><Link href="/create">Start a blank board</Link><Link href="/my-projects">Your saved projects</Link></div>
  </section>;
  return <Studio initialTemplate={result.template} />;
}
function EditorRoute({ start }: { start: EditorStart }) {
  if (start.kind === "template") return <TemplateEditor id={start.id} />;
  return <Studio initialProjectId={start.kind === "project" ? start.id : undefined} />;
}
function CreatePageContent() {
  const start = editorStart(useSearchParams());
  const key = start.kind === "blank" ? "blank" : `${start.kind}:${start.id}`;
  // Changing query context remounts state; an existing draft ID always takes precedence.
  return <EditorRoute key={key} start={start} />;
}
export default function CreateTierListPage() {
  return <Suspense fallback={<div className="min-h-64 bg-zinc-950" aria-hidden="true" />}><CreatePageContent /></Suspense>;
}
