"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, Edit3, Layers, Calendar, Loader2 } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { PublishModal } from "@/components/PublishModal";
import type { Project } from "@/types";
import { listProjects, deleteProject } from "@/lib/storage";

function formatRelativeTime(timestamp: number): string {
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDays = Math.floor(diffHour / 24);
  return `${diffDays}d ago`;
}

export default function MyProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);

  useEffect(() => {
    let isCancelled = false;
    listProjects()
      .then((data) => {
        if (!isCancelled) {
          setProjects(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error("Failed to load projects", err);
        if (!isCancelled) setIsLoading(false);
      });
    return () => {
      isCancelled = true;
    };
  }, []);

  const handleDelete = async (id: string) => {
    try {
      await deleteProject(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error("Failed to delete project", err);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-[#f4f4f5] flex flex-col">
      <Navbar onOpenPublish={() => setIsPublishModalOpen(true)} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link
                href="/"
                className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Home</span>
              </Link>
              <span className="text-zinc-600">•</span>
              <span className="text-xs text-indigo-400 font-semibold">IndexedDB Local Storage</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">My Saved Projects</h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              All your tier lists autosave securely in your browser. Reopen or edit anytime without an account.
            </p>
          </div>

          <Link
            href="/create"
            className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/30 flex items-center gap-2 self-start sm:self-auto transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Tier List</span>
          </Link>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-zinc-500 text-sm">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
            <span>Loading saved projects from device...</span>
          </div>
        ) : projects.length === 0 ? (
          <div className="rounded-2xl bg-zinc-900/40 border border-zinc-800 p-12 text-center">
            <Layers className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white mb-1">No saved projects yet</h3>
            <p className="text-xs text-zinc-500 mb-6 max-w-sm mx-auto">
              Create your first tier list in under 30 seconds. Your edits autosave directly in this browser.
            </p>
            <Link
              href="/create"
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Board</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((proj) => {
              const totalItems =
                proj.tiers.reduce((acc, t) => acc + t.items.length, 0) + proj.unranked.length;

              return (
                <div
                  key={proj.id}
                  className="rounded-2xl bg-zinc-900/60 border border-zinc-800/90 hover:border-zinc-700 p-5 flex flex-col justify-between transition-all group hover:-translate-y-0.5"
                >
                  <div>
                    <div className="flex items-center justify-between text-[11px] text-zinc-500 mb-3">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{formatRelativeTime(proj.updatedAt)}</span>
                      </span>
                      <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono">
                        {totalItems} items
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-white group-hover:text-indigo-400 transition-colors mb-3 truncate">
                      {proj.title}
                    </h3>

                    {/* Visual Preview Bars */}
                    <div className="space-y-1.5 mb-6">
                      {proj.tiers.slice(0, 4).map((tier) => (
                        <div key={tier.id} className="flex items-center gap-2 text-xs">
                          <span
                            className={`w-6 h-6 rounded bg-gradient-to-br ${tier.color} text-white font-bold text-[10px] flex items-center justify-center flex-shrink-0`}
                          >
                            {tier.label}
                          </span>
                          <div className="flex-1 bg-zinc-800/80 rounded-md h-5 px-2 flex items-center text-[10px] text-zinc-400 truncate">
                            {tier.items.length > 0
                              ? tier.items.map((i) => i.name).slice(0, 3).join(", ")
                              : "0 items"}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-4 border-t border-zinc-800/80 flex items-center justify-between">
                    <button
                      onClick={() => handleDelete(proj.id)}
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition-colors cursor-pointer"
                      title="Delete project"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <div className="flex items-center gap-2">
                      <Link
                        href={`/create?id=${proj.id}`}
                        className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 transition-colors shadow-sm"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Open Studio</span>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <Footer />

      <PublishModal
        isOpen={isPublishModalOpen}
        onClose={() => setIsPublishModalOpen(false)}
      />
    </div>
  );
}
