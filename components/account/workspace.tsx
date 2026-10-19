"use client";

import { useState } from "react";
import { ArrowRight, Bot, FileText, Plus, Sparkles } from "lucide-react";
import Link from "next/link";
import { withBase } from "@/lib/utils";

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
            <span className="w-36 shrink-0 font-medium">{label === "CV PDF" ? "CV PDF / Save as PDF" : label}</span>
            <a href={withBase(path)} target="_blank" rel="noreferrer" className="min-w-0 flex-1 break-all text-accent underline underline-offset-2">{path}</a>
            <button type="button" onClick={() => void copy(label, path)} className="min-h-9 rounded-lg border border-line-strong px-3 text-xs font-semibold hover:bg-surface">
              {copied === label ? "Copied" : "Copy"}
            </button>
          </li>
        ))}
      </ul>
      {pdfPath && <p className="mt-3 text-xs leading-5 text-muted">If the ready-made PDF file is unavailable, this link opens your selected CV design so you can save it as a PDF.</p>}
      {error && <p role="alert" className="mt-2 text-xs text-accent">{error}</p>}
      {copied && <p role="status" className="sr-only">{copied} link copied.</p>}
    </section>
  );
}

export function AccountWorkspace({ personas }: { personas: AccountCv[] }) {
  return (
    <div className="space-y-6">
      <section aria-labelledby="cvs-heading" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="cvs-heading" className="text-xl font-semibold">Your CVs</h2>
            <p className="mt-1 text-sm text-muted">Choose a CV to continue editing, train its AI, or share it.</p>
          </div>
          <Link href="/account/new/" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-accent px-4 font-semibold text-on-accent">
            <Plus className="size-4" aria-hidden="true" /> Create a CV
          </Link>
        </div>
        {personas.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line-strong bg-card p-8 text-center">
            <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-accent-soft text-accent">
              <FileText className="size-6" aria-hidden="true" />
            </span>
            <h3 className="mt-4 text-lg font-semibold">Your first CV starts here</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
              Name your CV, choose a design, then edit the starter information or upload an existing CV for help filling it in.
            </p>
            <Link href="/account/new/" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-accent px-4 font-semibold text-on-accent">
              <Plus className="size-4" aria-hidden="true" /> Create your first CV
            </Link>
          </div>
        ) : (
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
        )}
      </section>
    </div>
  );
}
