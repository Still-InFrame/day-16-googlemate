"use client";

import { useState } from "react";

/** Banner photo that hides itself on load failure, revealing the gradient
 * fallback behind it (Places photos can fail if the key is restricted). */
export function BannerImage({ src }: { src: string }) {
  const [ok, setOk] = useState(true);
  if (!ok) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      onError={() => setOk(false)}
      className="absolute inset-0 h-full w-full object-cover"
    />
  );
}
