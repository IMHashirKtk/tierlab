import { NextRequest, NextResponse } from "next/server";
import { isR2Configured, uploadBufferToR2 } from "@/lib/r2";

const ALLOWED_MIME_TYPES = new Set([
  "image/webp",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/svg+xml",
]);

const MAX_ITEMS_PER_BATCH = 60;
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB per file

export async function POST(req: NextRequest) {
  if (!isR2Configured()) {
    return NextResponse.json(
      {
        success: false,
        error: "Cloudflare R2 is not configured on the server.",
        fallback: true,
      },
      { status: 503 }
    );
  }

  const contentType = req.headers.get("content-type") || "";

  try {
    // 1. JSON Payload: Batch items with base64 data URLs
    if (contentType.includes("application/json")) {
      const body = await req.json();
      const items = body.items;

      if (!Array.isArray(items)) {
        return NextResponse.json(
          { success: false, error: "Invalid payload: 'items' array required." },
          { status: 400 }
        );
      }

      if (items.length > MAX_ITEMS_PER_BATCH) {
        return NextResponse.json(
          {
            success: false,
            error: `Batch limit exceeded: maximum ${MAX_ITEMS_PER_BATCH} items per upload.`,
          },
          { status: 400 }
        );
      }

      // Check all base64 sizes before uploading
      for (const item of items) {
        const rawUrl = item.dataUrl || item.imageUrl || "";
        if (rawUrl.startsWith("data:")) {
          const commaIdx = rawUrl.indexOf(",");
          if (commaIdx !== -1) {
            const base64Len = rawUrl.length - commaIdx - 1;
            const approxBytes = Math.ceil((base64Len * 3) / 4);
            if (approxBytes > MAX_FILE_SIZE_BYTES) {
              return NextResponse.json(
                {
                  success: false,
                  error: `Payload too large: item "${item.name || "unnamed"}" exceeds 5 MB limit.`,
                },
                { status: 413 }
              );
            }
          }
        }
      }

      const uploadedItems = await Promise.all(
        items.map(async (item: { id: string; name: string; dataUrl?: string; imageUrl?: string }) => {
          const rawUrl = item.dataUrl || item.imageUrl || "";

          // If already a remote CDN URL, keep it
          if (rawUrl.startsWith("http://") || rawUrl.startsWith("https://")) {
            return {
              id: item.id,
              name: item.name,
              imageUrl: rawUrl,
            };
          }

          // If base64 data URL, decode and upload to R2
          if (rawUrl.startsWith("data:")) {
            const match = rawUrl.match(/^data:([a-zA-Z0-9/+.-]+);base64,(.+)$/);
            if (!match) {
              return { id: item.id, name: item.name, imageUrl: rawUrl };
            }

            const mime = match[1];
            const base64Data = match[2];

            if (!ALLOWED_MIME_TYPES.has(mime)) {
              return { id: item.id, name: item.name, imageUrl: rawUrl };
            }

            const buffer = Buffer.from(base64Data, "base64");
            const uploaded = await uploadBufferToR2({
              buffer,
              contentType: mime,
            });

            return {
              id: item.id,
              name: item.name,
              imageUrl: uploaded.url,
            };
          }

          return item;
        })
      );

      return NextResponse.json({
        success: true,
        items: uploadedItems,
      });
    }

    // 2. FormData Payload: Direct binary file uploads
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const files: File[] = [];

      for (const entry of formData.values()) {
        if (entry instanceof File) {
          files.push(entry);
        }
      }

      if (files.length === 0) {
        return NextResponse.json(
          { success: false, error: "No files found in form data." },
          { status: 400 }
        );
      }

      if (files.length > MAX_ITEMS_PER_BATCH) {
        return NextResponse.json(
          {
            success: false,
            error: `Batch limit exceeded: maximum ${MAX_ITEMS_PER_BATCH} files per upload.`,
          },
          { status: 400 }
        );
      }

      for (const file of files) {
        if (file.size > MAX_FILE_SIZE_BYTES) {
          return NextResponse.json(
            {
              success: false,
              error: `Payload too large: file "${file.name}" exceeds 5 MB limit.`,
            },
            { status: 413 }
          );
        }
      }

      const uploadedFiles = await Promise.all(
        files.map(async (file) => {
          if (!ALLOWED_MIME_TYPES.has(file.type)) {
            throw new Error(`Unsupported file type: ${file.type}`);
          }

          const arrayBuffer = await file.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const uploaded = await uploadBufferToR2({
            buffer,
            contentType: file.type,
          });

          return {
            name: file.name,
            url: uploaded.url,
            key: uploaded.key,
            size: uploaded.size,
          };
        })
      );

      return NextResponse.json({
        success: true,
        files: uploadedFiles,
      });
    }

    return NextResponse.json(
      { success: false, error: "Unsupported Content-Type header." },
      { status: 400 }
    );
  } catch (err: any) {
    console.error("R2 Upload Error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to upload to Cloudflare R2." },
      { status: 500 }
    );
  }
}
