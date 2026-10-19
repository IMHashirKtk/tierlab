"use client";

import { useDialogFocus } from "@/lib/use-dialog-focus";
import { ItemImage } from "@/components/ItemImage";
import React, { useState, useEffect, useRef } from "react";
import { Search, X, Check, Plus, Sparkles, Loader2, Globe, Music, Tv, Zap } from "lucide-react";
import type { Item } from "@/types";

interface WebImageSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddItems: (items: Item[]) => void;
}

type SearchSource = "wikipedia" | "anime" | "music" | "presets";

// Curated library of instant searchable royalty-free & open web assets
const PRESET_ASSETS: Record<string, { name: string; url: string }[]> = {
  gaming: [
    { name: "Elden Ring", url: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=240&auto=format&fit=crop&q=80" },
    { name: "Cyberpunk 2077", url: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=240&auto=format&fit=crop&q=80" },
    { name: "PlayStation 5", url: "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=240&auto=format&fit=crop&q=80" },
    { name: "Nintendo Switch", url: "https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?w=240&auto=format&fit=crop&q=80" },
    { name: "Xbox Series X", url: "https://images.unsplash.com/photo-1621259182978-fbf93132d53d?w=240&auto=format&fit=crop&q=80" },
    { name: "Steam Deck", url: "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=240&auto=format&fit=crop&q=80" },
  ],
  food: [
    { name: "Pepperoni Pizza", url: "https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?w=240&auto=format&fit=crop&q=80" },
    { name: "Cheeseburger", url: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=240&auto=format&fit=crop&q=80" },
    { name: "French Fries", url: "https://images.unsplash.com/photo-1576107232684-1279f3908594?w=240&auto=format&fit=crop&q=80" },
    { name: "Sushi Rolls", url: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=240&auto=format&fit=crop&q=80" },
    { name: "Fried Chicken", url: "https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=240&auto=format&fit=crop&q=80" },
    { name: "Ice Cream Cone", url: "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=240&auto=format&fit=crop&q=80" },
  ],
  tech: [
    { name: "MacBook Pro", url: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=240&auto=format&fit=crop&q=80" },
    { name: "iPhone Pro", url: "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=240&auto=format&fit=crop&q=80" },
    { name: "Mechanical Keyboard", url: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=240&auto=format&fit=crop&q=80" },
    { name: "Noise Cancelling Headphones", url: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=240&auto=format&fit=crop&q=80" },
    { name: "Apple Watch Ultra", url: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=240&auto=format&fit=crop&q=80" },
    { name: "Vision Pro", url: "https://images.unsplash.com/photo-1593508512255-86ab42a8e620?w=240&auto=format&fit=crop&q=80" },
  ],
};

for (const assets of Object.values(PRESET_ASSETS)) {
  for (const asset of assets) asset.url = "text:" + asset.name;
}

const ALL_PRESETS = [
  ...PRESET_ASSETS.gaming,
  ...PRESET_ASSETS.food,
  ...PRESET_ASSETS.tech,
];

export function WebImageSearchModal({ isOpen, onClose, onAddItems }: WebImageSearchModalProps) {
  const [query, setQuery] = useState("");
  const [source, setSource] = useState<SearchSource>("wikipedia");
  const [activeCategory, setActiveCategory] = useState("gaming");
  const [selectedUrls, setSelectedUrls] = useState<Record<string, { name: string; url: string }>>({});
  const [liveResults, setLiveResults] = useState<{ name: string; url: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Live Public API Search with 350ms debounce
  useEffect(() => {
    if (!isOpen) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const timer = setTimeout(async () => {
      if (source === "presets" || query.trim().length < 2) {
        setLiveResults([]);
        setIsLoading(false);
        setSearchError(null);
        return;
      }

      setIsLoading(true);
      setSearchError(null);

      try {
        const q = query.trim();
        let items: { name: string; url: string }[] = [];

        if (source === "wikipedia") {
          const res = await fetch(
            `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
              q
            )}&gsrlimit=12&prop=pageimages&piprop=thumbnail&pithumbsize=300&format=json&origin=*`,
            { signal: controller.signal }
          );
          if (res.ok) {
            const data = await res.json();
            if (data?.query?.pages) {
              const pages = Object.values(data.query.pages) as {
                title: string;
                thumbnail?: { source: string };
              }[];
              items = pages
                .filter((p) => p.thumbnail?.source)
                .map((p) => ({
                  name: p.title,
                  url: p.thumbnail!.source,
                }));
            }
          }
        } else if (source === "anime") {
          const res = await fetch(
            `https://api.jikan.moe/v4/characters?q=${encodeURIComponent(q)}&limit=12`,
            { signal: controller.signal }
          );
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data?.data)) {
              items = data.data
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .filter((item: any) => item.images?.jpg?.image_url)
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .map((item: any) => ({
                  name: item.name,
                  url: item.images.jpg.image_url,
                }));
            }
          }
        } else if (source === "music") {
          const res = await fetch(
            `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=album&limit=12`,
            { signal: controller.signal }
          );
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data?.results)) {
              items = data.results
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .filter((item: any) => item.artworkUrl100 && item.collectionName)
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .map((item: any) => ({
                  name: item.collectionName,
                  url: item.artworkUrl100.replace("100x100bb", "300x300bb"),
                }));
            }
          }
        }

        setLiveResults(items);
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
        console.warn("Live web image search query failed:", err);
        setSearchError("Live search unavailable. Showing starter library.");
      } finally {
        setIsLoading(false);
      }
    }, 350);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, source, isOpen]);

  const dialogRef = useDialogFocus(isOpen);

  if (!isOpen) return null;

  // Determine which assets to display
  let displayedAssets: { name: string; url: string }[] = [];

  if (source === "presets") {
    const current = PRESET_ASSETS[activeCategory] || [];
    displayedAssets = query.trim()
      ? current.filter((a) => a.name.toLowerCase().includes(query.toLowerCase()))
      : current;
  } else if (query.trim().length >= 2 && liveResults.length > 0) {
    displayedAssets = liveResults;
  } else if (query.trim().length >= 2 && !isLoading && liveResults.length === 0) {
    // If no live results found, fall back to filtered presets
    const fallback = ALL_PRESETS.filter((a) =>
      a.name.toLowerCase().includes(query.toLowerCase())
    );
    displayedAssets = fallback.length > 0 ? fallback : [];
  } else {
    // Empty search query or 1 char: Always show starter presets so tests and users always have instant assets
    displayedAssets = PRESET_ASSETS[activeCategory] || PRESET_ASSETS.gaming;
  }

  const toggleSelect = (item: { name: string; url: string }) => {
    setSelectedUrls((prev) => {
      const copy = { ...prev };
      if (copy[item.url]) {
        delete copy[item.url];
      } else {
        copy[item.url] = item;
      }
      return copy;
    });
  };

  const handleAddSelected = () => {
    const itemsToAdd: Item[] = Object.values(selectedUrls).map((val) => ({
      id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: val.name,
      imageUrl: val.url.startsWith("text:") ? undefined : val.url,
    }));

    if (itemsToAdd.length > 0) {
      onAddItems(itemsToAdd);
      setSelectedUrls({});
      onClose();
    }
  };

  const selectedCount = Object.keys(selectedUrls).length;

  return (
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Search images and starter items" tabIndex={-1} className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header - Keeps 'Web Asset' in text for Playwright test compatibility */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <h3 className="text-lg font-bold text-white">Instant Web Asset Search</h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 cursor-pointer min-w-[28px] min-h-[28px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Source Mode Tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 mb-3">
          <button
            type="button"
            onClick={() => setSource("wikipedia")}
            className={`min-h-[30px] px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5 flex-shrink-0 ${
              source === "wikipedia"
                ? "bg-indigo-600 text-white"
                : "bg-zinc-800 text-zinc-400 hover:text-white"
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Wikipedia / All</span>
          </button>
          <button
            type="button"
            onClick={() => setSource("anime")}
            className={`min-h-[30px] px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5 flex-shrink-0 ${
              source === "anime"
                ? "bg-indigo-600 text-white"
                : "bg-zinc-800 text-zinc-400 hover:text-white"
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            <span>Anime & Characters</span>
          </button>
          <button
            type="button"
            onClick={() => setSource("music")}
            className={`min-h-[30px] px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5 flex-shrink-0 ${
              source === "music"
                ? "bg-indigo-600 text-white"
                : "bg-zinc-800 text-zinc-400 hover:text-white"
            }`}
          >
            <Music className="w-3.5 h-3.5" />
            <span>Music & Albums</span>
          </button>
          <button
            type="button"
            onClick={() => setSource("presets")}
            className={`min-h-[30px] px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5 flex-shrink-0 ${
              source === "presets"
                ? "bg-indigo-600 text-white"
                : "bg-zinc-800 text-zinc-400 hover:text-white"
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Starter Presets</span>
          </button>
        </div>

        {/* Search Input & Category Pills */}
        <div className="space-y-3 mb-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
            <input
              type="text"
              placeholder={
                source === "wikipedia"
                  ? "Search Wikipedia (e.g. Cristiano Ronaldo, GTA, Batman)..."
                  : source === "anime"
                  ? "Search MyAnimeList (e.g. Gojo, Luffy, Frieren)..."
                  : source === "music"
                  ? "Search iTunes (e.g. Kendrick Lamar, Drake, Daft Punk)..."
                  : "Search starter presets (e.g. Pizza, MacBook)..."
              }
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-zinc-800/90 border border-zinc-700 rounded-xl pl-10 pr-10 py-2 text-xs sm:text-sm text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500"
            />
            {isLoading ? (
              <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400 animate-spin" />
            ) : query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 min-w-[28px] min-h-[28px] flex items-center justify-center text-zinc-500 hover:text-zinc-300 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : null}
          </div>

          {/* Preset Categories (shown when in Presets mode or when query is empty) */}
          {(source === "presets" || query.trim() === "") && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setActiveCategory("gaming")}
                className={`min-h-[28px] px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                  activeCategory === "gaming"
                    ? "bg-indigo-600/80 text-white"
                    : "bg-zinc-800 text-zinc-400 hover:text-white"
                }`}
              >
                🎮 Gaming
              </button>
              <button
                type="button"
                onClick={() => setActiveCategory("food")}
                className={`min-h-[28px] px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                  activeCategory === "food"
                    ? "bg-indigo-600/80 text-white"
                    : "bg-zinc-800 text-zinc-400 hover:text-white"
                }`}
              >
                🍔 Food & Snacks
              </button>
              <button
                type="button"
                onClick={() => setActiveCategory("tech")}
                className={`min-h-[28px] px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                  activeCategory === "tech"
                    ? "bg-indigo-600/80 text-white"
                    : "bg-zinc-800 text-zinc-400 hover:text-white"
                }`}
              >
                💻 Tech & Gadgets
              </button>
            </div>
          )}

          {searchError && (
            <p className="text-[11px] text-amber-400/90">{searchError}</p>
          )}
        </div>

        {/* Assets Grid */}
        <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4 min-h-[200px]">
          {isLoading && displayedAssets.length === 0 ? (
            <div className="col-span-full py-16 flex flex-col items-center justify-center gap-2 text-zinc-400">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
              <span className="text-xs">Searching free web APIs...</span>
            </div>
          ) : displayedAssets.length === 0 ? (
            <div className="col-span-full py-16 text-center text-zinc-500 text-xs">
              <p>No results found for &ldquo;{query}&rdquo;</p>
              <p className="text-[11px] text-zinc-600 mt-1">
                Try switching source tabs (Wikipedia, Anime, Music) or clear the search.
              </p>
            </div>
          ) : (
            displayedAssets.map((asset) => {
              const isSelected = !!selectedUrls[asset.url];
              return (
                <div
                  key={asset.url}
                  onClick={() => toggleSelect(asset)}
                  className={`relative rounded-xl border p-2 cursor-pointer transition-all flex flex-col items-center gap-2 group ${
                    isSelected
                      ? "bg-indigo-950/40 border-indigo-500 ring-2 ring-indigo-500/30"
                      : "bg-zinc-800/50 border-zinc-700 hover:border-zinc-500"
                  }`}
                >
                  <div className="w-full aspect-square rounded-lg overflow-hidden bg-zinc-950 relative">
                    <ItemImage
                      src={asset.url.startsWith("text:") ? undefined : asset.url}
                      alt={asset.name}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                    {isSelected && (
                      <div className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>
                  <span className="text-xs font-medium text-zinc-200 truncate w-full text-center">
                    {asset.name}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-zinc-800 flex justify-between items-center">
          <span className="text-xs text-zinc-400">
            {selectedCount > 0 ? (
              <span className="text-indigo-400 font-semibold">{selectedCount} item(s) selected</span>
            ) : (
              "Click items to select them"
            )}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[32px] px-4 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-white bg-zinc-800 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={selectedCount === 0}
              onClick={handleAddSelected}
              className="min-h-[32px] px-4 py-2 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer shadow"
            >
              <Plus className="w-4 h-4" />
              <span>Add {selectedCount > 0 ? `(${selectedCount})` : ""} to Board</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
