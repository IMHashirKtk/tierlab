import { NextRequest, NextResponse } from "next/server";
import { isR2Configured, uploadBufferToR2 } from "@/lib/r2";
import { getSupabaseAdmin, isSupabaseAdminConfigured } from "@/lib/server/supabase-admin";

const MAX_ITEMS_PER_BATCH = 12;
const MAX_FILE_SIZE_BYTES = 1 * 1024 * 1024; // 1 MB per individual image
const MAX_TOTAL_PAYLOAD_BYTES = 3.5 * 1024 * 1024; // 3.5 MB max total payload

export interface ImageHeaderInfo {
  mime: "image/png" | "image/jpeg" | "image/gif" | "image/webp";
  width: number;
  height: number;
}

/**
 * Inspects binary magic bytes and extracts pixel dimensions from standard image headers.
 * Blocks decompression bombs and corrupt / forged headers.
 */
export function inspectImageHeader(buf: Buffer): ImageHeaderInfo | null {
  if (!buf || buf.length < 16) return null;

  // 1. PNG: 89 50 4E 47 0D 0A 1A 0A -> IHDR at offset 12 -> Width at 16, Height at 20
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    if (buf.length < 24) return null;
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    return { mime: "image/png", width, height };
  }

  // 2. GIF: "GIF87a" or "GIF89a" -> Width at 6 (uint16LE), Height at 8 (uint16LE)
  if (
    buf[0] === 0x47 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x38 &&
    (buf[4] === 0x37 || buf[4] === 0x39) &&
    buf[5] === 0x61
  ) {
    if (buf.length < 10) return null;
    const width = buf.readUInt16LE(6);
    const height = buf.readUInt16LE(8);
    return { mime: "image/gif", width, height };
  }

  // 3. WebP: "RIFF" .... "WEBP"
  if (
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf.length >= 30 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  ) {
    const chunkType = buf.toString("ascii", 12, 16);

    // Lossy VP8 (RFC 6386 section 9.1)
    if (chunkType === "VP8 ") {
      if (buf.length >= 30 && buf[23] === 0x9d && buf[24] === 0x01 && buf[25] === 0x2a) {
        const width = buf.readUInt16LE(26) & 0x3fff;
        const height = buf.readUInt16LE(28) & 0x3fff;
        return { mime: "image/webp", width, height };
      }
    }

    // Lossless VP8L
    if (chunkType === "VP8L") {
      if (buf.length >= 25 && buf[20] === 0x2f) {
        const b0 = buf[21];
        const b1 = buf[22];
        const b2 = buf[23];
        const b3 = buf[24];
        const width = 1 + (((b1 & 0x3f) << 8) | b0);
        const height = 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6));
        return { mime: "image/webp", width, height };
      }
    }

    // Extended VP8X
    if (chunkType === "VP8X") {
      if (buf.length >= 30) {
        const width = 1 + buf.readUIntLE(24, 3);
        const height = 1 + buf.readUIntLE(27, 3);
        return { mime: "image/webp", width, height };
      }
    }
  }

  // 4. JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    let offset = 2;
    while (offset < buf.length - 8) {
      if (buf[offset] !== 0xff) {
        offset++;
        continue;
      }
      const marker = buf[offset + 1];
      // SOF0 (0xC0), SOF1 (0xC1), SOF2 (0xC2)
      if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
        const height = buf.readUInt16BE(offset + 5);
        const width = buf.readUInt16BE(offset + 7);
        return { mime: "image/jpeg", width, height };
      }
      if (marker === 0xd9 || marker === 0xda) {
        break;
      }
      if (offset + 3 >= buf.length) break;
      const len = buf.readUInt16BE(offset + 2);
      if (len < 2) break;
      offset += 2 + len;
    }
  }

  return null;
}

