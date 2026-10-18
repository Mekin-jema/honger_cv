import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { otherPersonaMetadata, otherPersonaPage } from "@/components/site/other-persona";
import { PersonaShell } from "@/components/site/persona-shell";
import { cv as codeCv } from "@/content/cv";
import { profile } from "@/content/profile";
import { readCv } from "@/lib/persona/cv";
import { describe } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site";
import { isCvTemplateId } from "@/lib/persona/cv-templates";
import { currentPersona } from "@/server/persona/resolve";
import { CvStudio } from "./cv-studio";

const cvTitle = `CV - ${profile.name}`;

export async function generateMetadata(): Promise<Metadata> {
  const other = await otherPersonaMetadata("cv");
  if (other) return other;
  const cv = readCv((await currentPersona()).compiled.doc.document.data, codeCv);
  const cvDescription = describe(`CV of ${profile.name}, ${profile.role}: ${cv.profile}`);
  // A child openGraph/twitter object replaces the root layout's, so siteName and the image are repeated here.
  return {
    title: "CV",
    description: cvDescription,
    alternates: { canonical: absoluteUrl("/cv/") },
    openGraph: {
      type: "profile",
      siteName: profile.name,
      title: cvTitle,
      description: cvDescription,
      url: absoluteUrl("/cv/"),
      images: [{ url: "/og.png", width: 1200, height: 630, alt: `${profile.name} - ${profile.role}` }],
    },
    twitter: { card: "summary_large_image", title: cvTitle, description: cvDescription, images: ["/og.png"] },
  };
}

export default async function CvPage(props: {
  searchParams?: Promise<{ template?: string; color?: string }>;
}) {
  const searchParams = props.searchParams ? await props.searchParams : undefined;
  // Another persona whose document lives at /cv/ shows it here, in its own page frame.
  const p = await currentPersona();
  if (!p.compiled.doc.legacy) {
    if (p.wrongLang) notFound();
    return <PersonaShell p={p}>{await otherPersonaPage("cv")}</PersonaShell>;
  }
  // The published CV (edited in the Studio), else the code content.
  const cv = readCv(p.compiled.doc.document.data, codeCv);
  const initialTemplate = isCvTemplateId(searchParams?.template) ? searchParams.template : "modern";
  const initialAccentColor = searchParams?.color
    ? `#${searchParams.color.replace(/^#/, "")}`
    : undefined;

  return (
    <CvStudio
      cv={cv}
      initialTemplate={initialTemplate}
      initialAccentColor={initialAccentColor}
    />
  );
}
