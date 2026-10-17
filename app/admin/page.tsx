import type { Metadata } from "next";
import { AdminDashboard } from "@/components/admin/dashboard";
import { lt } from "@/lib/persona/text";
import { requireAdmin } from "@/server/admin-session";
import { buildAdminData } from "@/server/admin-view";
import { dbConfigured } from "@/server/db";
import { codeSnapshot, getPersona } from "@/server/persona/cache";
import { listPersonas } from "@/server/persona/repo";
import { readDb } from "@/server/store";

export const metadata: Metadata = { title: "Feedback inbox", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminPage({ searchParams }: PageProps<"/admin">) {
  // Signed out: the login page (and back here afterwards).
  await requireAdmin("/admin/");
  const sp = await searchParams;
  const personas = dbConfigured() ? await listPersonas().catch(() => []) : [];
  const chosen = typeof sp.persona === "string" && personas.some((p) => p.slug === sp.persona) ? sp.persona : undefined;
  const db = await readDb(chosen);
  // Question names of the personas shown (ids are per persona; the chosen one, else the first, wins a clash).
  const labels: Record<string, string> = { fallback: "Not sure", ai: "AI answer" };
  const slugs = chosen ? [chosen] : personas.length ? personas.map((p) => p.slug).reverse() : ["job"];
  for (const slug of slugs) {
    const compiled = (await getPersona(slug))?.compiled ?? codeSnapshot(slug);
    for (const q of compiled?.doc.questions ?? []) labels[q.id] = lt(q.label, "en");
  }
  // Only summaries of the event log reach the browser, not every raw event.
  return <AdminDashboard data={buildAdminData(db, labels)} labels={labels} personas={personas.map((p) => ({ slug: p.slug, name: p.name }))} persona={chosen} />;
}
