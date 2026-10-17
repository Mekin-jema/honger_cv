import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { Studio } from "@/components/admin/studio/studio";
import { TABS, type TabId } from "@/components/admin/studio/tabs";
import type { Doc } from "@/components/admin/studio/use-draft";
import { requireAdmin } from "@/server/admin-session";
import { PREVIEW_COOKIE, readPreview } from "@/server/persona/preview";
import { editableDraft, personaRow, studioOverview } from "@/server/persona/studio";

export const metadata: Metadata = { title: "Persona Studio", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function PersonaStudioPage({ params, searchParams }: Props) {
  const { slug } = await params;
  await requireAdmin(`/admin/personas/${slug}/`);
  if (!/^[a-z][a-z0-9-]{1,31}$/.test(slug)) notFound();
  const [row, draft, overview, sp, jar] = await Promise.all([personaRow(slug), editableDraft(slug), studioOverview(slug), searchParams, cookies()]);
  if (!row || !draft) notFound();
  const wanted = typeof sp.tab === "string" ? sp.tab : "overview";
  const tab = (TABS.some((t) => t.id === wanted) ? wanted : "overview") as TabId;
  return (
    <Studio
      key={slug}
      slug={slug}
      name={row.name}
      initial={{ doc: draft.doc as Doc, rev: draft.rev, issues: draft.issues, changed: draft.changed, source: draft.source }}
      overview={overview}
      tab={tab}
      previewing={readPreview(jar.get(PREVIEW_COOKIE)?.value)}
    />
  );
}
