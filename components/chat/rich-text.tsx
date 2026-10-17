import { Fragment } from "react";

/** Renders **bold** spans. Tolerates an unclosed marker mid-stream (the rest renders bold). */
export function RichText({ text }: { text: string }) {
  const parts = text.split("**");
  // Long emails and URLs wrap instead of widening the page on 320px phones.
  return (
    <span className="[overflow-wrap:anywhere]">
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <strong key={i} className="font-semibold text-fg">
            {part}
          </strong>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </span>
  );
}
