"use client";

import { useMemo, useState } from "react";
import { EyeOff, Eye, Search, Star } from "lucide-react";
import type { LeadCardData } from "@/lib/types";
import { LeadCard } from "@/components/lead-card";
import { Input, Select } from "@/components/ui/input";

const RATING_OPTIONS = [
  { value: "all", label: "Any rating" },
  { value: "4.5", label: "4.5+ stars" },
  { value: "4", label: "4.0+ stars" },
  { value: "3.5", label: "3.5+ stars" },
  { value: "3", label: "3.0+ stars" },
  { value: "lt3", label: "Under 3.0" },
];

function matchRating(rating: number | null, filter: string) {
  if (filter === "all") return true;
  if (rating == null) return false;
  if (filter === "lt3") return rating < 3;
  return rating >= Number(filter);
}

export function TopHitsClient({
  leads,
  initialLocation = "all",
  initialKeyword = "all",
}: {
  leads: LeadCardData[];
  initialLocation?: string;
  initialKeyword?: string;
}) {
  const locations = useMemo(
    () => [...new Set(leads.map((l) => l.location).filter(Boolean))].sort(),
    [leads],
  );
  const niches = useMemo(
    () => [...new Set(leads.map((l) => l.keyword).filter(Boolean))].sort(),
    [leads],
  );

  const [query, setQuery] = useState("");
  const [rating, setRating] = useState("all");
  const [location, setLocation] = useState(
    locations.includes(initialLocation) ? initialLocation : "all",
  );
  const [niche, setNiche] = useState(
    niches.includes(initialKeyword) ? initialKeyword : "all",
  );
  const [showHidden, setShowHidden] = useState(false);

  const q = query.trim().toLowerCase();
  const filtered = leads.filter(
    (l) =>
      (!q || l.name.toLowerCase().includes(q)) &&
      (location === "all" || l.location === location) &&
      (niche === "all" || l.keyword === niche) &&
      matchRating(l.rating, rating),
  );
  const kept = filtered.filter((l) => l.kept);
  const hidden = filtered.filter((l) => !l.kept);

  const anyActive =
    Boolean(q) || location !== "all" || niche !== "all" || rating !== "all";

  function clearAll() {
    setQuery("");
    setLocation("all");
    setNiche("all");
    setRating("all");
  }

  return (
    <div className="space-y-5">
      {/* Filters (always above the cards) */}
      <div className="rounded-xl border border-border bg-surface p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-48 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
            <Input
              className="h-9 pl-9 text-sm"
              placeholder="Search by business name"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <Select
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
            className="h-9 w-auto min-w-36 text-sm"
            aria-label="Filter by niche"
          >
            <option value="all">All niches</option>
            {niches.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </Select>
          <Select
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="h-9 w-auto min-w-36 text-sm"
            aria-label="Filter by location"
          >
            <option value="all">All locations</option>
            {locations.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </Select>
          <Select
            value={rating}
            onChange={(e) => setRating(e.target.value)}
            className="h-9 w-auto min-w-32 text-sm"
            aria-label="Filter by rating"
          >
            {RATING_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
          {anyActive && (
            <button
              type="button"
              onClick={clearAll}
              className="text-xs font-medium text-brand hover:text-brand-ink"
            >
              Clear
            </button>
          )}
          <span className="ml-auto inline-flex items-center gap-1 text-xs text-ink-faint">
            <Star className="h-3 w-3" />
            {kept.length} lead{kept.length === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      {/* Kept leads */}
      {kept.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {kept.map((lead) => (
            <LeadCard key={lead.id} lead={lead} />
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-border bg-surface px-4 py-8 text-center text-sm text-ink-soft">
          No leads match these filters.
        </p>
      )}

      {/* Hidden (tossed) leads */}
      {hidden.length > 0 && (
        <div className="rounded-2xl border border-border bg-slate-50/60 p-4">
          <button
            type="button"
            onClick={() => setShowHidden((v) => !v)}
            className="flex w-full items-center justify-between text-sm font-medium text-ink-soft hover:text-ink"
          >
            <span className="inline-flex items-center gap-2">
              {showHidden ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
              Hidden results ({hidden.length})
            </span>
            <span className="text-xs text-ink-faint">
              {showHidden ? "Hide" : "Show"} businesses that did not make the cut
            </span>
          </button>
          {showHidden && (
            <div className="mt-4 grid gap-5 gm-fade-up sm:grid-cols-2 lg:grid-cols-3">
              {hidden.map((lead) => (
                <LeadCard key={lead.id} lead={lead} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
