import { notFound } from "next/navigation";
import { ChatApp } from "@/components/chat-app";
import { PublicPersonaFrame } from "@/components/site/public-persona-frame";
import { PersonaShell } from "@/components/site/persona-shell";
import { aiEnabled } from "@/server/brain/model";
import { publicPersona } from "@/server/persona/public";

export const dynamic = "force-dynamic";

export default async function PublicPersonaChat({
  params,
}: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const persona = await publicPersona(slug);
  if (!persona) notFound();
  return (
    <PublicPersonaFrame persona={persona}>
      <PersonaShell p={persona}>
        <ChatApp aiEnabled={aiEnabled()} showSidebarToggle={false} />
      </PersonaShell>
    </PublicPersonaFrame>
  );
}
