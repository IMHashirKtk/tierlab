/**
 * Local project storage backed by IndexedDB.
 *
 * IndexedDB is used instead of localStorage because boards can contain many
 * compressed image thumbnails (data URLs), which would quickly exceed
 * localStorage's ~5 MB limit.
 */
import type { Project, PublishedTierList, Template } from "@/types";

const DB_NAME = "tierlistmaker";
const DB_VERSION = 2;
export const STORE = "projects";
export const TEMPLATE_DRAFTS_STORE = "template_drafts";

let dbPromise: Promise<IDBDatabase> | null = null;

let simulateIdbAbort = false;
let simulateIdbAbortMessage = "Simulated IndexedDB transaction abort";
let simulateSaveProjectFailure = false;
let simulateSaveProjectFailureMessage = "Simulated local project save failure";

export function setSimulateIdbAbort(shouldAbort: boolean, message?: string) {
  simulateIdbAbort = shouldAbort;
  if (message) simulateIdbAbortMessage = message;
}

export function isSimulateIdbAbort(): boolean {
  return simulateIdbAbort;
}

export function setSimulateSaveProjectFailure(shouldFail: boolean, message?: string) {
  simulateSaveProjectFailure = shouldFail;
  if (message) simulateSaveProjectFailureMessage = message;
}

export function isSimulateSaveProjectFailure(): boolean {
  return simulateSaveProjectFailure;
}

export async function resetDbConnectionForTests(): Promise<void> {
  if (dbPromise) {
    try {
      const db = await dbPromise;
      db.close();
    } catch {}
    dbPromise = null;
  }
}

function openDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined" || !indexedDB || typeof indexedDB.open !== "function") {
    dbPromise = null;
    return Promise.reject(
      new Error(
        "Browser storage (IndexedDB) is unavailable. Your draft remains in memory, but cannot be durably saved or published until browser storage is enabled."
      )
    );
  }
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains(TEMPLATE_DRAFTS_STORE)) {
          db.createObjectStore(TEMPLATE_DRAFTS_STORE, { keyPath: "draftId" });
        }
      };
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => {
          db.close();
          dbPromise = null;
        };
        resolve(db);
      };
      request.onerror = () => {
        dbPromise = null; // allow a retry on the next call
        reject(request.error);
      };
      request.onblocked = () => {
        dbPromise = null;
        reject(new Error("IndexedDB upgrade blocked by an open connection."));
      };
    });
  }
  return dbPromise;
}

/** Runs a single request in its own transaction and resolves ONLY once the transaction commits. */
export function runInStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  makeRequest: (store: IDBObjectStore, tx: IDBTransaction) => IDBRequest<T>
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(storeName, mode);
        const request = makeRequest(tx.objectStore(storeName), tx);

        if (mode === "readwrite" && isSimulateIdbAbort()) {
          try {
            tx.abort();
          } catch {}
        }

        tx.oncomplete = () => resolve(request.result);
        tx.onerror = () =>
          reject(tx.error || new Error("IndexedDB transaction failed."));
        tx.onabort = () =>
          reject(
            tx.error ||
              new Error(
                isSimulateIdbAbort()
                  ? simulateIdbAbortMessage
                  : "IndexedDB transaction aborted before commit."
              )
          );
      })
  );
}

function run<T>(mode: IDBTransactionMode, makeRequest: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return runInStore(STORE, mode, (store) => makeRequest(store));
}

export function getProject(id: string): Promise<Project | undefined> {
  return run<Project | undefined>("readonly", (store) => store.get(id));
}

export async function saveProject(project: Project): Promise<void> {
  if (isSimulateSaveProjectFailure()) {
    throw new Error(simulateSaveProjectFailureMessage);
  }
  await run("readwrite", (store) => store.put(project));
}

export async function deleteProject(id: string): Promise<void> {
  await run("readwrite", (store) => store.delete(id));
}

export { duplicateProject } from "./draft-storage";

/** All saved projects, most recently edited first. */
export async function listProjects(): Promise<Project[]> {
  const projects = await run<Project[]>("readonly", (store) => store.getAll());
  return projects.sort((a, b) => b.updatedAt - a.updatedAt);
}

/** Purge all local projects from IndexedDB */
export async function clearAllProjects(): Promise<void> {
  await run("readwrite", (store) => store.clear());
}

/** Export entire local storage as a JSON backup bundle */
export async function exportAllData(): Promise<string> {
  const projects = await listProjects();
  let userTemplates: Template[] = [];
  let publishedRankings: PublishedTierList[] = [];
  let commenterName: string | null = null;

  if (typeof window !== "undefined") {
    try {
      userTemplates = JSON.parse(localStorage.getItem("tl_user_templates") || "[]");
    } catch {}
    try {
      publishedRankings = JSON.parse(localStorage.getItem("tl_published_rankings") || "[]");
    } catch {}
    try {
      commenterName = localStorage.getItem("tl_commenter_name");
    } catch {}
  }

  const bundle = {
    version: "1.0",
    exportedAt: new Date().toISOString(),
    generator: "tierlistmaker.app",
    projects,
    tl_user_templates: userTemplates,
    tl_published_rankings: publishedRankings,
    tl_commenter_name: commenterName,
    publishedRankings, // backward compatibility
  };
  return JSON.stringify(bundle, null, 2);
}

