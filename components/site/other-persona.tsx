import type { Metadata } from "next";
import { personaPageMetadata } from "@/server/persona/pages";
import { currentPersona } from "@/server/persona/resolve";
import { PersonaPage } from "./persona-page";

/**
 * The job persona's hand-built pages (/about/, /projects/...) belong to it alone. For any other persona
 * the same path shows that persona's own page of that name, if it has one (else 404).
 */
export async function otherPersonaPage(key: string) {
  const p = await currentPersona();
  return p.compiled.doc.legacy ? null : <PersonaPage p={p} pageKey={key} />;
}

export async function otherPersonaMetadata(key: string): Promise<Metadata | null> {
  const p = await currentPersona();
  return p.compiled.doc.legacy ? null : personaPageMetadata(p, key);
}
