import type { Metadata } from "next";
import { AccountWorkspace } from "@/components/account/workspace";
import { requireCustomer } from "@/server/admin-session";
import { getAccountDraft, getAccountOwnedPersonas, getAccountVersion } from "@/server/persona/account-data";
import { PersonaDocShape } from "@/lib/persona/schema";
import { enText } from "@/lib/persona/edit";

export const metadata: Metadata = { title: "Your CVs", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const customer = await requireCustomer();
  const owned = await getAccountOwnedPersonas(customer.userId);
  const loaded = await Promise.all(owned.map(async (persona) => {
    const [draft, published] = await Promise.all([
      getAccountDraft(persona.slug),
      persona.publishedVersionId ? getAccountVersion(persona.publishedVersionId) : Promise.resolve(null),
    ]);
    const parsed = PersonaDocShape.safeParse(draft?.doc);
    const live = PersonaDocShape.safeParse(published?.doc);
    const identityName = parsed.success ? enText(parsed.data.identity.name) || persona.name : persona.name;
    return {
      slug: persona.slug,
      name: parsed.success ? parsed.data.name : persona.name,
      role: parsed.success ? enText(parsed.data.identity.role ?? parsed.data.identity.headline) : "",
      identityName,
      publishedVersionId: persona.publishedVersionId,
      pdfPath: persona.publishedVersionId && published?.pdfPath && live.success && live.data.document.kind === "cv" && !live.data.document.gated
        ? `/u/${persona.slug}/d/${encodeURIComponent(live.data.document.fileName)}`
        : undefined,
    };
  }));
  const personas = loaded.map(({ slug, name, identityName, role, publishedVersionId, pdfPath }) => ({
    slug,
    name,
    identityName,
    role,
    publishedVersionId,
    pdfPath,
  }));
  return (
    <main className="min-h-dvh bg-bg text-fg">
      <div className="mx-auto max-w-5xl px-5 py-10 sm:py-14">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">My CVs</h1>
          <p className="mt-3 max-w-2xl leading-7 text-muted">
            Your CVs, designs, and AI assistants in one place. Create a CV to choose a design, add your information, and train its AI.
          </p>
        </div>
        <AccountWorkspace personas={personas} />
      </div>
    </main>
  );
}
