import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { ThemeToggle } from "@/components/theme-provider";
import { SignOutButton } from "@/components/account/sign-out-button";
import { AccountWorkspace } from "@/components/account/workspace";
import { requireCustomer } from "@/server/admin-session";
import { listOwnedPersonas } from "@/server/persona/repo";

export const metadata: Metadata = { title: "Your workspace", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const customer = await requireCustomer();
  const personas = await listOwnedPersonas(customer.userId);
  return (
    <main className="min-h-dvh bg-bg text-fg">
      <header className="border-b border-line">
        <nav aria-label="Account navigation" className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-5">
          <Link href="/" className="font-semibold tracking-tight">Honger CV</Link>
          <span className="text-faint" aria-hidden="true">/</span>
          <span className="text-sm text-muted">Workspace</span>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/ask/" className="hidden items-center gap-1 text-sm text-muted hover:text-fg sm:flex">
              Explore demo <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </Link>
            <SignOutButton />
            <ThemeToggle className="border border-line-strong bg-card text-fg shadow-sm" />
          </div>
        </nav>
      </header>
      <div className="mx-auto max-w-5xl px-5 py-10 sm:py-14">
        <div className="mb-8">
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-accent">
            <Sparkles className="size-4" aria-hidden="true" /> AI Training
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Welcome, {customer.name}
          </h1>
          <p className="mt-3 max-w-2xl leading-7 text-muted">
            Create a private professional profile, add the information your assistant should know, and review it before you publish.
          </p>
        </div>
        <AccountWorkspace personas={personas} />
      </div>
    </main>
  );
}
