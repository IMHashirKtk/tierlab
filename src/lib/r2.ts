import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import crypto from "crypto";

const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID || "";
const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || "";
const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || "";
const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || "tierlistmaker-items";
const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL || "";

export type MockR2UploaderFn = (params: {
  buffer: Buffer;
  contentType: string;
  key?: string;
}) => Promise<{ key: string; url: string; size: number }>;

let mockR2Uploader: MockR2UploaderFn | undefined = undefined;

/**
 * Test helper to inject a controlled R2 upload mock during testing.
 */
export function setMockR2Uploader(uploader: MockR2UploaderFn) {
  mockR2Uploader = uploader;
}

export function resetMockR2Uploader() {
  mockR2Uploader = undefined;
}

/**
 * Check if Cloudflare R2 credentials are fully configured
 */
export function isR2Configured(): boolean {
  if (mockR2Uploader !== undefined) {
    return Boolean(mockR2Uploader);
  }
  return Boolean(accountId && accessKeyId && secretAccessKey && bucketName);
}

/**
 * Singleton S3 client instance configured for Cloudflare R2
 */
let s3ClientInstance: S3Client | null = null;

export function getR2Client(): S3Client {
  if (!s3ClientInstance) {
    if (!isR2Configured()) {
      throw new Error("Cloudflare R2 is not configured in environment variables.");
    }
    s3ClientInstance = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }
  return s3ClientInstance;
}

/**
 * Generate a public URL for an R2 key.
 * Prefers Cloudflare public URL if configured; otherwise provides edge proxy route /api/cdn/{key}.
 */
export function getR2PublicUrl(key: string): string {
  const cleanKey = key.replace(/^\/+/, "");
  if (publicUrl && !publicUrl.includes("placeholder")) {
    return `${publicUrl.replace(/\/+$/, "")}/${cleanKey}`;
  }
  return `/api/cdn/${cleanKey}`;
}

/**
 * Upload a binary buffer to Cloudflare R2 with immutable caching headers.
 */
export async function uploadBufferToR2({
  buffer,
  contentType,
  key,
}: {
  buffer: Buffer;
  contentType: string;
  key?: string;
}): Promise<{ key: string; url: string; size: number }> {
  if (mockR2Uploader !== undefined) {
    return mockR2Uploader({ buffer, contentType, key });
  }

  const client = getR2Client();

  // If key is not provided, generate a deterministic SHA-256 hash for deduplication
  const fileKey =
    key ||
    `items/${crypto.createHash("sha256").update(buffer).digest("hex").slice(0, 24)}.${
      contentType === "image/webp"
        ? "webp"
        : contentType === "image/png"
        ? "png"
        : "jpg"
    }`;

  await client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: fileKey,
      Body: buffer,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    })
  );

  return {
    key: fileKey,
    url: getR2PublicUrl(fileKey),
    size: buffer.length,
  };
}

/**
 * Fetch an object directly from R2 for edge proxy streaming.
 */
export async function getObjectFromR2(key: string) {
  const client = getR2Client();
  const res = await client.send(
    new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    })
  );
  return res;
}
