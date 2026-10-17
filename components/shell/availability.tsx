"use client";

import { usePersona } from "@/lib/persona/context";
import { cn } from "@/lib/utils";

/** Live availability badge ("Open to new roles", "Looking for a partner"). Click = the persona's chosen answer. */
export function Availability({ onClick, className }: { onClick?: () => void; className?: string }) {
  const { labels } = usePersona();
  // "Open to [new ]roles": the bracketed words are dropped on narrow screens.
  const parts = labels.availability.split(/(\[[^\]]*\])/).filter(Boolean);
  return (
    <button
      type="button"
      onClick={onClick}
      title={labels.availabilityTitle}
      className={cn(
        // Under 390px the top bar has no room for the words: the dot stays, the label goes to screen readers only.
        "flex shrink-0 items-center gap-2 rounded-full border border-line px-3 py-1.5 text-sm transition-colors hover:border-surface-strong hover:bg-surface pointer-coarse:min-h-11 max-[389px]:min-w-11 max-[389px]:justify-center",
        className,
      )}
    >
      <span className="relative flex size-2 shrink-0" aria-hidden="true">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-60 motion-reduce:hidden" />
        <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
      </span>
      <span className="font-semibold whitespace-nowrap max-[389px]:sr-only">
        {parts.map((p, i) =>
          p.startsWith("[") ? (
            <span key={i} className="hidden sm:inline">
              {p.slice(1, -1)}
            </span>
          ) : (
            p
          ),
        )}
      </span>
    </button>
  );
}
