"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { MessageSquare, ThumbsUp, Send, Sparkles, Flame, Clock, Award, AlertCircle, RefreshCw } from "lucide-react";
import { fetchComments, postComment, toggleCommentUpvote, hasUpvotedComment } from "@/lib/community";
import { supabase, ensureAuthenticatedSession } from "@/lib/supabase";
import { createId } from "@/lib/board";
import {
  loadPendingCommentDraft,
  savePendingCommentDraft,
  clearPendingCommentDraft,
} from "@/lib/draft-storage";
import type { Comment } from "@/types";

interface CommentsSectionProps {
  tierListId: string;
  creatorName: string;
}

const QUICK_TAKES = [
  "🔥 S-tier is 100% accurate",
  "💀 Your B-tier placement is criminal",
  "👏 Finally some proper respect for these picks",
  "🧑‍🍳 Bro cooked with this tier list",
  "🤔 Swap A and C tier and it's perfect",
];

const COMMENTER_NAME_KEY = "tl_commenter_name";

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function getAvatarGradient(name: string): string {
  const gradients = [
    "from-indigo-500 to-purple-600",
    "from-rose-500 to-orange-500",
    "from-emerald-500 to-teal-600",
    "from-blue-500 to-cyan-500",
    "from-amber-500 to-yellow-600",
    "from-pink-500 to-rose-600",
  ];
  let sum = 0;
  for (let i = 0; i < name.length; i++) {
    sum += name.charCodeAt(i);
  }
  return gradients[sum % gradients.length];
}

