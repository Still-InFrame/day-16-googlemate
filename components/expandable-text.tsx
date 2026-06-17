"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Text that clamps to a few lines with a Read more / Show less toggle. The
 * toggle only appears when the text actually overflows the clamp.
 */
export function ExpandableText({
  text,
  className,
  clampClass = "line-clamp-4",
}: {
  text: string;
  className?: string;
  clampClass?: string;
}) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [clampable, setClampable] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (el) setClampable(el.scrollHeight > el.clientHeight + 2);
  }, [text]);

  return (
    <div>
      <p ref={ref} className={cn(className, !expanded && clampClass)}>
        {text}
      </p>
      {(clampable || expanded) && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="mt-1 text-xs font-medium text-brand hover:text-brand-ink"
        >
          {expanded ? "Show less" : "Read more"}
        </button>
      )}
    </div>
  );
}
