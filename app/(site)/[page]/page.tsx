import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PersonaPage } from "@/components/site/persona-page";
import { personaPageMetadata } from "@/server/persona/pages";
import { currentPersona } from "@/server/persona/resolve";

type Props = { params: Promise<{ page: string }> };

/** A persona's own pages (/family/, /biodata/...). The job persona has only its hand-built pages. */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { page } = await params;
  const p = await currentPersona();
  return p.compiled.doc.legacy ? {} : personaPageMetadata(p, page);
}

export default async function Page({ params }: Props) {
  const { page } = await params;
  const p = await currentPersona();
  if (p.compiled.doc.legacy || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(page)) notFound();
  return <PersonaPage p={p} pageKey={page} />;
}
