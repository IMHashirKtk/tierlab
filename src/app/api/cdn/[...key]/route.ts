import { NextRequest, NextResponse } from "next/server";
import { isR2Configured, getObjectFromR2 } from "@/lib/r2";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ key: string[] }> }
) {
  if (!isR2Configured()) {
    return new NextResponse("Storage not configured", { status: 503 });
  }

  const { key } = await params;
  const objectKey = key.join("/");

  try {
    const s3Object = await getObjectFromR2(objectKey);

    if (!s3Object.Body) {
      return new NextResponse("Not Found", { status: 404 });
    }

    // Convert S3 body stream to web ReadableStream
    const stream = s3Object.Body.transformToWebStream();

    const headers = new Headers();
    headers.set("Content-Type", s3Object.ContentType || "image/webp");
    // 1-year immutable edge CDN cache
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
    headers.set("CDN-Cache-Control", "public, max-age=31536000, immutable");
    if (s3Object.ETag) headers.set("ETag", s3Object.ETag);

    return new NextResponse(stream as any, {
      status: 200,
      headers,
    });
  } catch (err: any) {
    if (err.name === "NoSuchKey" || err.$metadata?.httpStatusCode === 404) {
      return new NextResponse("Item not found", { status: 404 });
    }
    console.error("CDN Proxy Error:", err);
    return new NextResponse("Failed to fetch asset", { status: 500 });
  }
}
