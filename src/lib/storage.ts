/**
 * Local project storage backed by IndexedDB.
 *
 * IndexedDB is used instead of localStorage because boards can contain many
 * compressed image thumbnails (data URLs), which would quickly exceed
 * localStorage's ~5 MB limit.
 */
import type { Project } from "@/types";

const DB_NAME = "tierlistmaker";
const DB_VERSION = 1;
const STORE = "projects";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB is not available in this browser."));
  }
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: "id" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        dbPromise = null; // allow a retry on the next call
        reject(request.error);
      };
    });
  }
  return dbPromise;
}

/** Runs a single request in its own transaction and resolves once the transaction commits. */
function run<T>(mode: IDBTransactionMode, makeRequest: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const request = makeRequest(tx.objectStore(STORE));
        tx.oncomplete = () => resolve(request.result);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      })
  );
}

export function getProject(id: string): Promise<Project | undefined> {
  return run<Project | undefined>("readonly", (store) => store.get(id));
}

export async function saveProject(project: Project): Promise<void> {
  await run("readwrite", (store) => store.put(project));
}

export async function deleteProject(id: string): Promise<void> {
  await run("readwrite", (store) => store.delete(id));
}

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
  let publishedRankings: any[] = [];
  if (typeof window !== "undefined") {
    try {
      publishedRankings = JSON.parse(localStorage.getItem("tl_published_rankings") || "[]");
    } catch {}
  }

  const bundle = {
    version: 1,
    exportedAt: new Date().toISOString(),
    generator: "tierlistmaker.app",
    projects,
    publishedRankings,
  };
  return JSON.stringify(bundle, null, 2);
}

/** Restore projects from a JSON backup bundle. Returns count of restored projects. */
export async function importAllData(jsonString: string): Promise<{ restoredProjects: number }> {
  const parsed = JSON.parse(jsonString);
  const projects: Project[] = Array.isArray(parsed.projects) ? parsed.projects : Array.isArray(parsed) ? parsed : [];

  let count = 0;
  for (const p of projects) {
    if (p.id && Array.isArray(p.tiers)) {
      await saveProject(p);
      count++;
    }
  }

  if (Array.isArray(parsed.publishedRankings) && typeof window !== "undefined") {
    try {
      const existing = JSON.parse(localStorage.getItem("tl_published_rankings") || "[]");
      const merged = [
        ...parsed.publishedRankings,
        ...existing.filter((e: any) => !parsed.publishedRankings.some((p: any) => p.id === e.id)),
      ];
      localStorage.setItem("tl_published_rankings", JSON.stringify(merged));
    } catch {}
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
