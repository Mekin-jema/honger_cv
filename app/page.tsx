import type { Metadata } from "next";
import { ChatApp } from "@/components/chat-app";
import { JsonLd } from "@/components/site/site-shell";
import { profile } from "@/content/profile";
import { lt } from "@/lib/persona/text";
import { describe, graph, profilePageLd } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site";
import { aiEnabled } from "@/server/brain/model";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { personaPersonLd } from "@/server/persona/pages";
import { currentPersona } from "@/server/persona/resolve";
import { personaAlternates, personaOrigin, personaUrl } from "@/server/persona/urls";

// Set here, not in the layout, so other pages don't inherit "/" as their canonical.
export async function generateMetadata(): Promise<Metadata> {
  const p = await currentPersona();
  const { compiled, lang } = p;
  const { doc } = compiled;
  if (doc.legacy)
    return {
      alternates: { canonical: absoluteUrl("/") },
      description: describe(
        `${profile.name}, Software Engineer and AI Engineer specializing in AI agents, RAG, Python, FastAPI, React, Next.js, SQL, Oracle, and data analytics. Explore my projects, technical skills, and experience through my AI-powered portfolio assistant.`,
      ),
    };
  return {
    alternates: personaAlternates(p, await headers(), "/"),
    description: describe(lt(doc.site.description, lang) || lt(doc.identity.summary, lang) || doc.identity.name),
  };
}

export default async function Home() {
  const p = await currentPersona();
  const { compiled } = p;
  if (p.wrongLang) notFound();
  const h = await headers();
  return (
    <>
      {compiled.doc.legacy && <JsonLd data={graph(profilePageLd("/", `${profile.name} - ${profile.role}`))} />}
      {!compiled.doc.legacy && compiled.doc.site.indexable && !p.preview && (
        <JsonLd data={graph(personaPersonLd(p, h), { "@type": "ProfilePage", url: personaUrl(p, h, "/"), inLanguage: p.lang === "bn" ? "bn-BD" : "en", mainEntity: { "@id": `${personaOrigin(p, h)}/#person` } })} />
      )}
      {/* Read per request: switching the AI on or off needs no rebuild. */}
      <ChatApp aiEnabled={aiEnabled()} />
    </>
  );
}
