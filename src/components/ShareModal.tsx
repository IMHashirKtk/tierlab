"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { X, Copy, Check, Share2, Code, ExternalLink, Loader2, Sparkles } from "lucide-react";
import { publishTierList } from "@/lib/community";
import type { TierRow, Item } from "@/types";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  boardTitle: string;
  totalRankedCount: number;
  tiers?: TierRow[];
  unranked?: Item[];
  templateId?: string;
}

export function ShareModal({
  isOpen,
  onClose,
  boardTitle,
  totalRankedCount,
  tiers,
  unranked,
  templateId,
}: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"link" | "embed">("link");
  const [shareId, setShareId] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [authorName, setAuthorName] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setShareId(null);
      setIsPublishing(false);
      return;
    }

    // Auto-publish when modal opens if tiers exist
    if (tiers && !shareId && !isPublishing) {
      setIsPublishing(true);
      publishTierList({
        templateId,
        title: boardTitle,
        authorName: authorName.trim() || "Anonymous Ranker",
        tiers,
        unranked: unranked || [],
      })
        .then((pub) => {
          setShareId(pub.id);
        })
        .catch((err) => {
          console.error("Auto-publish failed", err);
        })
        .finally(() => {
          setIsPublishing(false);
        });
    }
  }, [isOpen, tiers, boardTitle, templateId]);

  if (!isOpen) return null;

  const origin = typeof window !== "undefined" ? window.location.origin : "https://tierlistmaker.app";
  const shareUrl = shareId ? `${origin}/share/${shareId}` : (typeof window !== "undefined" ? window.location.href : "");
  const embedCode = `<iframe src="${shareUrl}" width="100%" height="600" frameborder="0"></iframe>`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyEmbed = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tweetText = encodeURIComponent(`Check out my "${boardTitle}" tier list ranking on TierLab! 🏆\n\n${shareUrl}`);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-indigo-400" />
            <h3 className="text-lg font-bold text-white">Share Your Tier List</h3>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Board Summary Pill */}
        <div className="p-3 rounded-xl bg-zinc-800/60 border border-zinc-700/80 mb-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white truncate max-w-[240px]">{boardTitle}</span>
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
              Public Link
            </span>
          </div>
          <span className="text-[11px] text-zinc-400 block mt-0.5">
            {totalRankedCount} items placed • Anyone with the link can view and remix
          </span>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-zinc-800 mb-4 text-xs font-semibold">
          <button
            onClick={() => setActiveTab("link")}
            className={`pb-2.5 px-3 border-b-2 cursor-pointer transition-colors ${
              activeTab === "link"
                ? "border-indigo-500 text-white"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Shareable Link
          </button>
          <button
            onClick={() => setActiveTab("embed")}
            className={`pb-2.5 px-3 border-b-2 cursor-pointer transition-colors flex items-center gap-1.5 ${
              activeTab === "embed"
                ? "border-indigo-500 text-white"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span>Embed Code</span>
          </button>
        </div>

        {isPublishing ? (
          <div className="py-8 text-center space-y-2">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-400 mx-auto" />
            <p className="text-xs text-zinc-400">Generating permanent shareable link...</p>
          </div>
        ) : activeTab === "link" ? (
          <div className="space-y-4">
            {/* Copy Link Input */}
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-300 select-all focus:outline-none"
              />
              <button
                onClick={handleCopyLink}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 transition-colors cursor-pointer flex-shrink-0 shadow-md shadow-indigo-600/20"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? "Copied!" : "Copy"}</span>
              </button>
            </div>

            {/* View Shared Board CTA */}
            {shareId && (
              <Link
                href={`/share/${shareId}`}
                target="_blank"
                className="w-full py-2 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-750 text-indigo-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-zinc-700"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Public View Page</span>
              </Link>
            )}

            {/* Social Share Buttons */}
            <div>
              <span className="text-[11px] font-semibold text-zinc-400 block mb-2 uppercase tracking-wider">
                Quick Share
              </span>
              <div className="grid grid-cols-2 gap-2">
                <a
                  href={`https://twitter.com/intent/tweet?text=${tweetText}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-750 text-zinc-300 hover:text-white flex items-center justify-center gap-2 text-xs font-medium transition-colors"
                >
                  <span>Share to X / Twitter</span>
                </a>
                <a
                  href={`https://reddit.com/submit?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(boardTitle + " Tier List")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-750 text-zinc-300 hover:text-white flex items-center justify-center gap-2 text-xs font-medium transition-colors"
                >
                  <span>Share to Reddit</span>
                </a>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <textarea
              readOnly
              rows={4}
              value={embedCode}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 font-mono text-[11px] text-zinc-300 select-all focus:outline-none"
            />
            <button
              onClick={handleCopyEmbed}
              className="w-full py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? "Embed Code Copied!" : "Copy Embed Code"}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
