import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Studio } from "@/components/admin/studio/studio";
import { TABS, type TabId } from "@/components/admin/studio/tabs";
import type { Doc } from "@/components/admin/studio/use-draft";
import { PersonaDocShape } from "@/lib/persona/schema";
import { roleCvName } from "@/lib/persona/training";
import { enText } from "@/lib/persona/edit";
import { requireCustomer } from "@/server/admin-session";
import { loadDraft, personaOwnedBy } from "@/server/persona/repo";
import { editableDraft, studioOverview } from "@/server/persona/studio";
import { ensureCustomerStarterDraft } from "@/server/persona/templates";

export const metadata: Metadata = { title: "Job Persona Studio", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function TrainingPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const query = await searchParams;
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
  const wanted = typeof query.tab === "string" ? query.tab : "overview";
  const tab = (TABS.some((item) => item.id === wanted) ? wanted : "overview") as TabId;
  return (
    <Studio
      key={slug}
      slug={slug}
      name={roleCvName(enText(parsed.data.identity.role ?? parsed.data.identity.headline))}
      initial={{ doc: parsed.data as Doc, rev: draft.rev, issues: draft.issues, changed: draft.changed, source: draft.source }}
      overview={overview}
      tab={tab}
      previewing={null}
      mode="customer"
    />
  );
}
