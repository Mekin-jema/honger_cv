"use client";

import { useState } from "react";
import { ArrowLeft, ChevronRight, Inbox, LoaderCircle, Plus, Settings, UserRound } from "lucide-react";
import { ThemeToggle } from "@/components/theme-provider";
import { cn, withBase } from "@/lib/utils";
import { adminFetch } from "./api";
import { SelectInput, TextInput } from "./controls";

type Summary = { slug: string; name: string; live: { number: number; publishedAt: string | null } | null; draftRev: number; draftUpdatedAt: string | null; createdAt: string };

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "");

const TEMPLATES = [
  { value: "marriage", label: "Marriage biodata (English + Bangla)" },
  { value: "blank", label: "Blank" },
  { value: "job", label: "A copy of the job persona" },
] as const;

/** The admin's personas, and a form to start a new one from a template. */
export function PersonaList({ personas, noDatabase }: { personas: Summary[]; noDatabase?: boolean }) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [template, setTemplate] = useState<(typeof TEMPLATES)[number]["value"]>("marriage");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const autoSlug = (n: string) =>
    n
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .replace(/^[^a-z]+/, "")
      .slice(0, 32);

  const create = async () => {
    setBusy(true);
    setError(undefined);
    const res = await adminFetch<{ slug: string }>("/api/admin/personas/", { body: { name: name.trim(), slug, template } });
    if (!res.ok) {
      setBusy(false);
      return setError(res.error);
    }
    window.location.assign(withBase(`/admin/personas/${res.data.slug}/`));
  };

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <header className="sticky top-0 z-20 border-b border-line bg-bg/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-4xl items-center gap-3 px-4 md:px-6">
          <a href={withBase("/admin/")} className="icon-btn shrink-0" aria-label="Back to the inbox">
            <ArrowLeft className="size-5" />
          </a>
          <h1 className="text-[15px] font-semibold tracking-tight">Personas</h1>
          <span className="eyebrow ml-1 rounded-md border border-line px-1.5 py-0.5">Private</span>
          <div className="ml-auto flex items-center gap-1.5">
            <a href={withBase("/admin/")} className="icon-btn" aria-label="Inbox" title="Inbox">
              <Inbox className="size-[18px]" />
            </a>
            <a href={withBase("/admin/settings/")} className="icon-btn" aria-label="Settings" title="Settings">
              <Settings className="size-[18px]" />
            </a>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl space-y-6 px-4 py-6 md:px-6">
        <p className="text-[15px] leading-relaxed text-muted">
          A persona is one face of this site: who it is about, what it knows, its questions and its document. Edit a draft, then <strong className="text-fg">Publish & train</strong> to make it live.
        </p>

        {noDatabase ? (
          <p className="card p-5 text-muted">Personas need the database (DATABASE_URL). Without it the site shows the job persona from the code.</p>
        ) : (
          <ul className="space-y-3">
            {personas.map((p) => (
              <li key={p.slug}>
                <a href={withBase(`/admin/personas/${p.slug}/`)} className="card flex items-center gap-4 p-4 transition-colors hover:bg-surface md:p-5">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface text-muted">
                    <UserRound className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{p.name}</span>
                    <span className="block text-sm text-muted">
                      {p.live ? `Version ${p.live.number} live since ${when(p.live.publishedAt)}` : "Not published yet"}
                      {p.draftUpdatedAt ? ` · draft edited ${when(p.draftUpdatedAt)}` : ""}
                    </span>
                  </span>
                  <span className="hidden font-mono text-xs text-faint sm:inline">{p.slug}</span>
                  <ChevronRight className="size-5 text-faint" aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
        )}

        {!noDatabase && (
          <form
            className="card space-y-4 p-4 md:p-5"
            onSubmit={(e) => {
              e.preventDefault();
              if (name.trim() && slug) void create();
            }}
          >
            <h2 className="text-[17px] font-semibold tracking-tight">New persona</h2>
            <div className="grid gap-4 md:grid-cols-3">
              <TextInput
                label="Name"
                placeholder="Marriage"
                value={name}
                onChange={(v) => {
                  setName(v);
                  if (!slugTouched) setSlug(autoSlug(v));
                }}
              />
              <TextInput
                label="Short address"
                hint="Lowercase letters, digits, dashes. Used in links and settings."
                value={slug}
                onChange={(v) => {
                  setSlugTouched(true);
                  setSlug(v.toLowerCase());
                }}
                mono
              />
              <SelectInput label="Start from" value={template} options={TEMPLATES.map((t) => ({ value: t.value, label: t.label }))} onChange={setTemplate} />
            </div>
            {error && (
              <p role="alert" className="text-sm font-medium text-accent">
                {error}
              </p>
            )}
            <button type="submit" className={cn("btn btn-primary px-4 py-2 text-sm disabled:opacity-50")} disabled={busy || !name.trim() || !/^[a-z][a-z0-9-]{1,31}$/.test(slug)}>
              {busy ? <LoaderCircle className="size-4 animate-spin" /> : <Plus className="size-4" />} Create
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
