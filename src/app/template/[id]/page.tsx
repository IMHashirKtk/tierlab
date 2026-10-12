import React, { Suspense } from "react";
import { SEED_TEMPLATES } from "@/data/seed-templates";
import { fetchTemplateById } from "@/lib/community";
import { TemplateClientLoader } from "./TemplateClientLoader";

export function generateStaticParams() {
  return SEED_TEMPLATES.map((t) => ({ id: t.id }));
}

async function TemplateContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const template = await fetchTemplateById(id);

  return <TemplateClientLoader templateId={id} serverTemplate={template} />;
}

export default function TemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#09090b] text-zinc-400 flex items-center justify-center text-xs">
          Loading template studio...
        </div>
      }
    >
      <TemplateContent params={params} />
    </Suspense>
  );
}
