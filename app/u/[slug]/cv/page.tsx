import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CvStudio } from "@/app/cv/cv-studio";
import { PersonaShell } from "@/components/site/persona-shell";
import { PublicPersonaFrame } from "@/components/site/public-persona-frame";
import { personaToCvData } from "@/lib/persona/cv";
import { lt } from "@/lib/persona/text";
import { isCvTemplateId } from "@/lib/persona/cv-templates";
import { withBase } from "@/lib/utils";
import { documentPdfPath } from "@/server/persona/compile";
import { publicPersona } from "@/server/persona/public";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const persona = await publicPersona(slug);
  return persona
    ? {
        title: `CV - ${persona.compiled.doc.identity.name}`,
        description: lt(persona.compiled.doc.identity.summary, persona.lang),
        robots: persona.compiled.doc.site.indexable ? undefined : { index: false, follow: false },
      }
    : {};
}

export default async function PublicCvPage({ params }: Props) {
  const { slug } = await params;
  const persona = await publicPersona(slug);
  if (!persona || persona.compiled.doc.document.gated) notFound();
  const { doc } = persona.compiled;
  const data = doc.document.data ?? {};
  const template = isCvTemplateId(data.cvTemplate) ? data.cvTemplate : "modern";
  const accentColor = typeof data.cvAccent === "string" && /^#[0-9a-f]{6}$/i.test(data.cvAccent) ? data.cvAccent : "#b5400f";
  return (
    <PublicPersonaFrame persona={persona}>
      <PersonaShell p={persona} wide showHeader={false}>
        <CvStudio
          cv={personaToCvData(doc, persona.lang)}
          initialTemplate={template}
          initialAccentColor={accentColor}
          downloadUrl={persona.compiled.pdfPath ? withBase(`${persona.base}${documentPdfPath(doc)}`) : null}
          onDownload={() => {
            void fetch(withBase(`/u/${slug}/api/pdf/`), { method: "POST" })
              .catch((err: unknown) => console.error("[platform-analytics] Could not record PDF download:", err));
          }}
          showSidebarToggle={false}
        />
      </PersonaShell>
    </PublicPersonaFrame>
  );
}
