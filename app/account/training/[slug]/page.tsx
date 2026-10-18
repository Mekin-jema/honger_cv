import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TrainingEditor } from "@/components/account/training-editor";
import { PersonaDocShape } from "@/lib/persona/schema";
import { requireCustomer } from "@/server/admin-session";
import { loadDraft, personaOwnedBy, publishedPointer } from "@/server/persona/repo";

export const metadata: Metadata = { title: "AI Training", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function TrainingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const customer = await requireCustomer(`/account/training/${slug}/`);
  if (!/^[a-z][a-z0-9-]{1,31}$/.test(slug) || !(await personaOwnedBy(slug, customer.userId))) notFound();
  const [draft, published] = await Promise.all([loadDraft(slug), publishedPointer(slug)]);
  if (!draft) notFound();
  const parsed = PersonaDocShape.safeParse(draft.doc);
  if (!parsed.success) {
    return (
      <main className="mx-auto min-h-dvh max-w-3xl px-5 py-12">
        <h1 className="text-2xl font-semibold">This profile draft needs repair</h1>
        <p className="mt-3 text-muted">The saved data is not in a format this editor can safely change. Contact support before editing it.</p>
        <Link href="/account/" className="mt-5 inline-block font-semibold text-accent hover:underline">Return to your workspace</Link>
      </main>
    );
  }
  return <TrainingEditor slug={slug} initialDoc={parsed.data} initialRev={draft.rev} initiallyPublished={!!published?.versionId} />;
}
