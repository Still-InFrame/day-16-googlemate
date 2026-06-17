"use server";

import { revalidatePath } from "next/cache";
import { requireUser, getLead, getSettings, getBusinessInfo } from "@/lib/queries";
import { runJson, runWebSearchJson, describeAiError } from "@/lib/ai";
import { buildPitchPrompt, buildNapPrompt } from "@/lib/ai/prompts";
import { buildWordCloud } from "@/lib/reviews";
import { sanitizeCopy } from "@/lib/utils";
import type { PlaceDetail } from "@/lib/google/places";
import type {
  AiProvider,
  BusinessInfo,
  Lead,
  NapListing,
  NapReport,
  Sentiment,
} from "@/lib/types";

function detailFromLead(lead: Lead): PlaceDetail {
  return {
    placeId: lead.place_id ?? "",
    name: lead.name,
    rating: lead.rating,
    reviewCount: lead.review_count,
    website: lead.website,
    address: lead.address,
    mapsUrl: lead.maps_url,
    phone: lead.phone,
    hours: lead.hours,
    reviews: lead.reviews,
    photoNames: lead.photo_refs ?? [],
  };
}

/** Remove a business from Top Hits. Kept in the DB (dismissed) so the dedup
 * filter still excludes it from future scans. */
export async function dismissLead(leadId: string): Promise<{ error?: string }> {
  const { user, supabase } = await requireUser();
  const { error } = await supabase
    .from("googlemate_leads")
    .update({ dismissed: true })
    .eq("id", leadId)
    .eq("user_id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/top-hits");
  return {};
}

/** Restore a dismissed lead (undo a removal). */
export async function undismissLead(leadId: string): Promise<{ error?: string }> {
  const { user, supabase } = await requireUser();
  const { error } = await supabase
    .from("googlemate_leads")
    .update({ dismissed: false })
    .eq("id", leadId)
    .eq("user_id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/top-hits");
  return {};
}

/** Regenerate sentiment, word cloud, analysis, and pitch for an existing lead
 * using the current prompts (for leads scanned before these features). */
export async function reanalyzeLead(leadId: string): Promise<{ error?: string }> {
  const [lead, settings, info] = await Promise.all([
    getLead(leadId),
    getSettings(),
    getBusinessInfo(),
  ]);

  if (!lead) return { error: "Lead not found." };
  if (!settings?.ai_api_key) return { error: "Add your AI API key in Settings first." };
  if (!info) return { error: "Fill in your business profile first." };

  const detail = detailFromLead(lead);

  try {
    const { system, prompt } = buildPitchPrompt(info as BusinessInfo, detail, lead.email);
    const out = await runJson<{
      analysis: string;
      sentiment: Sentiment;
      pitch_email: string;
    }>({
      provider: settings.ai_provider as AiProvider,
      apiKey: settings.ai_api_key,
      model: settings.ai_model!,
      system,
      prompt,
      maxTokens: 1500,
    });

    const sentiment = out.sentiment
      ? { ...out.sentiment, summary: sanitizeCopy(out.sentiment.summary) ?? "" }
      : null;

    const { user, supabase } = await requireUser();
    const { error } = await supabase
      .from("googlemate_leads")
      .update({
        ai_analysis: sanitizeCopy(out.analysis) ?? null,
        sentiment,
        word_cloud: buildWordCloud(lead.reviews),
        pitch_email: sanitizeCopy(out.pitch_email) ?? null,
      })
      .eq("id", leadId)
      .eq("user_id", user.id);
    if (error) return { error: error.message };

    revalidatePath(`/lead/${leadId}`);
    return {};
  } catch (err) {
    return { error: describeAiError(err) };
  }
}

/** Check NAP (Name/Address/Phone) accuracy across directories via web search. */
export async function checkNap(leadId: string): Promise<{ error?: string }> {
  const [lead, settings] = await Promise.all([getLead(leadId), getSettings()]);
  if (!lead) return { error: "Lead not found." };
  if (!settings?.ai_api_key) return { error: "Add your AI API key in Settings first." };

  const detail = detailFromLead(lead);

  try {
    const { system, prompt } = buildNapPrompt(detail);
    const out = await runWebSearchJson<{
      overall: { consistency_score: number; summary: string };
      listings: NapListing[];
    }>({
      provider: settings.ai_provider as AiProvider,
      apiKey: settings.ai_api_key,
      model: settings.ai_model!,
      system,
      prompt,
      maxTokens: 3000,
    });

    const listings = (out.listings ?? []).map((l) => ({
      ...l,
      notes: sanitizeCopy(l.notes) ?? null,
    }));

    const report: NapReport = {
      canonical: { name: lead.name, address: lead.address, phone: lead.phone },
      overall: {
        consistency_score: Math.round(out.overall?.consistency_score ?? 0),
        summary: sanitizeCopy(out.overall?.summary) ?? "",
      },
      listings,
      checked_at: new Date().toISOString(),
    };

    const { user, supabase } = await requireUser();
    const { error } = await supabase
      .from("googlemate_leads")
      .update({ nap: report })
      .eq("id", leadId)
      .eq("user_id", user.id);
    if (error) return { error: error.message };

    revalidatePath(`/lead/${leadId}`);
    return {};
  } catch (err) {
    return { error: describeAiError(err) };
  }
}