export async function POST(req: NextRequest) {
  // Check Content-Length to protect serverless memory limits
  const contentLengthHeader = req.headers.get("content-length");
  if (contentLengthHeader) {
    const contentLength = parseInt(contentLengthHeader, 10);
    if (!Number.isNaN(contentLength) && contentLength > MAX_TOTAL_PAYLOAD_BYTES) {
      return NextResponse.json(
        {
          success: false,
          error: `Payload too large: request size (${(contentLength / (1024 * 1024)).toFixed(1)} MB) exceeds 3.5 MB platform limit.`,
        },
        { status: 413 }
      );
    }
  }

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

  // 1. Validate Privileged Server Configuration
  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json(
      {
        success: false,
        error: "Server rate limiting configuration is unavailable.",
      },
      { status: 503 }
    );
  }

  const adminClient = getSupabaseAdmin();
  if (!adminClient) {
    return NextResponse.json(
      {
        success: false,
        error: "Privileged server database client could not be instantiated.",
      },
      { status: 503 }
    );
  }

  // 2. Cryptographic Authentication Token Verification
  const authHeader = req.headers.get("authorization") || "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return NextResponse.json(
      {
        success: false,
        error: "Missing or malformed Authorization header. Expected 'Bearer <token>'.",
      },
      { status: 401 }
    );
  }

  const token = match[1].trim();
  if (!token) {
    return NextResponse.json(
      {
        success: false,
        error: "Empty authorization bearer token.",
      },
      { status: 401 }
    );
  }

  let verifiedUserId: string;
  try {
    const { data: userData, error: authError } = await adminClient.auth.getUser(token);
    if (authError || !userData?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid, expired, or unverified authorization token.",
        },
        { status: 401 }
      );
    }
    verifiedUserId = userData.user.id;
  } catch (authException: any) {
    return NextResponse.json(
      {
        success: false,
        error: `Authorization verification failure: ${authException?.message || "Unknown error"}`,
      },
      { status: 401 }
    );
  }

  // 3. Server-Only Fixed-Window Rate Limiting RPC
  let quotaResult: any;
  try {
    const { data, error } = await adminClient.rpc("consume_upload_quota", {
      v_user_id: verifiedUserId,
    });
    if (error) {
      console.error("Quota limiter RPC error:", error);
      return NextResponse.json(
        {
          success: false,
          error: "Rate limiter service error.",
        },
        { status: 503 }
      );
    }
    quotaResult = data;
  } catch (rpcErr: any) {
    console.error("Quota limiter RPC exception:", rpcErr);
    return NextResponse.json(
      {
        success: false,
        error: "Rate limiter service exception.",
      },
      { status: 503 }
    );
  }

  if (
    !quotaResult ||
    typeof quotaResult !== "object" ||
    typeof quotaResult.allowed !== "boolean"
  ) {
    return NextResponse.json(
      {
        success: false,
        error: "Rate limiter returned an invalid or malformed response.",
      },
      { status: 503 }
    );
  }

  if (!quotaResult.allowed) {
    const retryAfter =
      typeof quotaResult.retry_after === "number" ? quotaResult.retry_after : 60;
    return NextResponse.json(
      {
        success: false,
        error: `Upload rate limit exceeded. You have reached the limit of 30 uploads per 60 seconds. Please wait ${retryAfter} seconds before trying again.`,
        retryAfter,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfter),
        },
      }
    );
  }

  const contentType = req.headers.get("content-type") || "";

  try {
    // 1. JSON Payload: Batch items with base64 data URLs
    if (contentType.includes("application/json")) {
      const rawText = await req.text();
      if (Buffer.byteLength(rawText, "utf8") > MAX_TOTAL_PAYLOAD_BYTES) {
        return NextResponse.json(
          {
            success: false,
            error: "Payload too large: JSON payload exceeds 3.5 MB limit.",
          },
          { status: 413 }
        );
      }

      let body: any;
      try {
        body = JSON.parse(rawText);
      } catch {
        return NextResponse.json(
          { success: false, error: "Invalid JSON body." },
          { status: 400 }
        );
      }

      const items = Array.isArray(body.items) ? body.items : Array.isArray(body.files) ? body.files : null;
      if (!items) {
        return NextResponse.json(
          { success: false, error: "Invalid payload: 'items' array required." },
          { status: 400 }
        );
      }

      if (items.length > MAX_ITEMS_PER_BATCH) {
        return NextResponse.json(
          {
            success: false,
            error: `Batch limit exceeded: maximum ${MAX_ITEMS_PER_BATCH} items per upload request.`,
          },
          { status: 413 }
        );
      }

      // Validate each item
      const parsedBuffers: { item: any; buffer: Buffer; info: ImageHeaderInfo }[] = [];

      for (const item of items) {
        const rawUrl = item.dataUrl || item.imageUrl || item.data || "";

        // If already remote CDN URL, skip validation
        if (rawUrl.startsWith("http://") || rawUrl.startsWith("https://")) {
          continue;
        }

        // Explicitly reject SVG or non-base64
        if (rawUrl.startsWith("data:image/svg+xml")) {
          return NextResponse.json(
            {
              success: false,
              error: `Unsupported media type: SVG uploads are prohibited for security.`,
            },
            { status: 415 }
          );
        }

        if (rawUrl.startsWith("data:")) {
          const commaIdx = rawUrl.indexOf(",");
          if (commaIdx === -1) {
            return NextResponse.json(
              { success: false, error: "Malformed data URL." },
              { status: 400 }
            );
          }

          const base64Len = rawUrl.length - commaIdx - 1;
          const approxBytes = Math.ceil((base64Len * 3) / 4);
          if (approxBytes > MAX_FILE_SIZE_BYTES) {
            return NextResponse.json(
              {
                success: false,
                error: `Payload too large: item "${item.name || "unnamed"}" exceeds 1 MB limit.`,
              },
              { status: 413 }
            );
          }

          const base64Data = rawUrl.slice(commaIdx + 1);
          const buf = Buffer.from(base64Data, "base64");
          if (buf.length > MAX_FILE_SIZE_BYTES) {
            return NextResponse.json(
              {
                success: false,
                error: `Payload too large: item "${item.name || "unnamed"}" exceeds 1 MB limit.`,
              },
              { status: 413 }
            );
          }

          const info = inspectImageHeader(buf);
          if (!info) {
            return NextResponse.json(
              {
                success: false,
                error: `Unsupported media type: binary image header validation failed for item "${item.name || "unnamed"}".`,
              },
              { status: 415 }
            );
          }

          if (info.width > 2048 || info.height > 2048 || info.width < 1 || info.height < 1) {
            return NextResponse.json(
              {
                success: false,
                error: `Image dimensions ${info.width}x${info.height} exceed maximum allowed dimensions (2048x2048).`,
              },
              { status: 422 }
            );
          }

          parsedBuffers.push({ item, buffer: buf, info });
        }
      }

      // Upload validated images to R2
      const uploadedMap = new Map<string, string>();
      for (const entry of parsedBuffers) {
        const uploaded = await uploadBufferToR2({
          buffer: entry.buffer,
          contentType: entry.info.mime,
        });
        uploadedMap.set(entry.item.id, uploaded.url);
      }

      const uploadedItems = items.map((item: any) => {
        if (uploadedMap.has(item.id)) {
          return {
            id: item.id,
            name: item.name,
            imageUrl: uploadedMap.get(item.id),
          };
        }
        return {
          id: item.id,
          name: item.name,
          imageUrl: item.dataUrl || item.imageUrl,
        };
      });

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
            error: `Batch limit exceeded: maximum ${MAX_ITEMS_PER_BATCH} files per upload request.`,
          },
          { status: 400 }
        );
      }

      const validatedFiles: { file: File; buffer: Buffer; info: ImageHeaderInfo }[] = [];

      for (const file of files) {
        if (file.type === "image/svg+xml" || file.name.endsWith(".svg")) {
          return NextResponse.json(
            { success: false, error: "SVG uploads are prohibited for security." },
            { status: 415 }
          );
        }

        if (file.size > MAX_FILE_SIZE_BYTES) {
          return NextResponse.json(
            {
              success: false,
              error: `Payload too large: file "${file.name}" exceeds 1 MB limit.`,
            },
            { status: 413 }
          );
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const info = inspectImageHeader(buffer);
        if (!info) {
          return NextResponse.json(
            {
              success: false,
              error: `Unsupported media type: binary image header validation failed for "${file.name}".`,
            },
            { status: 415 }
          );
        }

        if (info.width > 2048 || info.height > 2048 || info.width < 1 || info.height < 1) {
          return NextResponse.json(
            {
              success: false,
              error: `Image dimensions ${info.width}x${info.height} exceed maximum allowed dimensions (2048x2048).`,
            },
            { status: 422 }
          );
        }

        validatedFiles.push({ file, buffer, info });
      }

      const uploadedFiles = await Promise.all(
        validatedFiles.map(async ({ file, buffer, info }) => {
          const uploaded = await uploadBufferToR2({
            buffer,
            contentType: info.mime,
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
