/**
 * Local project storage backed by IndexedDB.
 *
 * IndexedDB is used instead of localStorage because boards can contain many
 * compressed image thumbnails (data URLs), which would quickly exceed
 * localStorage's ~5 MB limit.
 */
import type { Project } from "@/types";

const DB_NAME = "tierlab";
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
