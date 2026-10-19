import type { Metadata } from "next";
import { Sparkles } from "lucide-react";
import { AccountWorkspace } from "@/components/account/workspace";
import { requireCustomer } from "@/server/admin-session";
import { listOwnedPersonas, loadDraft, loadVersion } from "@/server/persona/repo";
import { PersonaDocShape } from "@/lib/persona/schema";
import { roleCvName } from "@/lib/persona/training";
import { enText } from "@/lib/persona/edit";

export const metadata: Metadata = { title: "Your CVs", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const customer = await requireCustomer();
  const owned = await listOwnedPersonas(customer.userId);
  const loaded = await Promise.all(owned.map(async (persona) => {
    const [draft, published] = await Promise.all([
      loadDraft(persona.slug),
      persona.publishedVersionId ? loadVersion(persona.publishedVersionId) : Promise.resolve(null),
    ]);
    const parsed = PersonaDocShape.safeParse(draft?.doc);
    const live = PersonaDocShape.safeParse(published?.doc);
    const identityName = parsed.success ? enText(parsed.data.identity.name) || persona.name : persona.name;
    return {
      slug: persona.slug,
      role: parsed.success ? enText(parsed.data.identity.role ?? parsed.data.identity.headline) : "",
      identityName,
      publishedVersionId: persona.publishedVersionId,
      pdfPath: persona.publishedVersionId && live.success && !live.data.document.gated
        ? `/u/${persona.slug}/d/${encodeURIComponent(live.data.document.fileName)}`
        : undefined,
    };
  }));
  const usedNames = new Map<string, number>();
  const personas = loaded.map((persona) => {
    const nameKey = roleCvName(persona.role).toLowerCase();
    const number = (usedNames.get(nameKey) ?? 0) + 1;
    usedNames.set(nameKey, number);
    return {
      slug: persona.slug,
      name: roleCvName(persona.role, number),
      identityName: persona.identityName,
      role: persona.role,
      publishedVersionId: persona.publishedVersionId,
      pdfPath: persona.pdfPath,
    };
  });
  return (
    <main className="min-h-dvh bg-bg text-fg">
      <div className="mx-auto max-w-5xl px-5 py-10 sm:py-14">
        <div className="mb-8">
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-accent">
            <Sparkles className="size-4" aria-hidden="true" /> Customer dashboard
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Welcome, {customer.name}
          </h1>
          <p className="mt-3 max-w-2xl leading-7 text-muted">
            Create and manage your CVs, train an AI for each one, and publish when it is ready. Your private workspace only shows CVs that belong to you.
          </p>
        </div>
        <AccountWorkspace personas={personas} />
      </div>
    </main>
  );
}
