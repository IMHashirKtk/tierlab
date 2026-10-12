"use client";

import React, { useState } from "react";
import { Search, X, Check, Plus, Sparkles } from "lucide-react";
import { Item } from "@/types";

interface WebImageSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddItems: (items: Item[]) => void;
}

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

export function WebImageSearchModal({ isOpen, onClose, onAddItems }: WebImageSearchModalProps) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("gaming");
  const [selectedUrls, setSelectedUrls] = useState<Record<string, { name: string; url: string }>>({});

  if (!isOpen) return null;

  const currentAssets = PRESET_ASSETS[activeCategory] || [];
  const filteredAssets = currentAssets.filter((a) =>
    a.name.toLowerCase().includes(query.toLowerCase())
  );

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
      imageUrl: val.url,
    }));

    if (itemsToAdd.length > 0) {
      onAddItems(itemsToAdd);
      setSelectedUrls({});
      onClose();
    }
  };

  const selectedCount = Object.keys(selectedUrls).length;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <h3 className="text-lg font-bold text-white">Instant Web Asset Search</h3>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input & Category Pills */}
        <div className="space-y-3 mb-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search items (e.g. Elden Ring, Pizza, MacBook)..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-zinc-800/90 border border-zinc-700 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-zinc-200 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setActiveCategory("gaming")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                activeCategory === "gaming"
                  ? "bg-indigo-600 text-white"
                  : "bg-zinc-800 text-zinc-400 hover:text-white"
              }`}
            >
              🎮 Gaming
            </button>
            <button
              onClick={() => setActiveCategory("food")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                activeCategory === "food"
                  ? "bg-indigo-600 text-white"
                  : "bg-zinc-800 text-zinc-400 hover:text-white"
              }`}
            >
              🍔 Food & Snacks
            </button>
            <button
              onClick={() => setActiveCategory("tech")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                activeCategory === "tech"
                  ? "bg-indigo-600 text-white"
                  : "bg-zinc-800 text-zinc-400 hover:text-white"
              }`}
            >
              💻 Tech & Gadgets
            </button>
          </div>
        </div>

        {/* Assets Grid */}
        <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
          {filteredAssets.map((asset) => {
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
                  <img
                    src={asset.url}
                    alt={asset.name}
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
          })}
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
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-white bg-zinc-800 cursor-pointer"
            >
              Cancel
            </button>
            <button
              disabled={selectedCount === 0}
              onClick={handleAddSelected}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer shadow"
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
