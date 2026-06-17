"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/queries";
import { isValidModel } from "@/lib/ai/models";
import { ENABLED_CRM_IDS } from "@/lib/crm";
import type { AiProvider } from "@/lib/types";

/** Connect (or disconnect) a CRM. Only enabled CRMs are accepted. */
export async function saveCrm(formData: FormData): Promise<{ error?: string }> {
  const provider = String(formData.get("crm_provider") ?? "").trim();
  const apiKey = String(formData.get("crm_api_key") ?? "").trim();
  const locationId = String(formData.get("crm_location_id") ?? "").trim();

  if (provider && !ENABLED_CRM_IDS.has(provider)) {
    return { error: "That CRM isn't available yet." };
  }

  const { user, supabase } = await requireUser();

  const payload: Record<string, unknown> = {
    user_id: user.id,
    crm_provider: provider || null,
    updated_at: new Date().toISOString(),
  };

  if (!provider) {
    // Disconnecting clears the stored credentials.
    payload.crm_api_key = null;
    payload.crm_location_id = null;
  } else {
    payload.crm_location_id = locationId || null;
    if (apiKey) payload.crm_api_key = apiKey; // keep existing key if left blank
  }

  const { error } = await supabase
    .from("googlemate_user_settings")
    .upsert(payload, { onConflict: "user_id" });

  if (error) return { error: error.message };

  revalidatePath("/config");
  return {};
}

/**
 * Persist just the provider + model preference (not the key) the instant the
 * user changes a dropdown, so the choice sticks across refreshes without
 * needing to hit "Save settings". Leaves ai_api_key untouched (PostgREST upsert
 * only writes the columns in the payload).
 */
export async function savePreference(
  provider: AiProvider,
  model: string,
): Promise<{ error?: string }> {
  if (provider !== "anthropic" && provider !== "openai") {
    return { error: "Pick a valid provider." };
  }
  if (!isValidModel(provider, model)) {
    return { error: "Pick a valid model for that provider." };
  }

  const { user, supabase } = await requireUser();
  const { error } = await supabase.from("googlemate_user_settings").upsert(
    {
      user_id: user.id,
      ai_provider: provider,
      ai_model: model,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) return { error: error.message };

  revalidatePath("/config");
  revalidatePath("/search");
  return {};
}

export async function saveSettings(formData: FormData): Promise<{ error?: string }> {
  const provider = String(formData.get("ai_provider")) as AiProvider;
  const apiKey = String(formData.get("ai_api_key") ?? "").trim();
  const model = String(formData.get("ai_model") ?? "").trim();
  const keepRaw = Number(formData.get("keep_count"));
  const keep_count = Number.isFinite(keepRaw)
    ? Math.min(Math.max(Math.round(keepRaw), 1), 30)
    : 5;

  if (provider !== "anthropic" && provider !== "openai") {
    return { error: "Pick a valid provider." };
  }
  if (!isValidModel(provider, model)) {
    return { error: "Pick a valid model for that provider." };
  }

  const { user, supabase } = await requireUser();

  // Don't overwrite a saved key with an empty field (the form masks it).
  const payload: Record<string, unknown> = {
    user_id: user.id,
    ai_provider: provider,
    ai_model: model,
    keep_count,
    updated_at: new Date().toISOString(),
  };
  if (apiKey) payload.ai_api_key = apiKey;

  const { error } = await supabase
    .from("googlemate_user_settings")
    .upsert(payload, { onConflict: "user_id" });

  if (error) return { error: error.message };

  revalidatePath("/config");
  revalidatePath("/search");
  return {};
}