export function CommentsSection({ tierListId, creatorName }: CommentsSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState<boolean>(false);
  const [authorName, setAuthorName] = useState("");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [pendingCommentId, setPendingCommentId] = useState<string>("");
  const [sortBy, setSortBy] = useState<"newest" | "top">("newest");
  const [upvotedMap, setUpvotedMap] = useState<Record<string, boolean>>({});

  const isSubmittingRef = useRef(false);
  const sessionIdRef = useRef<string | null>(null);
  const hydrationSeqRef = useRef<number>(0);
  const hasUserEditedInSessionRef = useRef<boolean>(false);

  // Restore pending attempt and session identity after mount/reload, and listen for auth changes
  useEffect(() => {
    let isMounted = true;
    queueMicrotask(() => {
      setIsHydrated(false);
    });
    hasUserEditedInSessionRef.current = false;

    const hydrateSessionDraft = async (
      nextUserId: string | null,
      seq: number,
      isAuthSwitch = false
    ) => {
      if (!isMounted || hydrationSeqRef.current !== seq) return;

      if (typeof window !== "undefined" && !isAuthSwitch) {
        try {
          const savedName = localStorage.getItem(COMMENTER_NAME_KEY);
          if (savedName && !hasUserEditedInSessionRef.current) {
            setAuthorName(savedName);
          }
        } catch {}
      }

      if (!nextUserId) {
        sessionIdRef.current = null;
        setSessionId(null);
        if (!hasUserEditedInSessionRef.current) {
          setPendingCommentId((prev) => prev || `cmt-${createId("c")}`);
        }
        setIsHydrated(true);
        return;
      }

      const previousUserId = sessionIdRef.current;
      const switchedIdentity = Boolean(previousUserId && previousUserId !== nextUserId);

      sessionIdRef.current = nextUserId;
      setSessionId(nextUserId);

      const savedDraft = loadPendingCommentDraft(tierListId, nextUserId);

      if (switchedIdentity) {
        // Preserve User A's draft in localStorage under User A's key;
        // do not carry User A's pending text or ID into User B's composer.
        hasUserEditedInSessionRef.current = false;
        setCommentError(null);
        if (savedDraft) {
          setContent(savedDraft.content || "");
          if (savedDraft.authorName) setAuthorName(savedDraft.authorName);
          setPendingCommentId(savedDraft.pendingId || `cmt-${createId("c")}`);
        } else {
          setContent("");
          setPendingCommentId(`cmt-${createId("c")}`);
        }
      } else if (!hasUserEditedInSessionRef.current) {
        if (savedDraft) {
          if (savedDraft.content) setContent(savedDraft.content);
          if (savedDraft.authorName) setAuthorName(savedDraft.authorName);
          setPendingCommentId(savedDraft.pendingId || `cmt-${createId("c")}`);
        } else {
          setPendingCommentId((prev) => prev || `cmt-${createId("c")}`);
        }
      } else if (savedDraft?.pendingId) {
        // User typed while hydration was delayed; preserve user's newer text and adopt stored pendingId if unset
        setPendingCommentId((prev) => prev || savedDraft.pendingId);
      }

      setIsHydrated(true);
    };

    const initialSeq = ++hydrationSeqRef.current;
    ensureAuthenticatedSession()
      .then((userId) => hydrateSessionDraft(userId, initialSeq, false))
      .catch(() => hydrateSessionDraft(null, initialSeq, false));

    const authListener = supabase?.auth?.onAuthStateChange?.((_event: string, session: { user?: { id?: string | null } } | null) => {
      if (!isMounted) return;
      const newUserId = session?.user?.id || null;
      if (newUserId && newUserId !== sessionIdRef.current) {
        const switchSeq = ++hydrationSeqRef.current;
        hydrateSessionDraft(newUserId, switchSeq, true);
      }
    });

    const handleCustomAuthChange = async (e: Event) => {
      if (!isMounted) return;
      const detailId = (e as CustomEvent)?.detail?.userId;
      const resolvedId = detailId !== undefined ? detailId : await ensureAuthenticatedSession();
      if (resolvedId && resolvedId !== sessionIdRef.current) {
        const switchSeq = ++hydrationSeqRef.current;
        hydrateSessionDraft(resolvedId, switchSeq, true);
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("tl-auth-state-change", handleCustomAuthChange);
    }

    return () => {
      isMounted = false;
      authListener?.data?.subscription?.unsubscribe?.();
      if (typeof window !== "undefined") {
        window.removeEventListener("tl-auth-state-change", handleCustomAuthChange);
      }
    };
  }, [tierListId]);

  // Persist pending draft scoped to target tier list and authenticated identity AFTER hydration completes
  useEffect(() => {
    if (!isHydrated || !content.trim() || !sessionId) return;
    const activePendingId = pendingCommentId || `cmt-${createId("c")}`;
    if (!pendingCommentId) {
      queueMicrotask(() => {
        setPendingCommentId((prev) => prev || activePendingId);
      });
    }
    try {
      savePendingCommentDraft({
        pendingId: activePendingId,
        tierListId,
        authorName: authorName.trim() || "Anonymous Ranker",
        content,
        sessionUserId: sessionId,
        updatedAt: Date.now(),
      });
    } catch (err) {
      // Storage errors are strictly enforced and displayed when submitting
      console.warn("Pending comment autosave warning:", err);
    }
  }, [isHydrated, content, authorName, pendingCommentId, tierListId, sessionId]);

  // Fetch comments for this tier list
  useEffect(() => {
    if (!tierListId) return;
    let isCancelled = false;
    fetchComments(tierListId).then((data) => {
      if (!isCancelled) {
        setComments(data);
        const statusMap: Record<string, boolean> = {};
        data.forEach((c) => {
          statusMap[c.id] = hasUpvotedComment(c.id);
        });
        setUpvotedMap(statusMap);
        setLoading(false);
      }
    });
    return () => {
      isCancelled = true;
    };
  }, [tierListId]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmedContent = content.trim();
    if (!isHydrated || !trimmedContent || isSubmittingRef.current) return; // Synchronous in-flight & hydration guard

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setCommentError(null);

    // 1. Resolve the active authenticated identity BEFORE saving or submitting
    let activeUserId: string | null = null;
    try {
      activeUserId = await ensureAuthenticatedSession();
    } catch {}

    if (!activeUserId) {
      setCommentError("Authentication required: A verified user session is required to post comments.");
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      return;
    }

    // If the active authenticated session changed from User A to User B before submission,
    // never automatically submit User A's pending attempt as User B!
    if (sessionIdRef.current && sessionIdRef.current !== activeUserId) {
      sessionIdRef.current = activeUserId;
      setSessionId(activeUserId);
      hasUserEditedInSessionRef.current = false;
      const userBDraft = loadPendingCommentDraft(tierListId, activeUserId);
      if (userBDraft) {
        setContent(userBDraft.content || "");
        if (userBDraft.authorName) setAuthorName(userBDraft.authorName);
        setPendingCommentId(userBDraft.pendingId || `cmt-${createId("c")}`);
      } else {
        setContent("");
        setPendingCommentId(`cmt-${createId("c")}`);
      }
      setCommentError(
        "Your active session changed before submission. Loaded the current session's draft instead of submitting the previous user's pending comment."
      );
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      return;
    }

    sessionIdRef.current = activeUserId;
    setSessionId(activeUserId);

    const trimmedAuthor = authorName.trim() || "Anonymous Ranker";
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(COMMENTER_NAME_KEY, trimmedAuthor);
      } catch {}
    }

    const targetCommentId = pendingCommentId || `cmt-${createId("c")}`;
    if (!pendingCommentId) setPendingCommentId(targetCommentId);

    // 2. Save pending comment attempt before sending request; abort if persistence fails
    try {
      savePendingCommentDraft({
        pendingId: targetCommentId,
        tierListId,
        authorName: trimmedAuthor,
        content: trimmedContent,
        sessionUserId: activeUserId,
        updatedAt: Date.now(),
      });
    } catch (storageErr: unknown) {
      const msg = storageErr instanceof Error ? storageErr.message : String(storageErr);
      setCommentError(
        `Pending comment storage failed: ${msg || "Storage error"}. Submission aborted so your comment is not lost.`
      );
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      return;
    }

    try {
      const newComment = await postComment({
        tierListId,
        authorName: trimmedAuthor,
        content: trimmedContent,
        existingId: targetCommentId,
      });

      // Deduplicate displayed comments by ID after retry recovery
      setComments((prev) => {
        const exists = prev.some((c) => c.id === newComment.id);
        if (exists) {
          return prev.map((c) => (c.id === newComment.id ? newComment : c));
        }
        return [newComment, ...prev];
      });

      // Clear pending attempt only after confirmed success
      try {
        clearPendingCommentDraft(tierListId, activeUserId);
      } catch (cleanupErr: unknown) {
        console.warn("Failed to clear pending comment draft:", cleanupErr);
      }

      hasUserEditedInSessionRef.current = false;
      setContent("");
      // Fresh ID strictly for the NEXT new comment
      setPendingCommentId(`cmt-${createId("c")}`);
    } catch (err: unknown) {
      console.error("Failed to post comment", err);
      // Keep user's text and pendingCommentId intact on error/conflict
      const msg = err instanceof Error ? err.message : String(err);
      setCommentError(msg || "Failed to post comment. Please try again.");
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleToggleUpvote = async (commentId: string) => {
    const isCurrentlyUpvoted = Boolean(upvotedMap[commentId]);
    // Optimistic UI update
    setUpvotedMap((prev) => ({ ...prev, [commentId]: !isCurrentlyUpvoted }));
    setComments((prev) =>
      prev.map((c) =>
        c.id === commentId
          ? {
              ...c,
              upvotes: Math.max(0, c.upvotes + (isCurrentlyUpvoted ? -1 : 1)),
            }
          : c
      )
    );

    await toggleCommentUpvote(commentId);
  };

  const handleInsertQuickTake = (chip: string) => {
    hasUserEditedInSessionRef.current = true;
    setContent((prev) => (prev ? `${prev} ${chip}` : chip));
  };

  const sortedComments = [...comments].sort((a, b) => {
    if (sortBy === "top") return b.upvotes - a.upvotes;
    return b.createdAt - a.createdAt;
  });

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>Community Takes & Discussion</span>
              <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 text-xs font-semibold">
                {comments.length}
              </span>
            </h3>
            <p className="text-xs text-zinc-400">
              Debate the tiers, voice your hot takes, or give props to the creator.
            </p>
          </div>
        </div>

        {/* Sort Filter */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto bg-zinc-900 border border-zinc-800 rounded-xl p-1 text-xs">
          <button
            onClick={() => setSortBy("newest")}
            className={`px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
              sortBy === "newest"
                ? "bg-zinc-800 text-white shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Newest
          </button>
          <button
            onClick={() => setSortBy("top")}
            className={`px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
              sortBy === "top"
                ? "bg-zinc-800 text-white shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Top Upvoted
          </button>
        </div>
      </div>

      {/* Comment Form Composer */}
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl bg-zinc-900/80 border border-zinc-800/90 p-4 sm:p-5 space-y-3.5 shadow-lg"
      >
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={authorName}
            onChange={(e) => {
              hasUserEditedInSessionRef.current = true;
              setAuthorName(e.target.value);
            }}
            placeholder="Your name or handle (e.g. PixelHero)"
            maxLength={40}
            className="sm:w-64 px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30"
          />
          <div className="flex-1 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1 mr-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>Quick Takes:</span>
            </span>
            {QUICK_TAKES.slice(0, 3).map((take, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleInsertQuickTake(take)}
                className="px-2.5 py-1 rounded-lg bg-zinc-800/70 hover:bg-zinc-800 border border-zinc-750 text-[11px] text-zinc-300 hover:text-white transition-colors cursor-pointer"
              >
                {take}
              </button>
            ))}
          </div>
        </div>

        <div className="relative">
          <textarea
            value={content}
            onChange={(e) => {
              hasUserEditedInSessionRef.current = true;
              setContent(e.target.value);
            }}
            placeholder={`What do you think of @${creatorName}'s tier choices? Drop your take...`}
            rows={3}
            maxLength={500}
            required
            className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 resize-none"
          />
          <span className="absolute bottom-2.5 right-3 text-[10px] text-zinc-500">
            {content.length}/500
          </span>
        </div>

        {commentError && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-2 min-w-0">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
              <span className="break-words">{commentError}</span>
            </div>
            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={!isHydrated || isSubmitting}
              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-[11px] flex-shrink-0 cursor-pointer disabled:opacity-50 flex items-center gap-1 shadow-sm"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Retry</span>
            </button>
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
            <Flame className="w-3.5 h-3.5 text-orange-400" />
            <span>Keep debates fun and respectful</span>
          </div>

          <button
            type="submit"
            disabled={!isHydrated || isSubmitting || !content.trim()}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold shadow-md shadow-indigo-600/30 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isSubmitting ? "Posting..." : "Post Take"}</span>
          </button>
        </div>
      </form>

      {/* Comments Feed */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-8 text-center text-xs text-zinc-500">Loading comments...</div>
        ) : sortedComments.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-zinc-900/40 border border-dashed border-zinc-800 space-y-2">
            <MessageSquare className="w-8 h-8 text-zinc-600 mx-auto" />
            <p className="text-xs font-semibold text-zinc-300">No takes posted yet</p>
            <p className="text-[11px] text-zinc-500">Be the first to share your opinion on this ranking!</p>
          </div>
        ) : (
          sortedComments.map((comment) => {
            const isAuthor =
              comment.authorName.toLowerCase() === creatorName.toLowerCase();
            const isUpvoted = Boolean(upvotedMap[comment.id]);

            return (
              <div
                key={comment.id}
                className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700/80 transition-colors space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    {/* Gradient Avatar */}
                    <div
                      className={`w-7 h-7 rounded-full bg-gradient-to-tr ${getAvatarGradient(
                        comment.authorName
                      )} flex items-center justify-center font-bold text-white text-xs shadow-sm`}
                    >
                      {comment.authorName.charAt(0).toUpperCase()}
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        href={`/user/${encodeURIComponent(comment.authorName)}`}
                        className="text-xs font-bold text-zinc-200 hover:text-indigo-400 hover:underline transition-colors"
                      >
                        {comment.authorName}
                      </Link>
                      {isAuthor && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                          <Award className="w-2.5 h-2.5" />
                          <span>Creator</span>
                        </span>
                      )}
                      <span className="text-[11px] text-zinc-500 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        <span>{formatRelativeTime(comment.createdAt)}</span>
                      </span>
                    </div>
                  </div>

                  {/* Upvote Button */}
                  <button
                    onClick={() => handleToggleUpvote(comment.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
                      isUpvoted
                        ? "bg-indigo-600/20 text-indigo-300 border-indigo-500/40"
                        : "bg-zinc-800/80 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border-zinc-700/60"
                    }`}
                    title="Upvote comment"
                  >
                    <ThumbsUp
                      className={`w-3 h-3 ${isUpvoted ? "fill-indigo-400 text-indigo-400" : ""}`}
                    />
                    <span>{comment.upvotes}</span>
                  </button>
                </div>

                <p className="text-xs text-zinc-200 leading-relaxed pl-9">
                  {comment.content}
                </p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
