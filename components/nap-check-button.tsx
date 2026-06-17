"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Globe2, Loader2, Search } from "lucide-react";
import type { ScanEvent } from "@/lib/types";

export function NapCheck({
  leadId,
  hasReport,
}: {
  leadId: string;
  hasReport: boolean;
}) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState(0);

  async function run() {
    setRunning(true);
    setStatus("Starting…");
    setProgress(6);

    try {
      const res = await fetch("/api/lead/nap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId }),
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Check failed to start");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as ScanEvent;
          if (event.type === "status") {
            setStatus(event.message);
            setProgress((p) => Math.min(92, p + 11));
          } else if (event.type === "done") {
            setProgress(100);
            setStatus("Done");
            toast.success("Directory check complete");
            router.refresh();
            return;
          } else if (event.type === "error") {
            throw new Error(event.message);
          }
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Check failed");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-ink-soft">
            <Globe2 className="h-4 w-4 text-brand" /> Directories & NAP
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            Name, address, and phone consistency across listing sites.
          </p>
        </div>
        <button
          type="button"
          onClick={run}
          disabled={running}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-ink-soft transition-colors hover:bg-slate-50 hover:text-ink disabled:opacity-50"
        >
          {running ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Globe2 className="h-4 w-4" />
          )}
          {running ? "Checking…" : hasReport ? "Re-check" : "Check directories"}
        </button>
      </div>

      {running && (
        <div className="mt-3 rounded-xl border border-border bg-slate-50/70 p-3.5">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-brand-soft">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand to-brand-ink transition-[width] duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div
            key={status}
            className="mt-2.5 flex items-center gap-2 gm-fade-up text-sm text-ink"
          >
            <Search className="h-3.5 w-3.5 shrink-0 animate-pulse text-brand" />
            <span className="min-w-0 truncate">{status}</span>
          </div>
        </div>
      )}
    </div>
  );
}
