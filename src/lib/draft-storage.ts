import type { Item, Project } from "@/types";
import { createId } from "@/lib/board";
import { runInStore, TEMPLATE_DRAFTS_STORE, isSimulateIdbAbort } from "@/lib/storage";

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

// Per-draft monotonic discard generation counter so queued/in-flight saves cannot resurrect discarded drafts
const draftDiscardGeneration = new Map<string, number>();

/**
 * Test-only boundary adapter for isolated headless Node.js tests.
 * Production and browser environments NEVER fall back to in-memory storage.
 */
export interface DraftIdbTestAdapter {
  get(draftId: string): Promise<TemplateDraft | undefined>;
  put(record: TemplateDraft): Promise<void>;
  delete(draftId: string): Promise<void>;
}

let testDraftIdbAdapter: DraftIdbTestAdapter | null = null;

export function setDraftIdbTestAdapter(adapter: DraftIdbTestAdapter | null) {
  testDraftIdbAdapter = adapter;
}

export function getDraftGeneration(draftId = "default"): number {
  return draftDiscardGeneration.get(draftId) || 0;
}

export function markDraftDiscarded(draftId = "default"): number {
  const next = (draftDiscardGeneration.get(draftId) || 0) + 1;
  draftDiscardGeneration.set(draftId, next);
  return next;
}

export function setSimulateDraftStorageFailure(shouldFail: boolean, message?: string) {
  simulateStorageFailure = shouldFail;
  if (message) simulateStorageFailureMessage = message;
}

export function isSimulateDraftStorageFailure(): boolean {
  return simulateStorageFailure;
}

function getStorageFailureMessage(): string {
  return simulateStorageFailureMessage;
}

/**
 * Validates that a loaded template draft object has a safe, renderable structure.
 */
export function isValidTemplateDraft(raw: unknown): raw is TemplateDraft {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return false;
  const d = raw as Record<string, unknown>;
  if (typeof d.pendingId !== "string" || !d.pendingId.trim()) return false;
  if (typeof d.title !== "string") return false;
  if (typeof d.category !== "string") return false;
  if (typeof d.description !== "string") return false;
  if (typeof d.authorName !== "string") return false;
  if (typeof d.updatedAt !== "number" || !Number.isFinite(d.updatedAt)) return false;
  if (!Array.isArray(d.items)) return false;

  for (const item of d.items) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return false;
    const it = item as Record<string, unknown>;
    if (typeof it.id !== "string" || !it.id.trim()) return false;
    if (typeof it.name !== "string") return false;
    if (it.imageUrl !== undefined && typeof it.imageUrl !== "string") return false;
  }

  return true;
}

async function writeDraftToIdb(record: TemplateDraft, draftId: string): Promise<void> {
  if (testDraftIdbAdapter) {
    if (isSimulateIdbAbort()) {
      throw new Error("Simulated IndexedDB transaction abort");
    }
    await testDraftIdbAdapter.put({ ...record, draftId });
    return;
  }

  if (typeof indexedDB === "undefined" || !indexedDB || typeof indexedDB.open !== "function") {
    throw new Error(
      "Browser storage (IndexedDB) is unavailable. Your draft remains in memory, but cannot be durably saved or published until browser storage is enabled."
    );
  }

  await runInStore(TEMPLATE_DRAFTS_STORE, "readwrite", (store) =>
    store.put({ ...record, draftId })
  );
}

async function readDraftFromIdb(draftId: string): Promise<TemplateDraft | undefined> {
  if (testDraftIdbAdapter) {
    return await testDraftIdbAdapter.get(draftId);
  }

  if (typeof indexedDB === "undefined" || !indexedDB || typeof indexedDB.open !== "function") {
    return undefined;
  }

  return await runInStore<TemplateDraft | undefined>(
    TEMPLATE_DRAFTS_STORE,
    "readonly",
    (store) => store.get(draftId)
  );
}

async function removeDraftFromIdb(draftId: string): Promise<void> {
  if (testDraftIdbAdapter) {
    if (isSimulateIdbAbort()) {
      throw new Error("Simulated IndexedDB transaction abort");
    }
    await testDraftIdbAdapter.delete(draftId);
    return;
  }

  if (typeof indexedDB === "undefined" || !indexedDB || typeof indexedDB.open !== "function") {
    throw new Error(
      "Browser storage (IndexedDB) is unavailable. Storage cleanup could not be performed."
    );
  }

  await runInStore(TEMPLATE_DRAFTS_STORE, "readwrite", (store) => store.delete(draftId));
}

