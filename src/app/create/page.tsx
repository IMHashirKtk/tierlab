"use client";

import React, { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Studio } from "@/components/studio/Studio";
import { SEED_TEMPLATES } from "@/data/seed-templates";
import { fetchTemplateById } from "@/lib/community";
import type { Template } from "@/types";

function CreatePageContent() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get("id") || undefined;
  const templateId = searchParams.get("template") || undefined;

  const [template, setTemplate] = useState<Template | undefined>(() =>
    templateId ? SEED_TEMPLATES.find((t) => t.id === templateId) : undefined
  );
  const [loadingTemplate, setLoadingTemplate] = useState(Boolean(templateId && !template));

  useEffect(() => {
    if (templateId && !template) {
      fetchTemplateById(templateId).then((found) => {
        if (found) setTemplate(found);
        setLoadingTemplate(false);
      });
    }
  }, [templateId, template]);

  if (loadingTemplate) {
    return (
      <div className="min-h-screen bg-[#09090b] text-zinc-400 flex items-center justify-center text-xs">
        Loading template into studio...
      </div>
    );
  }

  return <Studio initialProjectId={projectId} initialTemplate={template} />;
}

export default function CreateTierListPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#09090b] text-zinc-400 flex items-center justify-center text-xs">
          Loading studio...
        </div>
      }
    >
      <CreatePageContent />
    </Suspense>
  );
}
