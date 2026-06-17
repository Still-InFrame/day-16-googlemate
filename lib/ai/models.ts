import type { AiProvider } from "@/lib/types";

/**
 * Client-safe provider metadata: model lists, key instructions, helpers.
 * No SDK imports here so client components (the config form) can use it.
 * The actual API calls live in lib/ai/index.ts (server-only).
 */

export interface ModelOption {
  id: string;
  label: string;
}

export const PROVIDER_MODELS: Record<AiProvider, ModelOption[]> = {
  anthropic: [
    { id: "claude-opus-4-8", label: "Claude Opus 4.8, most capable" },
    { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6, balanced" },
    { id: "claude-haiku-4-5", label: "Claude Haiku 4.5, fastest / cheapest" },
  ],
  openai: [
    { id: "gpt-5", label: "GPT-5, most capable" },
    { id: "gpt-5-mini", label: "GPT-5 mini, balanced" },
    { id: "gpt-4.1", label: "GPT-4.1" },
    { id: "gpt-4o-mini", label: "GPT-4o mini, fastest / cheapest" },
  ],
};

export const PROVIDER_META: Record<
  AiProvider,
  { label: string; keyUrl: string; keyPrefix: string; instructions: string[] }
> = {
  anthropic: {
    label: "Anthropic (Claude)",
    keyUrl: "https://console.anthropic.com/settings/keys",
    keyPrefix: "sk-ant-",
    instructions: [
      "Go to console.anthropic.com and sign in (or create an account).",
      "Open Settings → API Keys and click “Create Key”.",
      "Copy the key (it starts with sk-ant-) and paste it below, you only see it once.",
      "Add a few dollars of credit under Billing so scans can run.",
    ],
  },
  openai: {
    label: "OpenAI (GPT)",
    keyUrl: "https://platform.openai.com/api-keys",
    keyPrefix: "sk-",
    instructions: [
      "Go to platform.openai.com and sign in (or create an account).",
      "Open API Keys and click “Create new secret key”.",
      "Copy the key (it starts with sk-) and paste it below, you only see it once.",
      "Make sure your account has billing/credit set up so requests succeed.",
    ],
  },
};

export function defaultModel(provider: AiProvider) {
  return PROVIDER_MODELS[provider][0].id;
}

export function isValidModel(provider: AiProvider, model: string) {
  return PROVIDER_MODELS[provider].some((m) => m.id === model);
}
