import type { Item } from "@/types";

/**
 * Uploads local items with base64 data URLs to Cloudflare R2 CDN.
 * Returns items with persistent public CDN image URLs.
 * Gracefully falls back to original items if offline or if storage is unreachable.
 */
export async function uploadItemsToCloud(
  items: Item[],
  onProgress?: (message: string) => void
): Promise<Item[]> {
  const hasBase64 = items.some(
    (i) => i.imageUrl && i.imageUrl.startsWith("data:")
  );

  if (!hasBase64) {
    return items;
  }

  onProgress?.("Uploading items to Cloudflare R2 CDN...");

  try {
    const res = await fetch("/api/upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ items }),
    });

    if (!res.ok) {
      console.warn("R2 upload API returned status:", res.status);
      return items;
    }

    const data = await res.json();
    if (data.success && Array.isArray(data.items)) {
      onProgress?.("Assets successfully hosted on Cloud CDN!");
      return data.items;
    }

    return items;
  } catch (err) {
    console.warn("Cloud upload encountered an error, using local fallback:", err);
    return items;
  }
}
