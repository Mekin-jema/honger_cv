import type { Metadata } from "next";
import { Analytics } from "@/components/admin/analytics";
import { PlatformAnalyticsPanel } from "@/components/admin/platform-analytics";
import { lt } from "@/lib/persona/text";
import { requireAdmin } from "@/server/admin-session";
import { buildAdminData } from "@/server/admin-view";
import { dbConfigured } from "@/server/db";
import { codeSnapshot, getPersona } from "@/server/persona/cache";
import { listPersonas } from "@/server/persona/repo";
import { readDb } from "@/server/store";
import { getPlatformAnalytics } from "@/server/platform-events";

export const metadata: Metadata = { title: "Analytics", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminAnalyticsPage() {
  await requireAdmin("/admin/analytics/");
  const configured = dbConfigured();
  const personas = configured ? await listPersonas() : [];
  const [db, platformAnalytics] = await Promise.all([
    readDb(),
    configured ? getPlatformAnalytics() : Promise.resolve(null),
  ]);
  const labels: Record<string, string> = { fallback: "Not sure", ai: "AI answer" };
  const slugs = personas.length ? personas.map((persona) => persona.slug).reverse() : ["job"];
  for (const slug of slugs) {
    const compiled = (await getPersona(slug))?.compiled ?? codeSnapshot(slug);
    for (const question of compiled?.doc.questions ?? []) labels[question.id] = lt(question.label, "en");
  }
  const data = buildAdminData(db, labels).analytics;

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 space-y-5 px-4 py-5 md:px-6 md:py-6">
      {platformAnalytics && <PlatformAnalyticsPanel data={platformAnalytics} />}
      <section className="overflow-hidden rounded-2xl border border-line bg-card">
        <Analytics data={data} />
      </section>
    </main>
  );
}
