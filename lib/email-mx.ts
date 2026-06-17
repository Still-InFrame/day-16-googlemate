import "server-only";
import { promises as dns } from "node:dns";
import { detectEmailProvider, type EmailProvider } from "@/lib/email";

/**
 * Provider detection that understands custom domains by inspecting MX records.
 * A custom-domain address like jane@acme.com is really Google Workspace,
 * Microsoft 365, etc., which only the MX records reveal. Known consumer domains
 * skip the lookup. Results are cached in-memory per domain.
 */

const cache = new Map<string, EmailProvider>();

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("dns timeout")), ms)),
  ]);
}

export async function detectEmailProviderByMx(
  email: string | null | undefined,
): Promise<EmailProvider> {
  if (!email) return "other";
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return "other";

  // Fast path: known consumer mailboxes don't need a DNS lookup.
  const consumer = detectEmailProvider(email);
  if (consumer !== "other") return consumer;

  if (cache.has(domain)) return cache.get(domain)!;

  let provider: EmailProvider = "other";
  try {
    const records = await withTimeout(dns.resolveMx(domain), 2500);
    const hosts = records.map((r) => r.exchange.toLowerCase()).join(" ");
    if (/google|googlemail|aspmx/.test(hosts)) provider = "gmail";
    else if (/outlook\.com|protection\.outlook|office365|microsoft|hotmail/.test(hosts))
      provider = "outlook";
    else if (/yahoodns|yahoo\.com/.test(hosts)) provider = "yahoo";
  } catch {
    provider = "other";
  }

  cache.set(domain, provider);
  return provider;
}
