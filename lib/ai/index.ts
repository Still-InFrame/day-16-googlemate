import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import type { AiProvider } from "@/lib/types";

/**
 * Provider abstraction. Both adapters expose the same runText/runJson surface so
 * the scan pipeline never branches on provider. Keys are passed in per-call and
 * read server-side only, they never reach the client.
 *
 * Model lists + key instructions live in ./models (client-safe).
 */

export * from "@/lib/ai/models";

interface RunArgs {
  provider: AiProvider;
  apiKey: string;
  model: string;
  system: string;
  prompt: string;
  maxTokens?: number;
}

export async function runText({
  provider,
  apiKey,
  model,
  system,
  prompt,
  maxTokens = 1500,
}: RunArgs): Promise<string> {
  if (provider === "anthropic") {
    const client = new Anthropic({ apiKey });
    const msg = await client.messages.create({
      model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: prompt }],
    });
    return msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
  }

  const client = new OpenAI({ apiKey });
  const res = await client.chat.completions.create({
    model,
    max_completion_tokens: maxTokens,
    messages: [
      { role: "system", content: system },
      { role: "user", content: prompt },
    ],
  });
  return res.choices[0]?.message?.content?.trim() ?? "";
}

/**
 * Run a prompt expected to return JSON. We ask for raw JSON and parse
 * defensively (models occasionally wrap output in prose or code fences), so the
 * same path works across both providers without provider-specific schema modes.
 */
export async function runJson<T = unknown>({
  provider,
  apiKey,
  model,
  system,
  prompt,
  maxTokens = 2500,
}: RunArgs): Promise<T> {
  const jsonSystem = `${system}\n\nRespond with ONLY valid JSON, no markdown, no code fences, no commentary.`;

  let raw: string;
  if (provider === "anthropic") {
    const client = new Anthropic({ apiKey });
    const msg = await client.messages.create({
      model,
      max_tokens: maxTokens,
      system: jsonSystem,
      messages: [{ role: "user", content: prompt }],
    });
    raw = msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
  } else {
    const client = new OpenAI({ apiKey });
    const res = await client.chat.completions.create({
      model,
      max_completion_tokens: maxTokens,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: jsonSystem },
        { role: "user", content: `${prompt}\n\nReturn a single JSON object.` },
      ],
    });
    raw = res.choices[0]?.message?.content ?? "";
  }

  return extractJson<T>(raw);
}

/**
 * Run a prompt that needs live web search (e.g. finding a business across
 * directories), returning parsed JSON. Anthropic uses the server-side
 * web_search tool; OpenAI uses the Responses API web_search tool. Web search
 * bills extra on the user's key.
 */
export async function runWebSearchJson<T = unknown>({
  provider,
  apiKey,
  model,
  system,
  prompt,
  maxTokens = 3000,
}: RunArgs): Promise<T> {
  const jsonSystem = `${system}\n\nWhen finished, respond with ONLY valid JSON, no markdown, no code fences, no commentary.`;

  let raw: string;
  if (provider === "anthropic") {
    const client = new Anthropic({ apiKey });
    const messages: Anthropic.MessageParam[] = [{ role: "user", content: prompt }];
    let resp: Anthropic.Message | undefined;

    // Server tools can pause (pause_turn) when they hit the per-turn search
    // limit; re-send to resume, a few times at most.
    for (let i = 0; i < 4; i++) {
      resp = await client.messages.create({
        model,
        max_tokens: maxTokens,
        system: jsonSystem,
        tools: [
          { type: "web_search_20260209", name: "web_search" },
        ] as unknown as Anthropic.MessageCreateParams["tools"],
        messages,
      });
      if (resp.stop_reason === "pause_turn") {
        messages.push({ role: "assistant", content: resp.content });
        continue;
      }
      break;
    }
    raw = (resp?.content ?? [])
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
  } else {
    const client = new OpenAI({ apiKey });
    const res = await client.responses.create({
      model,
      tools: [{ type: "web_search_preview" }],
      input: `${jsonSystem}\n\n${prompt}`,
    } as unknown as Parameters<typeof client.responses.create>[0]);
    raw = (res as { output_text?: string }).output_text ?? "";
  }

  return extractJson<T>(raw);
}

