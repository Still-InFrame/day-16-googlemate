"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, Loader2 } from "lucide-react";
import { dismissLead, undismissLead } from "@/app/(app)/lead/actions";
import { cn } from "@/lib/utils";

export function RemoveLeadButton({
  leadId,
  name,
  variant = "icon",
  redirectTo,
}: {
  leadId: string;
  name: string;
  variant?: "icon" | "full";
  redirectTo?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function remove() {
    startTransition(async () => {
      const res = await dismissLead(leadId);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(`Removed ${name} from Top Hits`, {
        action: {
          label: "Undo",
          onClick: () =>
            startTransition(async () => {
              await undismissLead(leadId);
              router.refresh();
            }),
        },
      });
      if (redirectTo) router.push(redirectTo);
      else router.refresh();
    });
  }

  if (variant === "full") {
    return (
      <button
        type="button"
        onClick={remove}
        disabled={pending}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-ink-soft transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Trash2 className="h-4 w-4" />
        )}
        Remove
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={remove}
      disabled={pending}
      aria-label={`Remove ${name}`}
      className={cn(
        "grid h-8 w-8 place-items-center rounded-full bg-white/90 text-ink-soft shadow-sm backdrop-blur transition-all hover:bg-red-600 hover:text-white",
        "opacity-0 group-hover:opacity-100 focus:opacity-100",
      )}
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Trash2 className="h-4 w-4" />
      )}
    </button>
  );
}
