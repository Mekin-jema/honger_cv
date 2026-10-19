import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, MessageSquareText } from "lucide-react";
import { SectionBody } from "@/components/blocks/section-block";
import { PublicPersonaFrame } from "@/components/site/public-persona-frame";
import { PersonaShell } from "@/components/site/persona-shell";
import { lt } from "@/lib/persona/text";
import { clientSection, hasContent } from "@/server/persona/compile";
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
  const { doc } = persona.compiled;
  const sections = doc.sections
    .filter((section) => section.visibility === "public" && section.items.some(hasContent))
    .map((section) => clientSection(section, "public", persona.lang));

  return (
    <PublicPersonaFrame persona={persona}>
      <PersonaShell p={persona} showHeader={false}>
        <div className="space-y-10">
          <header className="space-y-4">
            <p className="eyebrow">{lt(doc.identity.role, persona.lang) || "Professional profile"}</p>
            <h1 className="display text-4xl sm:text-5xl">{doc.identity.name}</h1>
            {doc.identity.summary && <p className="max-w-2xl text-lg leading-8 text-muted">{lt(doc.identity.summary, persona.lang)}</p>}
            <Link href={`${persona.base}/ask/`} className="btn btn-primary">
              <MessageSquareText className="size-4" aria-hidden="true" /> Ask my AI assistant
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </header>
          {sections.map((section) => (
            <section key={section.key} className="space-y-4">
              <h2 className="text-2xl font-semibold tracking-tight">{section.title}</h2>
              <SectionBody s={section} />
            </section>
          ))}
        </div>
      </PersonaShell>
    </PublicPersonaFrame>
  );
}
