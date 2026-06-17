import * as React from "react";
import { cn } from "@/lib/utils";

type Tone = "brand" | "neutral" | "green" | "amber" | "red";

const tones: Record<Tone, string> = {
  brand: "bg-brand-soft text-brand-ink",
  neutral: "bg-slate-100 text-ink-soft",
  green: "bg-emerald-50 text-emerald-700",
  amber: "bg-amber-50 text-amber-700",
  red: "bg-red-50 text-red-700",
};

export function Badge({
  tone = "neutral",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
