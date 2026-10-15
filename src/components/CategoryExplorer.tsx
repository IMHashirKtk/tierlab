"use client";

import React from "react";
import Link from "next/link";
import { CATEGORIES } from "@/data/seed-templates";

export function CategoryExplorer() {
  const categoriesList = CATEGORIES.filter((c) => c.id !== "all");

  return (
    <section id="categories" className="py-16 border-t border-zinc-800/80 relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Browse by Category
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              Explore public templates across top fandoms.
            </p>
          </div>
          <Link href="/categories/gaming" className="text-xs font-semibold text-indigo-400 hover:text-indigo-300">
            View All Categories &rarr;
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {categoriesList.map((cat) => (
            <Link
              key={cat.id}
              href={`/categories/${cat.id}`}
              className="p-4 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 hover:border-indigo-500/40 text-center transition-all group"
            >
              <div className="text-2xl mb-1 group-hover:scale-110 transition-transform">
                {cat.icon}
              </div>
              <div className="text-sm font-bold text-white truncate">{cat.name}</div>
              <div className="text-[11px] text-zinc-500 mt-0.5">
                {cat.count.toLocaleString()} templates
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
