"use client";

import { Check, Loader2 } from "lucide-react";
import { Logo } from "@/components/brand";
import { cn } from "@/lib/utils";

export const SCAN_STEPS: { key: string; label: string }[] = [
  { key: "search", label: "Searching Google" },
  { key: "rank", label: "Ranking leads with AI" },
  { key: "details", label: "Pulling details & contacts" },
  { key: "pitch", label: "Writing your pitches" },
  { key: "save", label: "Saving top hits" },
];

export function ScanLoader({
  activeStage,
  message,
}: {
  activeStage: string;
  message: string;
}) {
  const activeIdx = SCAN_STEPS.findIndex((s) => s.key === activeStage);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-md gm-fade-up rounded-2xl border border-border bg-surface p-8 shadow-[0_24px_48px_-24px_rgba(15,23,42,0.25)]">
        <Logo className="mb-6 justify-center" />
        <p className="mb-6 text-center text-[15px] font-medium text-ink">
          {message || "Starting your scan…"}
        </p>
        <ol className="space-y-3">
          {SCAN_STEPS.map((step, i) => {
            const done = activeIdx > i;
            const active = activeIdx === i;
            return (
              <li key={step.key} className="flex items-center gap-3">
                <span
                  className={cn(
                    "grid h-6 w-6 place-items-center rounded-full text-white transition-colors",
                    done && "bg-emerald-500",
                    active && "bg-brand",
                    !done && !active && "bg-slate-200",
                  )}
                >
                  {done ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : active ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                  )}
                </span>
                <span
                  className={cn(
                    "text-sm transition-colors",
                    done && "text-ink-soft",
                    active && "font-medium text-ink",
                    !done && !active && "text-ink-faint",
                  )}
                >
                  {step.label}
                </span>
              </li>
            );
          })}
        </ol>
        <p className="mt-6 text-center text-xs text-ink-faint">
          This takes 15–30 seconds. Hang tight.
        </p>
      </div>
    </div>
  );
}