/** Restore projects from a JSON backup bundle. Validates strict schema and returns count of restored projects. */
export async function importAllData(jsonString: string): Promise<{ restoredProjects: number }> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    throw new Error("Invalid backup file: Not valid JSON.");
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Invalid backup file: Root must be an object.");
  }

  const root = parsed as Record<string, unknown>;

  if (root.version === undefined || (typeof root.version !== "string" && typeof root.version !== "number")) {
    throw new Error("Invalid backup file: Missing or invalid version string.");
  }

  if (!Array.isArray(root.projects)) {
    throw new Error("Invalid backup file: Missing 'projects' array.");
  }

  for (let i = 0; i < root.projects.length; i++) {
    const p = root.projects[i] as Record<string, unknown> | null | undefined;
    if (!p || typeof p !== "object" || Array.isArray(p)) {
      throw new Error(`Invalid project at index ${i}: Project must be an object.`);
    }
    if (typeof p.id !== "string" || !p.id.trim()) {
      throw new Error(`Invalid project at index ${i}: Missing or invalid project id.`);
    }
    if (typeof p.title !== "string") {
      throw new Error(`Invalid project "${p.id}": Missing or invalid title.`);
    }
    if (!Array.isArray(p.tiers)) {
      throw new Error(`Invalid project "${p.id}": 'tiers' must be an array.`);
    }
    if (!Array.isArray(p.unranked)) {
      throw new Error(`Invalid project "${p.id}": 'unranked' must be an array.`);
    }

    for (let tIdx = 0; tIdx < p.tiers.length; tIdx++) {
      const tier = p.tiers[tIdx] as Record<string, unknown> | null | undefined;
      if (!tier || typeof tier !== "object" || Array.isArray(tier)) {
        throw new Error(`Invalid tier at index ${tIdx} in project "${p.id}": Tier must be an object.`);
      }
      if (typeof tier.id !== "string" || !tier.id.trim()) {
        throw new Error(`Invalid tier at index ${tIdx} in project "${p.id}": Missing tier id.`);
      }
      if (typeof tier.label !== "string") {
        throw new Error(`Invalid tier "${tier.id}" in project "${p.id}": Missing tier label.`);
      }
      if (typeof tier.color !== "string") {
        throw new Error(`Invalid tier "${tier.id}" in project "${p.id}": Missing tier color.`);
      }
      if (!Array.isArray(tier.items)) {
        throw new Error(`Invalid tier "${tier.id}" in project "${p.id}": 'items' must be an array.`);
      }
      for (let itemIdx = 0; itemIdx < tier.items.length; itemIdx++) {
        const item = tier.items[itemIdx] as Record<string, unknown> | null | undefined;
        if (!item || typeof item !== "object" || typeof item.id !== "string" || typeof item.name !== "string") {
          throw new Error(`Invalid item at index ${itemIdx} in tier "${tier.id}" of project "${p.id}": Items must have 'id' and 'name'.`);
        }
      }
    }

    for (let uIdx = 0; uIdx < p.unranked.length; uIdx++) {
      const item = p.unranked[uIdx] as Record<string, unknown> | null | undefined;
      if (!item || typeof item !== "object" || typeof item.id !== "string" || typeof item.name !== "string") {
        throw new Error(`Invalid item at index ${uIdx} in unranked of project "${p.id}": Items must have 'id' and 'name'.`);
      }
    }
  }

  // All projects validated successfully. Persist to storage.
  let count = 0;
  for (const rawProj of root.projects) {
    await saveProject(rawProj as Project);
    count++;
  }

  if (typeof window !== "undefined") {
    // Restore user templates if present
    if (Array.isArray(root.tl_user_templates)) {
      try {
        const existing: Template[] = JSON.parse(localStorage.getItem("tl_user_templates") || "[]");
        const incoming = root.tl_user_templates as Template[];
        const merged = [
          ...incoming,
          ...existing.filter((e) => !incoming.some((p) => p.id === e.id)),
        ];
        localStorage.setItem("tl_user_templates", JSON.stringify(merged));
      } catch {}
    }

    // Restore published rankings if present
    const incomingRankings = Array.isArray(root.tl_published_rankings)
      ? (root.tl_published_rankings as PublishedTierList[])
      : Array.isArray(root.publishedRankings)
      ? (root.publishedRankings as PublishedTierList[])
      : null;

    if (incomingRankings) {
      try {
        const existing: PublishedTierList[] = JSON.parse(localStorage.getItem("tl_published_rankings") || "[]");
        const merged = [
          ...incomingRankings,
          ...existing.filter((e) => !incomingRankings.some((p) => p.id === e.id)),
        ];
        localStorage.setItem("tl_published_rankings", JSON.stringify(merged));
      } catch {}
    }

    // Restore commenter name if present
    if (typeof root.tl_commenter_name === "string" && root.tl_commenter_name.trim()) {
      localStorage.setItem("tl_commenter_name", root.tl_commenter_name.trim());
    }
  }

  return { restoredProjects: count };
}

/** Calculate storage usage estimates from browser */
export async function getStorageEstimate(): Promise<{
  usedBytes: number;
  quotaBytes: number;
  projectCount: number;
  itemCount: number;
}> {
  let usedBytes = 0;
  let quotaBytes = 0;

  if (typeof navigator !== "undefined" && navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      usedBytes = estimate.usage || 0;
      quotaBytes = estimate.quota || 0;
    } catch {}
  }

  const projects = await listProjects().catch(() => []);
  const itemCount = projects.reduce(
    (sum, p) => sum + p.tiers.reduce((tSum, t) => tSum + t.items.length, 0) + p.unranked.length,
    0
  );

  return {
    usedBytes,
    quotaBytes,
    projectCount: projects.length,
    itemCount,
  };
}
