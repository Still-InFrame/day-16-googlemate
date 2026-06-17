import { NextRequest } from "next/server";
import { requireUser } from "@/lib/queries";
import { fetchPlacePhoto } from "@/lib/google/places";

export const runtime = "nodejs";

/**
 * Image proxy for Google Places photos. Keeps the app's Places key server-side,
 * the browser only ever sees /api/photo?name=places/<id>/photos/<ref>.
 * Requires an authenticated session (the middleware excludes this route, so we
 * gate here).
 */
export async function GET(req: NextRequest) {
  try {
    await requireUser();
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }

  const name = req.nextUrl.searchParams.get("name");
  if (!name || !name.startsWith("places/")) {
    return new Response("Bad request", { status: 400 });
  }

  const width = Number(req.nextUrl.searchParams.get("w") ?? "1200");

  try {
    const { body, contentType } = await fetchPlacePhoto(name, width);
    return new Response(body, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return new Response("Photo unavailable", { status: 502 });
  }
}
