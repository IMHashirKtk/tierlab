"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Sparkles, Layers, ArrowBigUp, ExternalLink } from "lucide-react";
import { fetchUserProfile, type UserProfileData } from "@/lib/community";

function getAvatarGradient(name: string): string {
  const gradients = [
    "from-indigo-500 via-purple-600 to-pink-500",
    "from-rose-500 via-orange-500 to-amber-500",
    "from-emerald-500 via-teal-600 to-cyan-600",
    "from-blue-600 via-indigo-600 to-violet-700",
    "from-pink-500 via-rose-500 to-red-600",
  ];
  let sum = 0;
  for (let i = 0; i < name.length; i++) {
    sum += name.charCodeAt(i);
  }
  return gradients[sum % gradients.length];
}

function UserProfileContent() {
  const params = useParams();
  const rawUser = Array.isArray(params.username) ? params.username[0] : (params.username as string) || "Creator";
  const username = decodeURIComponent(rawUser);

  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"rankings" | "templates">("rankings");

  useEffect(() => {
    if (!username) return;
    let cancelled = false;
    fetchUserProfile(username).then((data) => {
      if (!cancelled) {
        setProfile(data);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [username]);

  const isLoading = loading || !profile || profile.username.toLowerCase() !== username.toLowerCase();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#09090b] text-zinc-400 flex items-center justify-center text-xs">
        Loading creator profile...
      </div>
    );
  }

  const initial = username.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-[#09090b] text-[#f4f4f5] flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 glass-panel border-b border-zinc-800/80 px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
            title="Back to Home"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="truncate">
            <h1 className="font-bold text-sm sm:text-base text-zinc-100 truncate">
              Creator Profile
            </h1>
            <span className="text-[11px] text-zinc-400">@{username}</span>
          </div>
        </div>

        <Link
          href="/create"
          className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 flex items-center gap-1.5"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Create Tier List</span>
        </Link>
      </header>

      {/* Main Profile Canvas */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 space-y-8">
        {/* Creator Banner Card */}
        <div className="rounded-3xl bg-gradient-to-br from-indigo-950/40 via-zinc-900 to-zinc-950 border border-indigo-500/20 p-6 sm:p-8 relative overflow-hidden shadow-2xl">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10 text-center sm:text-left">
            {/* Avatar */}
            <div
              className={`w-24 h-24 rounded-3xl bg-gradient-to-tr ${getAvatarGradient(
                username
              )} flex items-center justify-center font-black text-4xl text-white shadow-2xl border-2 border-white/10 flex-shrink-0`}
            >
              {initial}
            </div>

            {/* Identity & Bio */}
            <div className="space-y-2 flex-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  @{username}
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-zinc-300 max-w-lg leading-relaxed">
                {profile?.bio}
              </p>
            </div>

            {/* Stats Ribbon */}
            <div className="flex sm:flex-col gap-3 justify-center border-t sm:border-t-0 sm:border-l border-zinc-800 pt-4 sm:pt-0 sm:pl-6 w-full sm:w-auto">
              <div className="text-center sm:text-left px-3">
                <span className="text-xl sm:text-2xl font-black text-white block">
                  {profile?.tierLists.length || 0}
                </span>
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                  Rankings
                </span>
              </div>
              <div className="text-center sm:text-left px-3">
                <span className="text-xl sm:text-2xl font-black text-white block">
                  {profile?.templates.length || 0}
                </span>
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                  Templates
                </span>
              </div>
              <div className="text-center sm:text-left px-3">
                <span className="text-xl sm:text-2xl font-black text-indigo-400 block">
                  {profile?.totalUpvotes || 0}
                </span>
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                  Upvotes
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Portfolio Tabs */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
            <button
              onClick={() => setActiveTab("rankings")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === "rankings"
                  ? "bg-zinc-800 text-white shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Layers className="w-4 h-4 text-indigo-400" />
              <span>Rankings ({profile?.tierLists.length || 0})</span>
            </button>
            <button
              onClick={() => setActiveTab("templates")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === "templates"
                  ? "bg-zinc-800 text-white shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Templates ({profile?.templates.length || 0})</span>
            </button>
          </div>

          {/* Tab 1: Rankings Grid */}
          {activeTab === "rankings" && (
            <div className="space-y-4">
              {profile?.tierLists.length === 0 ? (
                <div className="p-12 text-center rounded-2xl bg-zinc-900/40 border border-dashed border-zinc-800 space-y-3">
                  <Layers className="w-10 h-10 text-zinc-600 mx-auto" />
                  <h3 className="text-sm font-bold text-zinc-200">No public tier lists yet</h3>
                  <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                    @{username} hasn&apos;t published any completed rankings yet.
                  </p>
                  <Link
                    href="/create"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                  >
                    <span>Create a Tier List</span>
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {profile?.tierLists.map((tierList) => {
                    const topTier = tierList.tiers.find((t) => t.items.length > 0) || tierList.tiers[0];
                    const totalItems = tierList.tiers.reduce((sum, t) => sum + t.items.length, 0);

                    return (
                      <Link
                        key={tierList.id}
                        href={`/share/${tierList.id}`}
                        className="p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800/90 hover:border-zinc-700 transition-all duration-200 hover:-translate-y-0.5 group space-y-3 block shadow-lg"
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors truncate">
                            {tierList.title}
                          </h4>
                          <span className="text-[11px] font-mono text-zinc-500 flex items-center gap-1">
                            <ArrowBigUp className="w-3.5 h-3.5 text-indigo-400" />
                            <span>{tierList.upvotes}</span>
                          </span>
                        </div>

                        {/* Top Tier Preview */}
                        {topTier && (
                          <div className="flex items-center gap-2 p-2 rounded-xl bg-zinc-950/80 border border-zinc-800/80">
                            <span
                              className={`w-7 h-7 rounded-lg bg-gradient-to-br ${topTier.color} text-[11px] font-bold text-white flex items-center justify-center flex-shrink-0 shadow-sm`}
                            >
                              {topTier.label}
                            </span>
                            <div className="flex-1 flex gap-1.5 overflow-hidden">
                              {topTier.items.slice(0, 4).map((it) => (
                                <div
                                  key={it.id}
                                  className="w-7 h-7 rounded bg-zinc-800 overflow-hidden flex items-center justify-center flex-shrink-0"
                                  title={it.name}
                                >
                                  {it.imageUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={it.imageUrl}
                                      alt={it.name}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <span className="text-[9px] text-zinc-400 px-1 truncate">
                                      {it.name}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1">
                          <span>{totalItems} items placed</span>
                          <span className="text-indigo-400 font-semibold group-hover:underline flex items-center gap-1">
                            <span>View Board</span>
                            <ExternalLink className="w-3 h-3" />
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Templates Grid */}
          {activeTab === "templates" && (
            <div className="space-y-4">
              {profile?.templates.length === 0 ? (
                <div className="p-12 text-center rounded-2xl bg-zinc-900/40 border border-dashed border-zinc-800 space-y-3">
                  <Sparkles className="w-10 h-10 text-zinc-600 mx-auto" />
                  <h3 className="text-sm font-bold text-zinc-200">No templates created yet</h3>
                  <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                    @{username} hasn&apos;t published any custom templates to the community yet.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {profile?.templates.map((tpl) => (
                    <div
                      key={tpl.id}
                      className="p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800/90 space-y-3 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                            {tpl.category}
                          </span>
                          <span className="text-[11px] text-zinc-500 font-mono">
                            {tpl.itemCount} items
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-white">{tpl.title}</h4>
                        <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
                          {tpl.description}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-zinc-800 flex items-center justify-between">
                        <span className="text-[11px] text-zinc-500 font-mono">
                          {tpl.remixCount} remixes
                        </span>
                        <Link
                          href={`/template/${tpl.id}`}
                          className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 flex items-center gap-1.5"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Rank This</span>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function UserProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#09090b] text-zinc-400 flex items-center justify-center text-xs">
          Loading creator profile...
        </div>
      }
    >
      <UserProfileContent />
    </Suspense>
  );
}
