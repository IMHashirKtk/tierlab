"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, Upload, Check, Loader2, Sparkles, Plus, Image as ImageIcon, Globe, AlertCircle, RefreshCw, Trash2 } from "lucide-react";
import { publishTemplate, generateTemplateSlug } from "@/lib/community";
import { compressBatchImages } from "@/utils/image-compression";
import { uploadItemsToCloud } from "@/lib/upload";
import { WebImageSearchModal } from "@/components/WebImageSearchModal";
import {
  saveTemplateDraft,
  loadTemplateDraft,
  deleteTemplateDraft,
} from "@/lib/draft-storage";
import type { Item } from "@/types";

interface PublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  draftId?: string;
}

export function PublishModal({ isOpen, onClose, draftId = "default" }: PublishModalProps) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("gaming");
  const [description, setDescription] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [textInput, setTextInput] = useState("");
  const [isCompressing, setIsCompressing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStep, setSubmitStep] = useState<string | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [createdTemplateId, setCreatedTemplateId] = useState<string | null>(null);
  const [isWebSearchOpen, setIsWebSearchOpen] = useState(false);

  const isSubmittingRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load saved draft on mount, when modal opens, or when draftId changes
  useEffect(() => {
    if (!isOpen) return;
    const saved = loadTemplateDraft(draftId);
    if (saved) {
      if (saved.pendingId) setPendingId(saved.pendingId);
      if (saved.title !== undefined) setTitle(saved.title);
      if (saved.category !== undefined) setCategory(saved.category);
      if (saved.description !== undefined) setDescription(saved.description);
      if (saved.authorName !== undefined) setAuthorName(saved.authorName);
      if (saved.items !== undefined) setItems(saved.items);
    }
  }, [isOpen, draftId]);

  // Handle Escape key to close without discarding
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Autosave draft to storage whenever fields change (preserving draft across reloads and closures)
  useEffect(() => {
    if (!isOpen) return;
    if (!createdTemplateId && (title || items.length > 0)) {
      const stablePendingId = pendingId || generateTemplateSlug(title || "template");
      if (!pendingId) setPendingId(stablePendingId);

      saveTemplateDraft(
        {
          draftId,
          pendingId: stablePendingId,
          title,
          category,
          description,
          authorName,
          items,
          updatedAt: Date.now(),
        },
        draftId
      ).catch((err) => {
        console.warn("Autosave draft warning:", err);
      });
    }
  }, [isOpen, draftId, pendingId, title, category, description, authorName, items, createdTemplateId]);

  if (!isOpen) return null;

  const handleImageFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsCompressing(true);
    try {
      const compressed = await compressBatchImages(files);
      const newItems: Item[] = compressed.map((c) => ({
        id: c.id,
        name: c.name,
        imageUrl: c.dataUrl,
      }));
      setItems((prev) => [...prev, ...newItems]);
    } catch (err) {
      console.error("Image compression error", err);
    } finally {
      setIsCompressing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleAddTextItems = () => {
    if (!textInput.trim()) return;
    const splitNames = textInput
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    const newItems: Item[] = splitNames.map((name, idx) => ({
      id: `item-txt-${Date.now()}-${idx}`,
      name,
    }));

    setItems((prev) => [...prev, ...newItems]);
    setTextInput("");
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  // Explicit Discard action: removes draft from storage and resets state
  const handleDiscardDraft = () => {
    deleteTemplateDraft(draftId);
    setTitle("");
    setCategory("gaming");
    setDescription("");
    setAuthorName("");
    setItems([]);
    setPendingId(generateTemplateSlug("template"));
    setCreatedTemplateId(null);
    setPublishError(null);
    setIsWebSearchOpen(false);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (isSubmittingRef.current) return; // Synchronous in-flight guard

    if (items.length < 2) {
      setPublishError("Please add at least 2 items to publish a template.");
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setPublishError(null);

    const currentPendingId = pendingId || generateTemplateSlug(title || "template");
    if (!pendingId) setPendingId(currentPendingId);

    // 1. Await persistence before sending network request
    try {
      await saveTemplateDraft(
        {
          draftId,
          pendingId: currentPendingId,
          title,
          category,
          description,
          authorName,
          items,
          updatedAt: Date.now(),
        },
        draftId
      );
    } catch (storageErr: any) {
      console.error("Failed to persist draft before publishing", storageErr);
      setPublishError(
        `Draft storage failed: ${storageErr?.message || "Storage error"}. Draft was not safely saved; publication aborted.`
      );
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      return;
    }

    try {
      // 2. Upload compressed items to Cloudflare R2
      setSubmitStep("Hosting items on Cloudflare R2 CDN...");
      const cloudItems = await uploadItemsToCloud(items, (msg) => setSubmitStep(msg));

      // Update state and draft with persistent URLs so retries don't re-upload
      setItems(cloudItems);
      await saveTemplateDraft(
        {
          draftId,
          pendingId: currentPendingId,
          title,
          category,
          description,
          authorName,
          items: cloudItems,
          updatedAt: Date.now(),
        },
        draftId
      );

      // 3. Publish template with CDN URLs and persistent pending ID
      setSubmitStep("Publishing template to community...");
      const created = await publishTemplate({
        title,
        category,
        description,
        items: cloudItems,
        authorName: authorName.trim() || undefined,
        existingId: currentPendingId,
      });

      setCreatedTemplateId(created.id);
      // Cleared only upon confirmed cloud publish
      deleteTemplateDraft(draftId);
    } catch (err: any) {
      console.error("Failed to publish template", err);
      setPublishError(err?.message || "Error publishing template. Please try again.");
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      setSubmitStep(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <h3 className="text-lg font-bold text-white">Publish Community Template</h3>
          </div>
          {/* Normal Close / X button preserves draft */}
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer min-w-[28px] min-h-[28px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {createdTemplateId ? (
          <div className="py-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
              <Check className="w-7 h-7" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-white">Template Published Successfully!</h4>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto mt-1">
                Your template &ldquo;{title}&rdquo; with {items.length} items is now live. You can rank it immediately.
              </p>
            </div>
            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 bg-zinc-800 hover:bg-zinc-750 cursor-pointer min-h-[32px]"
              >
                Close
              </button>
              <button
                onClick={() => {
                  onClose();
                  router.push(`/template/${createdTemplateId}`);
                }}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 cursor-pointer flex items-center gap-1.5 min-h-[32px]"
              >
                <span>Rank This Template Now &rarr;</span>
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {publishError && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between gap-3 animate-in fade-in">
                <div className="flex items-center gap-2 min-w-0">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                  <span className="break-words">{publishError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleSubmit()}
                  disabled={isSubmitting}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-[11px] flex-shrink-0 cursor-pointer disabled:opacity-50 flex items-center gap-1 shadow-sm"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Retry Publish</span>
                </button>
              </div>
            )}

            <input
              type="file"
              ref={fileInputRef}
              multiple
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={handleImageFiles}
              className="hidden"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold uppercase text-zinc-300 mb-1">
                  Template Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Best Sci-Fi Movies of 2020s"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold uppercase text-zinc-300 mb-1">
                  Category *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="gaming">Gaming</option>
                  <option value="anime">Anime & Animation</option>
                  <option value="movies">Movies & TV</option>
                  <option value="food">Food & Drinks</option>
                  <option value="music">Music</option>
                  <option value="sports">Sports</option>
                  <option value="pop-culture">Pop Culture / Tech</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold uppercase text-zinc-300 mb-1">
                  Your Handle / Creator Name
                </label>
                <input
                  type="text"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder="e.g. PixelKnight"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold uppercase text-zinc-300 mb-1">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Short tagline or prompt"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Item Upload Area */}
            <div>
              <div className="flex flex-wrap justify-between items-center mb-1.5 gap-2">
                <label className="font-semibold uppercase text-zinc-300">
                  Template Items ({items.length} items added)
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsWebSearchOpen(true)}
                    className="min-h-[28px] px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 hover:text-indigo-300 border border-indigo-500/30 font-semibold cursor-pointer flex items-center gap-1.5 transition-colors"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>Search Web & Icons</span>
                  </button>
                  <span className="text-[11px] text-zinc-500">Min 2 items</span>
                </div>
              </div>

              {/* Upload Dropzone + Search Web Action */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="sm:col-span-2 border-2 border-dashed border-zinc-700 rounded-xl p-4 text-center hover:border-indigo-500 transition-colors cursor-pointer bg-zinc-800/40 flex flex-col items-center justify-center min-h-[90px]"
                >
                  {isCompressing ? (
                    <div className="flex items-center justify-center gap-2 py-2 text-indigo-400">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Compressing image thumbnails into WebP...</span>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-5 h-5 text-zinc-500 mx-auto mb-1" />
                      <p className="text-zinc-300 font-medium">Click to upload local images</p>
                      <p className="text-[10px] text-zinc-500 mt-0.5">
                        PNG, JPEG, WebP • Auto-compressed
                      </p>
                    </>
                  )}
                </div>

                <div
                  onClick={() => setIsWebSearchOpen(true)}
                  className="border-2 border-dashed border-indigo-500/40 hover:border-indigo-500 bg-indigo-600/10 hover:bg-indigo-600/20 rounded-xl p-4 text-center transition-colors cursor-pointer flex flex-col items-center justify-center min-h-[90px]"
                >
                  <Globe className="w-5 h-5 text-indigo-400 mx-auto mb-1" />
                  <p className="text-indigo-300 font-semibold">Web Search</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">Wikipedia, Anime & Music</p>
                </div>
              </div>

              {/* Quick Text Items Input */}
              <div className="mt-2.5 p-3 rounded-xl bg-zinc-800/60 border border-zinc-750 space-y-2">
                <span className="text-[11px] font-semibold text-zinc-400 block">
                  Or quickly add text items (comma or newline separated):
                </span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddTextItems();
                      }
                    }}
                    placeholder="e.g. Iron Man, Thor, Hulk, Captain America"
                    className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddTextItems}
                    className="min-h-[28px] px-3 py-1.5 rounded-lg bg-zinc-750 hover:bg-zinc-700 text-zinc-200 font-semibold cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </div>
              </div>

              {/* Items Thumbnails / Chips Preview */}
              {items.length > 0 && (
                <div className="mt-3 max-h-40 overflow-y-auto p-2 bg-zinc-950/60 rounded-xl border border-zinc-800 flex flex-wrap gap-2">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="group relative flex items-center gap-1.5 bg-zinc-800 border border-zinc-700 rounded-lg pl-2 pr-1 py-1 text-[11px] text-zinc-200"
                    >
                      {item.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-5 h-5 rounded object-cover"
                        />
                      ) : (
                        <ImageIcon className="w-3.5 h-3.5 text-zinc-500" />
                      )}
                      <span className="truncate max-w-[120px]">{item.name}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="w-4 h-4 rounded-full text-zinc-400 hover:text-red-400 hover:bg-zinc-700 flex items-center justify-center cursor-pointer ml-1"
                        title="Remove item"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-wrap justify-between items-center gap-2 pt-2 border-t border-zinc-800">
              {/* Explicit Discard Draft Action */}
              <button
                type="button"
                onClick={handleDiscardDraft}
                className="min-h-[32px] px-3 py-1.5 rounded-xl text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Discard Draft</span>
              </button>

              <div className="flex items-center gap-2 ml-auto">
                {/* Normal Close preserves draft */}
                <button
                  type="button"
                  onClick={onClose}
                  className="min-h-[32px] px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-750 transition-colors cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || items.length < 2}
                  className="min-h-[32px] px-5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center gap-2 shadow-md shadow-indigo-600/30"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>{submitStep || "Publishing..."}</span>
                    </>
                  ) : (
                    <span>Publish Template</span>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}

        <WebImageSearchModal
          isOpen={isWebSearchOpen}
          onClose={() => setIsWebSearchOpen(false)}
          onAddItems={(newItems) => setItems((prev) => [...prev, ...newItems])}
        />
      </div>
    </div>
  );
}
