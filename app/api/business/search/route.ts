import { NextRequest } from "next/server";
import { requireUser } from "@/lib/queries";
import { placesTextSearch, placesConfigured } from "@/lib/google/places";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Find candidate Google listings for the user's OWN business (to prefill My Business). */
export async function POST(req: NextRequest) {
  try {
    await requireUser();
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!placesConfigured()) {
    return Response.json(
      { error: "Google Places isn't configured on the server yet." },
      { status: 400 },
    );
  }

  const { query } = (await req.json()) as { query?: string };
  if (!query?.trim()) {
    return Response.json({ error: "Enter your business name and location." }, { status: 400 });
  }

  try {
    const results = (await placesTextSearch(query, 5)).map((p) => ({
      placeId: p.placeId,
      name: p.name,
      address: p.address,
      rating: p.rating,
      reviewCount: p.reviewCount,
    }));
    return Response.json({ results });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Search failed" },
      { status: 500 },
    );
  }
}
