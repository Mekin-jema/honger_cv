import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/login-form";
import { getAdminSession, safeNext } from "@/server/admin-session";
import { dbConfigured } from "@/server/db";

export const metadata: Metadata = { title: "Sign in", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const next = safeNext(typeof sp.next === "string" ? sp.next : undefined);
  if (await getAdminSession()) redirect(next);
  // Reloading on the code step keeps you there (the password step left a short-lived cookie).
  const jar = await cookies();
  const pendingCode = jar.has("fb.two_factor") || jar.has("__Secure-fb.two_factor");
  return <LoginForm next={next} pendingCode={pendingCode} configured={dbConfigured()} />;
}
