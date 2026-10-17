"use client";

import { usePersona, type PersonaApi } from "@/lib/persona/context";

type Props = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "onClick"> & {
  intentId: string;
  onPick: (intentId: string) => void;
};

/** URL a chat topic links to: its indexable content page, or the chat answer page when there is none. */
export const intentHref = (persona: PersonaApi, intentId: string) => {
  const page = persona.get(intentId)?.page;
  return page ? persona.href(page) : persona.askPath(intentId);
};

/**
 * A chat topic as a real link. Search engines follow the href to the topic's content page; a plain
 * click answers in the chat instead (new-tab clicks and middle clicks still open the page).
 */
export function IntentLink({ intentId, onPick, children, ...rest }: Props) {
  const persona = usePersona();
  return (
    <a
      {...rest}
      href={intentHref(persona, intentId)}
      onClick={(e) => {
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        onPick(intentId);
      }}
    >
      {children}
    </a>
  );
}
