"use client";

import { createContext, useContext, useMemo } from "react";
import { setApiBase, withBase } from "@/lib/utils";
import type { ClientPersona, ClientSection, Question } from "./types";

/** The persona this page shows, plus lookups. Provided once, in the root layout. */
export type PersonaApi = ClientPersona & {
  /** A ready-made question by id (undefined for unknown or hidden ones). */
  get: (id: string) => Question | undefined;
  /** The main topics (sidebar first group, "/" list). */
  primary: Question[];
  section: (key: string) => ClientSection | undefined;
  /** A page of this persona's site: adds the persona prefix, the /bn language prefix and basePath. */
  href: (path: string) => string;
  /** The chat URL of an answer. */
  askPath: (id: string) => string;
  /** A file of this persona (the PDF, a photo): persona prefix and basePath, no language prefix. */
  fileHref: (path: string) => string;
  /** The persona prefix ("" unless PERSONA_ROUTING=prefix). */
  base: string;
};

const Ctx = createContext<PersonaApi | null>(null);

export function PersonaProvider({
  value,
  base = "",
  children,
}: {
  value: ClientPersona;
  base?: string;
  children: React.ReactNode;
}) {
  const api = useMemo<PersonaApi>(() => {
    // Bangla pages live under /bn/ (src/proxy.ts); their API calls go through it too, so answers come in Bangla.
    const langPrefix =
      value.lang === "bn" && value.defaultLang !== "bn" ? "/bn" : "";
    setApiBase(`${base}${langPrefix}`);
    const byId = new Map(value.questions.map((q) => [q.id, q]));
    const sections = new Map(value.sections.map((s) => [s.key, s]));
    const href = (path: string) => withBase(`${base}${langPrefix}${path}`);
    return {
      ...value,
      base,
      get: (id) => (id === "fallback" ? value.fallback : byId.get(id)),
      primary: value.questions.filter((q) => q.primary),
      section: (key) => sections.get(key),
      href,
      askPath: (id) => href(`/ask/${id}/`),
      fileHref: (path) => withBase(`${base}${path}`),
    };
  }, [value, base]);
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function usePersona(): PersonaApi {
  const api = useContext(Ctx);
  if (!api)
    throw new Error(
      "usePersona() needs a <PersonaProvider> (see src/app/layout.tsx)",
    );
  return api;
}
