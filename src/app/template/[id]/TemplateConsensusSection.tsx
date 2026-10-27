"use client";

import { useEffect, useState } from "react";
import type { Template } from "@/types";
import type { ConsensusResult } from "@/lib/consensus";

export function TemplateConsensusSection({ template }: { template: Template }) {
  const [consensus, setConsensus] = useState<ConsensusResult | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/template-consensus?id=${encodeURIComponent(template.id)}`, { signal: controller.signal })
      .then(response => response.ok ? response.json() : null)
      .then(result => { if (!controller.signal.aborted) setConsensus(result); })
      .catch(() => { if (!controller.signal.aborted) setConsensus(null); });
    return () => { controller.abort(); };
  }, [template.id]);
  if (!consensus || consensus.templateId !== template.id || consensus.status !== "ready" || consensus.totalSubmissions < 5) return null;
  return <section data-testid="consensus-section" className="space-y-4">
    <h2 className="text-2xl font-bold">Community consensus for {template.title}</h2>
    <p className="text-sm text-zinc-400">Based on {consensus.totalSubmissions} of the latest 100 published submissions.</p>
    <div className="rounded-xl border border-zinc-800 p-4 space-y-3">{consensus.tiers.filter(row => row.items.length > 0).map(row => <div key={row.id} className="flex gap-3 items-start">
      <span className={`w-10 min-h-10 shrink-0 rounded-lg flex items-center justify-center font-bold bg-gradient-to-br ${row.color}`}>{row.label}</span>
      <div className="flex flex-wrap gap-2">{row.items.map(entry => <span key={entry.item.id} className="rounded-lg bg-zinc-800 px-2 py-1 text-xs">{entry.item.name} ({entry.avgScore.toFixed(1)})</span>)}</div>
    </div>)}</div>
  </section>;
}
