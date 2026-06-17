"use client";

import { useState } from "react";
import { X, ChevronLeft, ChevronRight, ImageOff } from "lucide-react";
import { photoUrl } from "@/lib/photo";
import { cn } from "@/lib/utils";

export function PhotoGallery({ photos }: { photos: string[] }) {
  const [open, setOpen] = useState<number | null>(null);
  // Track photos that failed to load so a broken proxy fetch doesn't show a gap.
  const [broken, setBroken] = useState<Set<number>>(new Set());

  const visible = photos.filter((_, i) => !broken.has(i));
  if (visible.length === 0 && broken.size >= photos.length && photos.length > 0) {
    return null; // all failed, caller can hide the section
  }

  function markBroken(i: number) {
    setBroken((prev) => new Set(prev).add(i));
  }

  function move(dir: number) {
    if (open == null) return;
    let next = open;
    for (let step = 0; step < photos.length; step++) {
      next = (next + dir + photos.length) % photos.length;
      if (!broken.has(next)) break;
    }
    setOpen(next);
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {photos.map((name, i) =>
          broken.has(i) ? null : (
            <button
              key={name}
              type="button"
              onClick={() => setOpen(i)}
              className={cn(
                "relative aspect-square overflow-hidden rounded-xl bg-slate-100 transition-opacity hover:opacity-90",
                i === 0 && "col-span-2 row-span-2 aspect-auto",
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoUrl(name, i === 0 ? 1000 : 500)}
                alt=""
                onError={() => markBroken(i)}
                className="h-full w-full object-cover"
              />
            </button>
          ),
        )}
      </div>

      {open != null && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-ink/80 p-4 backdrop-blur-sm"
          onClick={() => setOpen(null)}
        >
          <button
            className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
            onClick={() => setOpen(null)}
          >
            <X className="h-5 w-5" />
          </button>
          <button
            className="absolute left-4 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
            onClick={(e) => {
              e.stopPropagation();
              move(-1);
            }}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoUrl(photos[open], 1400)}
            alt=""
            onClick={(e) => e.stopPropagation()}
            onError={() => {
              markBroken(open);
              move(1);
            }}
            className="max-h-[85vh] max-w-[90vw] rounded-xl object-contain shadow-2xl"
          />
          <button
            className="absolute right-4 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
            onClick={(e) => {
              e.stopPropagation();
              move(1);
            }}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}

      {visible.length === 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-border bg-slate-50 px-4 py-6 text-sm text-ink-faint">
          <ImageOff className="h-4 w-4" /> Photos couldn&apos;t be loaded.
        </div>
      )}
    </>
  );
}
