import { NextRequest } from "next/server";
import { requireUser, getReadiness } from "@/lib/queries";
import { placesTextSearch, placeDetails } from "@/lib/google/places";
import { enrichFromWebsite } from "@/lib/scrape/site";
import { runJson, describeAiError } from "@/lib/ai";
import { buildRankPrompt, buildPitchPrompt } from "@/lib/ai/prompts";
import { buildWordCloud } from "@/lib/reviews";
import { sanitizeCopy } from "@/lib/utils";
import type { ScanEvent, AiProvider, BusinessInfo, Sentiment } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const CANDIDATE_COUNT = 30;
const DEFAULT_KEEP = 5;

export async function POST(req: NextRequest) {
  const { location, keyword } = (await req.json()) as {
    location?: string;
    keyword?: string;
  };

  if (!location?.trim() || !keyword?.trim()) {
    return Response.json({ error: "Location and keyword are required." }, { status: 400 });
  }
  const loc = location.trim();
  const kw = keyword.trim();

  const { user, supabase } = await requireUser();
  const { hasKey, hasBusinessInfo, settings, info } = await getReadiness();

  if (!hasKey) {
    return Response.json(
      { error: "Add your AI API key on the Settings page first." },
      { status: 400 },
    );
  }
  if (!hasBusinessInfo || !info) {
    return Response.json(
      { error: "Fill in your business profile (My Business) first." },
      { status: 400 },
    );
  }

  const ai = {
    provider: settings!.ai_provider as AiProvider,
    apiKey: settings!.ai_api_key!,
    model: settings!.ai_model!,
  };
  const businessInfo = info as BusinessInfo;
  const keepCount = Math.min(Math.max(settings!.keep_count ?? DEFAULT_KEEP, 1), CANDIDATE_COUNT);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (e: ScanEvent) =>
        controller.enqueue(encoder.encode(JSON.stringify(e) + "\n"));
      const status = (stage: string, message: string) =>
        send({ type: "status", stage, message });

      try {
        // 1. Google Places search
        status("search", `Searching Google for "${kw}" in ${loc}...`);
        const query = `${kw} in ${loc}`;
        const places = await placesTextSearch(query, CANDIDATE_COUNT);

        if (places.length === 0) {
          send({ type: "error", message: "No businesses found for that search. Try a broader keyword or location." });
          controller.close();
          return;
        }

        // 2. Dedup against businesses already saved for this user (natural filter).
        const { data: existing } = await supabase
          .from("googlemate_leads")
          .select("place_id")
          .eq("user_id", user.id);
        const seen = new Set((existing ?? []).map((r) => r.place_id));
        const fresh = places.filter((p) => p.placeId && !seen.has(p.placeId));

        if (fresh.length === 0) {
          send({
            type: "error",
            message:
              "Every business for this search is already in your list. Try a new keyword or nearby location for fresh prospects.",
          });
          controller.close();
          return;
        }

        // 3. AI ranking, keep the user's chosen count of the fresh set
        status("rank", `Ranking ${fresh.length} new leads through your business lens...`);
        const { system, prompt } = buildRankPrompt(businessInfo, fresh, keepCount);
        const ranked = await runJson<{
          picks: { index: number; score: number; reason: string }[];
        }>({ ...ai, system, prompt, maxTokens: 1600 });

        const survivors = (ranked.picks ?? [])
          .filter((p) => p.index >= 1 && p.index <= fresh.length)
          .slice(0, keepCount)
          .map((p) => ({ place: fresh[p.index - 1], score: p.score, reason: p.reason }));

        if (survivors.length === 0) {
          send({ type: "error", message: "The AI couldn't rank these results. Try again." });
          controller.close();
          return;
        }

        // The fresh businesses that did not make the cut are kept as hidden
        // leads (basic data only) so they persist and are deduped out later.
        const survivorIds = new Set(survivors.map((s) => s.place.placeId));
        const tossed = fresh.filter((p) => !survivorIds.has(p.placeId));

        // 4. Reuse the search row for this query if it exists (so rescans share
        //    one entry with an original + latest timestamp), else create it.
        const now = new Date().toISOString();
        const { data: prior } = await supabase
          .from("googlemate_searches")
          .select("id")
          .eq("user_id", user.id)
          .ilike("location", loc)
          .ilike("keyword", kw)
          .maybeSingle();

        let searchId: string;
        if (prior?.id) {
          searchId = prior.id as string;
          await supabase
            .from("googlemate_searches")
            .update({ last_scanned_at: now })
            .eq("id", searchId);
        } else {
          const { data: created, error: createErr } = await supabase
            .from("googlemate_searches")
            .insert({ user_id: user.id, location: loc, keyword: kw, last_scanned_at: now })
            .select("id")
            .single();
          if (createErr || !created) throw new Error(createErr?.message ?? "Could not save search");
          searchId = created.id as string;
        }

        // 5. Details + contact/OG enrichment for each survivor (in parallel)
        status("details", `Pulling details, reviews & contacts for your top ${survivors.length}...`);
        const enriched = await Promise.all(
          survivors.map(async (s) => {
            const detail = await placeDetails(s.place.placeId);
            const site = detail.website
              ? await enrichFromWebsite(detail.website)
              : { email: null, og: null };
            return { ...s, detail, email: site.email, og: site.og };
          }),
        );

        // 6. Persist leads NOW, before the slow per-lead pitch generation. The
        //    pitch step makes one AI call per survivor and can push the request
        //    past Vercel's 60s function limit; if the save waited until after it
        //    (as it used to), a timeout meant the function was killed before
        //    anything was written and the scan showed no results. Saving first
        //    means the leads always land, with full details + score + word cloud;
        //    pitch/analysis/sentiment fill in next (or via "Refresh insights" on
        //    the lead page if the function is cut short).
        status("save", "Saving your top hits...");
        const survivorRows = enriched.map((e, i) => ({
          search_id: searchId,
          user_id: user.id,
          place_id: e.detail.placeId,
          name: e.detail.name,
          rating: e.detail.rating,
          review_count: e.detail.reviewCount,
          phone: e.detail.phone,
          website: e.detail.website,
          address: e.detail.address,
          maps_url: e.detail.mapsUrl,
          hours: e.detail.hours,
          reviews: e.detail.reviews,
          photo_refs: e.detail.photoNames,
          email: e.email,
          og_preview: e.og,
          ai_score: Math.round(e.score),
          ai_reason: e.reason,
          word_cloud: buildWordCloud(e.detail.reviews),
          kept: true,
          rank: i + 1,
        }));

        const { data: insertedSurvivors, error: leadsErr } = await supabase
          .from("googlemate_leads")
          .insert(survivorRows)
          .select("id, place_id");
        if (leadsErr) throw new Error(leadsErr.message);

        const tossedRows = tossed.map((p) => ({
          search_id: searchId,
          user_id: user.id,
          place_id: p.placeId,
          name: p.name,
          rating: p.rating,
          review_count: p.reviewCount,
          website: p.website,
          address: p.address,
          maps_url: p.mapsUrl,
          kept: false,
          rank: null,
        }));
        if (tossedRows.length) {
          await supabase.from("googlemate_leads").insert(tossedRows);
        }

        // 7. Write each survivor's pitch + analysis + sentiment and update its
        //    row as it completes (best-effort). A lead whose pitch is cut off by
        //    a timeout keeps its full profile and can be refreshed from its page.
        const idByPlace = new Map(
          (insertedSurvivors ?? []).map((r) => [r.place_id as string, r.id as string]),
        );
        status("pitch", "Analyzing reviews and writing tailored pitches...");
        await Promise.all(
          enriched.map(async (e) => {
            const id = idByPlace.get(e.detail.placeId);
            if (!id) return;
            try {
              const p = buildPitchPrompt(businessInfo, e.detail, e.email);
              const out = await runJson<{
                analysis: string;
                sentiment: Sentiment;
                pitch_email: string;
              }>({ ...ai, system: p.system, prompt: p.prompt, maxTokens: 1500 });
              const sentiment = out.sentiment
                ? { ...out.sentiment, summary: sanitizeCopy(out.sentiment.summary) ?? "" }
                : null;
              await supabase
                .from("googlemate_leads")
                .update({
                  ai_analysis: sanitizeCopy(out.analysis) ?? null,
                  sentiment,
                  pitch_email: sanitizeCopy(out.pitch_email) ?? null,
                })
                .eq("id", id)
                .eq("user_id", user.id);
            } catch {
              // Leave insights pending; the lead is already saved and can be
              // completed with "Refresh insights" on its page.
            }
          }),
        );

        send({ type: "done", searchId, leadCount: survivorRows.length });
        controller.close();
      } catch (err) {
        send({ type: "error", message: describeAiError(err) });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
