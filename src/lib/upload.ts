import type { Item } from "@/types";
import { getAuthenticatedSessionToken } from "@/lib/supabase";

/**
 * Uploads local items with base64 data URLs to Cloudflare R2 CDN.
 * Batches items in sequential chunks of at most 8 items (or max 2.5 MB)
 * to comply with Vercel's 4.5 MB request payload limit.
 * Sends verified Authorization Bearer token with requests.
 * Throws on authentication, rate limit (429), or server (503) errors.
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

  const resultItems = [...items];
  const itemsToUploadIndices: number[] = [];
  resultItems.forEach((it, idx) => {
    if (it.imageUrl && it.imageUrl.startsWith("data:")) {
      itemsToUploadIndices.push(idx);
    }
  });

  const totalToUpload = itemsToUploadIndices.length;
  let uploadedCount = 0;

  // Chunk indices into batches of at most 8 items and max 2.5 MB total size per chunk
  const batches: number[][] = [];
  let currentBatch: number[] = [];
  let currentBatchBytes = 0;

  for (const idx of itemsToUploadIndices) {
    const item = resultItems[idx];
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
    const batchItems = batchIndices.map((idx) => resultItems[idx]);

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

    const data = await res.json();
    if (!data.success || !Array.isArray(data.items)) {
      throw new Error(data.error || "Upload failed: Server returned an invalid response.");
    }

    data.items.forEach((uploaded: Item, i: number) => {
      const originalIdx = batchIndices[i];
      resultItems[originalIdx] = uploaded;
    });

    uploadedCount += batchItems.length;
    onProgress?.(`Hosting items on Cloudflare R2 CDN (${uploadedCount}/${totalToUpload})...`);
  }

  onProgress?.("Assets successfully hosted on Cloud CDN!");
  return resultItems;
}

