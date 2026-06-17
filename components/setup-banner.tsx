import Link from "next/link";
import { KeyRound, Building2, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";

export function SetupBanner({
  hasKey,
  hasBusinessInfo,
}: {
  hasKey: boolean;
  hasBusinessInfo: boolean;
}) {
  const items = [
    {
      done: hasKey,
      href: "/config",
      icon: KeyRound,
      title: "Connect your AI key",
      desc: "Add your Anthropic or OpenAI key so scans can rank and pitch.",
    },
    {
      done: hasBusinessInfo,
      href: "/business-info",
      icon: Building2,
      title: "Describe your business",
      desc: "So every lead is scored and pitched through your lens.",
    },
  ];

  return (
    <Card className="overflow-hidden border-amber-200 bg-amber-50/50">
      <div className="border-b border-amber-200/70 px-6 py-4">
        <h3 className="font-semibold text-ink">Finish setup to start scanning</h3>
        <p className="mt-0.5 text-sm text-ink-soft">
          Two quick steps and you&apos;re ready to find leads.
        </p>
      </div>
      <div className="divide-y divide-amber-200/60">
        {items.map(({ done, href, icon: Icon, title, desc }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-amber-50"
          >
            <span
              className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                done ? "bg-emerald-100 text-emerald-600" : "bg-white text-ink-soft"
              }`}
            >
              <Icon className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-ink">{title}</span>
                {done && (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                    Done
                  </span>
                )}
              </div>
              <p className="text-sm text-ink-soft">{desc}</p>
            </div>
            {!done && <ArrowRight className="h-4 w-4 text-ink-faint" />}
          </Link>
        ))}
      </div>
    </Card>
  );
}
