import type { Item } from "@/types";

/**
 * Uploads local items with base64 data URLs to Cloudflare R2 CDN.
 * Batches items in sequential chunks of at most 8 items (or max 2.5 MB)
 * to comply with Vercel's 4.5 MB request payload limit.
 * Returns items with persistent public CDN image URLs.
 */
export async function uploadItemsToCloud(
  items: Item[],
  onProgress?: (message: string) => void
): Promise<Item[]> {
  const needsUpload = items.some((i) => i.imageUrl && i.imageUrl.startsWith("data:"));
  if (!needsUpload) {
    return items;
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

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ items: batchItems }),
      });

      if (!res.ok) {
        console.warn(`Batch upload ${b + 1}/${batches.length} returned status:`, res.status);
      } else {
        const data = await res.json();
        if (data.success && Array.isArray(data.items)) {
          data.items.forEach((uploaded: Item, i: number) => {
            const originalIdx = batchIndices[i];
            resultItems[originalIdx] = uploaded;
          });
        }
      }
    } catch (err) {
      console.warn(`Batch upload ${b + 1} exception:`, err);
    }

    uploadedCount += batchItems.length;
    onProgress?.(`Hosting items on Cloudflare R2 CDN (${uploadedCount}/${totalToUpload})...`);
  }

  onProgress?.("Assets successfully hosted on Cloud CDN!");
  return resultItems;
}