/**
 * Like runWebSearchJson, but streams progress: `onStatus` is called as the
 * model issues each search query and gets results, so the UI can show live
 * step-by-step activity. Anthropic surfaces real queries; OpenAI gets coarser
 * stages (its Responses API web search isn't streamed here).
 */
export async function runWebSearchJsonStreaming<T = unknown>({
  provider,
  apiKey,
  model,
  system,
  prompt,
  maxTokens = 3000,
  onStatus,
}: RunArgs & { onStatus: (stage: string, message: string) => void }): Promise<T> {
  const jsonSystem = `${system}\n\nWhen finished, respond with ONLY valid JSON, no markdown, no code fences, no commentary.`;

  if (provider !== "anthropic") {
    onStatus("search", "Searching directories across the web…");
    const result = await runWebSearchJson<T>({ provider, apiKey, model, system, prompt, maxTokens });
    onStatus("analyze", "Comparing listings to the Google profile…");
    return result;
  }

  const client = new Anthropic({ apiKey });
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: prompt }];
  let raw = "";

  for (let round = 0; round < 3; round++) {
    const stream = client.messages.stream({
      model,
      max_tokens: maxTokens,
      system: jsonSystem,
      tools: [
        { type: "web_search_20260209", name: "web_search" },
      ] as unknown as Anthropic.MessageCreateParams["tools"],
      messages,
    });

    let toolInput = "";
    let inSearch = false;
    let analyzed = false;
    let searchCount = 0;

    for await (const event of stream) {
      if (event.type === "content_block_start") {
        const cb = event.content_block as {
          type: string;
          name?: string;
          content?: unknown;
        };
        if (cb.type === "server_tool_use" && cb.name === "web_search") {
          inSearch = true;
          toolInput = "";
        } else if (cb.type === "web_search_tool_result") {
          const results = Array.isArray(cb.content) ? cb.content : [];
          const domains = results
            .map((r) => {
              try {
                return new URL((r as { url?: string }).url ?? "").hostname.replace(/^www\./, "");
              } catch {
                return "";
              }
            })
            .filter(Boolean);
          const uniq = [...new Set(domains)].slice(0, 3);
          onStatus(
            "results",
            `Found ${results.length} result${results.length === 1 ? "" : "s"}${
              uniq.length ? " — " + uniq.join(", ") : ""
            }`,
          );
        } else if (cb.type === "text" && searchCount > 0 && !analyzed) {
          analyzed = true;
          onStatus("analyze", "Comparing each listing to the Google profile…");
        }
      } else if (event.type === "content_block_delta") {
        const delta = event.delta as { type: string; partial_json?: string };
        if (inSearch && delta.type === "input_json_delta") {
          toolInput += delta.partial_json ?? "";
        }
      } else if (event.type === "content_block_stop") {
        if (inSearch) {
          inSearch = false;
          searchCount++;
          let q = "";
          try {
            q = (JSON.parse(toolInput) as { query?: string }).query ?? "";
          } catch {
            /* partial input, skip */
          }
          onStatus("search", q ? `Searching: “${q}”` : "Searching the web…");
        }
      }
    }

    const msg = await stream.finalMessage();
    raw = msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");

    if (msg.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: msg.content });
      onStatus("more", "Following up on more directories…");
      continue;
    }
    break;
  }

  return extractJson<T>(raw);
}

function extractJson<T>(raw: string): T {
  const cleaned = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Fall back to grabbing the first balanced JSON object/array.
    const start = cleaned.search(/[[{]/);
    const lastObj = cleaned.lastIndexOf("}");
    const lastArr = cleaned.lastIndexOf("]");
    const end = Math.max(lastObj, lastArr);
    if (start !== -1 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1)) as T;
    }
    throw new Error("AI did not return valid JSON");
  }
}

/** Surface a friendly message for the common provider auth failures. */
export function describeAiError(err: unknown): string {
  if (err instanceof Anthropic.APIError || err instanceof OpenAI.APIError) {
    if (err.status === 401)
      return "Your AI API key was rejected. Double-check it on the Settings page.";
    if (err.status === 429)
      return "Your AI provider rate-limited the request or you're out of credit.";
    if (err.status === 404)
      return "That model isn't available on your account. Pick another in Settings.";
    return `AI provider error (${err.status}): ${err.message}`;
  }
  return err instanceof Error ? err.message : "Unknown AI error";
}
