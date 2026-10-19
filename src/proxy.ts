import { NextResponse, type NextRequest } from "next/server";
import { CATEGORIES } from "@/data/categories";

const categoryIds = new Set(CATEGORIES.filter(category => category.id !== "all").map(category => category.id));

/** Reject unknown categories before streaming can commit a successful response. */
export function proxy(request: NextRequest) {
  const segments = request.nextUrl.pathname.split("/").filter(Boolean);
  if (segments.length === 2 && categoryIds.has(segments[1])) return NextResponse.next();
  return new NextResponse(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Category not found | Tier List Maker</title></head><body style="margin:0;background:#09090b;color:#f4f4f5;font:16px system-ui"><main style="max-width:600px;margin:15vh auto;padding:24px"><p>Tier List Maker</p><h1>Category not found</h1><p>Choose one of our available categories or start your own tier list.</p><p><a style="color:#a5b4fc" href="/#categories">Browse categories</a> · <a style="color:#a5b4fc" href="/create">Create a tier list</a></p></main></body></html>`, {
    status: 404,
    headers: { "Content-Type": "text/html; charset=utf-8", "X-Robots-Tag": "noindex" },
  });
}

export const config = { matcher: "/categories/:path*" };
