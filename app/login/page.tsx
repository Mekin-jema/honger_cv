import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AccountAuthForm } from "@/components/account/auth-form";
import { getAdminSession, getCustomerSession, safeNext } from "@/server/admin-session";
import { dbConfigured } from "@/server/db";
import { safeAccountNext } from "@/lib/account-next";
import { configuredSocialProviders } from "@/server/auth-options.mjs";

export const metadata: Metadata = { title: "Sign in", robots: { index: false, follow: false } };

export default async function CustomerLoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const next = safeAccountNext(params.next);
  const adminNext = safeNext(typeof params.next === "string" ? params.next : undefined);
  if (await getAdminSession()) redirect(adminNext);
  if (await getCustomerSession()) redirect(next);
  const cookieJar = await cookies();
  const pendingAdminVerification = cookieJar.has("fb.two_factor") || cookieJar.has("__Secure-fb.two_factor");
  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg px-5 py-12 text-fg">
      <section className="w-full max-w-md rounded-3xl border border-line bg-card p-7 shadow-xl shadow-fg/5 sm:p-9">
        <Link href="/" className="text-sm font-semibold text-accent hover:underline">Honger CV</Link>
        <h1 className="mt-7 text-3xl font-semibold tracking-tight">Welcome back</h1>
        <p className="mt-2 text-sm leading-6 text-muted">Sign in to manage your CV and portfolio.</p>
        {!dbConfigured() ? (
          <p role="alert" className="mt-6 rounded-xl bg-accent-soft p-4 text-sm text-accent">Sign-in is temporarily unavailable because account storage is not configured.</p>
        ) : (
          <div className="mt-7"><AccountAuthForm mode="login" next={next} adminNext={adminNext} pendingAdminVerification={pendingAdminVerification} socialProviders={configuredSocialProviders()} socialError={typeof params.error === "string" ? params.error : undefined} /></div>
        )}
      </section>
    </main>
  );
}
