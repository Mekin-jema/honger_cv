import type { Metadata } from "next";
import { ChatApp } from "@/components/chat-app";
import { profile } from "@/content/profile";
import { lt } from "@/lib/persona/text";
import { describe } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site";
import { aiEnabled } from "@/server/brain/model";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { currentPersona } from "@/server/persona/resolve";
import { personaAlternates } from "@/server/persona/urls";

export async function generateMetadata(): Promise<Metadata> {
  const persona = await currentPersona();
  const { compiled, lang } = persona;
  const { doc } = compiled;
  const name = doc.identity.name;
  const description = describe(
    `${lt(doc.identity.headline, lang) || name}. Ask the AI assistant about projects, skills, experience, and more.`,
  );
  const alternates = doc.legacy
    ? { canonical: absoluteUrl("/ask/") }
    : personaAlternates(persona, await headers(), "/ask/");

  return {
    title: "Ask AI",
    description: doc.legacy
      ? describe(
          `${profile.name}, Software Engineer and AI Engineer. Explore my projects, technical skills, and experience through my AI-powered portfolio assistant.`,
        )
      : description,
    alternates,
    robots: { index: false, follow: true },
  };
}

export default async function AskHome() {
  const persona = await currentPersona();
  if (persona.wrongLang) notFound();
  return <ChatApp aiEnabled={aiEnabled()} />;
}
