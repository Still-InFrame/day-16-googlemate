"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function CopyButton({
  text,
  label = "Copy",
  className,
  toastMessage = "Copied to clipboard",
}: {
  text: string;
  label?: string;
  className?: string;
  toastMessage?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success(toastMessage);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Couldn't copy, select and copy manually.");
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-ink-soft transition-colors hover:bg-slate-50 hover:text-ink",
        className,
      )}
    >
      {copied ? (
        <Check className="h-4 w-4 text-emerald-600" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
      {copied ? "Copied" : label}
    </button>
  );
}
