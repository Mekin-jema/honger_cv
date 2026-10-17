import type { Metadata } from "next";
import { PersonaList } from "@/components/admin/studio/persona-list";
import { requireAdmin } from "@/server/admin-session";
import { dbConfigured } from "@/server/db";
import { personaSummaries } from "@/server/persona/studio";

export const metadata: Metadata = { title: "Personas", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function PersonasPage() {
  await requireAdmin("/admin/personas/");
  if (!dbConfigured()) return <PersonaList personas={[]} noDatabase />;
  return <PersonaList personas={await personaSummaries()} />;
}
