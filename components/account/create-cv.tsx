"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, LoaderCircle, Sparkles } from "lucide-react";
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
    <main className="min-h-dvh bg-bg text-fg">
      <div className="mx-auto max-w-3xl px-5 py-8 sm:py-12">
        <Link href="/account/" className="inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-fg">
          <ArrowLeft className="size-4" aria-hidden="true" /> Back to My CVs
        </Link>
        <div className="mt-8 rounded-3xl border border-line bg-card p-5 shadow-sm sm:p-8">
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-accent">
            <Sparkles className="size-4" aria-hidden="true" /> Create a CV
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">What is this CV for?</h1>
          <p className="mt-3 max-w-xl leading-7 text-muted">
            Give it a clear name, such as “Software Engineer” or “Data Analyst”. We’ll start with Mekin’s editable demo, then help you choose a design and add your details.
          </p>
          <form onSubmit={create} className="mt-7 space-y-5">
            <label className="block space-y-2 text-sm font-semibold">
              CV name or target role
              <input
                autoFocus
                required
                minLength={2}
                maxLength={80}
                value={cvName}
                onChange={(event) => {
                  setCvName(event.target.value);
                  if (!headline) setHeadline(event.target.value);
                }}
                placeholder="e.g. Software Engineer"
                className="w-full rounded-xl border border-line-strong bg-bg px-4 py-3 text-base font-normal outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
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
      </div>
    </main>
  );
}
