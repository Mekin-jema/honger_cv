import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChatApp } from "@/components/chat-app";
import { lt } from "@/lib/persona/text";
import { absoluteUrl } from "@/lib/site";
import { describe } from "@/lib/seo";
import { aiEnabled } from "@/server/brain/model";
import { questionVisible } from "@/server/persona/compile";
import { headers } from "next/headers";
import { currentPersona } from "@/server/persona/resolve";
import { personaUrl } from "@/server/persona/urls";

// Every answer has a real, shareable URL. The questions come from the published persona, so the page is
// rendered per request (a new question needs no rebuild); unknown or hidden ids answer 404.

export async function generateMetadata(props: PageProps<"/ask/[intent]">): Promise<Metadata> {
  const { intent: id } = await props.params;
  const persona = await currentPersona();
  const { compiled, tier, lang } = persona;
  const q = compiled.questionsById.get(id);
  if (!q || !questionVisible(compiled, id, tier)) return {};
  const name = compiled.doc.identity.name;
  const role = lt(compiled.doc.identity.role, lang);
  const label = lt(q.label, lang);
  const title = `${label} - ${name}`;
  const description = describe(lt(q.answers[0], lang));
  const url = compiled.doc.legacy ? absoluteUrl(`/ask/${id}/`) : personaUrl(persona, await headers(), `/ask/${id}/`);
  const ogImage = { url: "/og.png", width: 1200, height: 630, alt: role ? `${name} - ${role}` : name };
  // A child openGraph/twitter object replaces the root layout's, so siteName and the image are repeated here.
  return {
    title: label,
    description,
    // Chat views share one shell; the indexable copy of each topic is its content page (/about/, /projects/...).
    // noindex keeps them out of results without blocking the links they carry.
    robots: { index: false, follow: true },
    openGraph: { type: "website", siteName: name, title, description, url, images: [ogImage] },
    twitter: { card: "summary_large_image", title, description, images: ["/og.png"] },
  };
}

export default async function AskPage(props: PageProps<"/ask/[intent]">) {
  const { intent: id } = await props.params;
  const { compiled, tier, wrongLang } = await currentPersona();
  if (wrongLang || !questionVisible(compiled, id, tier)) notFound();
  return <ChatApp initialIntent={id} aiEnabled={aiEnabled()} />;
}
