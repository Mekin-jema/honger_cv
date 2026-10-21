"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, FileText, LoaderCircle, Sparkles } from "lucide-react";
import Link from "next/link";
import { withBase } from "@/lib/utils";

export function CreateCv() {
  const router = useRouter();
  const [cvName, setCvName] = useState("");
  const [headline, setHeadline] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const create = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(undefined);
    try {
      const response = await fetch(withBase("/api/account/personas/"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ cvName: cvName.trim(), headline: headline.trim() || cvName.trim() }),
      });
      const result = (await response.json()) as { slug?: string; error?: string };
      if (!response.ok || !result.slug) {
        setError(result.error || "Couldn't create this CV. Please try again.");
        return;
      }
      router.push(`/account/training/${result.slug}/design/`);
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="relative min-h-dvh overflow-hidden bg-bg text-fg">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-gradient-to-b from-accent/10 to-transparent" />
      <div className="relative mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-10">
        <Link href="/account/" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-card/80 px-4 text-sm font-semibold text-muted transition hover:text-fg">
          <ArrowLeft className="size-4" aria-hidden="true" /> Back to My CVs
        </Link>
        <div className="mt-8 grid overflow-hidden rounded-3xl border border-line bg-card shadow-[var(--card-shadow)] lg:grid-cols-[1.1fr_0.9fr]">
          <div className="p-5 sm:p-8 lg:p-10">
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-accent">
            <Sparkles className="size-4" aria-hidden="true" /> YOUR NEXT CHAPTER STARTS HERE
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Let’s make a CV that feels like you.</h1>
          <p className="mt-3 max-w-xl leading-7 text-muted">
            Start with the role you’re aiming for. You can add your experience, choose a polished design, and fine-tune everything before sharing.
          </p>
          <form onSubmit={create} className="mt-7 space-y-5">
            <label className="block space-y-2 text-sm font-semibold">
              CV name or target role
              <input
                autoFocus
                required
                minLength={2}
                maxLength={60}
                value={cvName}
                onChange={(event) => setCvName(event.target.value)}
                placeholder="e.g. Product Designer"
                className="min-h-12 w-full rounded-xl border border-line-strong bg-bg px-4 py-3 text-base font-normal outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
            </label>
            <details className="rounded-xl border border-line bg-bg-soft p-4">
              <summary className="cursor-pointer text-sm font-semibold">Set a different professional headline (optional)</summary>
              <label className="mt-3 block space-y-2 text-sm font-medium">
                Headline shown on the CV
                <input
                  maxLength={160}
                  value={headline}
                  onChange={(event) => setHeadline(event.target.value)}
                  placeholder="e.g. Full-Stack Developer · AI Engineer"
                  className="w-full rounded-xl border border-line-strong bg-bg px-3 py-2.5 font-normal outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                />
              </label>
            </details>
            {error && <p role="alert" className="text-sm font-medium text-accent">{error}</p>}
            <button
              type="submit"
              disabled={busy || cvName.trim().length < 2}
              className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-accent px-5 font-semibold text-on-accent disabled:opacity-60"
            >
              {busy ? <LoaderCircle className="size-4 animate-spin" /> : <Sparkles className="size-4" aria-hidden="true" />}
              {busy ? "Preparing your CV…" : "Continue to choose a design"}
            </button>
          </form>
          </div>
          <aside className="flex flex-col justify-between border-t border-line bg-surface/70 p-5 sm:p-8 lg:border-l lg:border-t-0 lg:p-10">
            <div>
              <div className="grid size-12 place-items-center rounded-2xl bg-accent/10 text-accent"><FileText className="size-6" aria-hidden="true" /></div>
              <h2 className="mt-5 text-xl font-semibold">A simple path to a standout CV</h2>
              <ol className="mt-6 space-y-5">
                {["Name your CV for the role you want", "Add your details and experience", "Choose a design and make it yours"].map((step, index) => (
                  <li key={step} className="flex items-start gap-3 text-sm leading-6 text-muted">
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent text-xs font-bold text-on-accent">{index + 1}</span>{step}
                  </li>
                ))}
              </ol>
            </div>
            <p className="mt-8 flex items-center gap-2 border-t border-line pt-5 text-xs leading-5 text-muted"><Check className="size-4 shrink-0 text-accent" aria-hidden="true" />Your CV stays editable. Nothing is published until you choose to share it.</p>
          </aside>
        </div>
      </div>
    </main>
  );
}
