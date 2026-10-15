import type { Item } from "@/types";
import { getAuthenticatedSessionToken } from "@/lib/supabase";

/**
 * Validates that an image URL returned by the upload API is a non-empty, persistent, secure CDN URL.
 * Rejects data:, blob:, javascript:, vbscript:, file:, malformed URLs, and unsupported protocols.
 * Supports:
 *  - Absolute https:// or http:// URLs with valid hostnames (e.g. Cloudflare R2 bucket or custom domain)
 *  - Relative /api/cdn/... proxy paths
 */
export function validatePersistentImageUrl(itemId: string, url: unknown): string {
  if (typeof url !== "string" || !url.trim()) {
    throw new Error(`Upload failed: Item "${itemId}" is missing a persistent image URL.`);
  }

  const trimmed = url.trim();
  const lower = trimmed.toLowerCase();

  if (lower.startsWith("data:")) {
    throw new Error(`Upload failed: Item "${itemId}" returned a data URL instead of a persistent CDN URL.`);
  }

  if (lower.startsWith("blob:")) {
    throw new Error(`Upload failed: Item "${itemId}" returned a blob URL instead of a persistent CDN URL.`);
  }

  if (lower.startsWith("javascript:")) {
    throw new Error(`Upload failed: Item "${itemId}" returned an insecure javascript URL.`);
  }

  if (lower.startsWith("vbscript:") || lower.startsWith("file:")) {
    throw new Error(`Upload failed: Item "${itemId}" returned an unsupported URL scheme.`);
  }

  // Support local Next.js proxy CDN route: /api/cdn/{key}
  if (trimmed.startsWith("/api/cdn/")) {
    const key = trimmed.slice("/api/cdn/".length);
    if (!key || key.includes("..") || key.includes("//") || /[\s<>"'`\\]/.test(key)) {
      throw new Error(`Upload failed: Item "${itemId}" returned a malformed CDN path: "${trimmed}".`);
    }
    return trimmed;
  }

  // Support standard absolute HTTP / HTTPS URLs (e.g. Cloudflare R2 public bucket or CDN domain)
  if (trimmed.startsWith("https://") || trimmed.startsWith("http://")) {
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
        throw new Error("Invalid protocol");
      }
      if (
        !parsed.hostname ||
        parsed.hostname.includes(" ") ||
        (!parsed.hostname.includes(".") && parsed.hostname !== "localhost")
      ) {
        throw new Error("Invalid hostname");
      }
      return trimmed;
    } catch {
      throw new Error(`Upload failed: Item "${itemId}" returned a malformed URL: "${trimmed}".`);
    }
  }

  throw new Error(`Upload failed: Item "${itemId}" returned an invalid or unsupported image URL format: "${trimmed}".`);
}

/**
 * Uploads local items with base64 data URLs to Cloudflare R2 CDN.
 * Batches items in sequential chunks of at most 8 items (or max 2.5 MB)
 * to comply with Vercel's 4.5 MB request payload limit.
 * Sends verified Authorization Bearer token with requests.
 * Throws on authentication, rate limit (429), or server (503) errors.
 * Validates batch response completeness, ID matching, and persistent CDN URLs before applying updates.
 * Returns items with persistent public CDN image URLs only upon complete success.
 */
