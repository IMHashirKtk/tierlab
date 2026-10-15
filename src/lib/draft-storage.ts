import type { Item, Project, TierRow } from "@/types";
import { createId } from "@/lib/board";

export interface TemplateDraft {
  draftId?: string;
  pendingId: string;
  title: string;
  category: string;
  description: string;
  authorName: string;
  items: Item[];
  updatedAt: number;
}

export interface PendingCommentDraft {
  pendingId: string;
  tierListId: string;
  authorName: string;
  content: string;
  sessionUserId: string;
  updatedAt: number;
}

const TEMPLATE_DRAFT_PREFIX = "tl_template_draft_";
const PROJECT_PENDING_SHARE_PREFIX = "tl_pending_share_project_";
const COMMENT_DRAFT_PREFIX = "tl_pending_comment_";

let simulateStorageFailure = false;
let simulateStorageFailureMessage = "Disk full or storage permission denied";

export function setSimulateDraftStorageFailure(shouldFail: boolean, message?: string) {
  simulateStorageFailure = shouldFail;
  if (message) simulateStorageFailureMessage = message;
}

export function isSimulateDraftStorageFailure(): boolean {
  return simulateStorageFailure;
}

/**
 * Persists a template draft. Throws if storage fails or if storage failure is simulated.
 */
export async function saveTemplateDraft(
  draft: TemplateDraft,
  draftId = "default"
): Promise<void> {
  if (simulateStorageFailure) {
    throw new Error(simulateStorageFailureMessage);
  }

  if (typeof window === "undefined") return;

  const key = `${TEMPLATE_DRAFT_PREFIX}${draftId}`;
  try {
    const payload = JSON.stringify({
      ...draft,
      draftId,
      updatedAt: Date.now(),
    });
    localStorage.setItem(key, payload);
  } catch (err: any) {
    throw new Error(`Failed to persist template draft: ${err?.message || "Storage error"}`);
  }
}

/**
 * Loads a saved template draft synchronously for initial hydration.
 */
export function loadTemplateDraft(draftId = "default"): TemplateDraft | null {
  if (typeof window === "undefined") return null;
  const key = `${TEMPLATE_DRAFT_PREFIX}${draftId}`;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Permanently deletes a saved template draft (only on explicit discard or confirmed publication).
 */
export function deleteTemplateDraft(draftId = "default"): void {
  if (typeof window === "undefined") return;
  const key = `${TEMPLATE_DRAFT_PREFIX}${draftId}`;
  try {
    localStorage.removeItem(key);
  } catch {}
}

/**
 * Retrieves the pending publication identity for a specific project.
 * Does not fall back to template ID or title.
 */
export function getProjectPendingShareId(projectId: string): string | null {
  if (!projectId || typeof window === "undefined") return null;
  const key = `${PROJECT_PENDING_SHARE_PREFIX}${projectId}`;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Persists the pending publication identity for a specific project.
 */
export function saveProjectPendingShareId(projectId: string, shareId: string): void {
  if (!projectId || !shareId || typeof window === "undefined") return;
  const key = `${PROJECT_PENDING_SHARE_PREFIX}${projectId}`;
  try {
    localStorage.setItem(key, shareId);
  } catch {}
}

/**
 * Clears the pending publication identity for a project after confirmed cloud persistence.
 */
export function clearProjectPendingShareId(projectId: string): void {
  if (!projectId || typeof window === "undefined") return;
  const key = `${PROJECT_PENDING_SHARE_PREFIX}${projectId}`;
  try {
    localStorage.removeItem(key);
  } catch {}
}

/**
 * Loads a pending comment draft scoped to tier list and user session.
 */
export function loadPendingCommentDraft(
  tierListId: string,
  sessionUserId: string
): PendingCommentDraft | null {
  if (!tierListId || typeof window === "undefined") return null;
  const key = `${COMMENT_DRAFT_PREFIX}${tierListId}_${sessionUserId || "anon"}`;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Persists a pending comment attempt before sending.
 */
export function savePendingCommentDraft(draft: PendingCommentDraft): void {
  if (!draft.tierListId || typeof window === "undefined") return;
  const key = `${COMMENT_DRAFT_PREFIX}${draft.tierListId}_${draft.sessionUserId || "anon"}`;
  try {
    localStorage.setItem(key, JSON.stringify(draft));
  } catch {}
}

/**
 * Clears a pending comment draft upon confirmed cloud success.
 */
export function clearPendingCommentDraft(
  tierListId: string,
  sessionUserId: string
): void {
  if (!tierListId || typeof window === "undefined") return;
  const key = `${COMMENT_DRAFT_PREFIX}${tierListId}_${sessionUserId || "anon"}`;
  try {
    localStorage.removeItem(key);
  } catch {}
}

/**
 * Creates an independent clone of a project with a new ID and cleared publishedShareId.
 * Guarantees that the duplicated project does not share publication identity with the source.
 */
export function duplicateProject(source: Project, newId?: string): Project {
  const targetId = newId || createId("proj");
  const now = Date.now();
  return {
    ...source,
    id: targetId,
    title: `${source.title} (Copy)`,
    publishedShareId: undefined, // Must never retain parent's published cloud link
    createdAt: now,
    updatedAt: now,
    tiers: source.tiers.map((t) => ({
      ...t,
      items: t.items.map((i) => ({ ...i })),
    })),
    unranked: source.unranked.map((i) => ({ ...i })),
  };
}
