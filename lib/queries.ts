import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  BusinessInfo,
  Lead,
  LeadCardData,
  Search,
  SearchSummary,
  UserSettings,
} from "@/lib/types";

interface TopHitRow {
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
  googlemate_searches: { location: string; keyword: string } | null;
}

/** Returns the authed user + a Supabase client, or throws if unauthenticated. */
export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { user, supabase };
}

export async function getSettings(): Promise<UserSettings | null> {
  const { user, supabase } = await requireUser();
  const { data } = await supabase
    .from("googlemate_user_settings")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  return data as UserSettings | null;
}

export async function getBusinessInfo(): Promise<BusinessInfo | null> {
  const { user, supabase } = await requireUser();
  const { data } = await supabase
    .from("googlemate_business_info")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  return data as BusinessInfo | null;
}

export async function getLatestSearch(): Promise<Search | null> {
  const { user, supabase } = await requireUser();
  const { data } = await supabase
    .from("googlemate_searches")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data as Search | null;
}

export async function getSearch(id: string): Promise<Search | null> {
  const { user, supabase } = await requireUser();
  const { data } = await supabase
    .from("googlemate_searches")
    .select("*")
    .eq("user_id", user.id)
    .eq("id", id)
    .maybeSingle();
  return data as Search | null;
}

export async function getLeadsForSearch(searchId: string): Promise<Lead[]> {
  const { user, supabase } = await requireUser();
  const { data } = await supabase
    .from("googlemate_leads")
    .select("*")
    .eq("user_id", user.id)
    .eq("search_id", searchId)
    .eq("dismissed", false)
    // Newest rescan batch first, best-ranked within each batch.
    .order("created_at", { ascending: false })
    .order("rank", { ascending: true });
  return (data as Lead[]) ?? [];
}

/** All of the user's leads (kept + hidden) as card data, joined with the
 * niche/location of their search, for the filterable Top Hits view. */
export async function getTopHitsLeads(): Promise<LeadCardData[]> {
  const { user, supabase } = await requireUser();
  const { data } = await supabase
    .from("googlemate_leads")
    .select(
      "id,name,rating,review_count,website,email,photo_refs,ai_score,ai_reason,rank,kept,googlemate_searches(location,keyword)",
    )
    .eq("user_id", user.id)
    .eq("dismissed", false)
    .order("kept", { ascending: false })
    .order("created_at", { ascending: false })
    .order("rank", { ascending: true });

  return ((data as unknown as TopHitRow[]) ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    rating: r.rating,
    review_count: r.review_count,
    website: r.website,
    email: r.email,
    photo_refs: r.photo_refs,
    ai_score: r.ai_score,
    ai_reason: r.ai_reason,
    rank: r.rank,
    kept: r.kept,
    location: r.googlemate_searches?.location ?? "",
    keyword: r.googlemate_searches?.keyword ?? "",
  }));
}

/** Previous searches with their lead counts, newest activity first. */
export async function getSearchSummaries(): Promise<SearchSummary[]> {
  const { user, supabase } = await requireUser();
  const { data: searches } = await supabase
    .from("googlemate_searches")
    .select("*")
    .eq("user_id", user.id)
    .order("last_scanned_at", { ascending: false });
  if (!searches?.length) return [];

  const { data: leads } = await supabase
    .from("googlemate_leads")
    .select("search_id")
    .eq("user_id", user.id)
    .eq("dismissed", false)
    .eq("kept", true);
  const counts = new Map<string, number>();
  for (const l of leads ?? []) {
    counts.set(l.search_id, (counts.get(l.search_id) ?? 0) + 1);
  }

  return (searches as Search[]).map((s) => ({
    ...s,
    lead_count: counts.get(s.id) ?? 0,
  }));
}

export async function getLead(id: string): Promise<Lead | null> {
  const { user, supabase } = await requireUser();
  const { data } = await supabase
    .from("googlemate_leads")
    .select("*")
    .eq("user_id", user.id)
    .eq("id", id)
    .maybeSingle();
  return data as Lead | null;
}

/** Whether the user is ready to run a scan (has an AI key + filled business info). */
export async function getReadiness() {
  const [settings, info] = await Promise.all([getSettings(), getBusinessInfo()]);
  return {
    hasKey: Boolean(settings?.ai_api_key),
    hasBusinessInfo: Boolean(info?.business_name && info?.services),
    settings,
    info,
  };
}
