import "server-only";
import type { PlaceReview } from "@/lib/types";

/**
 * Google Places API (New) client. App-level key, server-only, never exposed to
 * the browser. Search uses a lean field mask (cheap SKU); the richer Details
 * call (photos/reviews/hours) runs only for the ~5 survivors to conserve quota.
 */

const KEY = process.env.GOOGLE_PLACES_API_KEY;
const BASE = "https://places.googleapis.com/v1";

// The app key may be HTTP-referrer restricted (a browser-style restriction).
// Server requests carry no Referer, so Google blocks them. We send an allowed
// referer so a restricted key still works server-side. Best practice is still
// to set the key's Application restriction to "None"; this makes either setup
// work. Override the referer with GOOGLE_PLACES_REFERER if your allowlist differs.
const REFERER = process.env.GOOGLE_PLACES_REFERER || "https://googlemate.100dayaichallenge.com";

export interface PlaceLite {
  placeId: string;
  name: string;
  rating: number | null;
  reviewCount: number | null;
  website: string | null;
  address: string | null;
  mapsUrl: string | null;
}

export interface PlaceDetail extends PlaceLite {
  phone: string | null;
  hours: string[] | null;
  reviews: PlaceReview[] | null;
  photoNames: string[];
}

export function placesConfigured() {
  return Boolean(KEY);
}

function ensureKey() {
  if (!KEY) {
    throw new Error(
      "GOOGLE_PLACES_API_KEY is not set on the server. Add it to .env.local (and Vercel) and restart.",
    );
  }
  return KEY;
}

type RawPlace = {
  id?: string;
  displayName?: { text?: string };
  rating?: number;
  userRatingCount?: number;
  websiteUri?: string;
  formattedAddress?: string;
  googleMapsUri?: string;
  nationalPhoneNumber?: string;
  regularOpeningHours?: { weekdayDescriptions?: string[] };
  reviews?: Array<{
    authorAttribution?: { displayName?: string };
    rating?: number;
    text?: { text?: string };
    originalText?: { text?: string };
    relativePublishTimeDescription?: string;
  }>;
  photos?: Array<{ name?: string }>;
};

function toLite(p: RawPlace): PlaceLite {
  return {
    placeId: p.id ?? "",
    name: p.displayName?.text ?? "Unknown business",
    rating: p.rating ?? null,
    reviewCount: p.userRatingCount ?? null,
    website: p.websiteUri ?? null,
    address: p.formattedAddress ?? null,
    mapsUrl: p.googleMapsUri ?? null,
  };
}

/**
 * Text search, e.g. "plumbers in Miami, FL". Returns up to `count` places,
 * paginating (20 per page) via nextPageToken to reach counts above 20.
 */
export async function placesTextSearch(
  query: string,
  count = 30,
): Promise<PlaceLite[]> {
  const key = ensureKey();
  const pageSize = Math.min(count, 20);
  const results: PlaceLite[] = [];
  let pageToken: string | undefined;

  // Up to 3 pages covers 60 results; we stop once we hit `count`.
  for (let page = 0; page < 3 && results.length < count; page++) {
    const res = await fetch(`${BASE}/places:searchText`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        Referer: REFERER,
        "X-Goog-FieldMask":
          "nextPageToken,places.id,places.displayName,places.rating,places.userRatingCount,places.websiteUri,places.formattedAddress,places.googleMapsUri",
      },
      // Every param except pageToken must match across pages.
      body: JSON.stringify({
        textQuery: query,
        pageSize,
        languageCode: "en",
        ...(pageToken ? { pageToken } : {}),
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      if (page > 0) break; // a paging hiccup: keep what we have
      throw new Error(`Google Places search failed (${res.status}): ${body.slice(0, 300)}`);
    }

    const data = (await res.json()) as { places?: RawPlace[]; nextPageToken?: string };
    for (const p of data.places ?? []) results.push(toLite(p));
    pageToken = data.nextPageToken;
    if (!pageToken) break;
  }

  return results.slice(0, count);
}

/** Full details for one place: phone, hours, reviews, photo references. */
export async function placeDetails(placeId: string): Promise<PlaceDetail> {
  const key = ensureKey();
  const res = await fetch(`${BASE}/places/${encodeURIComponent(placeId)}`, {
    headers: {
      "X-Goog-Api-Key": key,
      Referer: REFERER,
      "X-Goog-FieldMask":
        "id,displayName,rating,userRatingCount,websiteUri,formattedAddress,googleMapsUri,nationalPhoneNumber,regularOpeningHours,reviews,photos",
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Google Places details failed (${res.status}): ${body.slice(0, 300)}`);
  }

  const p = (await res.json()) as RawPlace;
  const reviews: PlaceReview[] = (p.reviews ?? []).slice(0, 5).map((r) => ({
    author: r.authorAttribution?.displayName ?? null,
    rating: r.rating ?? null,
    text: r.text?.text ?? r.originalText?.text ?? null,
    relative_time: r.relativePublishTimeDescription ?? null,
  }));

  return {
    ...toLite(p),
    placeId,
    phone: p.nationalPhoneNumber ?? null,
    hours: p.regularOpeningHours?.weekdayDescriptions ?? null,
    reviews: reviews.length ? reviews : null,
    photoNames: (p.photos ?? [])
      .map((ph) => ph.name)
      .filter((n): n is string => Boolean(n))
      .slice(0, 8),
  };
}

/**
 * Fetch a Places photo's raw bytes for the image proxy. `photoName` looks like
 * "places/<id>/photos/<ref>". Returns the image body + content type.
 */
export async function fetchPlacePhoto(
  photoName: string,
  maxWidthPx = 1200,
): Promise<{ body: ArrayBuffer; contentType: string }> {
  const key = ensureKey();
  const url = `${BASE}/${photoName}/media?maxWidthPx=${maxWidthPx}&key=${key}`;
  const res = await fetch(url, { redirect: "follow", headers: { Referer: REFERER } });
  if (!res.ok) {
    throw new Error(`Places photo fetch failed (${res.status})`);
  }
  return {
    body: await res.arrayBuffer(),
    contentType: res.headers.get("content-type") ?? "image/jpeg",
  };
}
