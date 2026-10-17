import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { UnlockCard } from "@/components/unlock-card";
import { looksLikeAccessCode } from "@/lib/persona/access-code";
import { currentPersona } from "@/server/persona/resolve";

export const metadata: Metadata = { title: "Unlock", robots: { index: false, follow: false } };

/**
 * The link an owner sends with a code (/unlock/?code=...). It only shows a button: link previews in
 * messaging apps open URLs too, and must not use up a code.
 */
export default async function UnlockPage(props: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const persona = await currentPersona();
  if (persona.compiled.doc.access.mode === "open" || persona.wrongLang) notFound();
  const sp = await props.searchParams;
  const code = typeof sp.code === "string" && looksLikeAccessCode(sp.code) ? sp.code : "";
  return <UnlockCard code={code} />;
}
