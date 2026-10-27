"use client";

import { useEffect, useState } from "react";
import type { Template, PublishedTierList } from "@/types";
import { calculateConsensus } from "@/lib/consensus";
import { fetchSubmissionsForTemplateWithStatus } from "@/lib/community";

export function TemplateConsensusSection({ template, initialSubmissions = [] }: { template: Template; initialSubmissions?: PublishedTierList[]; initialFetchError?: string | null }) {
  const [submissions, setSubmissions] = useState(initialSubmissions);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    fetchSubmissionsForTemplateWithStatus(template.id).then(result => {
      if (active) { setSubmissions(result.submissions); setFailed(Boolean(result.fetchError)); }
    });
    return () => { active = false; };
  }, [template.id]);
  const consensus = calculateConsensus(template, submissions, { fetchError: failed });
  if (consensus.status !== "ready" || consensus.totalSubmissions < 5) return null;
  return <section data-testid="consensus-section" className="space-y-4">
    <h2 className="text-2xl font-bold">Community consensus for {template.title}</h2>
    <p className="text-sm text-zinc-400">Based on {consensus.totalSubmissions} published submissions.</p>
    <div className="rounded-xl border border-zinc-800 p-4 space-y-3">{consensus.tiers.filter(row => row.items.length > 0).map(row => <div key={row.id} className="flex gap-3 items-start">
      <span className={`w-10 min-h-10 shrink-0 rounded-lg flex items-center justify-center font-bold bg-gradient-to-br ${row.color}`}>{row.label}</span>
      <div className="flex flex-wrap gap-2">{row.items.map(entry => <span key={entry.item.id} className="rounded-lg bg-zinc-800 px-2 py-1 text-xs">{entry.item.name} ({entry.avgScore.toFixed(1)})</span>)}</div>
    </div>)}</div>
  </section>;
}
