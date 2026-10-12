"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Search, Plus, Layers, User, Sparkles, Swords } from "lucide-react";
import { fetchTemplates } from "@/lib/community";
import type { Template } from "@/types";

interface NavbarProps {
  onOpenPublish: () => void;
}

export function Navbar({ onOpenPublish }: NavbarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [matchingTemplates, setMatchingTemplates] = useState<Template[]>([]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setMatchingTemplates([]);
      return;
    }
    let isCancelled = false;
    fetchTemplates({ search: searchQuery }).then((res) => {
      if (!isCancelled) {
        setMatchingTemplates(res.slice(0, 6));
      }
    });
    return () => {
      isCancelled = true;
    };
  }, [searchQuery]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-zinc-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-3 flex-shrink-0 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-[1.5px] shadow-lg shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition-all">
            <div className="w-full h-full bg-zinc-950 rounded-[10px] flex items-center justify-center">
              <Layers className="w-5 h-5 text-indigo-400 group-hover:text-cyan-300 transition-colors" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold tracking-tight text-white">
              Tier<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">Lab</span>
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Community
            </span>
          </div>
        </Link>

        {/* Search Bar with Live Results */}
        <div className="hidden md:flex flex-1 max-w-md mx-4 relative" ref={searchRef}>
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              placeholder="Search 45,000+ templates, fandoms, games..."
              className="w-full bg-zinc-900/90 border border-zinc-800 rounded-xl pl-10 pr-12 py-2 text-xs sm:text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded font-mono text-[10px]">
              ⌘K
            </kbd>
          </div>

          {/* Quick Search Results Dropdown */}
          {isSearchFocused && searchQuery.trim().length > 0 && (
            <div className="absolute top-12 left-0 right-0 bg-zinc-900/95 backdrop-blur-md border border-zinc-700/80 rounded-xl shadow-2xl p-2 z-50 space-y-1 max-h-72 overflow-y-auto">
              {matchingTemplates.length === 0 ? (
                <div className="p-3 text-xs text-zinc-500 text-center">
                  No templates found matching &ldquo;{searchQuery}&rdquo;
                </div>
              ) : (
                matchingTemplates.map((t) => (
                  <Link
                    key={t.id}
                    href={`/template/${t.id}`}
                    onClick={() => {
                      setIsSearchFocused(false);
                      setSearchQuery("");
                    }}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-800 text-xs transition-colors group"
                  >
                    <div className="truncate mr-2">
                      <span className="font-semibold text-white group-hover:text-indigo-300 block truncate">
                        {t.title}
                      </span>
                      <span className="text-[11px] text-zinc-400">
                        {t.category} • {t.itemCount} items
                      </span>
                    </div>
                    <span className="text-[10px] font-semibold bg-indigo-600/30 text-indigo-300 px-2 py-0.5 rounded flex-shrink-0">
                      Rank &rarr;
                    </span>
                  </Link>
                ))
              )}
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          <nav className="hidden lg:flex items-center gap-1 text-sm font-medium text-zinc-400 mr-2">
            <a href="#trending" className="px-3 py-1.5 rounded-lg hover:text-white hover:bg-zinc-800/60 transition-colors">
              Trending
            </a>
            <a href="#feed" className="px-3 py-1.5 rounded-lg hover:text-white hover:bg-zinc-800/60 transition-colors">
              Live Feed
            </a>
            <a href="#categories" className="px-3 py-1.5 rounded-lg hover:text-white hover:bg-zinc-800/60 transition-colors">
              Categories
            </a>
            <Link href="/my-projects" className="px-3 py-1.5 rounded-lg hover:text-white hover:bg-zinc-800/60 transition-colors">
              My Projects
            </Link>
            <Link
              href="/versus"
              className="px-3 py-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors flex items-center gap-1 font-semibold"
            >
              <Swords className="w-3.5 h-3.5" />
              <span>Versus</span>
            </Link>
            <a href="#dropfx" className="px-3 py-1.5 rounded-lg text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 transition-colors flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Drop FX</span>
            </a>
          </nav>

          {/* Secondary CTA: Publish Template */}
          <button
            onClick={onOpenPublish}
            className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-zinc-300 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 hover:border-zinc-600 flex items-center gap-2 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 text-indigo-400" />
            <span className="hidden sm:inline">New Template</span>
          </button>

          {/* Primary CTA: Start Ranking */}
          <Link
            href="/create"
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/30 transition-all flex items-center gap-1.5"
          >
            <span>Rank Now</span>
          </Link>

          {/* Profile Button */}
          <Link
            href="/user/Creator"
            className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors"
            title="Creator Profile"
          >
            <User className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </header>
  );
}
