import { getPublicCatalog } from "@/lib/server/catalog";
import { getPublicSubmissions } from "@/lib/server/submissions";
import { calculateConsensus } from "@/lib/consensus";
export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id || id.length > 150) return Response.json(null, { status: 400 });
  try {
    const template = (await getPublicCatalog()).find(t => t.id === id);
    if (!template) return Response.json(null, { status: 404 });
    const submissions = await getPublicSubmissions(id);
    const result = submissions.length >= 5 ? calculateConsensus(template, submissions) : null;
    return Response.json(result, { headers: { "Cache-Control": "public, max-age=60, s-maxage=300" } });
  } catch { return Response.json(null, { status: 503, headers: { "Cache-Control": "no-store" } }); }
}
