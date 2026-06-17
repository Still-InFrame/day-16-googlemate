export type EmailProvider = "gmail" | "outlook" | "yahoo" | "other";

/** Guess the webmail provider from an email address domain. */
export function detectEmailProvider(email: string | null | undefined): EmailProvider {
  if (!email) return "other";
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  if (domain === "gmail.com" || domain === "googlemail.com") return "gmail";
  if (["outlook.com", "hotmail.com", "live.com", "msn.com"].includes(domain))
    return "outlook";
  if (domain === "yahoo.com" || domain === "ymail.com") return "yahoo";
  return "other";
}

export const PROVIDER_LABEL: Record<EmailProvider, string> = {
  gmail: "Open in Gmail",
  outlook: "Open in Outlook",
  yahoo: "Open in Yahoo",
  other: "Open in email app",
};

/**
 * Build a compose URL that opens the sender's webmail prefilled with the
 * recipient + subject + body. Falls back to mailto: (the OS default mail app)
 * for custom/unknown domains.
 */
export function buildComposeUrl(
  provider: EmailProvider,
  { to, subject, body }: { to?: string | null; subject?: string | null; body?: string | null },
) {
  const t = encodeURIComponent(to ?? "");
  const s = encodeURIComponent(subject ?? "");
  const b = encodeURIComponent(body ?? "");
  switch (provider) {
    case "gmail":
      return `https://mail.google.com/mail/?view=cm&fs=1&to=${t}&su=${s}&body=${b}`;
    case "outlook":
      return `https://outlook.live.com/mail/0/deeplink/compose?to=${t}&subject=${s}&body=${b}`;
    case "yahoo":
      return `https://compose.mail.yahoo.com/?to=${t}&subject=${s}&body=${b}`;
    default:
      return `mailto:${to ?? ""}?subject=${s}&body=${b}`;
  }
}
