import type { Metadata } from "next";
import { PublicPersonaFrame } from "@/components/site/public-persona-frame";
import { PublicPersonaProfile } from "@/components/site/public-persona-profile";
import { PersonaShell } from "@/components/site/persona-shell";
import { lt } from "@/lib/persona/text";
import { publicPersona } from "@/server/persona/public";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const persona = await publicPersona(slug);
  if (!persona) return {};
  const { doc } = persona.compiled;
  return {
    title: doc.identity.name,
    description: lt(doc.site.description, persona.lang) || lt(doc.identity.summary, persona.lang) || lt(doc.identity.headline, persona.lang) || doc.identity.name,
    robots: doc.site.indexable ? undefined : { index: false, follow: false },
  };
}

export default async function PublicPersonaHome({ params }: Props) {
  const { slug } = await params;
  const persona = await publicPersona(slug);
  if (!persona) notFound();

  return (
    <PublicPersonaFrame persona={persona}>
      <PersonaShell p={persona}>
        <PublicPersonaProfile p={persona} />
      </PersonaShell>
    </PublicPersonaFrame>
  );
}
