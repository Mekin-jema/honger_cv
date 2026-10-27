import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SimpleCvTrainer } from "@/components/account/simple-cv-trainer";
import { PersonaDocShape } from "@/lib/persona/schema";
import { requireCustomer } from "@/server/admin-session";
import { loadDraft, personaOwnedBy } from "@/server/persona/repo";
import { editableDraft, studioOverview } from "@/server/persona/studio";
import { ensureCustomerStarterDraft } from "@/server/persona/templates";

export const metadata: Metadata = { title: "Train Your CV AI", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function TrainingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const customer = await requireCustomer(`/account/training/${slug}/`);
  if (!/^[a-z][a-z0-9-]{1,31}$/.test(slug) || !(await personaOwnedBy(slug, customer.userId))) notFound();
  const [initialDraft, overview] = await Promise.all([editableDraft(slug), studioOverview(slug)]);
  let draft = initialDraft;
  if (!draft) notFound();
  if (draft.source === "draft") {
    const savedDraft = await loadDraft(slug);
    if (savedDraft) {
      const preparedDraft = await ensureCustomerStarterDraft(slug, savedDraft);
      if (preparedDraft.rev !== savedDraft.rev) draft = (await editableDraft(slug)) ?? draft;
    }
  }
  const parsed = PersonaDocShape.safeParse(draft.doc);
  if (!parsed.success) {
    return (
      <main className="mx-auto min-h-dvh max-w-3xl px-5 py-12">
        <h1 className="text-2xl font-semibold">This profile draft needs repair</h1>
        <p className="mt-3 text-muted">The saved data is not in a format this editor can safely change. Contact support before editing it.</p>
      </main>
    );
  }

  const isPublished = Boolean(overview.liveId);

  return (
    <SimpleCvTrainer
      key={slug}
      slug={slug}
      name={parsed.data.name}
      initialDoc={parsed.data}
      initialRev={draft.rev}
      isPublished={isPublished}
      liveVersionId={overview.liveId}
    />
  );
}
