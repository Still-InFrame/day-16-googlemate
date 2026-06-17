"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ExternalLink, KeyRound, Check } from "lucide-react";
import {
  PROVIDER_META,
  PROVIDER_MODELS,
  defaultModel,
} from "@/lib/ai/models";
import type { AiProvider, UserSettings } from "@/lib/types";
import { saveSettings, savePreference } from "@/app/(app)/config/actions";
import { Button } from "@/components/ui/button";
import { Input, Select, Field, Label } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function ConfigForm({ settings }: { settings: UserSettings | null }) {
  const [provider, setProvider] = useState<AiProvider>(
    settings?.ai_provider ?? "anthropic",
  );
  const [model, setModel] = useState(
    settings?.ai_model ?? defaultModel(settings?.ai_provider ?? "anthropic"),
  );
  const [apiKey, setApiKey] = useState("");
  const [keepCount, setKeepCount] = useState(settings?.keep_count ?? 5);
  const [pending, startTransition] = useTransition();
  const [, startPref] = useTransition();
  const [prefSaved, setPrefSaved] = useState(false);

  const hasSavedKey = Boolean(settings?.ai_api_key);
  const meta = PROVIDER_META[provider];

  // Persist the provider/model preference immediately on change (no Save needed).
  function persistPreference(nextProvider: AiProvider, nextModel: string) {
    startPref(async () => {
      const res = await savePreference(nextProvider, nextModel);
      if (res.error) {
        toast.error(res.error);
      } else {
        setPrefSaved(true);
        setTimeout(() => setPrefSaved(false), 1600);
      }
    });
  }

  function onProviderChange(next: AiProvider) {
    setProvider(next);
    // Reset the model to the new provider's default unless the saved one matches.
    const stillValid =
      settings?.ai_provider === next &&
      PROVIDER_MODELS[next].some((m) => m.id === settings?.ai_model);
    const nextModel = stillValid ? settings!.ai_model! : defaultModel(next);
    setModel(nextModel);
    persistPreference(next, nextModel);
  }

  function onModelChange(next: string) {
    setModel(next);
    persistPreference(provider, next);
  }

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      const res = await saveSettings(formData);
      if (res.error) toast.error(res.error);
      else toast.success("Settings saved");
    });
  }

  return (
    <form action={onSubmit} className="space-y-6">
      <input type="hidden" name="ai_provider" value={provider} />

      {/* Provider toggle */}
      <Field label="AI provider">
        <div className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-slate-50 p-1">
          {(["anthropic", "openai"] as AiProvider[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onProviderChange(p)}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-medium transition-all",
                provider === p
                  ? "bg-surface text-ink shadow-sm"
                  : "text-ink-soft hover:text-ink",
              )}
            >
              {PROVIDER_META[p].label}
            </button>
          ))}
        </div>
      </Field>

      {/* Instructions */}
      <Card className="border-brand/20 bg-brand-soft/40 shadow-none">
        <CardContent className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-brand-ink">
              <KeyRound className="h-4 w-4" />
              How to get your {meta.label} key
            </h3>
            <a
              href={meta.keyUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:text-brand-ink"
            >
              Open dashboard <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
          <ol className="space-y-1.5 text-sm text-ink-soft">
            {meta.instructions.map((step, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand/10 text-[11px] font-semibold text-brand-ink">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <Field
        label={`${meta.label} API key`}
        hint={
          hasSavedKey
            ? "A key is saved. Leave blank to keep it, or paste a new one to replace it."
            : `Your key is stored securely and only used server-side. Starts with ${meta.keyPrefix}`
        }
      >
        <div className="relative">
          <Input
            name="ai_api_key"
            type="password"
            autoComplete="off"
            placeholder={hasSavedKey ? "••••••••••••••••  (saved)" : `${meta.keyPrefix}…`}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
          {hasSavedKey && !apiKey && (
            <span className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1 text-xs font-medium text-emerald-600">
              <Check className="h-3.5 w-3.5" /> Saved
            </span>
          )}
        </div>
      </Field>

      <Field>
        <div className="flex items-center justify-between">
          <Label>Model</Label>
          <span
            className={cn(
              "inline-flex items-center gap-1 text-xs font-medium text-emerald-600 transition-opacity",
              prefSaved ? "opacity-100" : "opacity-0",
            )}
          >
            <Check className="h-3.5 w-3.5" /> Saved
          </span>
        </div>
        <Select
          name="ai_model"
          value={model}
          onChange={(e) => onModelChange(e.target.value)}
        >
          {PROVIDER_MODELS[provider].map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </Select>
        <p className="text-xs text-ink-faint">
          Your provider and model save automatically.
        </p>
      </Field>

      <Field
        label="Leads to keep per scan"
        hint="Each scan pulls up to 30 businesses; this many survive into Top Hits (1-30). The rest are saved as hidden results."
      >
        <Input
          name="keep_count"
          type="number"
          min={1}
          max={30}
          value={keepCount}
          onChange={(e) => setKeepCount(Number(e.target.value))}
          className="max-w-32"
        />
      </Field>

      <div className="flex items-center gap-3">
        <Button type="submit" loading={pending}>
          Save settings
        </Button>
        <p className="text-xs text-ink-faint">
          Google Places is already provided, no key needed from you.
        </p>
      </div>
    </form>
  );
}
