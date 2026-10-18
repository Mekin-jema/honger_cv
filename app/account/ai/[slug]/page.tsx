import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AccountAssistantFrame } from "@/components/account/account-assistant-frame";
import { PersonaDocShape } from "@/lib/persona/schema";
import { hasTrainingContent } from "@/lib/persona/training";
import { requireCustomer } from "@/server/admin-session";
import { aiEnabled } from "@/server/brain/model";
import { clientView, compilePersona } from "@/server/persona/compile";
import { loadDraft, personaOwnedBy } from "@/server/persona/repo";

export const metadata: Metadata = { title: "Your AI assistant", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function ProfileAssistantPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { slug } = await params;
  const query = await searchParams;
  const customer = await requireCustomer(`/account/ai/${slug}/`);
  if (!/^[a-z][a-z0-9-]{1,31}$/.test(slug) || !(await personaOwnedBy(slug, customer.userId))) notFound();
  const draft = await loadDraft(slug);
  if (!draft) notFound();
  const parsed = PersonaDocShape.safeParse(draft.doc);
  if (!parsed.success) notFound();
  if (!hasTrainingContent(parsed.data)) redirect(`/account/training/${slug}/?tab=knowledge`);
  const persona = clientView(compilePersona(slug, parsed.data), "public", parsed.data.site.defaultLang);
  const initialQuestion = typeof query.ask === "string" ? query.ask.slice(0, 300) : undefined;
  return <AccountAssistantFrame slug={slug} persona={persona} aiEnabled={aiEnabled()} initialQuestion={initialQuestion} />;
}