/**
 * Persists a template draft in IndexedDB. Resolves only after the transaction commits.
 * Throws if storage fails or if storage failure/abort is simulated.
 * Prevents an older queued save from resurrecting a discarded draft.
 */
export async function saveTemplateDraft(
  draft: TemplateDraft,
  draftId = "default",
  expectedGeneration?: number
): Promise<void> {
  const startGen = expectedGeneration ?? getDraftGeneration(draftId);

  if (isSimulateDraftStorageFailure()) {
    throw new Error(getStorageFailureMessage());
  }

  if (typeof window === "undefined" && !testDraftIdbAdapter) return;

  const record: TemplateDraft = {
    ...draft,
    draftId,
    updatedAt: typeof draft.updatedAt === "number" ? draft.updatedAt : Date.now(),
  };

  if (!isValidTemplateDraft(record)) {
    throw new Error("Invalid template draft structure: cannot persist malformed draft.");
  }

  // If the draft was discarded while this save was queued or awaiting, do not resurrect it
  if (getDraftGeneration(draftId) !== startGen) {
    return;
  }

  if (isSimulateDraftStorageFailure()) {
    throw new Error(getStorageFailureMessage());
  }

  try {
    await writeDraftToIdb(record, draftId);

    // Double-check after transaction commit in case a discard happened concurrently
    if (getDraftGeneration(draftId) !== startGen) {
      await removeDraftFromIdb(draftId);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "IndexedDB storage error";
    throw new Error(`Failed to persist template draft: ${msg}`);
  }
}

/**
 * Loads a saved template draft asynchronously from IndexedDB, safely migrating any legacy
 * localStorage template draft and deleting the old copy only after successful migration.
 * Validates draft structure before returning.
 */
export async function loadTemplateDraft(draftId = "default"): Promise<TemplateDraft | null> {
  if (typeof window === "undefined" && !testDraftIdbAdapter) return null;

  const legacyKey = `${TEMPLATE_DRAFT_PREFIX}${draftId}`;

  // 1. Check IndexedDB first
  try {
    const idbDraft = await readDraftFromIdb(draftId);
    if (idbDraft) {
      if (!isValidTemplateDraft(idbDraft)) {
        return null;
      }
      // Clean up any leftover legacy localStorage entry if IndexedDB already has a valid copy
      if (typeof localStorage !== "undefined") {
        try {
          if (localStorage.getItem(legacyKey) !== null) {
            localStorage.removeItem(legacyKey);
          }
        } catch {}
      }
      return idbDraft;
    }
  } catch (err) {
    console.warn("IndexedDB template draft read failed:", err);
  }

  // 2. Check legacy localStorage for migration
  if (typeof localStorage === "undefined") return null;

  let rawLegacy: string | null = null;
  try {
    rawLegacy = localStorage.getItem(legacyKey);
  } catch {
    return null;
  }

  if (!rawLegacy) return null;

  let parsedLegacy: unknown;
  try {
    parsedLegacy = JSON.parse(rawLegacy);
  } catch {
    return null;
  }

  if (!isValidTemplateDraft(parsedLegacy)) {
    return null;
  }

  const migratedDraft: TemplateDraft = {
    ...parsedLegacy,
    draftId,
  };

  // Migrate to IndexedDB and delete old localStorage copy ONLY after transaction commits
  try {
    if (isSimulateDraftStorageFailure()) {
      throw new Error(getStorageFailureMessage());
    }
    await writeDraftToIdb(migratedDraft, draftId);
    localStorage.removeItem(legacyKey);
  } catch (migrationErr) {
    // Keep the legacy localStorage copy intact if IndexedDB migration failed
    console.warn("Template draft migration to IndexedDB did not complete; preserving localStorage copy:", migrationErr);
  }

  return migratedDraft;
}

/**
 * Permanently deletes a saved template draft from IndexedDB and legacy localStorage
 * (only on explicit discard or confirmed publication).
 * Increments the discard generation counter immediately and propagates cleanup errors.
 */
export async function deleteTemplateDraft(draftId = "default"): Promise<void> {
  markDraftDiscarded(draftId);

  if (isSimulateDraftStorageFailure()) {
    throw new Error(getStorageFailureMessage());
  }

  if (typeof window === "undefined" && !testDraftIdbAdapter) return;

  const legacyKey = `${TEMPLATE_DRAFT_PREFIX}${draftId}`;
  try {
    await removeDraftFromIdb(draftId);
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(legacyKey);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Storage cleanup error";
    throw new Error(`Failed to delete template draft: ${msg}`);
  }
}

/**
 * Retrieves the pending publication identity for a specific project.
 * Does not fall back to template ID or title.
 */
export function getProjectPendingShareId(projectId: string): string | null {
  if (!projectId || typeof window === "undefined" || typeof localStorage === "undefined") return null;
  const key = `${PROJECT_PENDING_SHARE_PREFIX}${projectId}`;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Persists the pending publication identity for a specific project.
 * Propagates persistence failures so callers abort publication before any cloud write.
 */
export function saveProjectPendingShareId(projectId: string, shareId: string): void {
  if (isSimulateDraftStorageFailure()) {
    throw new Error(getStorageFailureMessage());
  }
  if (!projectId || !shareId) {
    throw new Error("Cannot save pending share identity: projectId and shareId are required.");
  }
  if (typeof window !== "undefined" && typeof localStorage === "undefined") {
    throw new Error("Browser localStorage is unavailable. Cannot persist pending share identity.");
  }
  if (typeof window === "undefined") return;

  const key = `${PROJECT_PENDING_SHARE_PREFIX}${projectId}`;
  try {
    localStorage.setItem(key, shareId);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Storage error";
    throw new Error(`Failed to persist pending share ID: ${msg}`);
  }
}

/**
 * Clears the pending publication identity for a project after confirmed cloud + local persistence.
 * Propagates storage errors rather than silently ignoring failed cleanup.
 */
export function clearProjectPendingShareId(projectId: string): void {
  if (!projectId || typeof window === "undefined") return;
  if (typeof localStorage === "undefined") {
    throw new Error("Browser localStorage is unavailable. Cannot clear pending share identity.");
  }
  const key = `${PROJECT_PENDING_SHARE_PREFIX}${projectId}`;
  try {
    localStorage.removeItem(key);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Storage cleanup error";
    throw new Error(`Failed to clear pending share ID: ${msg}`);
  }
}

/**
 * Loads a pending comment draft scoped to tier list and user session.
 */
export function loadPendingCommentDraft(
  tierListId: string,
  sessionUserId: string
): PendingCommentDraft | null {
  if (!tierListId || !sessionUserId || typeof window === "undefined" || typeof localStorage === "undefined") return null;
  const key = `${COMMENT_DRAFT_PREFIX}${tierListId}_${sessionUserId}`;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      !parsed ||
      typeof parsed !== "object" ||
      Array.isArray(parsed)
    ) {
      return null;
    }
    const d = parsed as Record<string, unknown>;
    if (
      typeof d.pendingId !== "string" ||
      !d.pendingId.trim() ||
      d.tierListId !== tierListId ||
      d.sessionUserId !== sessionUserId ||
      typeof d.content !== "string"
    ) {
      return null;
    }
    return parsed as PendingCommentDraft;
  } catch {
    return null;
  }
}

