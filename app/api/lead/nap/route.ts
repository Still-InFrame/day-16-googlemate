import { NextRequest } from "next/server";
import { requireUser, getLead, getSettings } from "@/lib/queries";
import { runWebSearchJsonStreaming, describeAiError } from "@/lib/ai";
import { buildNapPrompt } from "@/lib/ai/prompts";
import { sanitizeCopy } from "@/lib/utils";
import type { PlaceDetail } from "@/lib/google/places";
import type { AiProvider, NapListing, NapReport, ScanEvent } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const { leadId } = (await req.json()) as { leadId?: string };
  if (!leadId) return Response.json({ error: "Missing lead." }, { status: 400 });

  await requireUser();
  const [lead, settings] = await Promise.all([getLead(leadId), getSettings()]);
  if (!lead) return Response.json({ error: "Lead not found." }, { status: 404 });
  if (!settings?.ai_api_key)
    return Response.json({ error: "Add your AI API key in Settings first." }, { status: 400 });

  const detail: PlaceDetail = {
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

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (e: ScanEvent) =>
        controller.enqueue(encoder.encode(JSON.stringify(e) + "\n"));

      try {
        send({ type: "status", stage: "start", message: `Looking up ${lead.name} across directories…` });

        const { system, prompt } = buildNapPrompt(detail);
        const out = await runWebSearchJsonStreaming<{
          overall: { consistency_score: number; summary: string };
          listings: NapListing[];
        }>({
          provider: settings.ai_provider as AiProvider,
          apiKey: settings.ai_api_key!,
          model: settings.ai_model!,
          system,
          prompt,
          maxTokens: 3000,
          onStatus: (stage, message) => send({ type: "status", stage, message }),
        });

        send({ type: "status", stage: "save", message: "Saving the report…" });

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
        if (error) throw new Error(error.message);

        send({ type: "done", searchId: leadId, leadCount: listings.length });
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
