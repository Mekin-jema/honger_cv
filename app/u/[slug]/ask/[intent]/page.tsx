import { notFound } from "next/navigation";
import { ChatApp } from "@/components/chat-app";
import { PublicPersonaFrame } from "@/components/site/public-persona-frame";
import { PersonaShell } from "@/components/site/persona-shell";
import { aiEnabled } from "@/server/brain/model";
import { questionVisible } from "@/server/persona/compile";
import { publicPersona } from "@/server/persona/public";

export const dynamic = "force-dynamic";

export default async function PublicPersonaIntent({
  params,
}: { params: Promise<{ slug: string; intent: string }> }) {
  const { slug, intent } = await params;
  const persona = await publicPersona(slug);
  if (!persona || !questionVisible(persona.compiled, intent, "public")) notFound();
  return (
    <PublicPersonaFrame persona={persona}>
      <PersonaShell p={persona}>
        <ChatApp initialIntent={intent} aiEnabled={aiEnabled()} showSidebarToggle={false} />
      </PersonaShell>
    </PublicPersonaFrame>
  );
}
