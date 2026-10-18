import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProfileDesignStudio } from "@/components/account/profile-design-studio";
import { personaToCvData } from "@/lib/persona/cv";
import { isCvTemplateId } from "@/lib/persona/cv-templates";
import { PersonaDocShape } from "@/lib/persona/schema";
import { requireCustomer } from "@/server/admin-session";
import { loadDraft, personaOwnedBy } from "@/server/persona/repo";

export const metadata: Metadata = { title: "CV design", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function CustomerCvDesignPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const customer = await requireCustomer(`/account/training/${slug}/design/`);
  if (!/^[a-z][a-z0-9-]{1,31}$/.test(slug) || !(await personaOwnedBy(slug, customer.userId))) notFound();
  const draft = await loadDraft(slug);
  if (!draft) notFound();
  const parsed = PersonaDocShape.safeParse(draft.doc);
  if (!parsed.success) notFound();
  const data = parsed.data.document.data ?? {};
  const template = isCvTemplateId(data.cvTemplate) ? data.cvTemplate : "modern";
  const accentColor = typeof data.cvAccent === "string" && /^#[0-9a-f]{6}$/i.test(data.cvAccent) ? data.cvAccent : "#b5400f";

  return (
    <main className="min-h-dvh bg-bg text-fg">
      <ProfileDesignStudio
        slug={slug}
        doc={parsed.data}
        initialRev={draft.rev}
        cv={personaToCvData(parsed.data, parsed.data.site.defaultLang)}
        initialDesign={{ template, accentColor }}
      />
    </main>
  );
}
