"use client";

import { Ellipsis } from "lucide-react";
import { usePersona } from "@/lib/persona/context";
import { QIcon } from "@/lib/persona/icons";
import type { Question } from "@/lib/persona/types";
import { cn } from "@/lib/utils";
import { IntentLink } from "./intent-link";

type Props = {
  ids?: string[];
  intents?: Question[];
  onPick: (intentId: string) => void;
  /** Wrap onto several lines instead of scrolling sideways. */
  wrap?: boolean;
  /** Centre the chips (wrapping on desktop, still swipeable on phones). */
  center?: boolean;
  /** Small chips on a single line (the bottom dock). */
  compact?: boolean;
  /** Adds a trailing "More" chip. */
  onMore?: () => void;
  className?: string;
};

export function SuggestionChips({ ids, intents, onPick, wrap, center, compact, onMore, className }: Props) {
  const persona = usePersona();
  const list = intents ?? (ids ?? []).map((id) => persona.get(id)).filter((i): i is Question => !!i && i.id !== "fallback");
  const chip = compact ? "chip chip-sm" : "chip";
  const icon = compact ? "size-3.5 text-faint" : "size-4 text-faint";
  const items = (
    <>
      {list.map((i) => (
        <li key={i.id} className="snap-start">
          <IntentLink intentId={i.id} onPick={onPick} className={chip}>
            <QIcon name={i.icon} className={icon} />
            {i.label}
          </IntentLink>
        </li>
      ))}
      {onMore && (
        <li className="snap-start">
          <button type="button" className={chip} onClick={onMore}>
            <Ellipsis className={icon} aria-hidden="true" />
            More
          </button>
        </li>
      )}
    </>
  );

  if (compact)
    // One line that scrolls sideways. Phones: starts at the question box's left edge (scroll padding keeps
    // the first chip there when snapping). Wider screens: centred when it fits.
    return (
      <div className={cn("no-scrollbar -mx-4 snap-x scroll-pl-4 overflow-x-auto px-4 md:mx-0 md:scroll-pl-0 md:px-0", className)}>
        <ul className="flex w-max gap-1.5 md:mx-auto">{items}</ul>
      </div>
    );

  return (
    <ul
      className={cn(
        "flex gap-2",
        wrap ? "flex-wrap" : "no-scrollbar -mx-5 snap-x overflow-x-auto px-5 md:mx-0 md:flex-wrap md:overflow-visible md:px-0",
        center && "md:justify-center",
        className,
      )}
    >
      {items}
    </ul>
  );
}