/**
 * Persists a pending comment attempt before sending.
 * Propagates persistence failures so callers abort comment publication before any cloud write.
 */
export function savePendingCommentDraft(draft: PendingCommentDraft): void {
  if (isSimulateDraftStorageFailure()) {
    throw new Error(getStorageFailureMessage());
  }
  if (
    !draft ||
    !draft.tierListId ||
    !draft.sessionUserId ||
    !draft.pendingId
  ) {
    throw new Error(
      "Cannot save pending comment draft: tierListId, sessionUserId, and pendingId are required."
    );
  }
  if (typeof window !== "undefined" && typeof localStorage === "undefined") {
    throw new Error("Browser localStorage is unavailable. Cannot persist pending comment draft.");
  }
  if (typeof window === "undefined") return;

  const key = `${COMMENT_DRAFT_PREFIX}${draft.tierListId}_${draft.sessionUserId}`;
  try {
    localStorage.setItem(key, JSON.stringify(draft));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Storage error";
    throw new Error(`Failed to persist pending comment draft: ${msg}`);
  }
}

/**
 * Clears a pending comment draft upon confirmed cloud success.
 * Propagates cleanup errors rather than silently ignoring them.
 */
export function clearPendingCommentDraft(
  tierListId: string,
  sessionUserId: string
): void {
  if (!tierListId || !sessionUserId || typeof window === "undefined") return;
  if (typeof localStorage === "undefined") {
    throw new Error("Browser localStorage is unavailable. Cannot clear pending comment draft.");
  }
  const key = `${COMMENT_DRAFT_PREFIX}${tierListId}_${sessionUserId}`;
  try {
    localStorage.removeItem(key);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Storage cleanup error";
    throw new Error(`Failed to clear pending comment draft: ${msg}`);
  }
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
