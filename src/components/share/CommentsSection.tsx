"use client";

import React, { useState, useEffect } from "react";
import { MessageSquare, ThumbsUp, Send, Sparkles, Flame, Clock, Award } from "lucide-react";
import { fetchComments, postComment, toggleCommentUpvote, hasUpvotedComment } from "@/lib/community";
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
  const [authorName, setAuthorName] = useState("");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sortBy, setSortBy] = useState<"newest" | "top">("newest");
  const [upvotedMap, setUpvotedMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedName = localStorage.getItem(COMMENTER_NAME_KEY);
      if (savedName) setAuthorName(savedName);
    }
  }, []);

  useEffect(() => {
    if (!tierListId) return;
    setLoading(true);
    fetchComments(tierListId).then((data) => {
      setComments(data);
      // Populate upvoted status
      const statusMap: Record<string, boolean> = {};
      data.forEach((c) => {
        statusMap[c.id] = hasUpvotedComment(c.id);
      });
      setUpvotedMap(statusMap);
      setLoading(false);
    });
  }, [tierListId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedContent = content.trim();
    if (!trimmedContent) return;

    const trimmedAuthor = authorName.trim() || "Anonymous Ranker";
    if (typeof window !== "undefined") {
      localStorage.setItem(COMMENTER_NAME_KEY, trimmedAuthor);
    }

    setIsSubmitting(true);
    try {
      const newComment = await postComment({
        tierListId,
        authorName: trimmedAuthor,
        content: trimmedContent,
      });

      setComments((prev) => [newComment, ...prev]);
      setContent("");
    } catch (err) {
      console.error("Failed to post comment", err);
    } finally {
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
            onChange={(e) => setAuthorName(e.target.value)}
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
            onChange={(e) => setContent(e.target.value)}
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

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
            <Flame className="w-3.5 h-3.5 text-orange-400" />
            <span>Keep debates fun and respectful</span>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !content.trim()}
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
                      <span className="text-xs font-bold text-zinc-200">
                        {comment.authorName}
                      </span>
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
