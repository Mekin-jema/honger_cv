import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { AccountAssistantFrame } from "@/components/account/account-assistant-frame";
import { PersonaDocShape } from "@/lib/persona/schema";
import { hasTrainingContent } from "@/lib/persona/training";
import { requireCustomer } from "@/server/admin-session";
import { aiEnabled } from "@/server/brain/model";
import { clientView, compilePersona } from "@/server/persona/compile";
import { loadDraft, personaOwnedBy, publishedPointer } from "@/server/persona/repo";

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
  const published = await publishedPointer(slug);
  if (!published?.versionId || !hasTrainingContent(parsed.data)) {
    return (
      <main className="grid min-h-dvh place-items-center bg-bg px-5 py-12 text-fg">
        <section className="w-full max-w-xl rounded-3xl border border-line bg-card p-7 shadow-sm sm:p-9">
          <p className="text-sm font-semibold text-accent">AI training needed</p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">Train this CV before chatting with its AI</h1>
          <p className="mt-3 leading-7 text-muted">
            First add or edit the CV information in the form, or update the complete profile in the JSON editor. Save your draft, then choose <strong className="text-fg">Publish &amp; train</strong>. You can return to this chat once the profile has been trained.
          </p>
          <Link
            href={`/account/training/${slug}/?tab=knowledge`}
            className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-accent px-4 font-semibold text-on-accent"
          >
            Open CV training
          </Link>
        </section>
      </main>
    );
  }
  const persona = clientView(compilePersona(slug, parsed.data), "public", parsed.data.site.defaultLang);
  const initialQuestion = typeof query.ask === "string" ? query.ask.slice(0, 300) : undefined;
  return <AccountAssistantFrame slug={slug} persona={persona} aiEnabled={aiEnabled()} initialQuestion={initialQuestion} />;
}
