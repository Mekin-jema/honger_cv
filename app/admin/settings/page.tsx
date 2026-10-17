import type { Metadata } from "next";
import { AdminSettings } from "@/components/admin/settings";
import { staticOtp } from "@/server/auth-options.mjs";
import { requireAdmin } from "@/server/admin-session";
import { mailProvider } from "@/server/mail";

export const metadata: Metadata = { title: "Settings", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await requireAdmin("/admin/settings/");
  return <AdminSettings email={session.email} currentSessionId={session.sessionId} staticCode={!!staticOtp()} mailProvider={mailProvider()} />;
}
