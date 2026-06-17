import { ExternalLink, Check, AlertTriangle, X } from "lucide-react";
import type { NapReport, NapFieldStatus } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { NapCheck } from "@/components/nap-check-button";
import { cn } from "@/lib/utils";

const FIELD_META: Record<NapFieldStatus, { Icon: typeof Check; color: string }> = {
  match: { Icon: Check, color: "text-emerald-600" },
  minor: { Icon: AlertTriangle, color: "text-amber-500" },
  mismatch: { Icon: X, color: "text-red-500" },
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
                {report.listings.map((l, i) => (
                  <li key={i} className="rounded-xl border border-border p-4">
                    {/* Directory + confidence */}
                    <div className="flex items-center justify-between gap-2">
                      {l.url ? (
                        <a
                          href={l.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 font-semibold text-ink hover:text-brand"
                        >
                          {l.directory}
                          <ExternalLink className="h-3.5 w-3.5 text-ink-faint" />
                        </a>
                      ) : (
                        <span className="font-semibold text-ink">{l.directory}</span>
                      )}
                      <span
                        className={cn("text-xs font-semibold", confidenceTone(l.confidence))}
                        title="How confident this listing is theirs"
                      >
                        {l.confidence}% theirs
                      </span>
                    </div>

                    {/* Fields (left) + summary (right) */}
                    <div className="mt-3 grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2.5">
                        <NapField label="Name" value={l.name} status={l.name_match ?? l.match} />
                        <NapField label="Address" value={l.address} status={l.address_match ?? l.match} />
                        <NapField label="Phone" value={l.phone} status={l.phone_match ?? l.match} />
                      </div>
                      {l.notes && (
                        <p className="text-sm leading-relaxed text-ink-soft sm:border-l sm:border-border sm:pl-4">
                          {l.notes}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
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

function NapField({
  label,
  value,
  status,
}: {
  label: string;
  value: string | null;
  status: NapFieldStatus;
}) {
  const meta = FIELD_META[status] ?? FIELD_META.mismatch;
  return (
    <div className="flex items-start gap-2">
      <meta.Icon className={cn("mt-0.5 h-4 w-4 shrink-0", meta.color)} />
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-wide text-ink-faint">{label}</div>
        <div className="break-words text-sm text-ink">
          {value || <span className="text-ink-faint">not listed</span>}
        </div>
      </div>
    </div>
  );
}
