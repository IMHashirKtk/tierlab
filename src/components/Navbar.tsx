"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Search, Plus, Layers, User, Swords, Menu, X } from "lucide-react";
import { fetchTemplates } from "@/lib/community";
import type { Template } from "@/types";

interface NavbarProps {
  onOpenPublish?: () => void;
}

export function Navbar({ onOpenPublish }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [matchingTemplates, setMatchingTemplates] = useState<Template[]>([]);
  const [creatorHandle, setCreatorHandle] = useState("Creator");

  useEffect(() => {
    queueMicrotask(() => {
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("tl_commenter_name");
        if (saved && saved.trim()) {
          setCreatorHandle(saved.trim());
        }
      }
    });
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) return;
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
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) setMenuOpen(false);
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        setIsSearchFocused(false);
        menuButtonRef.current?.focus();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
  return (
    <header ref={headerRef} className="sticky top-0 z-50 glass-panel border-b border-zinc-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand Logo */}
        <Link href="/" aria-label="Tier List Maker home" className="flex min-w-0 items-center gap-2 shrink-0 group">
          <div className="w-8 h-8 sm:w-9 sm:h-9 shrink-0 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-[1.5px] shadow-lg shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition-all">
            <div className="w-full h-full bg-zinc-950 rounded-[10px] flex items-center justify-center">
              <Layers className="w-5 h-5 text-indigo-400 group-hover:text-cyan-300 transition-colors" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-base sm:text-lg font-bold tracking-tight text-white whitespace-nowrap">
              Tier List <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">Maker</span>
            </span>
          </div>
        </Link>

        {/* Search Bar with Live Results */}
        <div className="hidden lg:flex min-w-0 flex-1 max-w-xs relative" ref={searchRef}>
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              placeholder="Search templates, fandoms, games..."
              aria-label="Search community templates"
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
        <div className="flex shrink-0 items-center gap-2">
          <nav aria-label="Main navigation" className="hidden xl:flex items-center whitespace-nowrap text-sm font-medium text-zinc-400">
            <Link href="/#trending" className="px-2.5 py-2 rounded-lg hover:text-white hover:bg-zinc-800/60 transition-colors">
              Templates
            </Link>
            <Link href="/#categories" className="px-2.5 py-2 rounded-lg hover:text-white hover:bg-zinc-800/60 transition-colors">
              Categories
            </Link>
            <Link href="/my-projects" className="px-2.5 py-2 rounded-lg hover:text-white hover:bg-zinc-800/60 transition-colors">
              My Projects
            </Link>
            <Link
              href="/versus"
              className="px-2.5 py-2 rounded-lg hover:text-white hover:bg-zinc-800/60 transition-colors flex items-center gap-1"
            >
              <Swords className="w-3.5 h-3.5" />
              <span>Versus</span>
            </Link>
          </nav>

          {onOpenPublish && (
            <button
              type="button"
              onClick={onOpenPublish}
              className="hidden xl:flex px-3 py-2 rounded-xl text-sm font-semibold text-zinc-300 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 items-center gap-2 whitespace-nowrap transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4 text-indigo-400" />
              <span>New Template</span>
            </button>
          )}

          {/* Primary CTA: Start Ranking */}
          <Link
            href="/create"
            className="px-3 sm:px-4 min-h-10 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap text-white bg-indigo-600 hover:bg-indigo-500 transition-colors flex items-center"
          >
            <span>Rank Now</span>
          </Link>

          {/* Profile Button */}
          <Link
            href={`/user/${encodeURIComponent(creatorHandle)}`}
            className="hidden xl:flex w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 items-center justify-center text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors shrink-0"
            title={`Creator Profile (${creatorHandle})`}
          >
            <User className="w-4 h-4" />
          </Link>
          <button ref={menuButtonRef} type="button" aria-label={menuOpen ? "Close navigation" : "Open navigation"} aria-expanded={menuOpen} aria-controls="site-navigation" onClick={() => setMenuOpen(!menuOpen)} className="xl:hidden w-10 h-10 flex items-center justify-center rounded-xl border border-zinc-800 text-zinc-200 hover:bg-zinc-800 focus-visible:ring-2 focus-visible:ring-indigo-400">
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>
      {menuOpen && (
        <nav id="site-navigation" aria-label="Mobile navigation" className="xl:hidden absolute inset-x-0 top-full max-h-[calc(100dvh-4rem)] overflow-y-auto bg-zinc-950 border-b border-zinc-800 p-4 shadow-xl">
          <div className="max-w-7xl mx-auto grid gap-1">
            {[
              ["Browse templates", "/#trending"], ["Categories", "/#categories"], ["Community rankings", "/#feed"], ["My Projects", "/my-projects"], ["Versus", "/versus"], ["Creator features", "/#dropfx"], ["My Profile", `/user/${encodeURIComponent(creatorHandle)}`],
            ].map(([label, href]) => <Link key={href} href={href} onClick={() => setMenuOpen(false)} className="px-3 py-3 rounded-lg text-sm text-zinc-200 hover:bg-zinc-800 focus-visible:ring-2 focus-visible:ring-indigo-400">{label}</Link>)}
            {onOpenPublish && (
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onOpenPublish();
                }}
                className="px-3 py-3 text-left rounded-lg text-sm text-zinc-200 hover:bg-zinc-800"
              >
                New Template
              </button>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
