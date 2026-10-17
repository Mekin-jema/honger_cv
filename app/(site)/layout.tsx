import { notFound } from "next/navigation";
import { currentPersona } from "@/server/persona/resolve";

/** The readable pages: the job persona keeps its hand-built pages; other personas get theirs from their sections. */
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const p = await currentPersona();
  if (p.wrongLang) notFound();
  return children;
}
