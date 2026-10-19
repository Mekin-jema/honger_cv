"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Bot, FileText, LoaderCircle, Plus, Sparkles } from "lucide-react";
import Link from "next/link";
import { withBase } from "@/lib/utils";
import { roleCvName } from "@/lib/persona/training";

type AccountCv = {
  slug: string;
  name: string;
  identityName: string;
  role: string;
  publishedVersionId: string | null;
  pdfPath?: string;
};

function ShareLinks({ slug, pdfPath }: { slug: string; pdfPath?: string }) {
  const [copied, setCopied] = useState<string>();
  const [error, setError] = useState<string>();
  const links = [
    { label: "Portfolio", path: `/u/${slug}/` },
    ...(pdfPath ? [{ label: "CV PDF", path: pdfPath }] : []),
    { label: "Public AI chat", path: `/u/${slug}/ask/` },
  ];

  const copy = async (label: string, path: string) => {
    setError(undefined);
    try {
      await navigator.clipboard.writeText(new URL(withBase(path), window.location.origin).toString());
      setCopied(label);
    } catch {
      setError("Couldn't copy the link. Select and copy the URL instead.");
    }
  };

  return (
    <section className="mt-5 rounded-xl border border-line bg-bg p-4" aria-label="Public share links">
      <h3 className="font-semibold">Share your CV</h3>
      <p className="mt-1 text-sm text-muted">Anyone with a link can open the portfolio and AI chat without an account. Any access-code protections you configured still apply.</p>
      <ul className="mt-3 space-y-2">
        {links.map(({ label, path }) => (
          <li key={label} className="flex flex-wrap items-center gap-2 text-sm">
            <span className="w-28 shrink-0 font-medium">{label}</span>
            <a href={withBase(path)} target="_blank" rel="noreferrer" className="min-w-0 flex-1 break-all text-accent underline underline-offset-2">{path}</a>
            <button type="button" onClick={() => void copy(label, path)} className="min-h-9 rounded-lg border border-line-strong px-3 text-xs font-semibold hover:bg-surface">
              {copied === label ? "Copied" : "Copy"}
            </button>
          </li>
        ))}
      </ul>
      {!pdfPath && <p className="mt-3 text-xs text-muted">The PDF link will appear here once a PDF has been generated for this published design.</p>}
      {error && <p role="alert" className="mt-2 text-xs text-accent">{error}</p>}
      {copied && <p role="status" className="sr-only">{copied} link copied.</p>}
    </section>
  );
}

export function AccountWorkspace({ personas }: { personas: AccountCv[] }) {
  const router = useRouter();
  const [headline, setHeadline] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (window.location.hash !== "#create-job-profile") return;
    requestAnimationFrame(() => document.getElementById("create-job-profile")?.scrollIntoView({ block: "start" }));
  }, []);

  const createCv = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(undefined);
    try {
      const response = await fetch(withBase("/api/account/personas/"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ headline }),
      });
      const result = (await response.json()) as { slug?: string; error?: string };
      if (!response.ok || !result.slug) {
        setError(result.error || "Couldn't create your CV. Try again.");
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
  const roleCount = personas.filter((persona) => persona.role.trim().toLowerCase() === headline.trim().toLowerCase()).length;

  return (
    <div className="space-y-8">
      <section aria-label="Your CV summary" className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Your CVs", value: personas.length },
          { label: "Published CVs", value: publishedCount },
          { label: "CV drafts", value: draftCount },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-2xl border border-line bg-card p-5">
            <p className="text-sm font-medium text-muted">{label}</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums">{value}</p>
          </div>
        ))}
      </section>

      {personas.length > 0 && (
        <section aria-labelledby="cvs-heading" className="space-y-3">
          <div>
            <h2 id="cvs-heading" className="text-lg font-semibold">Your CVs</h2>
            <p className="mt-1 text-sm text-muted">Open a CV’s AI, update its information, or change its design.</p>
          </div>
          <ul className="grid gap-4 lg:grid-cols-2">
            {personas.map((persona) => (
              <li id={`cv-${persona.slug}`} key={persona.slug} className="scroll-mt-24 rounded-2xl border border-line bg-card p-5">
                <div className="flex items-center gap-4">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent-soft text-sm font-bold text-accent">
                    {persona.name.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{persona.name}</span>
                    {persona.role && <span className="block truncate text-sm text-muted">{persona.role}</span>}
                    <span className="block text-sm text-muted">
                      {persona.publishedVersionId ? "Published CV" : "Private CV draft"}
                    </span>
                  </span>
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Link
                    href={`/account/ai/${persona.slug}/`}
                    className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-accent px-3.5 text-sm font-semibold text-on-accent"
                  >
                    <Bot className="size-4" aria-hidden="true" /> Ask my CV AI
                  </Link>
                  <Link
                    href={`/account/training/${persona.slug}/`}
                    className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-line-strong bg-bg px-3.5 text-sm font-semibold hover:border-accent/50"
                  >
                    <Sparkles className="size-4" aria-hidden="true" /> Train CV AI
                  </Link>
                  <Link
                    href={`/account/training/${persona.slug}/design/`}
                    className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-line-strong bg-bg px-3.5 text-sm font-semibold hover:border-accent/50"
                  >
                    <FileText className="size-4" aria-hidden="true" /> Edit CV
                  </Link>
                  {persona.publishedVersionId && (
                    <Link
                      href={`/u/${persona.slug}/`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-line-strong bg-bg px-3.5 text-sm font-semibold hover:border-accent/50"
                    >
                      Public CV <ArrowRight className="size-3.5" aria-hidden="true" />
                    </Link>
                  )}
                </div>
                {persona.publishedVersionId && <ShareLinks slug={persona.slug} pdfPath={persona.pdfPath} />}
              </li>
            ))}
          </ul>
        </section>
      )}

      <form id="create-job-profile" onSubmit={createCv} className="scroll-mt-24 rounded-2xl border border-line bg-card p-5 sm:p-7">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
            <Plus className="size-5" aria-hidden="true" />
          </span>
          <div>
              <h2 className="text-lg font-semibold">{personas.length ? "Create another CV" : "Create your CV"}</h2>
              <p className="mt-1 text-sm leading-6 text-muted">Your professional role names the CV automatically. Your account name starts the CV identity; edit your experience and train its AI before publishing.</p>
          </div>
        </div>
        <div className="mt-6 grid gap-4">
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
        {headline.trim().length >= 2 && (
          <p className="mt-3 text-sm text-muted">Your CV will be named <span className="font-semibold text-fg">{roleCvName(headline, roleCount + 1)}</span>.</p>
        )}
        {error && <p role="alert" className="mt-4 text-sm font-medium text-accent">{error}</p>}
        <button
          type="submit"
          disabled={busy || headline.trim().length < 2}
          className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-accent px-4 font-semibold text-on-accent disabled:opacity-60"
        >
          {busy ? <LoaderCircle className="size-4 animate-spin" /> : <Plus className="size-4" />}
          {busy ? "Creating CV..." : "Create CV"}
        </button>
      </form>
    </div>
  );
}
