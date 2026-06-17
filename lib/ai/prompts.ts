import type { BusinessInfo, PlaceReview } from "@/lib/types";
import type { PlaceLite, PlaceDetail } from "@/lib/google/places";

/** A compact description of the user's own business, shared across prompts. */
function businessContext(info: BusinessInfo): string {
  return [
    `My business: ${info.business_name}`,
    `What I do / services: ${info.services}`,
    info.ideal_customer ? `My ideal customer: ${info.ideal_customer}` : "",
    info.value_prop ? `My value proposition: ${info.value_prop}` : "",
    info.voice ? `My voice/tone: ${info.voice}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

const EXPERT_SYSTEM =
  "You are an expert B2B lead-qualification and sales strategist who helps service providers find local businesses to pitch and tells them exactly how to win the deal. You are sharp, practical, and honest, you never invent facts about a business.";

/** Rank the candidates and pick the best-fit prospects. */
export function buildRankPrompt(info: BusinessInfo, places: PlaceLite[], keep: number) {
  const list = places
    .map((p, i) => {
      const signals = [
        p.rating != null ? `${p.rating}★` : "no rating",
        p.reviewCount != null ? `${p.reviewCount} reviews` : "0 reviews",
        p.website ? "has website" : "NO website",
      ].join(", ");
      return `${i + 1}. ${p.name}, ${signals}`;
    })
    .join("\n");

  const prompt = `${businessContext(info)}

Here are ${places.length} local businesses returned from a Google search. Each line shows its Google presence signals (rating, review count, whether it has a website):

${list}

These are prospects I could sell my services to. The BEST prospects are the ones that (a) most need what I offer, weak online presence: no website, low/few reviews, low rating, AND (b) fit my ideal customer.

Pick the ${keep} best prospects to pitch. Return a JSON object:
{"picks": [{"index": <number from the list above>, "score": <0-100 fit score>, "reason": "<one tight sentence on why they're a strong prospect for me>"}]}

Order picks best-first. Use the exact index numbers from the list.`;

  return { system: EXPERT_SYSTEM, prompt };
}

/** Write the first-impressions analysis + a ready-to-send pitch email for one lead. */
export function buildPitchPrompt(
  info: BusinessInfo,
  lead: PlaceDetail,
  email: string | null,
) {
  const reviewLines =
    lead.reviews && lead.reviews.length
      ? lead.reviews
          .map(
            (r: PlaceReview) =>
              `- ${r.author ?? "A reviewer"} (${r.rating ?? "?"} stars): "${(r.text ?? "").slice(0, 240)}"`,
          )
          .join("\n")
      : "No reviews available.";

  const hasReviews = Boolean(lead.reviews && lead.reviews.length);

  const senderName =
    [info.first_name, info.last_name].filter(Boolean).join(" ").trim() ||
    info.business_name ||
    "";
  const sigLines = [
    senderName ? `Name: ${senderName}` : "Name: (not provided, sign off with my business name)",
    info.phone ? `Phone: ${info.phone}` : "Phone: (none, omit from signature)",
    info.email ? `My email: ${info.email}` : "My email: (none, omit from signature)",
  ].join("\n");

  const prompt = `${businessContext(info)}

My contact details for the email signature:
${sigLines}

I'm evaluating this local business as a prospect to pitch my services to:

Name: ${lead.name}
Rating: ${lead.rating ?? "none"} (${lead.reviewCount ?? 0} reviews)
Website: ${lead.website ?? "NONE LISTED"}
Phone: ${lead.phone ?? "unknown"}
Address: ${lead.address ?? "unknown"}
Contact email found: ${email ?? "none found"}
Recent reviews:
${reviewLines}

Do three things and return them as JSON:

1. "analysis": A crisp first-impressions assessment (about 90-130 words, plain text) of this business's ONLINE PRESENCE based on the signals above: their Google rating/reviews and whether they have a website. Include one sentence on the overall SENTIMENT of their reviews (what customers praise or complain about). Call out the specific gaps I can help with (no website, thin reviews, low rating, negative themes) and how my services map to fixing them. Be concrete and honest; do not invent details you don't have.

2. "sentiment": An object describing the tone of their reviews: {"score": <0-100, where 0 is very negative and 100 is very positive, weighing the star rating, review volume, and what the review text actually says>, "label": "Positive" | "Mostly positive" | "Mixed" | "Negative", "summary": "<one short sentence on what customers feel>"}. If there are no reviews, base it on the star rating and set summary to note that reviews are sparse.

3. "pitch_email": A short cold outreach email FROM me TO this business, ready to send as-is.

Write it like a real person actually wrote it, in MY voice and tone described above. Reference their specific situation by name, lead with the one gap I noticed, tie it to a clear benefit, and end with a low-friction call to action (a quick reply or a short call). Keep it under 140 words.
${
  hasReviews
    ? "Naturally reference ONE specific real review from the list above, mentioning the reviewer's first name (for example \"I saw Maria mention...\"). Only use a review and name that actually appears above. Keep it warm and genuine, not creepy."
    : "They have few or no reviews, so do not invent or reference any review."
}

Format rules, follow exactly:
- First line is the subject, prefixed with "Subject: ".
- Then the email body.
- Sign off naturally (for example "Thanks," or "Best,") followed by my name on the next line. If I gave a phone and/or email above, put each on its own line under my name as a simple signature. If I gave no name, sign with my business name.
- NEVER use placeholders like [Name], [Your Name], [Company], or brackets of any kind. Use the real values I provided, and omit anything I did not provide.
- ABSOLUTELY NO EM DASHES (—) or en dashes (–) anywhere. Use commas, periods, or parentheses instead.
- No corporate filler, no buzzwords, no "I hope this email finds you well", no AI-sounding phrasing. Sound human and direct.

Return: {"analysis": "...", "sentiment": {...}, "pitch_email": "..."}`;

  return { system: EXPERT_SYSTEM, prompt };
}

/**
 * Draft the user's OWN business profile from their Google Business listing,
 * to prefill the My Business form. This describes the service provider doing the
 * outreach, not a prospect.
 */
export function buildBusinessPrefillPrompt(
  detail: PlaceDetail,
  og: { title?: string | null; description?: string | null } | null,
) {
  const reviewLines =
    detail.reviews && detail.reviews.length
      ? detail.reviews
          .map((r: PlaceReview) => `- "${(r.text ?? "").slice(0, 160)}"`)
          .join("\n")
      : "No reviews available.";

  const prompt = `Here is a business's own Google Business listing. This is MY business, I use a tool to find other local businesses to pitch my services to, and I need to describe myself so the tool can position my outreach correctly.

Name: ${detail.name}
Rating: ${detail.rating ?? "none"} (${detail.reviewCount ?? 0} reviews)
Website: ${detail.website ?? "none"}
Address: ${detail.address ?? "unknown"}
Website headline: ${og?.title ?? "n/a"}
Website description: ${og?.description ?? "n/a"}
Sample reviews:
${reviewLines}

From this, draft my business profile. Make reasonable, concrete inferences from the signals above, it's a starting draft I'll edit. Return JSON with these fields (all strings):
{
  "business_name": "<my business name>",
  "services": "<the services I most likely offer, 1-2 sentences>",
  "ideal_customer": "<the kind of customer I most likely serve, 1 sentence>",
  "value_prop": "<a plausible value proposition / the outcome I deliver, 1 sentence>",
  "voice": "<a suggested tone for my outreach, e.g. 'friendly, direct, no jargon'>"
}

Do not invent specific facts (awards, years in business) you can't infer. Keep each field tight and editable.`;

  return { system: EXPERT_SYSTEM, prompt };
}

/**
 * Draft the user's OWN business profile from their WEBSITE, the path for
 * remote/online-only businesses that aren't on Google Maps.
 */
export function buildBusinessPrefillFromSitePrompt(
  url: string,
  text: string,
  og: { title?: string | null; description?: string | null } | null,
) {
  const prompt = `Here is content scraped from my own business website (${url}). This is MY business, I use a tool to find other local businesses to pitch my services to, and I need to describe myself so the tool can position my outreach correctly.

Website headline: ${og?.title ?? "n/a"}
Website description: ${og?.description ?? "n/a"}
Page text (homepage + about/services, truncated):
"""
${text || "(no readable text found)"}
"""

From this, draft my business profile. Base it on what the site actually says; make reasonable inferences where needed, it's a starting draft I'll edit. Return JSON with these fields (all strings):
{
  "business_name": "<my business name>",
  "services": "<the services I offer, 1-2 sentences>",
  "ideal_customer": "<the kind of customer I serve, 1 sentence>",
  "value_prop": "<my value proposition / the outcome I deliver, 1 sentence>",
  "voice": "<a suggested tone for my outreach that matches the site's voice, e.g. 'friendly, direct, no jargon'>"
}

Do not invent specific facts (awards, exact years, client names) not supported by the text. Keep each field tight and editable.`;

  return { system: EXPERT_SYSTEM, prompt };
}

/**
 * Web-search prompt: find the business across online directories and assess
 * NAP (Name, Address, Phone) consistency + how confident each listing is theirs.
 */
export function buildNapPrompt(lead: PlaceDetail) {
  const system =
    "You are a meticulous local-SEO analyst. You verify a business's NAP (Name, Address, Phone) consistency across online directories. You only report listings you actually find via web search, never invented ones, and you never use em dashes.";

  const prompt = `Here is a business and its canonical NAP from Google:

Name: ${lead.name}
Address: ${lead.address ?? "unknown"}
Phone: ${lead.phone ?? "unknown"}
Website: ${lead.website ?? "none"}

Search the web and find this business's listings across major directories (for example Yelp, Yellow Pages, Better Business Bureau, Facebook, Bing Places, Apple Maps, Foursquare, Manta, Angi, Nextdoor, Chamber of Commerce). For each directory where you find what appears to be THIS business, read the listing and record the Name, Address, and Phone exactly as shown there.

For each listing judge each field separately against the canonical:
- "name_match", "address_match", "phone_match": "match" if that field equals the canonical, "minor" if only a small difference (formatting, abbreviation, missing suite/unit, spelled-out vs abbreviated), "mismatch" if it differs materially or is missing/not listed.
- "match": the overall verdict ("match" only if all three are match; "mismatch" if any field materially differs; otherwise "minor").
- "confidence": 0 to 100, how confident you are this listing is actually THIS business and not a different one with a similar name, based on how well the name, address, phone, and city line up.

Rules:
- Only include real listings you found through search, each with its real URL. Do not invent or guess listings. If you cannot confidently find the business on a directory, leave it out.
- Keep notes short. No em dashes anywhere.

Return JSON exactly in this shape:
{
  "overall": { "consistency_score": <0-100 how consistent the NAP is across the listings you found, 100 = perfectly consistent>, "summary": "<one or two plain sentences on the NAP consistency and any issues>" },
  "listings": [
    { "directory": "<name>", "url": "<url>", "name": "<as listed>", "address": "<as listed>", "phone": "<as listed>", "name_match": "match|minor|mismatch", "address_match": "match|minor|mismatch", "phone_match": "match|minor|mismatch", "match": "match|minor|mismatch", "confidence": <0-100>, "notes": "<short>" }
  ]
}

If you find no listings at all, return an empty listings array and explain in the summary.`;

  return { system, prompt };
}

/** Suggest search niches tailored to the user's business. */
export function buildNichePrompt(info: BusinessInfo) {
  const prompt = `${businessContext(info)}

Suggest 6 specific local-business niches/industries that would be strong prospects for my services (the kind of business I should search for on Google to find leads). Favor industries that commonly have weak online presence and match my ideal customer.

Return JSON: {"niches": ["plumbers", "roofing contractors", ...]}, each a short search keyword (2-3 words max), lowercase.`;

  return { system: EXPERT_SYSTEM, prompt };
}
