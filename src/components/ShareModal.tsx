"use client";

import { useDialogFocus } from "@/lib/use-dialog-focus";
import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { X, Copy, Check, Share2, Code, ExternalLink, Loader2, Sparkles, AlertCircle, RefreshCw } from "lucide-react";
import { publishTierList } from "@/lib/community";
import { createId } from "@/lib/board";
import {
  getProjectPendingShareId,
  saveProjectPendingShareId,
  clearProjectPendingShareId,
} from "@/lib/draft-storage";
import type { TierRow, Item } from "@/types";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  boardTitle: string;
  totalRankedCount: number;
  tiers?: TierRow[];
  unranked?: Item[];
  templateId?: string;
  projectId?: string;
  publishedShareId?: string;
  onPublishSuccess?: (shareId: string, projectId?: string) => Promise<void> | void;
}

export function ShareModal({
  isOpen,
  onClose,
  boardTitle,
  totalRankedCount,
  tiers,
  unranked,
  templateId,
  projectId,
  publishedShareId,
  onPublishSuccess,
}: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"link" | "embed">("link");
  const [shareId, setShareId] = useState<string | null>(publishedShareId || null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [authorName, setAuthorName] = useState("");
  const [pendingShareId, setPendingShareId] = useState<string>("");

  useEffect(() => {
    if (!isOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isPublishing) onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isOpen, isPublishing, onClose]);

  const isPublishingRef = useRef(false);
  const activeProjectIdRef = useRef<string | undefined>(projectId);

  // Switching projects resets modal state to the selected project
  // Do not retain another project's shareId when the new project's publishedShareId is empty!
  useEffect(() => {
    const projectChanged = activeProjectIdRef.current !== projectId;
    activeProjectIdRef.current = projectId;

    queueMicrotask(() => {
      setShareId(publishedShareId || null);
      setPublishError(null);
      if (projectChanged) {
        setIsPublishing(false);
        isPublishingRef.current = false;
      }

      if (publishedShareId) {
        setPendingShareId(publishedShareId);
      } else if (projectId) {
        const savedPending = getProjectPendingShareId(projectId);
        if (savedPending) {
          setPendingShareId(savedPending);
        } else {
          const freshPending = `share-${createId("tier")}`;
          setPendingShareId(freshPending);
          try {
            saveProjectPendingShareId(projectId, freshPending);
          } catch {
            // Will be enforced and surfaced when the user initiates publication
          }
        }
      } else {
        setPendingShareId(`share-${createId("tier")}`);
      }
    });
  }, [projectId, publishedShareId]);

  // Load saved creator handle from localStorage on mount
  useEffect(() => {
    queueMicrotask(() => {
      if (typeof window !== "undefined") {
        try {
          const savedHandle = localStorage.getItem("tl_commenter_name") || "";
          if (savedHandle) setAuthorName(savedHandle);
        } catch {}
      }
    });
  }, []);

  const executePublish = async (handle: string) => {
    if (!tiers || isPublishingRef.current) return; // Synchronous in-flight guard
    if (totalRankedCount === 0) {
      setPublishError("Place at least one item in a tier before publishing.");
      return;
    }
    isPublishingRef.current = true;
    setIsPublishing(true);
    setPublishError(null);

    const publishProjectId = projectId;
    const cleanHandle = handle.trim();
    if (cleanHandle && typeof window !== "undefined") {
      try {
        localStorage.setItem("tl_commenter_name", cleanHandle);
      } catch {}
    }

    // Reuse confirmed shareId if updating, or reuse persistent pendingShareId if first-time publish
    const targetId = shareId || pendingShareId || `share-${createId("tier")}`;
    if (!pendingShareId) {
      setPendingShareId(targetId);
    }

    // 1. Persist pending identity BEFORE any publication write; abort if persistence fails
    if (!shareId) {
      try {
        saveProjectPendingShareId(publishProjectId || "default", targetId);
      } catch (storageErr: unknown) {
        if (activeProjectIdRef.current === publishProjectId) {
          const msg = storageErr instanceof Error ? storageErr.message : String(storageErr);
          setPublishError(
            `Pending share storage failed: ${msg || "Storage error"}. Publication aborted so recovery identity is not lost.`
          );
          setIsPublishing(false);
        }
        isPublishingRef.current = false;
        return;
      }
    }

    try {
      const pub = await publishTierList({
        templateId,
        title: boardTitle,
        authorName: cleanHandle || "Anonymous Ranker",
        tiers,
        unranked: unranked || [],
        existingId: targetId,
      });

      // Keep pendingShareId synced to the confirmed cloud ID until local confirmation save succeeds
      if (activeProjectIdRef.current === publishProjectId) {
        setPendingShareId(pub.id);
      }
      if (!shareId) {
        try {
          saveProjectPendingShareId(publishProjectId || "default", pub.id);
        } catch {}
      }

      // 2. Persist confirmed share ID locally BEFORE clearing recovery data
      if (onPublishSuccess) {
        try {
          await onPublishSuccess(pub.id, publishProjectId);
        } catch (localSaveErr: unknown) {
          if (activeProjectIdRef.current === publishProjectId) {
            const msg = localSaveErr instanceof Error ? localSaveErr.message : String(localSaveErr);
            setPublishError(
              `Cloud publication succeeded (${pub.id}), but saving confirmation locally failed: ${msg || "Local storage error"}. Your pending publication ID is preserved for recovery — click Retry to complete local saving against the same cloud record.`
            );
          }
          return;
        }
      }

      // 3. Remove pending mapping strictly after confirmed cloud + local persistence
      if (publishProjectId) {
        try {
          clearProjectPendingShareId(publishProjectId);
        } catch (cleanupErr: unknown) {
          if (activeProjectIdRef.current === publishProjectId) {
            setShareId(pub.id);
            const msg = cleanupErr instanceof Error ? cleanupErr.message : String(cleanupErr);
            setPublishError(
              `Published and saved locally (${pub.id}), but failed to clear pending recovery key: ${msg || "Storage cleanup error"}.`
            );
          }
          return;
        }
      }

      if (activeProjectIdRef.current === publishProjectId) {
        setShareId(pub.id);
      }
    } catch (err: unknown) {
      console.error("Publish failed:", err);
      if (activeProjectIdRef.current === publishProjectId) {
        const msg = err instanceof Error ? err.message : String(err);
        setPublishError(msg || "Failed to publish tier list to cloud.");
      }
    } finally {
      isPublishingRef.current = false;
      if (activeProjectIdRef.current === publishProjectId) {
        setIsPublishing(false);
      }
    }
  };

  const dialogRef = useDialogFocus(isOpen);

  if (!isOpen) return null;

  const origin = typeof window !== "undefined" ? window.location.origin : "https://tierlistmaker.app";
  const shareUrl = shareId ? `${origin}/share/${shareId}` : "";
  const embedUrl = `${origin}/embed/${shareId || templateId || "demo"}`;
  const embedCode = `<iframe src="${embedUrl}" width="100%" height="520" style="border:0;border-radius:16px;overflow:hidden;" loading="lazy"></iframe>\n<p style="font-size:12px;margin-top:6px;">Interactive ranking powered by <a href="${origin}" target="_blank" rel="noopener">Tier List Maker</a> — <a href="${shareUrl || origin}" target="_blank" rel="noopener">Remix or duel this tier list</a>.</p>`;

  const handleCopyLink = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyEmbed = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tweetText = encodeURIComponent(
    `Check out my "${boardTitle}" tier list ranking on Tier List Maker! 🏆\n\n${shareUrl}`
  );

  return (
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Share and publish ranking" tabIndex={-1} className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-indigo-400" />
            <h3 className="text-lg font-bold text-white">Share Your Tier List</h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 cursor-pointer min-w-[28px] min-h-[28px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Board Summary Pill */}
        <div className="p-3 rounded-xl bg-zinc-800/60 border border-zinc-700/80 mb-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white truncate max-w-[240px]">{boardTitle}</span>
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
              {shareId ? "Public Link" : "Unpublished Draft"}
            </span>
          </div>
          <span className="text-[11px] text-zinc-400 block mt-0.5">
            {totalRankedCount} items placed • {shareId ? "Anyone with the link can view and remix" : "Publish to get a permanent cloud link"}
          </span>
        </div>

        {/* Creator Handle Input */}
        <div className="mb-4 bg-zinc-800/40 border border-zinc-750/80 rounded-xl p-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold text-zinc-300">Creator Handle</span>
            <span className="text-[10px] text-zinc-500">Shows on public ranking</span>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="Your handle (e.g. PixelHero)"
              disabled={isPublishing}
              className="flex-1 bg-zinc-900/90 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => executePublish(authorName)}
              disabled={isPublishing}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors flex items-center gap-1 flex-shrink-0 cursor-pointer disabled:opacity-50 shadow-sm"
            >
              {shareId ? "Update" : "Publish"}
            </button>
          </div>
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
            <p className="text-xs text-zinc-400">Publishing ranking to the cloud...</p>
          </div>
        ) : publishError ? (
          <div className="py-6 text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/30">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-rose-300">Cloud Publishing Failed</p>
              <p className="text-[11px] text-zinc-400 max-w-xs mx-auto break-words">{publishError}</p>
            </div>
            <button
              onClick={() => executePublish(authorName)}
              disabled={isPublishing}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Publish</span>
            </button>
          </div>
        ) : !shareId ? (
          <div className="py-6 text-center space-y-3 bg-zinc-800/30 border border-zinc-800 rounded-xl p-4">
            <div className="w-10 h-10 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto border border-indigo-500/20">
              <Share2 className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-white">Publish to Generate Public Link</h4>
              <p className="text-[11px] text-zinc-400 max-w-xs mx-auto">
                {totalRankedCount === 0 ? "Place at least one item in a tier before publishing." : "Publish your ranking to generate a public link and embed snippet."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => executePublish(authorName)}
              disabled={isPublishing}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition-all cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Publish Ranking to Cloud</span>
            </button>
          </div>
        ) : activeTab === "link" ? (
          <div className="space-y-4">
            {/* Copy Link Input */}
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                placeholder="Publishing..."
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-300 select-all focus:outline-none"
              />
              <button
                onClick={handleCopyLink}
                disabled={!shareId}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 transition-colors cursor-pointer flex-shrink-0 shadow-md shadow-indigo-600/20 disabled:opacity-50"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? "Copied!" : "Copy"}</span>
              </button>
            </div>

            {/* Social Share Buttons */}
            {shareId && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <a
                  href={`https://twitter.com/intent/tweet?text=${tweetText}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-xl border border-zinc-800 bg-zinc-800/40 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 24.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                  <span>Post on X</span>
                </a>
                <a
                  href={`https://reddit.com/submit?url=${encodeURIComponent(
                    shareUrl
                  )}&title=${encodeURIComponent(boardTitle)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-xl border border-zinc-800 bg-zinc-800/40 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5 fill-current text-orange-500" viewBox="0 0 24 24">
                    <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.56 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.688-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.197-2.512-.73a.326.326 0 0 0-.232-.095z" />
                  </svg>
                  <span>Reddit</span>
                </a>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-[11px] text-zinc-400">
              Paste this responsive HTML snippet into Substack, WordPress, Medium, or your blog:
            </p>
            <div className="relative">
              <textarea
                readOnly
                rows={4}
                value={embedCode}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 font-mono text-[11px] text-zinc-300 resize-none select-all focus:outline-none"
              />
            </div>
            <button
              onClick={handleCopyEmbed}
              className="w-full py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-indigo-600/20"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? "Embed Code Copied!" : "Copy Embed Code"}</span>
            </button>
          </div>
        )}

        <div className="mt-5 pt-4 border-t border-zinc-800 flex justify-between items-center text-xs text-zinc-400">
          <span>{shareId ? "Permanent cloud ranking" : "Pending cloud publish"}</span>
          {shareId && (
            <Link
              href={`/share/${shareId}`}
              target="_blank"
              className="hover:text-white flex items-center gap-1 text-indigo-400 hover:underline"
            >
              <span>Preview Page</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
