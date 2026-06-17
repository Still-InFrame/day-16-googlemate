"use client";

import { useEffect, useRef, useState } from "react";
import { Mail, ChevronDown } from "lucide-react";
import { type EmailProvider, buildComposeUrl } from "@/lib/email";

const OPTIONS: { id: EmailProvider; label: string; dot: string }[] = [
  { id: "gmail", label: "Gmail", dot: "#EA4335" },
  { id: "outlook", label: "Outlook", dot: "#0A66C2" },
  { id: "yahoo", label: "Yahoo", dot: "#6001D2" },
  { id: "other", label: "Default mail app", dot: "#64748b" },
];

export function ComposeMenu({
  defaultProvider,
  to,
  subject,
  body,
}: {
  defaultProvider: EmailProvider;
  to?: string | null;
  subject?: string | null;
  body?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // Detected provider first, then the rest.
  const ordered = [
    ...OPTIONS.filter((o) => o.id === defaultProvider),
    ...OPTIONS.filter((o) => o.id !== defaultProvider),
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-brand-ink"
      >
        <Mail className="h-4 w-4" />
        Open in email
        <ChevronDown className="h-3.5 w-3.5" />
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-56 overflow-hidden rounded-xl border border-border bg-surface p-1 shadow-[0_12px_32px_-12px_rgba(15,23,42,0.25)]">
          {ordered.map((opt) => {
            const url = buildComposeUrl(opt.id, { to, subject, body });
            const newTab = opt.id !== "other";
            return (
              <a
                key={opt.id}
                href={url}
                target={newTab ? "_blank" : undefined}
                rel={newTab ? "noreferrer" : undefined}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-ink transition-colors hover:bg-slate-100"
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: opt.dot }}
                />
                {opt.label}
                {opt.id === defaultProvider && (
                  <span className="ml-auto text-[11px] font-medium text-brand">
                    detected
                  </span>
                )}
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
