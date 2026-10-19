"use client";

import { WEB_IMAGE_SEARCH_ENABLED } from "@/lib/features";

import { ItemImage } from "@/components/ItemImage";
import { useDialogFocus } from "@/lib/use-dialog-focus";
import React, { useState, useEffect, useRef, useTransition, useCallback, useMemo } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
  pointerWithin,
  rectIntersection,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
  type CollisionDetection,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import {
  ArrowLeft,
  Download,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  Upload,
  X,
  ChevronUp,
  ChevronDown,
  Palette,
  Type,
  Share2,
  Globe,
  Undo2,
  Redo2,
  CheckCircle2,
  Loader2,
  BrainCircuit,
  Dices,
  Tv,
  Search,
  Wand2,
  ArrowDownAZ,
  Eraser,
  Shuffle,
  SlidersHorizontal,
  Film,
  ShieldCheck,
} from "lucide-react";
import type { TierRow, Item, Project, Template } from "@/types";
import { compressBatchImages } from "@/utils/image-compression";
import { usePwa } from "@/components/pwa/PwaProvider";

// Dynamically split heavy modals to keep core studio initial bundle ultra-light
const WebImageSearchModal = dynamic(
  () => import("@/components/WebImageSearchModal").then((mod) => mod.WebImageSearchModal),
  { ssr: false }
);
const ShareModal = dynamic(
  () => import("@/components/ShareModal").then((mod) => mod.ShareModal),
  { ssr: false }
);
const ConsensusComparisonModal = dynamic(
  () => import("@/components/studio/ConsensusComparisonModal").then((mod) => mod.ConsensusComparisonModal),
  { ssr: false }
);
const CreatorExportModal = dynamic(
  () => import("@/components/studio/CreatorExportModal").then((mod) => mod.CreatorExportModal),
  { ssr: false }
);
const VideoExportModal = dynamic(
  () => import("@/components/studio/VideoExportModal").then((mod) => mod.VideoExportModal),
  { ssr: false }
);
const BlindRankModal = dynamic(
  () => import("@/components/studio/BlindRankModal").then((mod) => mod.BlindRankModal),
  { ssr: false }
);
const PresentationModal = dynamic(
  () => import("@/components/studio/PresentationModal").then((mod) => mod.PresentationModal),
  { ssr: false }
);
const TierPresetsModal = dynamic(
  () => import("@/components/studio/TierPresetsModal").then((mod) => mod.TierPresetsModal),
  { ssr: false }
);
import type { TierPresetConfig } from "@/components/studio/TierPresetsModal";
import {
  UNRANKED,
  type Board,
  createId,
  newBlankProject,
  projectFromTemplate,
  findContainer,
  getItems,
  setItems,
  countRanked,
} from "@/lib/board";
import { getProject, saveProject } from "@/lib/storage";
import { fetchTemplateById } from "@/lib/community";
import { DropZone, ItemCard } from "@/components/studio/BoardDnd";

const COLOR_PRESETS = [
  { name: "Ruby Flame", class: "from-rose-500 to-red-600" },
  { name: "Golden Amber", class: "from-amber-500 to-orange-500" },
  { name: "Emerald Spring", class: "from-emerald-500 to-teal-600" },
  { name: "Cyber Cyan", class: "from-sky-500 to-blue-600" },
  { name: "Twilight Violet", class: "from-purple-500 to-indigo-600" },
  { name: "Hot Pink", class: "from-pink-500 to-rose-600" },
  { name: "Graphite", class: "from-zinc-600 to-zinc-800" },
];

interface StudioProps {
  initialProjectId?: string;
  initialTemplate?: Template;
}

