import { getPublicCatalog } from "@/lib/server/catalog";
export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim().slice(0, 80).toLocaleLowerCase() || "";
  if (!query) return Response.json([]);
  try {
    const results = (await getPublicCatalog()).filter(t => `${t.title} ${t.description} ${t.category}`.toLocaleLowerCase().includes(query)).slice(0, 6)
      .map(({ id, slug, title, category, itemCount }) => ({ id, slug, title, category, itemCount }));
    return Response.json(results, { headers: { "Cache-Control": "public, max-age=60, s-maxage=300" } });
  } catch { return Response.json([], { status: 503, headers: { "Cache-Control": "no-store" } }); }
}
