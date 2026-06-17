import { NextRequest } from "next/server";
import { requireUser, getSettings } from "@/lib/queries";
import { placeDetails } from "@/lib/google/places";
import { enrichFromWebsite, fetchSiteProfile } from "@/lib/scrape/site";
import { runJson, describeAiError } from "@/lib/ai";
import {
  buildBusinessPrefillPrompt,
  buildBusinessPrefillFromSitePrompt,
} from "@/lib/ai/prompts";
import type { AiProvider, UserSettings } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 45;

interface PrefillFields {
  business_name: string;
  services: string;
  ideal_customer: string;
  value_prop: string;
  voice: string;
}

function normalizeFields(f: Partial<PrefillFields>, fallbackName = ""): PrefillFields {
  return {
    business_name: f.business_name ?? fallbackName,
    services: f.services ?? "",
    ideal_customer: f.ideal_customer ?? "",
    value_prop: f.value_prop ?? "",
    voice: f.voice ?? "",
  };
}

/**
 * Draft the user's business profile from either:
 *  - a chosen Google listing (`placeId`), or
 *  - their website URL (`url`), the path for remote/online-only businesses
 *    that aren't on Google Maps.
 */
export async function POST(req: NextRequest) {
  try {
    await requireUser();
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await getSettings();
  if (!settings?.ai_api_key) {
    return Response.json(
      { error: "Add your AI API key in Settings first to auto-fill." },
      { status: 400 },
    );
  }
  const ai = {
    provider: (settings as UserSettings).ai_provider as AiProvider,
    apiKey: settings.ai_api_key,
    model: settings.ai_model!,
  };

  const { placeId, url } = (await req.json()) as { placeId?: string; url?: string };

  try {
    // Website path (works for businesses with no Google listing).
    if (url?.trim()) {
      const profile = await fetchSiteProfile(url);
      if (!profile || (!profile.text && !profile.og)) {
        return Response.json(
          {
            error:
              "Couldn't read that website. Check the URL, or fill the fields in manually.",
          },
          { status: 422 },
        );
      }
      const { system, prompt } = buildBusinessPrefillFromSitePrompt(
        url,
        profile.text,
        profile.og,
      );
      const fields = await runJson<PrefillFields>({ ...ai, system, prompt, maxTokens: 800 });
      return Response.json({ fields: normalizeFields(fields), website: url });
    }

    // Google listing path.
    if (placeId) {
      const detail = await placeDetails(placeId);
      const site = detail.website
        ? await enrichFromWebsite(detail.website)
        : { og: null };
      const { system, prompt } = buildBusinessPrefillPrompt(detail, site.og);
      const fields = await runJson<PrefillFields>({ ...ai, system, prompt, maxTokens: 800 });
      return Response.json({
        fields: normalizeFields(fields, detail.name),
        website: detail.website ?? null,
      });
    }

    return Response.json({ error: "Pick a business or paste a website URL." }, { status: 400 });
  } catch (err) {
    return Response.json({ error: describeAiError(err) }, { status: 500 });
  }
}
