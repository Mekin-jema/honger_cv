import { notFound } from "next/navigation";
import { PersonaShell } from "@/components/site/persona-shell";
import { SiteShell } from "@/components/site/site-shell";
import { currentPersona } from "@/server/persona/resolve";

/** The readable pages: the job persona keeps its hand-built pages; other personas get theirs from their sections. */
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const p = await currentPersona();
  if (p.wrongLang) notFound();
  return p.compiled.doc.legacy ? <SiteShell>{children}</SiteShell> : <PersonaShell p={p}>{children}</PersonaShell>;
}
