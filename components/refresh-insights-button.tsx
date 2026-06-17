"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { reanalyzeLead } from "@/app/(app)/lead/actions";

export function RefreshInsightsButton({ leadId }: { leadId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function refresh() {
    startTransition(async () => {
      const res = await reanalyzeLead(leadId);
      if (res.error) toast.error(res.error);
      else {
        toast.success("Insights refreshed");
        router.refresh();
      }
    });
  }

  return (
    <button
      type="button"
      onClick={refresh}
      disabled={pending}
      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-ink-soft transition-colors hover:bg-slate-50 hover:text-ink disabled:opacity-50"
    >
      <RefreshCw className={pending ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
      {pending ? "Refreshing..." : "Refresh insights"}
    </button>
  );
}
