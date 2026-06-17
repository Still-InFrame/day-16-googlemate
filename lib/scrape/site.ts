import "server-only";
import type { OgPreview } from "@/lib/types";

/**
 * Lightweight, no-browser site enrichment: fetch the homepage HTML and pull out
 * a contact email + Open Graph preview tags. If the homepage has no email, we
 * follow ONE "contact"-looking link and try again. Best-effort, many sites
 * render contact info via JS or hide it behind a form, so a null result is
 * normal and expected, not an error.
 */

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

// Emails that are almost never the business's real contact address.
const JUNK_DOMAINS = [
  "sentry.io",
  "example.com",
  "example.org",
  "wix.com",
  "wixpress.com",
  "squarespace.com",
  "godaddy.com",
  "sentry-next.wixpress.com",
  "schema.org",
  "w3.org",
];
const JUNK_EXT = [".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".css", ".js"];

export interface SiteEnrichment {
  email: string | null;
  og: OgPreview | null;
}

function normalizeUrl(raw: string): string | null {
  try {
    const url = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
    return url.toString();
  } catch {
    return null;
  }
}

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "text/html" },
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const type = res.headers.get("content-type") ?? "";
    if (!type.includes("text/html") && !type.includes("text/")) return null;
    const text = await res.text();
    return text.slice(0, 600_000); // cap to keep parsing cheap
  } catch {
    return null;
  }
}

function pickEmail(html: string): string | null {
  const found = new Set<string>();

  // mailto: links are the highest-signal source.
  for (const m of html.matchAll(/mailto:([^"'?>\s]+)/gi)) {
    found.add(decodeURIComponent(m[1]).toLowerCase());
  }
  for (const m of html.matchAll(EMAIL_RE)) {
    found.add(m[0].toLowerCase());
  }

  const candidates = [...found].filter((e) => {
    if (JUNK_EXT.some((ext) => e.endsWith(ext))) return false;
    const domain = e.split("@")[1] ?? "";
    if (JUNK_DOMAINS.some((d) => domain.includes(d))) return false;
    if (e.length > 60) return false;
    return true;
  });

  if (!candidates.length) return null;

  // Prefer human-ish inboxes over no-reply/automated ones.
  const priority = ["info@", "contact@", "hello@", "office@", "sales@", "admin@"];
  const preferred = candidates.find((e) =>
    priority.some((p) => e.startsWith(p)),
  );
  const nonNoreply = candidates.find((e) => !e.includes("noreply") && !e.includes("no-reply"));
  return preferred ?? nonNoreply ?? candidates[0];
}

function parseOg(html: string): OgPreview | null {
  const meta = (prop: string) => {
    const re = new RegExp(
      `<meta[^>]+(?:property|name)=["']${prop}["'][^>]*content=["']([^"']+)["']`,
      "i",
    );
    const alt = new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${prop}["']`,
      "i",
    );
    return html.match(re)?.[1] ?? html.match(alt)?.[1] ?? null;
  };

  const titleTag = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ?? null;

  const og: OgPreview = {
    title: meta("og:title") ?? titleTag,
    description: meta("og:description") ?? meta("description"),
    image: meta("og:image"),
  };

  if (!og.title && !og.description && !og.image) return null;
  return og;
}

function findLink(html: string, baseUrl: string, pattern: RegExp): string | null {
  for (const m of html.matchAll(/href=["']([^"']+)["']/gi)) {
    const href = m[1];
    if (pattern.test(href)) {
      try {
        return new URL(href, baseUrl).toString();
      } catch {
        continue;
      }
    }
  }
  return null;
}

function findContactLink(html: string, baseUrl: string): string | null {
  return findLink(html, baseUrl, /contact|about/i);
}

/** Strip a page down to readable text for feeding to the AI. */
function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#0?39;|&apos;|&rsquo;/g, "'")
    .replace(/&quot;|&ldquo;|&rdquo;/g, '"')
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export interface SiteProfile {
  og: OgPreview | null;
  email: string | null;
  text: string;
}

/**
 * Read a website for the "prefill from my website" path: homepage text + OG +
 * email, plus one about/services page when present for richer signal. Returns
 * null if the site can't be read at all.
 */
export async function fetchSiteProfile(website: string): Promise<SiteProfile | null> {
  const url = normalizeUrl(website);
  if (!url) return null;

  const html = await fetchHtml(url);
  if (!html) return null;

  const og = parseOg(html);
  let email = pickEmail(html);
  let text = htmlToText(html);

  // An about/services page usually says what the business actually does.
  const deepUrl = findLink(html, url, /about|services|what-we-do|company|who-we-are/i);
  if (deepUrl && deepUrl !== url) {
    const deepHtml = await fetchHtml(deepUrl);
    if (deepHtml) {
      text += "\n\n" + htmlToText(deepHtml);
      if (!email) email = pickEmail(deepHtml);
    }
  }

  return { og, email, text: text.slice(0, 3500) };
}

export async function enrichFromWebsite(website: string): Promise<SiteEnrichment> {
  const url = normalizeUrl(website);
  if (!url) return { email: null, og: null };

  const html = await fetchHtml(url);
  if (!html) return { email: null, og: null };

  const og = parseOg(html);
  let email = pickEmail(html);

  if (!email) {
    const contactUrl = findContactLink(html, url);
    if (contactUrl && contactUrl !== url) {
      const contactHtml = await fetchHtml(contactUrl);
      if (contactHtml) email = pickEmail(contactHtml);
    }
  }

  return { email, og };
}
