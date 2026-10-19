"use client";

import { Film, Image as ImageIcon } from "lucide-react";

type ExportFormat = "image" | "video";

interface ExportFormatTabsProps {
  format: ExportFormat;
  onChange: (format: ExportFormat) => void;
  disabled?: boolean;
}

export function ExportFormatTabs({ format, onChange, disabled = false }: ExportFormatTabsProps) {
  return (
    <div role="group" aria-label="Export format" className="flex p-1 rounded-xl bg-zinc-950 border border-zinc-800 text-xs">
      {(["image", "video"] as const).map((option) => {
        const Icon = option === "image" ? ImageIcon : Film;
        return (
          <button
            key={option}
            type="button"
            data-tab={`${option}-export`}
            aria-pressed={format === option}
            disabled={disabled}
            onClick={() => { if (format !== option) onChange(option); }}
            className={`flex-1 min-w-0 py-2.5 px-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-wait ${format === option ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-400 hover:text-white hover:bg-zinc-900/60"}`}
          >
            <Icon aria-hidden="true" className={`w-4 h-4 shrink-0 ${option === "image" ? "text-indigo-400" : "text-rose-400"}`} />
            <span>{option === "image" ? "Image" : "Video"}</span>
          </button>
        );
      })}
    </div>
  );
}
