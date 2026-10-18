import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountAuthForm } from "@/components/account/auth-form";
import { getAdminSession, getCustomerSession } from "@/server/admin-session";
import { dbConfigured } from "@/server/db";
import { safeAccountNext } from "@/lib/account-next";

export const metadata: Metadata = { title: "Create your account", robots: { index: false, follow: false } };

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const next = safeAccountNext(params.next);
  if (await getAdminSession()) redirect("/admin/");
  if (await getCustomerSession()) redirect(next);
  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg px-5 py-12 text-fg">
      <section className="w-full max-w-md rounded-3xl border border-line bg-card p-7 shadow-xl shadow-fg/5 sm:p-9">
        <Link href="/" className="text-sm font-semibold text-accent hover:underline">Honger CV</Link>
        <h1 className="mt-7 text-3xl font-semibold tracking-tight">Create your account</h1>
        <p className="mt-2 text-sm leading-6 text-muted">Start building a portfolio and AI assistant with your own information.</p>
        {!dbConfigured() ? (
          <p role="alert" className="mt-6 rounded-xl bg-accent-soft p-4 text-sm text-accent">Registration is temporarily unavailable because account storage is not configured.</p>
        ) : (
          <div className="mt-7"><AccountAuthForm mode="register" next={next} /></div>
        )}
        <p className="mt-7 border-t border-line pt-5 text-center text-xs leading-5 text-muted">
          Looking at the demo? <Link href="/ask/" className="font-semibold text-fg underline-offset-4 hover:underline">Explore Mekin&apos;s AI portfolio</Link>
        </p>
      </section>
    </main>
  );
}
