"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Globe2, Loader2, MapPinned } from "lucide-react";
import { checkNap } from "@/app/(app)/lead/actions";

export function NapCheck({
  leadId,
  hasReport,
}: {
  leadId: string;
  hasReport: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function run() {
    startTransition(async () => {
      const res = await checkNap(leadId);
      if (res.error) toast.error(res.error);
      else {
        toast.success("Directory check complete");
        router.refresh();
      }
    });
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-ink-soft">
            <MapPinned className="h-4 w-4 text-brand" /> Directories & NAP
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            Name, address, and phone consistency across listing sites.
          </p>
        </div>
        <button
          type="button"
          onClick={run}
          disabled={pending}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-ink-soft transition-colors hover:bg-slate-50 hover:text-ink disabled:opacity-50"
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Globe2 className="h-4 w-4" />
          )}
          {pending ? "Checking..." : hasReport ? "Re-check" : "Check directories"}
        </button>
      </div>

      {pending && (
        <div className="mt-3 gm-fade-up">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-brand-soft">
            <div className="h-full w-1/3 rounded-full bg-brand gm-indeterminate" />
          </div>
          <p className="mt-1.5 text-xs text-ink-faint">
            Searching directories across the web. This can take about 20 seconds.
          </p>
        </div>
      )}
    </div>
  );
}
