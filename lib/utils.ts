import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Strip em/en dashes from AI-generated copy (Savion never wants em dashes).
 * Em dash and horizontal bar become a comma; en dashes become a hyphen in
 * number ranges and a comma elsewhere. Cleans up the resulting punctuation.
 */
export function sanitizeCopy<T extends string | null | undefined>(text: T): T {
  if (!text) return text;
  let t = (text as string)
    .replace(/\s*[—―]\s*/g, ", ") // em dash / horizontal bar
    .replace(/(\d)\s*–\s*(\d)/g, "$1-$2") // en dash in ranges -> hyphen
    .replace(/\s*–\s*/g, ", "); // remaining en dashes -> comma
  t = t
    .replace(/,\s*([.,;:!?])/g, "$1") // ", ." -> "."
    .replace(/\s+,/g, ",")
    .replace(/,{2,}/g, ",");
  return t as T;
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}
