import { requireUser, getReadiness } from "@/lib/queries";
import { runJson, describeAiError } from "@/lib/ai";
import { buildNichePrompt } from "@/lib/ai/prompts";
import type { AiProvider, BusinessInfo } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    await requireUser();
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { hasKey, hasBusinessInfo, settings, info } = await getReadiness();
  if (!hasKey) return Response.json({ error: "Add your AI key in Settings first." }, { status: 400 });
  if (!hasBusinessInfo || !info)
    return Response.json({ error: "Fill in your business profile first." }, { status: 400 });

  try {
    const { system, prompt } = buildNichePrompt(info as BusinessInfo);
    const out = await runJson<{ niches: string[] }>({
      provider: settings!.ai_provider as AiProvider,
      apiKey: settings!.ai_api_key!,
      model: settings!.ai_model!,
      system,
      prompt,
      maxTokens: 400,
    });
    const niches = (out.niches ?? []).filter((n) => typeof n === "string").slice(0, 6);
    return Response.json({ niches });
  } catch (err) {
    return Response.json({ error: describeAiError(err) }, { status: 500 });
  }
}
