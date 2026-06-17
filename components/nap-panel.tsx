import { ExternalLink, Check, AlertTriangle, X } from "lucide-react";
import type { NapReport, NapListing } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NapCheck } from "@/components/nap-check-button";
import { cn } from "@/lib/utils";

const MATCH_META: Record<
  NapListing["match"],
  { label: string; tone: "green" | "amber" | "red"; Icon: typeof Check }
> = {
  match: { label: "Consistent", tone: "green", Icon: Check },
  minor: { label: "Minor diff", tone: "amber", Icon: AlertTriangle },
  mismatch: { label: "Mismatch", tone: "red", Icon: X },
};

function confidenceTone(c: number) {
  if (c >= 80) return "text-emerald-600";
  if (c >= 50) return "text-amber-600";
  return "text-red-500";
}

export function NapPanel({
  report,
  leadId,
}: {
  report: NapReport | null;
  leadId: string;
}) {
  return (
    <Card>
      <CardContent className="space-y-4">
        <NapCheck leadId={leadId} hasReport={Boolean(report)} />

        {!report ? (
          <p className="rounded-xl border border-border bg-slate-50 px-4 py-3 text-sm text-ink-soft">
            Run a web search to find this business on directories like Yelp, BBB,
            Facebook, and Apple Maps, and check whether their NAP is consistent.
            Each listing is scored for how confident we are it is theirs. This uses
            web search on your AI key and takes about 20 seconds.
          </p>
        ) : (
          <>
            {/* Overall */}
            <div className="flex items-center gap-4 rounded-xl border border-border bg-slate-50 p-4">
              <div className="text-center">
                <div className="text-2xl font-semibold text-ink">
                  {report.overall.consistency_score}
                  <span className="text-sm text-ink-faint">/100</span>
                </div>
                <div className="text-[11px] uppercase tracking-wide text-ink-faint">
                  Consistency
                </div>
              </div>
              <p className="flex-1 text-sm text-ink-soft">{report.overall.summary}</p>
            </div>

            {/* Listings */}
            {report.listings.length === 0 ? (
              <p className="text-sm text-ink-soft">
                No directory listings were found for this business.
              </p>
            ) : (
              <ul className="space-y-3">
                {report.listings.map((l, i) => {
                  const meta = MATCH_META[l.match] ?? MATCH_META.mismatch;
                  return (
                    <li
                      key={i}
                      className="rounded-xl border border-border p-3.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {l.url ? (
                            <a
                              href={l.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 font-medium text-ink hover:text-brand"
                            >
                              {l.directory}
                              <ExternalLink className="h-3.5 w-3.5 text-ink-faint" />
                            </a>
                          ) : (
                            <span className="font-medium text-ink">{l.directory}</span>
                          )}
                          <Badge tone={meta.tone}>
                            <meta.Icon className="h-3 w-3" />
                            {meta.label}
                          </Badge>
                        </div>
                        <span
                          className={cn(
                            "text-xs font-semibold",
                            confidenceTone(l.confidence),
                          )}
                          title="How confident this listing is theirs"
                        >
                          {l.confidence}% theirs
                        </span>
                      </div>
                      <dl className="mt-2 grid gap-1 text-sm sm:grid-cols-3">
                        <NapField label="Name" value={l.name} />
                        <NapField label="Address" value={l.address} />
                        <NapField label="Phone" value={l.phone} />
                      </dl>
                      {l.notes && (
                        <p className="mt-2 text-xs text-ink-faint">{l.notes}</p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}

            <p className="text-[11px] text-ink-faint">
              Compared against the Google listing. AI web search can miss or
              misattribute listings, so confirm before acting.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function NapField({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] uppercase tracking-wide text-ink-faint">{label}</dt>
      <dd className="truncate text-ink" title={value ?? undefined}>
        {value || <span className="text-ink-faint">not listed</span>}
      </dd>
    </div>
  );
}
