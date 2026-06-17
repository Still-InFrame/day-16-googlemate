import type { Sentiment } from "@/lib/types";
import { cn } from "@/lib/utils";

export function SentimentMeter({ sentiment }: { sentiment: Sentiment }) {
  const score = Math.max(0, Math.min(100, Math.round(sentiment.score ?? 0)));
  const tone =
    score >= 67 ? "text-emerald-600" : score >= 40 ? "text-amber-600" : "text-red-600";

  return (
    <div>
      <div className="flex items-center justify-between">
        <span className={cn("text-sm font-semibold", tone)}>
          {sentiment.label || "Sentiment"}
        </span>
        <span className="text-xs font-medium text-ink-faint">{score}/100</span>
      </div>
      <div
        className="relative mt-2 h-2.5 rounded-full"
        style={{
          background: "linear-gradient(90deg, #ef4444 0%, #f59e0b 50%, #10b981 100%)",
        }}
      >
        <span
          className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-ink shadow"
          style={{ left: `${score}%` }}
        />
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-ink-faint">
        <span>Negative</span>
        <span>Positive</span>
      </div>
      {sentiment.summary && (
        <p className="mt-2 text-sm text-ink-soft">{sentiment.summary}</p>
      )}
    </div>
  );
}
