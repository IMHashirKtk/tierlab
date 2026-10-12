/**
 * Client-side image compression utility.
 * Resizes and converts user-uploaded photos to sharp, lightweight WebP thumbnails (~12-20 KB)
 * directly in the browser before rendering or saving.
 */

export interface CompressedImageResult {
  id: string;
  name: string;
  dataUrl: string;
  originalSize: number;
  compressedSize: number;
}

export async function compressImage(
  file: File,
  maxDimension = 240,
  quality = 0.85
): Promise<CompressedImageResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Calculate square aspect-ratio crop / resize
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          reject(new Error("Unable to create canvas context"));
          return;
        }

        // Determine center crop coordinates for square tile
        const minSide = Math.min(img.width, img.height);
        const startX = (img.width - minSide) / 2;
        const startY = (img.height - minSide) / 2;

        canvas.width = maxDimension;
        canvas.height = maxDimension;

        // Image smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        // Draw cropped & scaled square
        ctx.drawImage(
          img,
          startX,
          startY,
          minSide,
          minSide,
          0,
          0,
          maxDimension,
          maxDimension
        );

        // Export as WebP (fallback to JPEG if WebP unsupported)
        let dataUrl = canvas.toDataURL("image/webp", quality);
        if (!dataUrl.startsWith("data:image/webp")) {
          dataUrl = canvas.toDataURL("image/jpeg", quality);
        }

        // Clean filename (remove extension)
        const cleanName = file.name.replace(/\.[^/.]+$/, "");

        // Approximate compressed size in bytes
        const compressedBytes = Math.round((dataUrl.length * 3) / 4);

        resolve({
          id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          name: cleanName,
          dataUrl,
          originalSize: file.size,
          compressedSize: compressedBytes,
        });
      };

      img.onerror = () => reject(new Error(`Failed to load image: ${file.name}`));
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
    reader.readAsDataURL(file);
  });
}

export async function compressBatchImages(
  files: FileList | File[],
  onProgress?: (completed: number, total: number) => void
): Promise<CompressedImageResult[]> {
  const fileArray = Array.from(files);
  const results: CompressedImageResult[] = [];

  for (let i = 0; i < fileArray.length; i++) {
    try {
      const result = await compressImage(fileArray[i]);
      results.push(result);
      if (onProgress) onProgress(i + 1, fileArray.length);
    } catch (err) {
      console.warn(`Skipping invalid image ${fileArray[i].name}`, err);
    }
  }

  return results;
}
