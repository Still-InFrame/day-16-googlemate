"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Check, Plug, KeyRound } from "lucide-react";
import { CRM_OPTIONS, CRM_ENABLED } from "@/lib/crm";
import type { UserSettings } from "@/lib/types";
import { saveCrm } from "@/app/(app)/config/actions";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function CrmForm({ settings }: { settings: UserSettings | null }) {
  const [provider, setProvider] = useState(settings?.crm_provider ?? "");
  const [apiKey, setApiKey] = useState("");
  const [locationId, setLocationId] = useState(settings?.crm_location_id ?? "");
  const [pending, startTransition] = useTransition();

  const hasSavedKey = Boolean(settings?.crm_api_key);
  const selected = CRM_OPTIONS.find((c) => c.id === provider);

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      const res = await saveCrm(formData);
      if (res.error) toast.error(res.error);
      else toast.success(provider ? "CRM connected" : "CRM disconnected");
    });
  }

  return (
    <form action={onSubmit} className="space-y-5">
      <input type="hidden" name="crm_provider" value={provider} />

      <p className="text-sm text-ink-soft">
        {CRM_ENABLED
          ? "Endpoints are coming soon. For now this just stores your connection."
          : "CRM integrations are coming soon. You will be able to connect HighLevel and others here to save prospects and send outreach from your CRM."}
      </p>

      <div className="grid gap-2 sm:grid-cols-2">
        {CRM_OPTIONS.map((c) => {
          const active = provider === c.id;
          return (
            <button
              key={c.id}
              type="button"
              disabled={!c.enabled}
              onClick={() => c.enabled && setProvider(active ? "" : c.id)}
              className={cn(
                "flex items-center gap-3 rounded-xl border p-3 text-left transition-colors",
                active
                  ? "border-brand bg-brand-soft"
                  : "border-border bg-surface",
                c.enabled
                  ? "hover:border-brand/40"
                  : "cursor-not-allowed opacity-60",
              )}
            >
              <span
                className={cn(
                  "grid h-9 w-9 shrink-0 place-items-center rounded-lg",
                  active ? "bg-brand text-white" : "bg-slate-100 text-ink-soft",
                )}
              >
                <Plug className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-ink">{c.name}</span>
                <span className="block text-xs text-ink-faint">
                  {c.enabled ? "Available" : "Coming soon"}
                </span>
              </span>
              {active && <Check className="h-4 w-4 text-brand" />}
              {!c.enabled && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-ink-faint">
                  Soon
                </span>
              )}
            </button>
          );
        })}
      </div>

      {provider === "highlevel" && (
        <div className="space-y-4 gm-fade-up rounded-xl border border-border bg-slate-50/60 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink">
            <KeyRound className="h-4 w-4 text-brand" /> HighLevel credentials
          </div>
          {selected?.note && (
            <p className="text-xs text-ink-soft">{selected.note}</p>
          )}
          <Field
            label="API key / Private Integration token"
            hint={
              hasSavedKey
                ? "A token is saved. Leave blank to keep it, or paste a new one."
                : "Stored securely and read server-side only."
            }
          >
            <Input
              name="crm_api_key"
              type="password"
              autoComplete="off"
              placeholder={hasSavedKey ? "••••••••••••  (saved)" : "pit-…"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </Field>
          <Field label="Location ID" hint="Found in your HighLevel sub-account settings.">
            <Input
              name="crm_location_id"
              placeholder="e.g. abcdEFGH1234"
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
            />
          </Field>
        </div>
      )}

      {CRM_ENABLED && (
        <div className="flex items-center gap-3">
          <Button type="submit" loading={pending}>
            {provider ? "Save connection" : "Save"}
          </Button>
          {provider && (
            <button
              type="button"
              onClick={() => {
                setProvider("");
                setApiKey("");
                setLocationId("");
              }}
              className="text-sm font-medium text-ink-soft hover:text-red-600"
            >
              Disconnect
            </button>
          )}
        </div>
      )}
    </form>
  );
}