export async function uploadItemsToCloud(
  items: Item[],
  onProgress?: (message: string) => void
): Promise<Item[]> {
  const needsUpload = items.some((i) => i.imageUrl && i.imageUrl.startsWith("data:"));
  if (!needsUpload) {
    return items;
  }

  // 1. Establish/obtain client authentication token.
  // Throws if anonymous auth fails/is disabled.
  onProgress?.("Authenticating upload session...");
  const token = await getAuthenticatedSessionToken();
  if (!token) {
    throw new Error("Authentication failed: No valid access token available.");
  }

  // Create an immutable working copy of items to ensure input array and objects are never mutated
  const workingItems: Item[] = items.map((it) => ({ ...it }));

  // Identify items needing upload and record their indices in workingItems
  const uploadIndices: number[] = [];
  workingItems.forEach((it, idx) => {
    if (it.imageUrl && it.imageUrl.startsWith("data:")) {
      uploadIndices.push(idx);
    }
  });

  const totalToUpload = uploadIndices.length;
  let uploadedCount = 0;

  // Chunk indices into batches of at most 8 items and max 2.5 MB total size per chunk
  const batches: number[][] = [];
  let currentBatch: number[] = [];
  let currentBatchBytes = 0;

  for (const idx of uploadIndices) {
    const item = workingItems[idx];
    const itemBytes = (item.imageUrl?.length || 0) + (item.name?.length || 0) + 128;
    if (
      currentBatch.length >= 8 ||
      (currentBatchBytes + itemBytes > 2.5 * 1024 * 1024 && currentBatch.length > 0)
    ) {
      batches.push(currentBatch);
      currentBatch = [idx];
      currentBatchBytes = itemBytes;
    } else {
      currentBatch.push(idx);
      currentBatchBytes += itemBytes;
    }
  }
  if (currentBatch.length > 0) {
    batches.push(currentBatch);
  }

  for (let b = 0; b < batches.length; b++) {
    const batchIndices = batches[b];
    const batchItems = batchIndices.map((idx) => workingItems[idx]);

    onProgress?.(`Hosting items on Cloudflare R2 CDN (${uploadedCount}/${totalToUpload})...`);

    const res = await fetch("/api/upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ items: batchItems }),
    });

    if (!res.ok) {
      let serverErrorMsg = `Upload failed with HTTP ${res.status}`;
      try {
        const errJson = await res.json();
        if (errJson.error) {
          serverErrorMsg = errJson.error;
        }
      } catch {}

      if (res.status === 401) {
        throw new Error(`Authentication failed (401): ${serverErrorMsg}`);
      }
      if (res.status === 429) {
        const retryAfter = res.headers.get("Retry-After");
        throw new Error(
          `Upload rate limit exceeded: ${serverErrorMsg}${
            retryAfter ? ` (Retry after ${retryAfter}s)` : ""
          }`
        );
      }
      if (res.status === 503) {
        throw new Error(`Service temporarily unavailable (503): ${serverErrorMsg}`);
      }
      throw new Error(serverErrorMsg);
    }

    let data: any;
    try {
      data = await res.json();
    } catch {
      throw new Error("Upload failed: Server returned an invalid JSON response.");
    }

    if (!data || typeof data !== "object") {
      throw new Error("Upload failed: Server returned an empty or non-object response.");
    }

    if (data.success !== true) {
      throw new Error(data.error || "Upload failed: Server indicated upload was unsuccessful.");
    }

    if (!Array.isArray(data.items)) {
      throw new Error("Upload failed: Server response is missing 'items' array.");
    }

    // Returned item count must equal requested batch item count
    if (data.items.length !== batchItems.length) {
      throw new Error(
        `Upload failed: Batch size mismatch. Requested ${batchItems.length} items but server returned ${data.items.length} items.`
      );
    }

    // Validate the ENTIRE batch response before updating workingItems
    const requestedMap = new Map<string, number>();
    for (const idx of batchIndices) {
      requestedMap.set(workingItems[idx].id, idx);
    }

    const seenIds = new Set<string>();
    const validatedUpdates: { targetIdx: number; persistentUrl: string }[] = [];

    for (const returnedItem of data.items) {
      if (!returnedItem || typeof returnedItem !== "object") {
        throw new Error("Upload failed: Batch item in server response is invalid.");
      }

      const id = returnedItem.id;
      if (!id || typeof id !== "string") {
        throw new Error("Upload failed: Server returned an item with missing or invalid ID.");
      }

      if (!requestedMap.has(id)) {
        throw new Error(`Upload failed: Server returned unexpected item ID "${id}".`);
      }

      if (seenIds.has(id)) {
        throw new Error(`Upload failed: Duplicate item ID "${id}" returned in batch response.`);
      }
      seenIds.add(id);

      const validatedUrl = validatePersistentImageUrl(id, returnedItem.imageUrl);
      const targetIdx = requestedMap.get(id)!;
      validatedUpdates.push({ targetIdx, persistentUrl: validatedUrl });
    }

    // Ensure every requested item was returned
    for (const reqItem of batchItems) {
      if (!seenIds.has(reqItem.id)) {
        throw new Error(`Upload failed: Missing item "${reqItem.id}" in upload response.`);
      }
    }

    // Now that the entire batch has been validated without error, commit updates
    // Match returned items to requested items by ID, preserving original metadata
    for (const update of validatedUpdates) {
      workingItems[update.targetIdx] = {
        ...workingItems[update.targetIdx],
        imageUrl: update.persistentUrl,
      };
    }

    uploadedCount += batchItems.length;
    onProgress?.(`Hosting items on Cloudflare R2 CDN (${uploadedCount}/${totalToUpload})...`);
  }

  onProgress?.("Assets successfully hosted on Cloud CDN!");
  return workingItems;
}

