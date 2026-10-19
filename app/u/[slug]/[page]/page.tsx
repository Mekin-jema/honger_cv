import { notFound } from "next/navigation";
import { PersonaPage } from "@/components/site/persona-page";
import { PersonaShell } from "@/components/site/persona-shell";
import { PublicPersonaFrame } from "@/components/site/public-persona-frame";
import { publicPersona } from "@/server/persona/public";

export const dynamic = "force-dynamic";

export default async function PublicPersonaPage({
  params,
}: { params: Promise<{ slug: string; page: string }> }) {
  const { slug, page } = await params;
  const persona = await publicPersona(slug);
  if (!persona || page === "ask" || page === "api") notFound();
  return (
    <PublicPersonaFrame persona={persona}>
      <PersonaShell p={persona}>
        <PersonaPage p={persona} pageKey={page} />
      </PersonaShell>
    </PublicPersonaFrame>
  );
}
