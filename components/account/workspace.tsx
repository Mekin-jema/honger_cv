"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Bot, FileText, LoaderCircle, Plus, Sparkles } from "lucide-react";
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

  const publishedCount = personas.filter((persona) => persona.publishedVersionId).length;
  const draftCount = personas.length - publishedCount;

  return (
    <div className="space-y-8">
      <section aria-label="Your profile summary" className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Your profiles", value: personas.length },
          { label: "Published", value: publishedCount },
          { label: "Private drafts", value: draftCount },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-2xl border border-line bg-card p-5">
            <p className="text-sm font-medium text-muted">{label}</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums">{value}</p>
          </div>
        ))}
      </section>

      {personas.length > 0 && (
        <section aria-labelledby="profiles-heading" className="space-y-3">
          <div>
            <h2 id="profiles-heading" className="text-lg font-semibold">Your dashboard</h2>
            <p className="mt-1 text-sm text-muted">Open your AI, update its training, or continue designing your CV.</p>
          </div>
          <ul className="grid gap-4 lg:grid-cols-2">
            {personas.map((persona) => (
              <li key={persona.slug} className="rounded-2xl border border-line bg-card p-5">
                <div className="flex items-center gap-4">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent-soft text-sm font-bold text-accent">
                    {persona.name.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{persona.name}</span>
                    <span className="block text-sm text-muted">
                      {persona.publishedVersionId ? "Published profile" : "Private draft"}
                    </span>
                  </span>
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Link
                    href={`/account/ai/${persona.slug}/`}
                    className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-accent px-3.5 text-sm font-semibold text-on-accent"
                  >
                    <Bot className="size-4" aria-hidden="true" /> Open my AI
                  </Link>
                  <Link
                    href={`/account/training/${persona.slug}/`}
                    className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-line-strong bg-bg px-3.5 text-sm font-semibold hover:border-accent/50"
                  >
                    <Sparkles className="size-4" aria-hidden="true" /> Train AI
                  </Link>
                  <Link
                    href={`/account/training/${persona.slug}/design/`}
                    className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-line-strong bg-bg px-3.5 text-sm font-semibold hover:border-accent/50"
                  >
                    <FileText className="size-4" aria-hidden="true" /> CV design
                  </Link>
                  {persona.publishedVersionId && (
                    <Link
                      href={`/u/${persona.slug}/`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-line-strong bg-bg px-3.5 text-sm font-semibold hover:border-accent/50"
                    >
                      Public profile <ArrowRight className="size-3.5" aria-hidden="true" />
                    </Link>
                  )}
                </div>
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
