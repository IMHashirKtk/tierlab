"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Studio } from "@/components/studio/Studio";
import { fetchTemplateById } from "@/lib/community";
import type { Template } from "@/types";
import { Layers } from "lucide-react";

interface TemplateClientLoaderProps {
  templateId: string;
  serverTemplate: Template | null;
}

export function TemplateClientLoader({ templateId, serverTemplate }: TemplateClientLoaderProps) {
  const [template, setTemplate] = useState<Template | null>(serverTemplate);
  const [loading, setLoading] = useState(!serverTemplate);

  useEffect(() => {
    if (!serverTemplate && templateId) {
      fetchTemplateById(templateId).then((data) => {
        setTemplate(data);
        setLoading(false);
      });
    }
  }, [templateId, serverTemplate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] text-zinc-400 flex items-center justify-center text-xs">
        Loading template ranking studio...
      </div>
    );
  }

  if (!template) {
    return (
      <div className="min-h-screen bg-[#09090b] text-[#f4f4f5] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-600">
          <Layers className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white">Template Not Found</h2>
        <p className="text-xs text-zinc-400 max-w-sm">
          Could not find template &ldquo;{templateId}&rdquo;. It may have been removed or created on another browser.
        </p>
        <Link
          href="/"
          className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30"
        >
          Explore All Templates
        </Link>
      </div>
    );
  }

  return <Studio initialTemplate={template} />;
}
