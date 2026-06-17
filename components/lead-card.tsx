import Link from "next/link";
import { Star, Globe, GlobeLock, Mail, ArrowUpRight } from "lucide-react";
import type { LeadCardData } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { RemoveLeadButton } from "@/components/remove-lead-button";
import { photoUrl } from "@/lib/photo";
import { initials } from "@/lib/utils";

function scoreTone(score: number | null): "green" | "amber" | "neutral" {
  if (score == null) return "neutral";
  if (score >= 70) return "green";
  if (score >= 45) return "amber";
  return "neutral";
}

export function LeadCard({ lead }: { lead: LeadCardData }) {
  const photo = lead.photo_refs?.[0];
  const tone = scoreTone(lead.ai_score);

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_28px_-12px_rgba(15,23,42,0.18)]">
      {/* Remove (sibling of the link so it stays clickable on its own) */}
      <div className="absolute right-3 top-3 z-20">
        <RemoveLeadButton leadId={lead.id} name={lead.name} variant="icon" />
      </div>

      <Link href={`/lead/${lead.id}`} className="flex flex-1 flex-col">
        {/* Thumbnail */}
        <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoUrl(photo, 600)}
              alt={lead.name}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="grid h-full w-full place-items-center bg-gradient-to-br from-brand-soft to-slate-100">
              <span className="text-3xl font-semibold text-brand-ink/40">
                {initials(lead.name)}
              </span>
            </div>
          )}
          {lead.rank != null && (
            <div className="absolute left-3 top-3">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-ink/80 text-xs font-semibold text-white backdrop-blur">
                #{lead.rank}
              </span>
            </div>
          )}
          {lead.ai_score != null && (
            <div className="absolute bottom-3 left-3">
              <Badge tone={tone} className="bg-white/90 backdrop-blur">
                {lead.ai_score}/100 fit
              </Badge>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex flex-1 flex-col gap-3 p-4">
          <div>
            <h3 className="line-clamp-1 font-semibold text-ink">{lead.name}</h3>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-soft">
              <span className="inline-flex items-center gap-1">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                {lead.rating != null ? lead.rating.toFixed(1) : "-"}
                <span className="text-ink-faint">({lead.review_count ?? 0})</span>
              </span>
              {lead.website ? (
                <span className="inline-flex items-center gap-1 text-emerald-600">
                  <Globe className="h-3.5 w-3.5" /> Website
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-red-500">
                  <GlobeLock className="h-3.5 w-3.5" /> No website
                </span>
              )}
              {lead.email && (
                <span className="inline-flex items-center gap-1 text-brand">
                  <Mail className="h-3.5 w-3.5" /> Email
                </span>
              )}
            </div>
          </div>

          {lead.ai_reason && (
            <p className="line-clamp-2 text-sm text-ink-soft">{lead.ai_reason}</p>
          )}

          <div className="mt-auto flex items-center justify-between pt-1 text-sm font-medium text-brand">
            View profile
            <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </div>
        </div>
      </Link>
    </div>
  );
}
