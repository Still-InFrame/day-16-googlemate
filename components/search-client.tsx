"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Search,
  Sparkles,
  MapPin,
  Wand2,
  ArrowRight,
  RefreshCw,
  Clock,
  ChevronRight,
} from "lucide-react";
import type { ScanEvent, SearchSummary } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ScanLoader } from "@/components/scan-loader";
import { cn } from "@/lib/utils";

function fmtDate(iso: string | null) {
  if (!iso) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(iso));
}

export function SearchClient({
  recentSearches = [],
}: {
  recentSearches?: SearchSummary[];
}) {
  const router = useRouter();
  const [location, setLocation] = useState("");
  const [keyword, setKeyword] = useState("");
  const [niches, setNiches] = useState<string[]>([]);
  const [suggesting, setSuggesting] = useState(false);

  const [scanning, setScanning] = useState(false);
  const [stage, setStage] = useState("search");
  const [message, setMessage] = useState("");

  async function suggestNiches() {
    setSuggesting(true);
    try {
      const res = await fetch("/api/suggest-niches", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not suggest niches");
      setNiches(data.niches ?? []);
      if (!data.niches?.length) toast.message("No suggestions came back, try again.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSuggesting(false);
    }
  }

  async function startScan(loc: string, kw: string) {
    if (!loc.trim() || !kw.trim()) {
      toast.error("Enter both a location and a keyword.");
      return;
    }

    setScanning(true);
    setStage("search");
    setMessage("Starting your scan...");

    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location: loc, keyword: kw }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Scan failed to start");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as ScanEvent;
          if (event.type === "status") {
            setStage(event.stage);
            setMessage(event.message);
          } else if (event.type === "done") {
            router.push(`/top-hits?search=${event.searchId}`);
            return;
          } else if (event.type === "error") {
            throw new Error(event.message);
          }
        }
      }
    } catch (err) {
      setScanning(false);
      toast.error(err instanceof Error ? err.message : "Scan failed");
    }
  }

  return (
    <>
      {scanning && <ScanLoader activeStage={stage} message={message} />}

      <Card className="overflow-hidden">
        <div className="border-b border-border bg-gradient-to-br from-brand-soft/60 to-transparent px-6 py-5">
          <div className="flex items-center gap-2 text-sm font-medium text-brand-ink">
            <Search className="h-4 w-4" /> New lead scan
          </div>
          <p className="mt-1 text-sm text-ink-soft">
            We&apos;ll find 15 businesses, then your AI keeps only the 5 best-fit
            prospects, each with a ready-to-send pitch. Businesses already in your
            list are skipped automatically.
          </p>
        </div>

        <CardContent className="space-y-5">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              startScan(location, keyword);
            }}
            className="space-y-5"
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Location">
                <div className="relative">
                  <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
                  <Input
                    className="pl-9"
                    placeholder="Miami, FL"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                </div>
              </Field>
              <Field label="Keyword / niche">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
                  <Input
                    className="pl-9"
                    placeholder="plumbers"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                  />
                </div>
              </Field>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-ink-soft">
                  Need ideas? Let AI suggest niches for your business.
                </span>
                <button
                  type="button"
                  onClick={suggestNiches}
                  disabled={suggesting}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-brand hover:text-brand-ink disabled:opacity-50"
                >
                  <Wand2 className={cn("h-3.5 w-3.5", suggesting && "animate-pulse")} />
                  {suggesting ? "Thinking..." : "Suggest niches"}
                </button>
              </div>
              {niches.length > 0 && (
                <div className="flex flex-wrap gap-2 gm-fade-up">
                  {niches.map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setKeyword(n)}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm transition-colors",
                        keyword === n
                          ? "border-brand bg-brand-soft text-brand-ink"
                          : "border-border bg-surface text-ink-soft hover:border-brand/40 hover:text-ink",
                      )}
                    >
                      <Sparkles className="h-3 w-3" />
                      {n}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Button type="submit" size="lg" className="w-full sm:w-auto">
              Run scan
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Previous searches */}
      {recentSearches.length > 0 && (
        <Card className="mt-6">
          <CardContent>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-soft">
              Recent searches
            </h2>
            <ul className="divide-y divide-border">
              {recentSearches.map((s) => {
                const rescanned =
                  s.last_scanned_at && s.last_scanned_at !== s.created_at;
                return (
                  <li
                    key={s.id}
                    className="group flex items-center gap-3 py-3"
                  >
                    <button
                      type="button"
                      onClick={() => router.push(`/top-hits?search=${s.id}`)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-medium text-ink">
                            {s.keyword}
                          </span>
                          <span className="text-ink-faint">in</span>
                          <span className="truncate text-ink-soft">{s.location}</span>
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-ink-faint">
                          <span>
                            {s.lead_count} lead{s.lead_count === 1 ? "" : "s"}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            First scan {fmtDate(s.created_at)}
                          </span>
                          {rescanned && (
                            <span>Last scan {fmtDate(s.last_scanned_at)}</span>
                          )}
                        </div>
                      </div>
                    </button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => startScan(s.location, s.keyword)}
                    >
                      <RefreshCw className="h-3.5 w-3.5" /> Rescan
                    </Button>
                    <ChevronRight className="h-4 w-4 shrink-0 text-ink-faint" />
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </>
  );
}
