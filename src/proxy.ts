import { NextResponse, type NextRequest } from "next/server";
import { CATEGORIES } from "@/data/categories";
import { supabase } from "@/lib/supabase";
import { templatePath } from "@/lib/template-url";
import { STARTER_TEMPLATE_IDS } from "@/lib/catalog";

const categoryIds = new Set(CATEGORIES.filter(category => category.id !== "all").map(category => category.id));

/** Reject unknown categories before streaming can commit a successful response. */
export async function proxy(request: NextRequest) {
  const segments = request.nextUrl.pathname.split("/").filter(Boolean);
  if (segments[0] === "template") {
    if (segments.length !== 2 || !supabase) return NextResponse.next();
    let id: string;
    try { id = decodeURIComponent(segments[1]); } catch { return NextResponse.next(); }
    if (STARTER_TEMPLATE_IDS.has(id)) return NextResponse.next();
    // The original ID remains the permanent alias. RLS excludes moderated rows.
    const lookup = () => supabase!.from("templates").select("id, slug")
      .eq("id", id).abortSignal(AbortSignal.timeout(8000)).maybeSingle();
    let result = await lookup();
    // Retry a transient transport/upstream failure once with a fresh signal.
    if (result.error && (!result.status || result.status >= 500)) result = await lookup();
    const { data, error } = result;
    if (error) {
      console.warn("Template redirect lookup failed", { code: error.code, message: error.message });
      return new NextResponse("Template lookup temporarily unavailable", {
        status: 503, headers: { "Retry-After": "60", "Cache-Control": "no-store" },
      });
    }
    if (data?.slug && data.slug !== id) {
      const destination = request.nextUrl.clone();
      destination.pathname = templatePath(data);
      // Explicit 301: Next's permanentRedirect uses 308 instead.
      return NextResponse.redirect(destination, 301);
    }
    return NextResponse.next();
  }
  const validCategory = categoryIds.has(segments[1]);
  const categoryPage = segments.length === 4 && segments[2] === "page" && /^[1-9]\d*$/.test(segments[3]) && Number(segments[3]) >= 2;
  if (validCategory && (segments.length === 2 || categoryPage)) return NextResponse.next();
  return new NextResponse(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Category not found | Tier List Maker</title></head><body style="margin:0;background:#09090b;color:#f4f4f5;font:16px system-ui"><main style="max-width:600px;margin:15vh auto;padding:24px"><p>Tier List Maker</p><h1>Category not found</h1><p>Choose one of our available categories or start your own tier list.</p><p><a style="color:#a5b4fc" href="/#categories">Browse categories</a> · <a style="color:#a5b4fc" href="/create">Create a tier list</a></p></main></body></html>`, {
    status: 404,
    headers: { "Content-Type": "text/html; charset=utf-8", "X-Robots-Tag": "noindex" },
  });
}

export const config = { matcher: ["/categories/:path*", "/template/:path*"] };