export function Studio({ initialProjectId, initialTemplate }: StudioProps) {
  const { openPrivacyModal } = usePwa();
  const [projectId, setProjectId] = useState<string>(() => initialProjectId || createId("proj"));
  const [title, setTitle] = useState<string>(initialTemplate?.title || "Untitled Tier List");
  const [board, setBoard] = useState<Board>(() => {
    if (initialTemplate) {
      const p = projectFromTemplate(initialTemplate, createId("proj"));
      return { tiers: p.tiers, unranked: p.unranked };
    }
    const blank = newBlankProject(createId("proj"));
    return { tiers: blank.tiers, unranked: [] };
  });

  // History stack for Undo / Redo
  const [history, setHistory] = useState<Board[]>([]);
  const [future, setFuture] = useState<Board[]>([]);

  // Drag-and-drop state
  const [activeItem, setActiveItem] = useState<Item | null>(null);
  const [overContainerId, setOverContainerId] = useState<string | null>(null);

  // Persistence status
  const [saveStatus, setSaveStatus] = useState<"saving" | "saved" | "idle" | "error">("idle");
  const isInitialMount = useRef(true);

  // Studio UI states
  const [dropFxEnabled, setDropFxEnabled] = useState(true);
  const [isWebSearchOpen, setIsWebSearchOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<"image" | "video" | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isConsensusModalOpen, setIsConsensusModalOpen] = useState(false);
  const [isBlindModalOpen, setIsBlindModalOpen] = useState(false);
  const [isPresentationModalOpen, setIsPresentationModalOpen] = useState(false);
  const [isPresetsModalOpen, setIsPresetsModalOpen] = useState(false);
  const [isMobileToolsOpen, setIsMobileToolsOpen] = useState(false);
  const [unrankedSearch, setUnrankedSearch] = useState("");

  const toolsDialogRef = useDialogFocus(isMobileToolsOpen);
  const isStudioDialogOpen = isWebSearchOpen || isShareModalOpen || exportFormat !== null || isConsensusModalOpen || isBlindModalOpen || isPresentationModalOpen || isPresetsModalOpen || isMobileToolsOpen;

  // Loaded project metadata preservation
  const [loadedTemplateId, setLoadedTemplateId] = useState<string | undefined>(initialTemplate?.id);
  const [resolvedTemplate, setResolvedTemplate] = useState<Template | null>(initialTemplate || null);
  const [publishedShareId, setPublishedShareId] = useState<string | undefined>(undefined);
  const [projectCreatedAt, setProjectCreatedAt] = useState<number>(() => Date.now());
  const [isProjectHydrated, setIsProjectHydrated] = useState<boolean>(!initialProjectId);
  const activeProjectIdRef = useRef<string>(projectId);

  useEffect(() => {
    activeProjectIdRef.current = projectId;
  }, [projectId]);

  // Tap-to-rank quick selection state
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  // Compression & Upload State
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionProgress, setCompressionProgress] = useState({ done: 0, total: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Text Item Quick-Add
  const [newItemName, setNewItemName] = useState("");
  const [isAddingText, setIsAddingText] = useState(false);

  // Color picker popover
  const [activeColorPickerTierId, setActiveColorPickerTierId] = useState<string | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  // Configure touch and pointer sensors for mobile & desktop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Load existing project if initialProjectId provided
  useEffect(() => {
    if (!initialProjectId) {
      return;
    }
    let isCancelled = false;
    getProject(initialProjectId)
      .then((loaded) => {
        if (isCancelled) return;
        if (!loaded) {
          setIsProjectHydrated(true);
          return;
        }
        activeProjectIdRef.current = loaded.id;
        setProjectId(loaded.id);
        setTitle(loaded.title);
        setBoard({ tiers: loaded.tiers, unranked: loaded.unranked });
        if (loaded.templateId) {
          setLoadedTemplateId(loaded.templateId);
          if (!initialTemplate) {
            fetchTemplateById(loaded.templateId).then((t) => {
              if (!isCancelled && t) setResolvedTemplate(t);
            });
          }
        } else {
          setLoadedTemplateId(undefined);
          if (!initialTemplate) setResolvedTemplate(null);
        }
        setPublishedShareId(loaded.publishedShareId || undefined);
        setProjectCreatedAt(loaded.createdAt || Date.now());
        setHistory([]);
        setFuture([]);
        setSaveStatus("saved");
        setIsProjectHydrated(true);
      })
      .catch(() => {
        if (!isCancelled) setIsProjectHydrated(true);
      });
    return () => {
      isCancelled = true;
    };
  }, [initialProjectId, initialTemplate]);

  // Synchronize state when backup is restored or storage is cleared
  useEffect(() => {
    const handleSync = async () => {
      const p = await getProject(projectId);
      if (p) {
        setTitle(p.title);
        setBoard({ tiers: p.tiers, unranked: p.unranked });
        setLoadedTemplateId(p.templateId || undefined);
        setPublishedShareId(p.publishedShareId || undefined);
        if (p.createdAt) setProjectCreatedAt(p.createdAt);
      }
    };
    window.addEventListener("tierlistmaker-data-synced", handleSync);
    return () => window.removeEventListener("tierlistmaker-data-synced", handleSync);
  }, [projectId]);

  // Set template if passed for a fresh template project
  useEffect(() => {
    if (initialTemplate && !initialProjectId) {
      const p = projectFromTemplate(initialTemplate, activeProjectIdRef.current);
      setTitle(p.title);
      setBoard({ tiers: p.tiers, unranked: p.unranked });
      setLoadedTemplateId(initialTemplate.id);
      setResolvedTemplate(initialTemplate);
      setPublishedShareId(undefined);
      setHistory([]);
      setFuture([]);
    }
  }, [initialTemplate, initialProjectId]);

  // Debounced Auto-save to IndexedDB (skips while user is dragging or while project is hydrating)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (!isProjectHydrated || activeItem) return;

    const timer = setTimeout(() => {
      setSaveStatus("saving");
      const currentProject: Project = {
        id: projectId,
        title,
        tiers: board.tiers,
        unranked: board.unranked,
        templateId: loadedTemplateId || initialTemplate?.id,
        publishedShareId,
        createdAt: projectCreatedAt,
        updatedAt: Date.now(),
      };
      saveProject(currentProject)
        .then(() => setSaveStatus("saved"))
        .catch((err) => {
          console.error("Auto-save failed", err);
          setSaveStatus("error");
        });
    }, 600);

    return () => clearTimeout(timer);
  }, [board, title, projectId, initialTemplate, loadedTemplateId, publishedShareId, projectCreatedAt, activeItem, isProjectHydrated]);

  // Push board change to history (for Undo)
  const commitBoardChange = useCallback(
    (newBoard: Board | ((prev: Board) => Board)) => {
      setBoard((prev) => {
        const next = typeof newBoard === "function" ? newBoard(prev) : newBoard;
        setHistory((h) => [...h.slice(-20), prev]);
        setFuture([]);
        return next;
      });
    },
    []
  );

  const handleUndo = () => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setFuture((f) => [board, ...f]);
    setHistory((h) => h.slice(0, -1));
    setBoard(previous);
  };

  const handleRedo = () => {
    if (future.length === 0) return;
    const next = future[0];
    setHistory((h) => [...h, board]);
    setFuture((f) => f.slice(1));
    setBoard(next);
  };

  // Drop FX celebration (dynamically load confetti library on demand)
  const triggerDropFx = async (tierLabel: string) => {
    if (!dropFxEnabled || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const upper = tierLabel.trim().toUpperCase();
    if (upper === "S" || upper === "S+" || upper.includes("GOD")) {
      try {
        const confetti = (await import("canvas-confetti")).default;
        confetti({
          zIndex: 20,
          particleCount: 80,
          spread: 70,
          origin: { y: 0.5 },
          colors: ["#f43f5e", "#fbbf24", "#6366f1", "#10b981", "#ec4899"],
        });
      } catch {}
      if (boardRef.current) {
        boardRef.current.classList.add("translate-x-1");
        setTimeout(() => boardRef.current?.classList.remove("translate-x-1"), 80);
      }
    }
  };

  // Hotkey listener for Presentation Mode ('P')
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isStudioDialogOpen) return;
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.key === "p" || e.key === "P") {
        setIsPresentationModalOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isStudioDialogOpen]);

  // Composite collision strategy: direct pointerWithin for empty containers & items,
  // falling back to rectIntersection and closestCorners for smooth targeting
  const collisionDetectionStrategy: CollisionDetection = useCallback((args) => {
    const pointerCollisions = pointerWithin(args);
    if (pointerCollisions.length > 0) {
      return pointerCollisions;
    }
    const rectCollisions = rectIntersection(args);
    if (rectCollisions.length > 0) {
      return rectCollisions;
    }
    return closestCorners(args);
  }, []);

  // Drag and Drop Handlers
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const activeId = String(active.id);
    const container = findContainer(board, activeId);
    if (!container) return;

    const items = getItems(board, container);
    const item = items.find((i) => i.id === activeId) || null;
    setActiveItem(item);
    setOverContainerId(container);
  }, [board]);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event;
    if (!over) {
      setOverContainerId(null);
      return;
    }

    const overId = String(over.id);
    const targetContainer = findContainer(board, overId);
    if (targetContainer) {
      setOverContainerId(targetContainer);
    }
  }, [board]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveItem(null);
    setOverContainerId(null);

    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    const sourceContainer = findContainer(board, activeId);
    const targetContainer = findContainer(board, overId);

    if (!sourceContainer || !targetContainer) return;

    if (sourceContainer === targetContainer) {
      // Reorder within the same container
      const items = getItems(board, sourceContainer);
      const oldIndex = items.findIndex((i) => i.id === activeId);
      const newIndex = items.findIndex((i) => i.id === overId);

      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        const reordered = arrayMove(items, oldIndex, newIndex);
        commitBoardChange((prev) => setItems(prev, sourceContainer, reordered));
      }
    } else {
      // Move between containers (e.g. from unranked to tier, tier to unranked, or tier to tier)
      commitBoardChange((prev) => {
        const sourceItems = getItems(prev, sourceContainer);
        const targetItems = getItems(prev, targetContainer);

        const movingItem = sourceItems.find((i) => i.id === activeId);
        if (!movingItem) return prev;

        const overIndex = targetItems.findIndex((i) => i.id === overId);
        const newIndex = overIndex >= 0 ? overIndex : targetItems.length;

        const newSource = sourceItems.filter((i) => i.id !== activeId);
        const filteredTarget = targetItems.filter((i) => i.id !== activeId);
        const newTarget = [
          ...filteredTarget.slice(0, newIndex),
          movingItem,
          ...filteredTarget.slice(newIndex),
        ];

        let updated = setItems(prev, sourceContainer, newSource);
        updated = setItems(updated, targetContainer, newTarget);
        return updated;
      });

      // Trigger Drop FX celebration if dropped into S tier
      if (targetContainer !== UNRANKED) {
        const tier = board.tiers.find((t) => t.id === targetContainer);
        if (tier) triggerDropFx(tier.label);
      }
    }
  }, [board, commitBoardChange]);

  const handleDragCancel = useCallback(() => {
    setActiveItem(null);
    setOverContainerId(null);
  }, []);

  // Image Processing & WebP Compression (File Input, Drag-and-Drop, or Clipboard Paste)
  const processAndAddImages = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;

    setIsCompressing(true);
    setCompressionProgress({ done: 0, total: files.length });

    try {
      const compressed = await compressBatchImages(files, (done, total) => {
        setCompressionProgress({ done, total });
      });

      const newItems: Item[] = compressed.map((c) => ({
        id: c.id,
        name: c.name,
        imageUrl: c.dataUrl,
      }));

      commitBoardChange((prev) => ({
        ...prev,
        unranked: [...newItems, ...prev.unranked],
      }));
    } catch (err) {
      console.error("Image upload/compression failed", err);
    } finally {
      setIsCompressing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processAndAddImages(e.target.files);
    }
  };

  // Clipboard Image Pasting (Ctrl+V / Cmd+V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          activeEl.getAttribute("contenteditable") === "true")
      ) {
        return;
      }

      const files: File[] = [];
      if (e.clipboardData?.files && e.clipboardData.files.length > 0) {
        for (let i = 0; i < e.clipboardData.files.length; i++) {
          const file = e.clipboardData.files[i];
          if (file.type.startsWith("image/")) {
            files.push(file);
          }
        }
      } else if (e.clipboardData?.items) {
        for (let i = 0; i < e.clipboardData.items.length; i++) {
          const item = e.clipboardData.items[i];
          if (item.type.startsWith("image/")) {
            const blob = item.getAsFile();
            if (blob) files.push(blob);
          }
        }
      }

      if (files.length > 0) {
        e.preventDefault();
        processAndAddImages(files);
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, []);

  // File Drag-and-Drop over Unranked tray
  const handleDragOverFiles = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes("Files")) {
      e.preventDefault();
    }
  };

  const handleDropFiles = (e: React.DragEvent) => {
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files: File[] = [];
      for (let i = 0; i < e.dataTransfer.files.length; i++) {
        const file = e.dataTransfer.files[i];
        if (file.type.startsWith("image/")) {
          files.push(file);
        }
      }
      if (files.length > 0) {
        e.preventDefault();
        e.stopPropagation();
        processAndAddImages(files);
      }
    }
  };

  // Tap-to-select quick rank assignment
  const handleQuickAssignTier = (tierId: string) => {
    if (!selectedItem) return;

    commitBoardChange((prev) => {
      const sourceContainer = findContainer(prev, selectedItem.id);
      if (!sourceContainer) return prev;

      const sourceItems = getItems(prev, sourceContainer);
      const targetItems = getItems(prev, tierId);

      const movingItem = sourceItems.find((i) => i.id === selectedItem.id);
      if (!movingItem) return prev;

      const newSource = sourceItems.filter((i) => i.id !== selectedItem.id);
      const filteredTarget = targetItems.filter((i) => i.id !== selectedItem.id);
      const newTarget = [...filteredTarget, movingItem];

      let updated = setItems(prev, sourceContainer, newSource);
      updated = setItems(updated, tierId, newTarget);
      return updated;
    });

    const targetTier = board.tiers.find((t) => t.id === tierId);
    if (targetTier) triggerDropFx(targetTier.label);

    // Automatically advance to next unranked item (if any)
    const nextUnranked = board.unranked.filter((it) => it.id !== selectedItem.id);
    setSelectedItem(nextUnranked.length > 0 ? nextUnranked[0] : null);
  };

  const handleReturnToUnranked = () => {
    if (!selectedItem) return;
    commitBoardChange((prev) => {
      const sourceContainer = findContainer(prev, selectedItem.id);
      if (!sourceContainer || sourceContainer === UNRANKED) return prev;

      const sourceItems = getItems(prev, sourceContainer);
      const movingItem = sourceItems.find((i) => i.id === selectedItem.id);
      if (!movingItem) return prev;

      const newSource = sourceItems.filter((i) => i.id !== selectedItem.id);
      const newUnranked = [movingItem, ...prev.unranked.filter((i) => i.id !== selectedItem.id)];

      let updated = setItems(prev, sourceContainer, newSource);
      updated = setItems(updated, UNRANKED, newUnranked);
      return updated;
    });
    setSelectedItem(null);
  };

  // Keyboard Shortcuts for Tap-to-Rank Dock (1-9 to assign tier, Backspace to unrank, Esc to deselect)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedItem || isStudioDialogOpen) return;
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          activeEl.getAttribute("contenteditable") === "true")
      ) {
        return;
      }

      if (e.key === "Escape") {
        setSelectedItem(null);
        return;
      }

      if (e.key === "Backspace" || e.key === "Delete") {
        handleReturnToUnranked();
        return;
      }

      const num = parseInt(e.key, 10);
      if (!isNaN(num) && num >= 1 && num <= board.tiers.length) {
        e.preventDefault();
        handleQuickAssignTier(board.tiers[num - 1].id);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedItem, board.tiers, isStudioDialogOpen]);

  // Tier Row Operations
  const handleUpdateTierLabel = (tierId: string, newLabel: string) => {
    commitBoardChange((prev) => ({
      ...prev,
      tiers: prev.tiers.map((t) => (t.id === tierId ? { ...t, label: newLabel } : t)),
    }));
  };

  const handleUpdateTierColor = (tierId: string, newColorClass: string) => {
    commitBoardChange((prev) => ({
      ...prev,
      tiers: prev.tiers.map((t) => (t.id === tierId ? { ...t, color: newColorClass } : t)),
    }));
    setActiveColorPickerTierId(null);
  };

  const handleMoveTier = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= board.tiers.length) return;

    commitBoardChange((prev) => {
      const newTiers = [...prev.tiers];
      const temp = newTiers[index];
      newTiers[index] = newTiers[targetIndex];
      newTiers[targetIndex] = temp;
      return { ...prev, tiers: newTiers };
    });
  };

  const handleAddTier = () => {
    const newTier: TierRow = {
      id: `tier-${Date.now()}`,
      label: "NEW",
      color: "from-zinc-600 to-zinc-800",
      items: [],
    };
    commitBoardChange((prev) => ({ ...prev, tiers: [...prev.tiers, newTier] }));
  };

  const handleDeleteTier = (tierId: string) => {
    const tierToDelete = board.tiers.find((t) => t.id === tierId);
    commitBoardChange((prev) => ({
      ...prev,
      unranked: tierToDelete ? [...prev.unranked, ...tierToDelete.items] : prev.unranked,
      tiers: prev.tiers.filter((t) => t.id !== tierId),
    }));
  };

  const handleRemoveItemFromTier = (item: Item, tierId: string) => {
    commitBoardChange((prev) => ({
      ...prev,
      tiers: prev.tiers.map((t) =>
        t.id === tierId ? { ...t, items: t.items.filter((i) => i.id !== item.id) } : t
      ),
      unranked: [...prev.unranked, item],
    }));
  };

  const handleDeleteUnrankedItem = (itemId: string) => {
    commitBoardChange((prev) => ({
      ...prev,
      unranked: prev.unranked.filter((i) => i.id !== itemId),
    }));
  };

  // Add Quick Text Item
  const handleAddTextItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;
    const newItem: Item = {
      id: `item-${Date.now()}`,
      name: newItemName.trim(),
    };
    commitBoardChange((prev) => ({
      ...prev,
      unranked: [newItem, ...prev.unranked],
    }));
    setNewItemName("");
    setIsAddingText(false);
  };

  // Reset Board (Move all to unranked)
  const handleReset = () => {
    const allRanked: Item[] = [];
    board.tiers.forEach((t) => allRanked.push(...t.items));
    if (allRanked.length === 0) return;
    commitBoardChange((prev) => ({
      tiers: prev.tiers.map((t) => ({ ...t, items: [] })),
      unranked: [...prev.unranked, ...allRanked],
    }));
  };

  // Blind Rank Placement Handler
  const handlePlaceBlindItem = (tierId: string, item: Item) => {
    commitBoardChange((prev) => {
      const cleanedUnranked = prev.unranked.filter((i) => i.id !== item.id);
      const updatedTiers = prev.tiers.map((t) => {
        const filteredItems = t.items.filter((i) => i.id !== item.id);
        if (t.id === tierId) {
          return { ...t, items: [...filteredItems, item] };
        }
        return { ...t, items: filteredItems };
      });
      return {
        ...prev,
        unranked: cleanedUnranked,
        tiers: updatedTiers,
      };
    });
  };

  // Filter unranked items based on user search
  const filteredUnranked = useMemo(() => {
    if (!unrankedSearch.trim()) return board.unranked;
    const query = unrankedSearch.toLowerCase().trim();
    return board.unranked.filter((item) => item.name.toLowerCase().includes(query));
  }, [board.unranked, unrankedSearch]);

  // Apply Tier Preset configuration
  const handleApplyPreset = (preset: TierPresetConfig) => {
    setIsPresetsModalOpen(false);
    commitBoardChange((prev) => {
      const updatedTiers: TierRow[] = preset.tiers.map((cfg, index) => {
        const existing = prev.tiers[index];
        return {
          id: existing ? existing.id : `tier-${Date.now()}-${index}`,
          label: cfg.label,
          color: cfg.color,
          items: existing ? existing.items : [],
        };
      });

      const excessItems: Item[] = [];
      if (prev.tiers.length > preset.tiers.length) {
        for (let i = preset.tiers.length; i < prev.tiers.length; i++) {
          excessItems.push(...prev.tiers[i].items);
        }
      }

      return {
        ...prev,
        tiers: updatedTiers,
        unranked: [...prev.unranked, ...excessItems],
      };
    });
  };

  // Row Batch Operations
  const handleSortTierAlphabetical = (tierId: string) => {
    commitBoardChange((prev) => ({
      ...prev,
      tiers: prev.tiers.map((t) =>
        t.id === tierId
          ? { ...t, items: [...t.items].sort((a, b) => a.name.localeCompare(b.name)) }
          : t
      ),
    }));
  };

  const handleReverseTier = (tierId: string) => {
    commitBoardChange((prev) => ({
      ...prev,
      tiers: prev.tiers.map((t) =>
        t.id === tierId ? { ...t, items: [...t.items].reverse() } : t
      ),
    }));
  };

  const handleShuffleTier = (tierId: string) => {
    commitBoardChange((prev) => ({
      ...prev,
      tiers: prev.tiers.map((t) =>
        t.id === tierId ? { ...t, items: [...t.items].sort(() => Math.random() - 0.5) } : t
      ),
    }));
  };

  const handleClearTier = (tierId: string) => {
    const target = board.tiers.find((t) => t.id === tierId);
    if (!target || target.items.length === 0) return;
    commitBoardChange((prev) => ({
      ...prev,
      tiers: prev.tiers.map((t) => (t.id === tierId ? { ...t, items: [] } : t)),
      unranked: [...prev.unranked, ...target.items],
    }));
  };

  // Export 4K PNG (dynamically loads html-to-image on demand)
  const handleExportPng = async () => {
    if (!boardRef.current) return;
    setIsExporting(true);
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(boardRef.current, { quality: 0.95, pixelRatio: 2 });
      const link = document.createElement("a");
      link.download = `${title.replace(/[^a-z0-9]/gi, "-").toLowerCase()}-tierlist.png`;
      link.href = dataUrl;
      link.click();
      setExportFormat(null);
    } catch (err) {
      console.error("Export failed", err);
    } finally {
      setIsExporting(false);
    }
  };

  const totalRanked = countRanked(board);

  return (
    <DndContext
      id="studio-board-dnd"
      sensors={sensors}
      collisionDetection={collisionDetectionStrategy}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="min-h-screen bg-[#09090b] text-[#f4f4f5] flex flex-col">
        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          multiple
          accept="image/png,image/jpeg,image/webp,image/gif"
          onChange={handleImageUpload}
          className="hidden"
        />

        {/* Top Header */}
        <header className="sticky top-0 z-40 glass-panel border-b border-zinc-800/80 px-3 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex flex-1 items-center gap-2 sm:gap-3 min-w-0">
            <Link
              href="/"
              className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors flex-shrink-0"
              title="Back to Home"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="flex flex-1 items-center gap-2 min-w-0">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full min-w-0 bg-transparent border border-transparent hover:border-zinc-700 focus:border-indigo-500 rounded-md px-1 sm:px-2 py-1 font-bold text-sm sm:text-base text-zinc-100 focus:outline-none transition-colors truncate sm:min-w-40 sm:max-w-md"
                title="Click to rename"
              />

              {/* Live Save Status & Local Privacy Hub Indicator */}
              <button
                onClick={openPrivacyModal}
                className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono text-zinc-500 hover:text-white whitespace-nowrap pl-1.5 pr-2 py-0.5 rounded-md hover:bg-zinc-900 border border-transparent hover:border-zinc-800 transition-colors cursor-pointer"
                title="Local-First Storage & Privacy Hub (Click to inspect device storage & backups)"
              >
                {saveStatus === "saving" ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin text-indigo-400" />
                    <span>Saving...</span>
                  </>
                ) : saveStatus === "saved" ? (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-zinc-400 group-hover:text-zinc-200">Saved to device</span>
                  </>
                ) : (
                  <span role="status" className={saveStatus === "error" ? "text-rose-300" : "text-zinc-400"}>{saveStatus === "error" ? "Could not save — keep this tab open" : "Changes save on this device"}</span>
                )}
              </button>
            </div>
          </div>

          {/* Studio Actions: Mobile & Tablet Compact View */}
          <div className="flex shrink-0 items-center gap-1.5">
            {/* Undo */}
            <button
              onClick={handleUndo}
              disabled={history.length === 0}
              className="p-2 min-w-[32px] min-h-[32px] flex items-center justify-center rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              title="Undo"
            >
              <Undo2 className="w-4 h-4" />
            </button>

            {/* Redo */}
            <button
              onClick={handleRedo}
              disabled={future.length === 0}
              className="p-2 min-w-[32px] min-h-[32px] flex items-center justify-center rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              title="Redo"
            >
              <Redo2 className="w-4 h-4" />
            </button>

            {/* Mobile Tools Drawer Trigger */}
            <button
              onClick={() => setIsMobileToolsOpen(true)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700/80 flex items-center gap-1 transition-colors cursor-pointer"
              title="Open Creator Tools Menu"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
              <span>Tools</span>
            </button>

            {/* Export Button */}
            <button
              onClick={() => setExportFormat("image")}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 text-white shadow-sm flex items-center gap-1 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>
          </div>
        </header>

        {/* Mobile Tools Bottom Sheet / Drawer */}
        {isMobileToolsOpen && (
          <div
            ref={toolsDialogRef} role="dialog" aria-modal="true" aria-label="Creator Studio Tools" tabIndex={-1} onKeyDown={(event) => { if (event.key === "Escape") setIsMobileToolsOpen(false); }} className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center sm:items-center bg-black/75 backdrop-blur-sm p-0 sm:p-6"
            onClick={() => setIsMobileToolsOpen(false)}
          >
            <div
              className="bg-zinc-900 border border-zinc-800 rounded-t-3xl sm:rounded-2xl p-5 space-y-4 shadow-2xl max-h-[85dvh] overflow-y-auto w-full sm:max-w-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Creator Studio Tools</h3>
                    <p className="text-[11px] text-zinc-400">Power tools & board modes</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsMobileToolsOpen(false)}
                  aria-label="Close tools"
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                {/* 1-Click Presets */}
                <button
                  onClick={() => {
                    setIsPresetsModalOpen(true);
                    setIsMobileToolsOpen(false);
                  }}
                  className="flex items-center gap-2 p-3 rounded-xl bg-zinc-950/70 hover:bg-zinc-800 border border-zinc-800 text-left font-semibold text-zinc-200 transition-colors"
                >
                  <Wand2 className="w-4 h-4 text-violet-400 flex-shrink-0" />
                  <div>
                    <div className="text-white text-xs">1-Click Presets</div>
                    <div className="text-[10px] text-zinc-500 font-normal">S-F, Gaming, Buyers</div>
                  </div>
                </button>

                {/* Blind Rank Mode */}
                <button
                  onClick={() => {
                    setIsBlindModalOpen(true);
                    setIsMobileToolsOpen(false);
                  }}
                  className="flex items-center gap-2 p-3 rounded-xl bg-zinc-950/70 hover:bg-zinc-800 border border-zinc-800 text-left font-semibold text-zinc-200 transition-colors"
                >
                  <Dices className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <div>
                    <div className="text-white text-xs">Blind Rank</div>
                    <div className="text-[10px] text-zinc-500 font-normal">TikTok Mystery Mode</div>
                  </div>
                </button>

                {/* Consensus (if available) */}
                {initialTemplate && (
                  <button
                    onClick={() => {
                      setIsConsensusModalOpen(true);
                      setIsMobileToolsOpen(false);
                    }}
                    className="flex items-center gap-2 p-3 rounded-xl bg-zinc-950/70 hover:bg-zinc-800 border border-zinc-800 text-left font-semibold text-zinc-200 transition-colors"
                  >
                    <BrainCircuit className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                    <div>
                      <div className="text-white text-xs">Consensus</div>
                      <div className="text-[10px] text-zinc-500 font-normal">Crowd agreement %</div>
                    </div>
                  </button>
                )}

                {/* Presenter Mode */}
                <button
                  onClick={() => {
                    setIsPresentationModalOpen(true);
                    setIsMobileToolsOpen(false);
                  }}
                  className="flex items-center gap-2 p-3 rounded-xl bg-zinc-950/70 hover:bg-zinc-800 border border-zinc-800 text-left font-semibold text-zinc-200 transition-colors"
                >
                  <Tv className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                  <div>
                    <div className="text-white text-xs">Presenter View</div>
                    <div className="text-[10px] text-zinc-500 font-normal">Streamer clean UI</div>
                  </div>
                </button>

                {/* Drop FX Toggle */}
                <button
                  onClick={() => setDropFxEnabled(!dropFxEnabled)}
                  className="flex items-center gap-2 p-3 rounded-xl bg-zinc-950/70 hover:bg-zinc-800 border border-zinc-800 text-left font-semibold text-zinc-200 transition-colors"
                >
                  <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <div>
                    <div className="text-white text-xs">Drop FX</div>
                    <div className="text-[10px] text-zinc-500 font-normal">
                      {dropFxEnabled ? "Confetti & Shake: ON" : "Effects: OFF"}
                    </div>
                  </div>
                </button>

                {/* Share Modal */}
                <button
                  onClick={() => {
                    setIsShareModalOpen(true);
                    setIsMobileToolsOpen(false);
                  }}
                  className="flex items-center gap-2 p-3 rounded-xl bg-zinc-950/70 hover:bg-zinc-800 border border-zinc-800 text-left font-semibold text-zinc-200 transition-colors"
                >
                  <Share2 className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                  <div>
                    <div className="text-white text-xs">Share & Publish</div>
                    <div className="text-[10px] text-zinc-500 font-normal">Generate viral link</div>
                  </div>
                </button>

                {/* Animated Video Export */}
                <button
                  onClick={() => {
                    setExportFormat("video");
                    setIsMobileToolsOpen(false);
                  }}
                  className="flex items-center gap-2 p-3 rounded-xl bg-gradient-to-r from-rose-950/50 to-pink-950/50 hover:bg-rose-900/40 border border-rose-500/30 text-left font-semibold text-zinc-200 transition-colors"
                >
                  <Film className="w-4 h-4 text-rose-400 flex-shrink-0" />
                  <div>
                    <div className="text-white text-xs">Video Export</div>
                    <div className="text-[10px] text-rose-300 font-normal">TikTok 9:16 Animation</div>
                  </div>
                </button>

                {/* Reset Board */}
                <button
                  onClick={() => {
                    handleReset();
                    setIsMobileToolsOpen(false);
                  }}
                  className="col-span-2 flex items-center justify-center gap-2 p-2.5 rounded-xl bg-zinc-950/50 hover:bg-rose-950/30 border border-zinc-800/80 hover:border-rose-900/50 text-zinc-400 hover:text-rose-400 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="text-xs">Reset All Items to Unranked</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Studio Area */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 pb-40 grid grid-cols-1 lg:grid-cols-4 items-start gap-4 sm:gap-6">
          {/* Tier Board (3 Columns) */}
          <div className="lg:col-span-3 min-w-0 space-y-4">
            <div
              ref={boardRef}
              className="space-y-3 p-3 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 transition-transform"
            >
              {board.tiers.map((tier, index) => (
                <div
                  key={tier.id}
                  className="flex rounded-xl overflow-hidden bg-zinc-900/80 border border-zinc-800/90 min-h-[82px] transition-all hover:border-zinc-700 relative group"
                >
                  {/* Editable Tier Badge */}
                  <div className="relative flex-shrink-0 flex items-center">
                    <div
                      className={`w-16 sm:w-20 h-full bg-gradient-to-br ${tier.color} flex items-center justify-center font-bold text-xl sm:text-2xl text-white select-none shadow-inner p-2 text-center break-words`}
                    >
                      <input
                        type="text"
                        value={tier.label}
                        aria-label={`Tier ${index + 1} label`}
                        onChange={(e) => handleUpdateTierLabel(tier.id, e.target.value)}
                        className="w-full text-center bg-transparent border-none text-white font-bold focus:outline-none focus:ring-1 focus:ring-white/40 rounded"
                      />
                    </div>

                    {/* Palette icon trigger on hover (desktop only) */}
                    <button
                      onClick={() =>
                        setActiveColorPickerTierId(
                          activeColorPickerTierId === tier.id ? null : tier.id
                        )
                      }
                      className="hidden sm:flex absolute bottom-1.5 right-1.5 p-1 rounded bg-black/40 hover:bg-black/70 text-white/80 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      title="Change tier color"
                    >
                      <Palette className="w-3 h-3" />
                    </button>

                    {/* Color Presets Popover */}
                    {activeColorPickerTierId === tier.id && (
                      <div className="absolute top-12 left-2 z-50 p-2.5 rounded-xl bg-zinc-900 border border-zinc-700 shadow-2xl flex flex-wrap gap-1.5 w-44">
                        {COLOR_PRESETS.map((preset) => (
                          <button
                            key={preset.name}
                            onClick={() => handleUpdateTierColor(tier.id, preset.class)}
                            className={`w-7 h-7 rounded-lg bg-gradient-to-br ${preset.class} hover:scale-110 transition-transform cursor-pointer border border-white/20`}
                            title={preset.name}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Items Dropzone powered by dnd-kit */}
                  <DropZone
                    id={tier.id}
                    items={tier.items}
                    highlighted={overContainerId === tier.id}
                    className="flex-1 p-2.5 min-h-[82px]"
                    emptyHint={
                      <span className="text-xs text-zinc-400 italic px-3 select-none flex items-center h-full pointer-events-none">
                        Drag items here
                      </span>
                    }
                    onRemoveItem={(item) => handleRemoveItemFromTier(item, tier.id)}
                    removeLabel="Return to unranked"
                    selectedItemId={selectedItem?.id}
                    onSelectItem={(item) => setSelectedItem((prev) => (prev?.id === item.id ? null : item))}
                  />

                  {/* Tier Row Operations (Sort, Shuffle, Clear, Move, Delete) */}
                  <div className="hidden sm:grid grid-cols-2 content-center items-center px-1.5 py-1 border-l border-zinc-800/80 gap-1 text-zinc-400">
                    <button
                      onClick={() => handleSortTierAlphabetical(tier.id)}
                      disabled={tier.items.length <= 1}
                      className="p-1 rounded text-zinc-400 hover:text-indigo-400 disabled:opacity-20 cursor-pointer"
                      title="Sort row alphabetically (A-Z)"
                    >
                      <ArrowDownAZ className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleShuffleTier(tier.id)}
                      disabled={tier.items.length <= 1}
                      className="p-1 rounded text-zinc-400 hover:text-amber-400 disabled:opacity-20 cursor-pointer"
                      title="Shuffle row items"
                    >
                      <Shuffle className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleClearTier(tier.id)}
                      disabled={tier.items.length === 0}
                      className="p-1 rounded text-zinc-400 hover:text-orange-400 disabled:opacity-20 cursor-pointer"
                      title="Clear row (return items to unranked)"
                    >
                      <Eraser className="w-3.5 h-3.5" />
                    </button>
                    <button
                      disabled={index === 0}
                      onClick={() => handleMoveTier(index, "up")}
                      className="p-1 rounded text-zinc-400 hover:text-white disabled:opacity-20 cursor-pointer"
                      title="Move Tier Up"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      disabled={index === board.tiers.length - 1}
                      onClick={() => handleMoveTier(index, "down")}
                      className="p-1 rounded text-zinc-400 hover:text-white disabled:opacity-20 cursor-pointer"
                      title="Move Tier Down"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteTier(tier.id)}
                      className="p-1 rounded text-zinc-500 hover:text-red-400 cursor-pointer"
                      title="Delete Tier"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Tier Button */}
            <button
              onClick={handleAddTier}
              className="w-full py-3 rounded-xl border border-dashed border-zinc-800 hover:border-zinc-700 bg-zinc-900/40 hover:bg-zinc-900/80 text-zinc-400 hover:text-zinc-200 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 text-indigo-400" />
              <span>Add New Tier Row</span>
            </button>
          </div>

          {/* Unranked Items Tray & Uploader (1 Column) */}
          <div
            onDragOver={handleDragOverFiles}
            onDrop={handleDropFiles}
            className="order-first lg:order-last min-w-0 lg:sticky lg:top-20 rounded-2xl bg-zinc-900/80 border border-zinc-800 p-5 flex flex-col justify-between h-fit space-y-4"
          >
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                    Unranked Items
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-[11px] font-mono text-zinc-400">
                    {board.unranked.length}
                  </span>
                  <span className="hidden xl:inline text-[10px] text-zinc-500 font-medium">
                    Auto-WebP • Ctrl+V Paste
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {/* Instant Web Search Trigger */}
                  {WEB_IMAGE_SEARCH_ENABLED && (
                    <button
                      onClick={() => setIsWebSearchOpen(true)}
                      className="p-2 min-w-[32px] min-h-[32px] flex items-center justify-center rounded-lg bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer border border-indigo-500/30"
                      title="Search Web & Icons"
                    >
                      <Globe className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {/* Local Upload */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 min-w-[32px] min-h-[32px] flex items-center justify-center rounded-lg bg-zinc-800 hover:bg-zinc-750 text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
                    title="Upload Batch Images"
                  >
                    <Upload className="w-3.5 h-3.5" />
                  </button>
                  {/* Add Text */}
                  <button
                    onClick={() => setIsAddingText(!isAddingText)}
                    className="p-2 min-w-[32px] min-h-[32px] flex items-center justify-center rounded-lg bg-zinc-800 hover:bg-zinc-750 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                    title="Add Text Item"
                  >
                    <Type className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Compression Progress Bar */}
              {isCompressing && (
                <div className="mb-4 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 space-y-1.5">
                  <div className="flex justify-between font-semibold text-[11px]">
                    <span>Compressing WebP thumbnails...</span>
                    <span>
                      {compressionProgress.done}/{compressionProgress.total}
                    </span>
                  </div>
                  <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-indigo-500 h-full transition-all duration-200"
                      style={{
                        width: `${(compressionProgress.done / compressionProgress.total) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Quick Text Add Form */}
              {isAddingText && (
                <form onSubmit={handleAddTextItem} className="mb-4 space-y-2">
                  <input
                    type="text"
                    autoFocus
                    placeholder="Enter text item name..."
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                  />
                  <div className="flex justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => setIsAddingText(false)}
                      className="px-2.5 py-1 rounded text-[11px] text-zinc-400 hover:text-white cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1 rounded text-[11px] font-semibold bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                </form>
              )}

              {/* Instant Unranked Item Search Filter */}
              {board.unranked.length > 2 && (
                <div className="relative mb-3">
                  <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder={`Filter ${board.unranked.length} unranked items...`}
                    value={unrankedSearch}
                    onChange={(e) => setUnrankedSearch(e.target.value)}
                    className="w-full bg-zinc-950/80 border border-zinc-800 rounded-lg pl-8 pr-8 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                  {unrankedSearch && (
                    <button
                      onClick={() => setUnrankedSearch("")}
                      className="absolute right-1 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 min-w-[28px] min-h-[28px] flex items-center justify-center cursor-pointer"
                      title="Clear search"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}

              {/* Droppable Unranked Tray powered by dnd-kit */}
              <div className="max-h-40 lg:max-h-[460px] overflow-y-auto pr-1">
                <DropZone
                  id={UNRANKED}
                  items={filteredUnranked}
                  highlighted={overContainerId === UNRANKED}
                  selectedItemId={selectedItem?.id}
                  onSelectItem={(item) =>
                    setSelectedItem((prev) => (prev?.id === item.id ? null : item))
                  }
                  className="min-h-[64px] p-1"
                  emptyHint={
                    board.unranked.length > 0 && filteredUnranked.length === 0 ? (
                      <div className="w-full py-8 text-center text-xs text-zinc-500 space-y-1.5">
                        <p>No unranked items match &quot;{unrankedSearch}&quot;</p>
                        <button
                          onClick={() => setUnrankedSearch("")}
                          className="text-indigo-400 hover:underline text-[11px] cursor-pointer"
                        >
                          Clear filter
                        </button>
                      </div>
                    ) : (
                      <div className="w-full py-5 text-center text-xs text-zinc-400 space-y-2">
                        <p className="text-zinc-300">{board.tiers.some(t => t.items.length) ? "All items have been ranked." : "Start with your own images or text."}</p>
                        <div className="flex justify-center gap-2 pt-1">
                          {WEB_IMAGE_SEARCH_ENABLED && (
                            <button
                              onClick={() => setIsWebSearchOpen(true)}
                              className="text-indigo-400 hover:underline font-medium text-[11px] cursor-pointer"
                            >
                              + Search Web
                            </button>
                          )}
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            className="text-indigo-400 hover:underline font-medium text-[11px] cursor-pointer"
                          >
                            + Upload Images
                          </button>
                          <button onClick={() => setIsAddingText(true)} className="text-indigo-300 hover:underline font-medium text-[11px] cursor-pointer">+ Add Text</button>
                        </div>
                      </div>
                    )
                  }
                  onRemoveItem={(item) => handleDeleteUnrankedItem(item.id)}
                  removeLabel="Delete item"
                />
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className={`hidden lg:grid gap-2 ${WEB_IMAGE_SEARCH_ENABLED ? "grid-cols-2" : "grid-cols-1"}`}>
              {WEB_IMAGE_SEARCH_ENABLED && (
                <button
                  onClick={() => setIsWebSearchOpen(true)}
                  className="p-3 rounded-xl border border-dashed border-indigo-500/40 hover:border-indigo-500 bg-indigo-500/10 hover:bg-indigo-500/20 text-center transition-colors cursor-pointer"
                >
                  <Globe className="w-4 h-4 text-indigo-400 mx-auto mb-1" />
                  <span className="text-xs font-semibold text-indigo-300 block">Web Search</span>
                  <span className="text-[10px] text-zinc-400">Instant Icons</span>
                </button>
              )}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-3 rounded-xl border border-dashed border-zinc-700/80 hover:border-zinc-500 bg-zinc-800/40 hover:bg-zinc-800/70 text-center transition-colors cursor-pointer"
              >
                <Upload className="w-4 h-4 text-zinc-400 mx-auto mb-1" />
                <span className="text-xs font-semibold text-zinc-300 block">Upload Files</span>
                <span className="text-[10px] text-zinc-500">Auto-WebP</span>
              </button>
            </div>
          </div>
        </main>

        {/* Drag Overlay (follows pointer/touch smoothly) */}
        <DragOverlay dropAnimation={null}>
          {activeItem ? <ItemCard item={activeItem} isOverlay /> : null}
        </DragOverlay>

        {/* Modals */}
        {WEB_IMAGE_SEARCH_ENABLED && (
          <WebImageSearchModal
            isOpen={isWebSearchOpen}
            onClose={() => setIsWebSearchOpen(false)}
            onAddItems={(newItems) =>
              commitBoardChange((prev) => ({
                ...prev,
                unranked: [...newItems, ...prev.unranked],
              }))
            }
          />
        )}

        <ShareModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          projectId={projectId}
          boardTitle={title}
          totalRankedCount={totalRanked}
          tiers={board.tiers}
          unranked={board.unranked}
          templateId={resolvedTemplate?.id || initialTemplate?.id}
          publishedShareId={publishedShareId}
          onPublishSuccess={async (newShareId, targetProjectId) => {
            const targetPid = targetProjectId || projectId;
            await saveProject({
              id: targetPid,
              title,
              tiers: board.tiers,
              unranked: board.unranked,
              templateId: loadedTemplateId || initialTemplate?.id,
              publishedShareId: newShareId,
              createdAt: projectCreatedAt,
              updatedAt: Date.now(),
            });
            if (activeProjectIdRef.current === targetPid) {
              setPublishedShareId(newShareId);
            }
          }}
        />

        {(resolvedTemplate || initialTemplate) && (
          <ConsensusComparisonModal
            isOpen={isConsensusModalOpen}
            onClose={() => setIsConsensusModalOpen(false)}
            board={board}
            template={resolvedTemplate || initialTemplate!}
          />
        )}

        {/* Creator Multi-Format Export Modal */}
        <CreatorExportModal
          isOpen={exportFormat === "image"}
          onClose={() => setExportFormat(null)}
          boardTitle={title}
          authorName={
            (typeof window !== "undefined" ? localStorage.getItem("tl_commenter_name") : null) ||
            "Creator"
          }
          tiers={board.tiers}
          onSwitchToVideo={() => setExportFormat("video")}
        />

        {/* Animated Video Export Modal (TikTok / Reels / Shorts) */}
        <VideoExportModal
          onSwitchToImage={() => setExportFormat("image")}
          isOpen={exportFormat === "video"}
          onClose={() => setExportFormat(null)}
          boardTitle={title}
          authorName={
            (typeof window !== "undefined" ? localStorage.getItem("tl_commenter_name") : null) ||
            "Creator"
          }
          tiers={board.tiers}
        />

        {/* Blind Rank Challenge Modal */}
        <BlindRankModal
          isOpen={isBlindModalOpen}
          onClose={() => setIsBlindModalOpen(false)}
          board={board}
          onPlaceBlindItem={handlePlaceBlindItem}
          onOpenConsensus={
            resolvedTemplate || initialTemplate
              ? () => setIsConsensusModalOpen(true)
              : undefined
          }
        />

        {/* Presentation & Streamer Mode Modal */}
        <PresentationModal
          isOpen={isPresentationModalOpen}
          onClose={() => setIsPresentationModalOpen(false)}
          boardTitle={title}
          authorName={
            (typeof window !== "undefined" ? localStorage.getItem("tl_commenter_name") : null) ||
            "Creator"
          }
          tiers={board.tiers}
          onOpenExport={() => setExportFormat("image")}
        />

        {/* Tier Presets Modal */}
        <TierPresetsModal
          isOpen={isPresetsModalOpen}
          onClose={() => setIsPresetsModalOpen(false)}
          onApplyPreset={handleApplyPreset}
        />

        {/* Tap-to-Rank Dock (Mobile & Desktop Rapid Ranking) */}
        {selectedItem && !isStudioDialogOpen && (
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[95%] max-w-2xl bg-zinc-900/95 backdrop-blur-xl border border-indigo-500/40 shadow-2xl shadow-indigo-950/60 rounded-2xl p-3 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-4 duration-200">
            <div className="flex items-center gap-2.5 min-w-0 pr-2">
              <div className="w-10 h-10 rounded-lg overflow-hidden bg-zinc-800 flex-shrink-0 border border-zinc-700 relative">
                {selectedItem.imageUrl ? (
                  <ItemImage
                    src={selectedItem.imageUrl}
                    alt={selectedItem.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[10px] text-zinc-300 font-bold p-1 text-center bg-zinc-800">
                    {selectedItem.name}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate max-w-[140px] sm:max-w-[180px]">
                  {selectedItem.name}
                </p>
                <span className="text-[10px] text-zinc-400">
                  Tap tier to assign • 1-{board.tiers.length} keys
                </span>
              </div>
            </div>

            {/* Tier quick-assign pills */}
            <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap overflow-x-auto py-1 max-w-full">
              {board.tiers.map((t, idx) => (
                <button
                  key={t.id}
                  onClick={() => handleQuickAssignTier(t.id)}
                  className={`min-w-10 min-h-10 px-2.5 py-1 rounded-lg bg-gradient-to-br ${t.color} text-xs font-black text-white shadow-sm hover:scale-105 active:scale-95 transition-all flex items-center justify-center cursor-pointer`}
                  title={`Assign to ${t.label} (Press ${idx + 1})`}
                >
                  {t.label}
                </button>
              ))}

              {/* Return to unranked */}
              {findContainer(board, selectedItem.id) !== UNRANKED && (
                <button
                  onClick={handleReturnToUnranked}
                  className="min-w-[34px] min-h-[34px] px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-750 text-zinc-300 text-xs font-semibold shadow-sm hover:scale-105 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
                  title="Return to unranked (Press Backspace)"
                >
                  Unrank
                </button>
              )}

              {/* Deselect / Cancel */}
              <button
                onClick={() => setSelectedItem(null)}
                className="min-w-[34px] min-h-[34px] p-2 rounded-lg bg-zinc-800/80 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors flex items-center justify-center cursor-pointer ml-1"
                title="Deselect (Press Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </DndContext>
  );
}
