import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Star,
  Phone,
  Globe,
  MapPin,
  Mail,
  Clock,
  ExternalLink,
  Sparkles,
  MailX,
  Gauge,
} from "lucide-react";
import { getLead, getBusinessInfo } from "@/lib/queries";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CopyButton } from "@/components/copy-button";
import { ComposeMenu } from "@/components/compose-menu";
import { PhotoGallery } from "@/components/photo-gallery";
import { SentimentMeter } from "@/components/sentiment-meter";
import { WordCloud } from "@/components/word-cloud";
import { RefreshInsightsButton } from "@/components/refresh-insights-button";
import { RemoveLeadButton } from "@/components/remove-lead-button";
import { NapPanel } from "@/components/nap-panel";
import { BannerImage } from "@/components/banner-image";
import { ExpandableText } from "@/components/expandable-text";
import { detectEmailProviderByMx } from "@/lib/email-mx";
import { buildWordCloud } from "@/lib/reviews";
import { photoUrl } from "@/lib/photo";
import { cn, initials } from "@/lib/utils";

function splitPitch(pitch: string): { subject: string | null; body: string } {
  const lines = pitch.split("\n");
  if (lines[0]?.toLowerCase().startsWith("subject:")) {
    return {
      subject: lines[0].replace(/subject:\s*/i, "").trim(),
      body: lines.slice(1).join("\n").trim(),
    };
  }
  return { subject: null, body: pitch.trim() };
}

function hostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export default async function LeadProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [lead, info] = await Promise.all([getLead(id), getBusinessInfo()]);
  if (!lead) notFound();

  const pitch = lead.pitch_email ? splitPitch(lead.pitch_email) : null;
  const og = lead.og_preview;

  // Provider guessed from the sender's own email (MX-aware for custom domains).
  const provider = await detectEmailProviderByMx(info?.email);
  const composeSubject = pitch?.subject ?? `Quick note about ${lead.name}`;
  const composeBody = pitch?.body ?? lead.pitch_email ?? "";

  // Existing leads scanned before word clouds existed still get one for free.
  const wordCloud =
    lead.word_cloud && lead.word_cloud.length > 0
      ? lead.word_cloud
      : buildWordCloud(lead.reviews);

  const bannerPhoto = lead.photo_refs?.[0];
  const scoreHigh = (lead.ai_score ?? 0) >= 70;
  const hasInsights = Boolean(lead.sentiment) || wordCloud.length > 0;

  // Jump-nav targets, only for sections that actually render.
  const sections = [
    lead.ai_analysis && { id: "impressions", label: "First impressions" },
    hasInsights && { id: "insights", label: "Reviews" },
    { id: "directories", label: "Directories" },
    pitch && { id: "pitch", label: "Pitch" },
    (og || lead.website) && { id: "website", label: "Website" },
    lead.photo_refs?.length && { id: "photos", label: "Photos" },
  ].filter(Boolean) as { id: string; label: string }[];

  return (
    <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/top-hits"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Top Hits
        </Link>
        <div className="flex items-center gap-2">
          <RefreshInsightsButton leadId={lead.id} />
          <RemoveLeadButton leadId={lead.id} name={lead.name} variant="full" redirectTo="/top-hits" />
        </div>
      </div>

      {/* Hero banner: a Google photo behind a gradient fade for legible text */}
      <Card className="mt-4 overflow-hidden">
        <div className="relative h-48 sm:h-56">
          {/* Brand gradient base, photo layers on top and hides on error */}
          <div className="absolute inset-0 bg-gradient-to-br from-brand to-brand-ink" />
          {bannerPhoto && <BannerImage src={photoUrl(bannerPhoto, 1600)} />}
          {/* Dark fade so white text reads on any photo */}
          <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/45 to-ink/10" />

          <div className="absolute inset-x-0 bottom-0 p-6">
            <div className="flex items-end gap-4">
              <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-white/15 text-xl font-semibold text-white ring-1 ring-white/30 backdrop-blur-sm">
                {initials(lead.name)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-semibold tracking-tight text-white drop-shadow-sm">
                    {lead.name}
                  </h1>
                  <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
                    Rank #{lead.rank}
                  </span>
                  {lead.ai_score != null && (
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-xs font-semibold text-white backdrop-blur-sm",
                        scoreHigh ? "bg-emerald-500/85" : "bg-amber-500/85",
                      )}
                    >
                      {lead.ai_score}/100 fit
                    </span>
                  )}
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/90">
                  <span className="inline-flex items-center gap-1">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    {lead.rating != null ? lead.rating.toFixed(1) : "No rating"}
                    <span className="text-white/70">
                      ({lead.review_count ?? 0} reviews)
                    </span>
                  </span>
                  {lead.address && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-4 w-4 text-white/70" /> {lead.address}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Jump navigation */}
      <nav className="sticky top-0 z-20 -mx-1 mt-3 flex gap-1 overflow-x-auto rounded-xl border border-border bg-surface/85 p-1 backdrop-blur">
        {sections.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium text-ink-soft transition-colors hover:bg-slate-100 hover:text-ink"
          >
            {s.label}
          </a>
        ))}
      </nav>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-6 lg:col-span-2">
          {/* AI analysis */}
          {lead.ai_analysis && (
            <Card id="impressions" className="scroll-mt-20">
              <CardContent>
                <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-ink-soft">
                  <Sparkles className="h-4 w-4 text-brand" /> First impressions
                </h2>
                <p className="whitespace-pre-line text-[15px] leading-relaxed text-ink">
                  {lead.ai_analysis}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Review insights: sentiment + word cloud */}
          {(lead.sentiment || wordCloud.length > 0) && (
            <Card id="insights" className="scroll-mt-20">
              <CardContent className="space-y-5">
                <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-ink-soft">
                  <Gauge className="h-4 w-4 text-brand" /> Review insights
                </h2>
                {lead.sentiment ? (
                  <SentimentMeter sentiment={lead.sentiment} />
                ) : (
                  <p className="text-sm text-ink-soft">
                    No sentiment score yet. Use{" "}
                    <span className="font-medium text-ink">Refresh insights</span>{" "}
                    above to generate one for this lead.
                  </p>
                )}
                {wordCloud.length > 0 && (
                  <div className="border-t border-border pt-4">
                    <p className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-faint">
                      What customers talk about
                    </p>
                    <WordCloud items={wordCloud} />
                  </div>
                )}
                <p className="text-[11px] text-ink-faint">
                  Based on up to 5 reviews Google provides plus the overall rating.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Directories & NAP accuracy */}
          <div id="directories" className="scroll-mt-20">
            <NapPanel report={lead.nap} leadId={lead.id} />
          </div>

          {/* Pitch email */}
          {pitch && (
            <Card id="pitch" className="scroll-mt-20 overflow-hidden">
              <div className="flex items-center justify-between border-b border-border bg-brand-soft/40 px-6 py-4">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-brand-ink">
                  <Mail className="h-4 w-4" /> Ready-to-send pitch
                </h2>
                <div className="flex items-center gap-2">
                  <ComposeMenu
                    defaultProvider={provider}
                    to={lead.email}
                    subject={composeSubject}
                    body={composeBody}
                  />
                  <CopyButton
                    text={lead.pitch_email ?? ""}
                    label="Copy"
                    toastMessage="Pitch copied"
                  />
                </div>
              </div>
              <CardContent className="space-y-3">
                {/* Recipient */}
                {lead.email ? (
                  <div className="flex items-center justify-between rounded-lg border border-border bg-slate-50 px-3 py-2 text-sm">
                    <span className="inline-flex items-center gap-2 text-ink">
                      <Mail className="h-4 w-4 text-ink-faint" />
                      <span className="font-medium">{lead.email}</span>
                    </span>
                    <CopyButton
                      text={lead.email}
                      label="Copy address"
                      toastMessage="Email address copied"
                      className="border-0 bg-transparent px-2 py-1"
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    <MailX className="h-4 w-4" />
                    No public email found, grab their address from{" "}
                    {lead.website ? (
                      <a
                        href={lead.website}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium underline"
                      >
                        their website
                      </a>
                    ) : (
                      "their listing"
                    )}{" "}
                    and paste the pitch.
                  </div>
                )}

                {pitch.subject && (
                  <div className="text-sm">
                    <span className="text-ink-faint">Subject: </span>
                    <span className="font-medium text-ink">{pitch.subject}</span>
                  </div>
                )}
                <div className="whitespace-pre-line rounded-lg bg-slate-50 p-4 text-[15px] leading-relaxed text-ink">
                  {pitch.body}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Website preview */}
          {(og || lead.website) && (
            <Card id="website" className="scroll-mt-20">
              <CardContent>
                <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-ink-soft">
                  <Globe className="h-4 w-4" /> Website preview
                </h2>
                {lead.website ? (
                  <a
                    href={lead.website}
                    target="_blank"
                    rel="noreferrer"
                    className="group block overflow-hidden rounded-xl border border-border transition-colors hover:border-brand/40"
                  >
                    {og?.image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={og.image}
                        alt=""
                        className="h-44 w-full object-cover"
                      />
                    )}
                    <div className="p-4">
                      <div className="text-xs text-ink-faint">
                        {hostname(lead.website)}
                      </div>
                      <div className="mt-0.5 font-medium text-ink">
                        {og?.title ?? lead.name}
                      </div>
                      {og?.description && (
                        <p className="mt-1 line-clamp-2 text-sm text-ink-soft">
                          {og.description}
                        </p>
                      )}
                      <span className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-brand">
                        Visit site <ExternalLink className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </a>
                ) : (
                  <p className="text-sm text-ink-soft">
                    This business has no website listed on Google, a strong
                    opening for your pitch.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Photo gallery */}
          {lead.photo_refs && lead.photo_refs.length > 0 && (
            <Card id="photos" className="scroll-mt-20">
              <CardContent>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-soft">
                  Photos
                </h2>
                <PhotoGallery photos={lead.photo_refs} />
                <p className="mt-2 text-xs text-ink-faint">Photos via Google.</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Contact */}
          <Card>
            <CardContent className="space-y-1">
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-soft">
                Business info
              </h2>
              <InfoRow icon={Phone} label="Phone" value={lead.phone}>
                {lead.phone && (
                  <a href={`tel:${lead.phone}`} className="font-medium text-ink hover:text-brand">
                    {lead.phone}
                  </a>
                )}
              </InfoRow>
              <InfoRow icon={Globe} label="Website" value={lead.website}>
                {lead.website && (
                  <a
                    href={lead.website}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-ink hover:text-brand"
                  >
                    {hostname(lead.website)}
                  </a>
                )}
              </InfoRow>
              <InfoRow icon={Mail} label="Email" value={lead.email}>
                {lead.email && <span className="font-medium text-ink">{lead.email}</span>}
              </InfoRow>
              {lead.maps_url && (
                <InfoRow icon={MapPin} label="Maps" value={lead.maps_url}>
                  <a
                    href={lead.maps_url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-ink hover:text-brand"
                  >
                    Open in Google Maps
                  </a>
                </InfoRow>
              )}
            </CardContent>
          </Card>

          {/* Hours */}
          {lead.hours && lead.hours.length > 0 && (
            <Card>
              <CardContent>
                <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-ink-soft">
                  <Clock className="h-4 w-4" /> Hours
                </h2>
                <ul className="space-y-1 text-sm text-ink-soft">
                  {lead.hours.map((h, i) => (
                    <li key={i}>{h}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Reviews */}
          {lead.reviews && lead.reviews.length > 0 && (
            <Card>
              <CardContent>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-soft">
                  Recent reviews
                </h2>
                <ul className="space-y-4">
                  {lead.reviews.map((r, i) => (
                    <li key={i} className="border-b border-border pb-4 last:border-0 last:pb-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-ink">
                          {r.author ?? "Anonymous"}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs text-ink-soft">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                          {r.rating ?? "-"}
                        </span>
                      </div>
                      {r.text && (
                        <ExpandableText
                          text={r.text}
                          className="mt-1 text-sm text-ink-soft"
                        />
                      )}
                      {r.relative_time && (
                        <span className="mt-1 block text-xs text-ink-faint">
                          {r.relative_time}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | null;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-ink-faint" />
      <div className="min-w-0 flex-1">
        <div className="text-xs text-ink-faint">{label}</div>
        <div className="truncate text-sm">
          {value ? children : <span className="text-ink-faint">Not listed</span>}
        </div>
      </div>
    </div>
  );
}
