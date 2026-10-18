"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LoaderCircle, Plus } from "lucide-react";
import Link from "next/link";
import type { PersonaRow } from "@/server/persona/repo";
import { withBase } from "@/lib/utils";

export function AccountWorkspace({ personas }: { personas: PersonaRow[] }) {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [headline, setHeadline] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const createProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(undefined);
    try {
      const response = await fetch(withBase("/api/account/personas/"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ fullName, headline }),
      });
      const result = (await response.json()) as { slug?: string; error?: string };
      if (!response.ok || !result.slug) {
        setError(result.error || "Couldn't create your profile. Try again.");
        return;
      }
      router.push(`/account/training/${result.slug}/`);
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-8">
      {personas.length > 0 && (
        <section aria-labelledby="profiles-heading" className="space-y-3">
          <h2 id="profiles-heading" className="text-lg font-semibold">Your profiles</h2>
          <ul className="space-y-3">
            {personas.map((persona) => (
              <li key={persona.slug}>
                <Link
                  href={`/account/training/${persona.slug}/`}
                  className="flex items-center gap-4 rounded-2xl border border-line bg-card p-4 transition hover:border-accent/50 hover:bg-surface"
                >
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent-soft text-sm font-bold text-accent">
                    {persona.name.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{persona.name}</span>
                    <span className="block text-sm text-muted">
                      {persona.publishedVersionId ? "Published profile" : "Private draft"}
                    </span>
                  </span>
                  <ArrowRight className="size-4 text-muted" aria-hidden="true" />
                </Link>
                {persona.publishedVersionId && (
                  <Link
                    href={`/u/${persona.slug}/`}
                    target="_blank"
                    rel="noreferrer"
                    className="ml-4 inline-flex min-h-9 items-center gap-2 text-sm font-semibold text-accent hover:underline"
                  >
                    View public profile <ArrowRight className="size-3.5" aria-hidden="true" />
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <form onSubmit={createProfile} className="rounded-2xl border border-line bg-card p-5 sm:p-7">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
            <Plus className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-lg font-semibold">Create your AI profile</h2>
            <p className="mt-1 text-sm leading-6 text-muted">Start with your name and professional focus. You can add and edit details before publishing.</p>
          </div>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="space-y-2 text-sm font-medium">
            Full name
            <input
              required
              minLength={2}
              maxLength={120}
              autoComplete="name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className="w-full rounded-xl border border-line-strong bg-bg px-4 py-3 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
          </label>
          <label className="space-y-2 text-sm font-medium">
            Professional headline
            <input
              required
              minLength={2}
              maxLength={160}
              placeholder="e.g. Software Engineer · Data Analyst"
              value={headline}
              onChange={(event) => setHeadline(event.target.value)}
              className="w-full rounded-xl border border-line-strong bg-bg px-4 py-3 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
          </label>
        </div>
        {error && <p role="alert" className="mt-4 text-sm font-medium text-accent">{error}</p>}
        <button
          type="submit"
          disabled={busy || !fullName.trim() || !headline.trim()}
          className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-accent px-4 font-semibold text-on-accent disabled:opacity-60"
        >
          {busy ? <LoaderCircle className="size-4 animate-spin" /> : <Plus className="size-4" />}
          Start training
        </button>
      </form>
    </div>
  );
}
