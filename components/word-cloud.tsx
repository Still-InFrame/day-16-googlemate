import type { WordCloudItem } from "@/lib/types";

/** A simple, reliable tag cloud: size + weight + color scale with frequency. */
export function WordCloud({ items }: { items: WordCloudItem[] }) {
  if (!items.length) return null;

  const weights = items.map((i) => i.weight);
  const max = Math.max(...weights);
  const min = Math.min(...weights);
  const scale = (w: number) => (max === min ? 0.6 : (w - min) / (max - min));

  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1.5">
      {items.map((it) => {
        const t = scale(it.weight); // 0..1
        const fontSize = 13 + t * 15; // 13px .. 28px
        const fontWeight = t > 0.6 ? 700 : t > 0.3 ? 600 : 500;
        const color =
          t > 0.6 ? "var(--brand-ink)" : t > 0.3 ? "var(--brand)" : "var(--ink-soft)";
        return (
          <span
            key={it.text}
            title={`${it.text} (${it.weight})`}
            style={{ fontSize, fontWeight, color, lineHeight: 1.1 }}
          >
            {it.text}
          </span>
        );
      })}
    </div>
  );
}
