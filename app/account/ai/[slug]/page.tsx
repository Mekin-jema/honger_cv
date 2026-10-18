import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProfileAssistant } from "@/components/account/profile-assistant";
import { PersonaDocShape } from "@/lib/persona/schema";
import { requireCustomer } from "@/server/admin-session";
import { loadDraft, personaOwnedBy } from "@/server/persona/repo";

export const metadata: Metadata = { title: "Your AI assistant", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function ProfileAssistantPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const customer = await requireCustomer(`/account/ai/${slug}/`);
  if (!/^[a-z][a-z0-9-]{1,31}$/.test(slug) || !(await personaOwnedBy(slug, customer.userId))) notFound();
  const draft = await loadDraft(slug);
  if (!draft) notFound();
  const parsed = PersonaDocShape.safeParse(draft.doc);
  if (!parsed.success) notFound();
  return <ProfileAssistant slug={slug} profileName={parsed.data.identity.name} />;
}
