"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Search, Sparkles, MapPin, Star, Loader2, Wand2, Globe } from "lucide-react";
import type { BusinessInfo } from "@/lib/types";
import { saveBusinessInfo } from "@/app/(app)/business-info/actions";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Field } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Candidate {
  placeId: string;
  name: string;
  address: string | null;
  rating: number | null;
  reviewCount: number | null;
}

export function BusinessInfoForm({ info }: { info: BusinessInfo | null }) {
  const [pending, startTransition] = useTransition();

  // Controlled form state so the Google prefill can populate the fields.
  const [fields, setFields] = useState({
    business_name: info?.business_name ?? "",
    services: info?.services ?? "",
    ideal_customer: info?.ideal_customer ?? "",
    value_prop: info?.value_prop ?? "",
    voice: info?.voice ?? "",
    first_name: info?.first_name ?? "",
    last_name: info?.last_name ?? "",
    phone: info?.phone ?? "",
    email: info?.email ?? "",
  });
  const set = (k: keyof typeof fields, v: string) =>
    setFields((f) => ({ ...f, [k]: v }));

  // Prefill panel state.
  const [mode, setMode] = useState<"google" | "website">("google");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Candidate[] | null>(null);
  const [finding, setFinding] = useState(false);
  const [prefillingId, setPrefillingId] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [urlPrefilling, setUrlPrefilling] = useState(false);

  async function findBusiness() {
    if (!query.trim()) {
      toast.error("Enter your business name and city.");
      return;
    }
    setFinding(true);
    setResults(null);
    try {
      const res = await fetch("/api/business/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Search failed");
      setResults(data.results ?? []);
      if (!data.results?.length) toast.message("No matches, try adding your city.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Search failed");
    } finally {
      setFinding(false);
    }
  }

  async function prefillFromUrl() {
    if (!url.trim()) {
      toast.error("Paste your website URL.");
      return;
    }
    setUrlPrefilling(true);
    try {
      const res = await fetch("/api/business/prefill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't read that website");
      setFields((f) => ({ ...f, ...data.fields }));
      toast.success("Filled from your website, review and save.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Auto-fill failed");
    } finally {
      setUrlPrefilling(false);
    }
  }

  async function prefillFrom(c: Candidate) {
    setPrefillingId(c.placeId);
    try {
      const res = await fetch("/api/business/prefill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ placeId: c.placeId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't auto-fill");
      setFields((f) => ({ ...f, ...data.fields }));
      setResults(null);
      toast.success("Filled from your Google profile, review and save.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Auto-fill failed");
    } finally {
      setPrefillingId(null);
    }
  }

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      const res = await saveBusinessInfo(formData);
      if (res.error) toast.error(res.error);
      else toast.success("Business profile saved");
    });
  }

  return (
    <div className="space-y-6">
      {/* Prefill from Google */}
      <div className="rounded-2xl border border-brand/20 bg-brand-soft/40 p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-brand-ink">
          <Wand2 className="h-4 w-4" />
          Auto-fill your profile
        </div>
        <p className="mt-1 text-sm text-ink-soft">
          Let AI draft the fields below from your Google listing or your website.
        </p>

        {/* Source toggle */}
        <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl border border-border bg-surface/60 p-1">
          {(
            [
              { id: "google", label: "Google profile" },
              { id: "website", label: "Website URL" },
            ] as const
          ).map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMode(m.id)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium transition-all",
                mode === m.id
                  ? "bg-surface text-ink shadow-sm"
                  : "text-ink-soft hover:text-ink",
              )}
            >
              {m.label}
            </button>
          ))}
        </div>

        {mode === "google" ? (
          <>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
                <Input
                  className="pl-9"
                  placeholder="Brightline Web Studio, Miami FL"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      findBusiness();
                    }
                  }}
                />
              </div>
              <Button type="button" variant="secondary" onClick={findBusiness} loading={finding}>
                Find my business
              </Button>
            </div>
            <p className="mt-2 text-xs text-ink-faint">
              Only works if your business has a Google listing. Remote/online-only?
              Use the Website tab.
            </p>
          </>
        ) : (
          <>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Globe className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
                <Input
                  className="pl-9"
                  placeholder="https://yourbusiness.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      prefillFromUrl();
                    }
                  }}
                />
              </div>
              <Button type="button" variant="secondary" onClick={prefillFromUrl} loading={urlPrefilling}>
                Use my website
              </Button>
            </div>
            <p className="mt-2 text-xs text-ink-faint">
              Best for remote businesses with no Google listing, we read your
              homepage and about page.
            </p>
          </>
        )}

        {mode === "google" && results && results.length > 0 && (
          <ul className="mt-3 space-y-2 gm-fade-up">
            {results.map((c) => (
              <li key={c.placeId}>
                <button
                  type="button"
                  onClick={() => prefillFrom(c)}
                  disabled={prefillingId !== null}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-left transition-colors hover:border-brand/40 disabled:opacity-60",
                  )}
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-ink">{c.name}</div>
                    <div className="mt-0.5 flex items-center gap-3 text-xs text-ink-soft">
                      {c.address && (
                        <span className="inline-flex items-center gap-1 truncate">
                          <MapPin className="h-3 w-3" /> {c.address}
                        </span>
                      )}
                      {c.rating != null && (
                        <span className="inline-flex items-center gap-1">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                          {c.rating.toFixed(1)}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-brand">
                    {prefillingId === c.placeId ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Drafting…
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3.5 w-3.5" /> Use this
                      </>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <form action={onSubmit} className="space-y-5">
        <Field label="Business name" hint="Your company, the one you're pitching prospects from.">
          <Input
            name="business_name"
            required
            placeholder="e.g. Brightline Web Studio"
            value={fields.business_name}
            onChange={(e) => set("business_name", e.target.value)}
          />
        </Field>

        <Field
          label="What you do / services you offer"
          hint="List the services you'd sell to these businesses (websites, SEO, Google profile cleanup, reviews, ads…)."
        >
          <Textarea
            name="services"
            required
            rows={3}
            placeholder="We build fast small-business websites, optimize Google Business profiles, and set up review-generation systems."
            value={fields.services}
            onChange={(e) => set("services", e.target.value)}
          />
        </Field>

        <Field
          label="Who's your ideal customer?"
          hint="Helps the AI judge which leads are the best fit for you."
        >
          <Textarea
            name="ideal_customer"
            rows={2}
            placeholder="Local home-service businesses (plumbers, HVAC, roofers) with a weak or missing online presence."
            value={fields.ideal_customer}
            onChange={(e) => set("ideal_customer", e.target.value)}
          />
        </Field>

        <Field
          label="Your value proposition"
          hint="Why a business should pick you, what outcome you deliver."
        >
          <Textarea
            name="value_prop"
            rows={2}
            placeholder="We turn an invisible Google presence into a steady stream of inbound calls within 60 days, no long contracts."
            value={fields.value_prop}
            onChange={(e) => set("value_prop", e.target.value)}
          />
        </Field>

        <Field label="Your voice / tone" hint="How your pitch emails should sound. The AI matches this.">
          <Input
            name="voice"
            placeholder="Friendly, direct, no jargon. Confident but not salesy."
            value={fields.voice}
            onChange={(e) => set("voice", e.target.value)}
          />
        </Field>

        {/* Sender details used to sign and send the pitch emails */}
        <div className="rounded-2xl border border-border bg-slate-50/60 p-5">
          <h3 className="text-sm font-semibold text-ink">Your details</h3>
          <p className="mt-0.5 text-sm text-ink-soft">
            Used to sign your pitch emails and to open them in your email app.
          </p>

          <div className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="First name">
                <Input
                  name="first_name"
                  placeholder="Jane"
                  value={fields.first_name}
                  onChange={(e) => set("first_name", e.target.value)}
                />
              </Field>
              <Field label="Last name">
                <Input
                  name="last_name"
                  placeholder="Doe"
                  value={fields.last_name}
                  onChange={(e) => set("last_name", e.target.value)}
                />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Phone">
                <Input
                  name="phone"
                  type="tel"
                  placeholder="(305) 555-1234"
                  value={fields.phone}
                  onChange={(e) => set("phone", e.target.value)}
                />
              </Field>
              <Field label="Your email" hint="We use this to guess your email app for one-click send.">
                <Input
                  name="email"
                  type="email"
                  placeholder="jane@yourbusiness.com"
                  value={fields.email}
                  onChange={(e) => set("email", e.target.value)}
                />
              </Field>
            </div>
          </div>
        </div>

        <Button type="submit" loading={pending}>
          Save business profile
        </Button>
      </form>
    </div>
  );
}
