"use client";

import React, { useEffect, useState, useTransition } from "react";
import type { Template, PublishedTierList } from "@/types";
import { calculateConsensus, type ConsensusResult } from "@/lib/consensus";
import { fetchSubmissionsForTemplateWithStatus } from "@/lib/community";
import { BarChart3, Flame, RefreshCw, AlertCircle } from "lucide-react";

interface TemplateConsensusSectionProps {
  template: Template;
  initialSubmissions?: PublishedTierList[];
  initialFetchError?: string | null;
}

export function TemplateConsensusSection({
  template,
  initialSubmissions = [],
  initialFetchError = null,
}: TemplateConsensusSectionProps) {
  const [submissions, setSubmissions] = useState<PublishedTierList[]>(initialSubmissions);
  const [fetchError, setFetchError] = useState<string | null>(initialFetchError);
  const [isPending, startTransition] = useTransition();

  const loadSubmissions = () => {
    startTransition(async () => {
      const { submissions: data, fetchError: err } =
        await fetchSubmissionsForTemplateWithStatus(template.id);
      setSubmissions(data);
      setFetchError(err);
    });
  };

  useEffect(() => {
    // If we only have server data or need to hydrate with client local storage / live data
    let isCancelled = false;
    fetchSubmissionsForTemplateWithStatus(template.id).then(({ submissions: data, fetchError: err }) => {
      if (!isCancelled) {
        setSubmissions(data);
        setFetchError(err);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [template.id]);

  const consensus: ConsensusResult = calculateConsensus(template, submissions, {
    fetchError: Boolean(fetchError),
  });

  return (
    <div className="space-y-4" data-testid="consensus-section">
      <div className="flex items-center justify-between">
        <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-cyan-400" />
          <span>Global Community Consensus for {template.title}</span>
        </h3>
        <div className="flex items-center gap-2">
          {consensus.status === "error" ? (
            <span className="text-xs text-rose-400 font-medium flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              Unable to load consensus
            </span>
          ) : (
            <span className="text-xs text-zinc-400">
              {consensus.totalSubmissions > 0
                ? `${consensus.totalSubmissions.toLocaleString()} ${
                    consensus.totalSubmissions === 1 ? "submission" : "submissions"
                  }`
                : "No submissions yet"}
            </span>
          )}
        </div>
      </div>

      {consensus.status === "error" ? (
        <div
          role="alert"
          className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-6 text-center space-y-3"
        >
          <div className="flex items-center justify-center gap-2 text-rose-300 font-semibold text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>Could not retrieve community rankings</span>
          </div>
          <p className="text-xs text-rose-200/80 max-w-md mx-auto">
            {fetchError || "An error occurred while loading community consensus submissions."}
          </p>
          <button
            type="button"
            onClick={loadSubmissions}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isPending ? "animate-spin" : ""}`} />
            <span>{isPending ? "Retrying..." : "Retry"}</span>
          </button>
        </div>
      ) : consensus.status === "empty" || consensus.totalSubmissions === 0 ? (
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-6 text-center space-y-2">
          <p className="text-xs text-zinc-400">
            No community rankings submitted yet — rank this template above to establish the first consensus!
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-4 space-y-3">
          {consensus.tiers.map((row) => (
            <div key={row.id} className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-lg font-bold text-xs flex items-center justify-center text-white flex-shrink-0 bg-gradient-to-br ${row.color}`}
              >
                {row.label}
              </div>
              <div className="flex-1 flex flex-wrap gap-1.5 min-h-[36px] items-center p-1.5 rounded-lg bg-zinc-900/80 border border-zinc-800/60">
                {row.items.length === 0 ? (
                  <span className="text-[11px] text-zinc-600 px-2 italic">No items</span>
                ) : (
                  row.items.map((it) => (
                    <span
                      key={it.item.id}
                      className="px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-800 border border-zinc-700 text-zinc-200"
                    >
                      {it.item.name} ({it.avgScore.toFixed(1)})
                    </span>
                  ))
                )}
              </div>
            </div>
          ))}

          {consensus.mostControversial?.item && (
            <div className="pt-3 border-t border-zinc-800/60 flex items-center justify-between text-xs text-zinc-400">
              <span className="flex items-center gap-1.5 text-amber-400 font-semibold">
                <Flame className="w-3.5 h-3.5" />
                <span>Most Controversial Item:</span>
                <span className="text-white">{consensus.mostControversial.item.name}</span>
              </span>
              <span>{consensus.overallAgreementPct}% Community Agreement</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
