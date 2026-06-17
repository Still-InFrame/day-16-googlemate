export type AiProvider = "anthropic" | "openai";

export interface UserSettings {
  user_id: string;
  ai_provider: AiProvider;
  ai_api_key: string | null;
  ai_model: string | null;
  keep_count: number;
  crm_provider: string | null;
  crm_api_key: string | null;
  crm_location_id: string | null;
  updated_at: string;
}

export interface BusinessInfo {
  user_id: string;
  business_name: string | null;
  services: string | null;
  ideal_customer: string | null;
  value_prop: string | null;
  voice: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  extra: Record<string, unknown> | null;
  updated_at: string;
}

export interface Search {
  id: string;
  user_id: string;
  location: string;
  keyword: string;
  created_at: string;
  last_scanned_at: string | null;
}

/** A previous search row plus how many leads it has produced. */
export interface SearchSummary extends Search {
  lead_count: number;
}

export interface Sentiment {
  score: number; // 0-100, higher = more positive
  label: string; // e.g. "Positive", "Mixed", "Negative"
  summary: string;
}

export interface WordCloudItem {
  text: string;
  weight: number; // raw frequency
}

export type NapFieldStatus = "match" | "minor" | "mismatch";

export interface NapListing {
  directory: string;
  url: string | null;
  name: string | null;
  address: string | null;
  phone: string | null;
  match: NapFieldStatus; // overall (kept for older reports)
  // Per-field comparison to the canonical Google listing.
  name_match?: NapFieldStatus;
  address_match?: NapFieldStatus;
  phone_match?: NapFieldStatus;
  confidence: number; // 0-100, how confident this listing is actually theirs
  notes: string | null;
}

export interface NapReport {
  canonical: { name: string | null; address: string | null; phone: string | null };
  overall: { consistency_score: number; summary: string };
  listings: NapListing[];
  checked_at: string;
}

export interface PlaceReview {
  author: string | null;
  rating: number | null;
  text: string | null;
  relative_time: string | null;
}

export interface OgPreview {
  title: string | null;
  description: string | null;
  image: string | null;
}

export interface Lead {
  id: string;
  search_id: string;
  user_id: string;
  place_id: string | null;
  name: string;
  rating: number | null;
  review_count: number | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  maps_url: string | null;
  hours: string[] | null;
  reviews: PlaceReview[] | null;
  photo_refs: string[] | null;
  email: string | null;
  og_preview: OgPreview | null;
  ai_score: number | null;
  ai_reason: string | null;
  ai_analysis: string | null;
  pitch_email: string | null;
  sentiment: Sentiment | null;
  word_cloud: WordCloudItem[] | null;
  nap: NapReport | null;
  dismissed: boolean;
  kept: boolean;
  rank: number | null;
  created_at: string;
}

/** Lightweight lead shape for Top Hits cards (+ its search's niche/location). */
export interface LeadCardData {
  id: string;
  name: string;
  rating: number | null;
  review_count: number | null;
  website: string | null;
  email: string | null;
  photo_refs: string[] | null;
  ai_score: number | null;
  ai_reason: string | null;
  rank: number | null;
  kept: boolean;
  location: string;
  keyword: string;
}

/** Progress events streamed from /api/scan as newline-delimited JSON. */
export type ScanEvent =
  | { type: "status"; stage: string; message: string }
  | { type: "done"; searchId: string; leadCount: number }
  | { type: "error"; message: string };
