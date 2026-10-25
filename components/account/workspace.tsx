"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Bot, FileText, Plus, Sparkles, Trash2 } from "lucide-react";
import Link from "next/link";
import { withBase } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

type AccountCv = {
  slug: string;
  name: string;
  identityName: string;
  role: string;
  publishedVersionId: string | null;
  pdfPath?: string;
};

function DeleteCvButton({ slug, name, onDeleted }: { slug: string; name: string; onDeleted: (warning?: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [open, setOpen] = useState(false);

  const remove = async () => {
    if (busy) return;
    setBusy(true);
    setError(undefined);
    try {
      const response = await fetch(withBase(`/api/account/personas/${slug}/`), { method: "DELETE" });
      const result = await response.json() as { error?: string; warning?: string };
      if (!response.ok) throw new Error(result.error || "Couldn't delete this CV.");
      setOpen(false);
      onDeleted(result.warning);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Couldn't delete this CV. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={(nextOpen) => !busy && setOpen(nextOpen)}>
      <AlertDialogTrigger
        render={<Button variant="outline" className="min-h-10 rounded-xl border-red-500/40 px-3.5 text-red-700 hover:bg-red-500/5 dark:text-red-300" />}
      >
        <Trash2 className="size-4" aria-hidden="true" /> Delete CV
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this CV permanently?</AlertDialogTitle>
          <AlertDialogDescription>
            “{name}” and its public CV link, drafts, uploaded files, and visitor history will be removed. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            className="bg-red-700 text-white hover:bg-red-800 dark:bg-red-500 dark:text-gray-950 dark:hover:bg-red-400"
            disabled={busy}
            onClick={() => void remove()}
          >
            {busy ? "Deleting…" : "Delete CV"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function ShareLinks({ slug, pdfPath }: { slug: string; pdfPath?: string }) {
  const [copied, setCopied] = useState<string>();
  const [error, setError] = useState<string>();
  const links = [
    { label: "Portfolio", path: `/u/${slug}/` },
    { label: "Selected CV design", path: `/u/${slug}/cv/` },
    ...(pdfPath ? [{ label: "Download CV PDF", path: pdfPath }] : []),
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
            <span className="w-36 shrink-0 font-medium">{label}</span>
            <a href={withBase(path)} target="_blank" rel="noreferrer" className="min-w-0 flex-1 break-all text-accent underline underline-offset-2">{path}</a>
            <button type="button" onClick={() => void copy(label, path)} className="min-h-9 rounded-lg border border-line-strong px-3 text-xs font-semibold hover:bg-surface">
              {copied === label ? "Copied" : "Copy"}
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs leading-5 text-muted">
        The selected-design link opens your CV in the template you chose. The PDF link, when available, downloads the file directly.
      </p>
      {error && <p role="alert" className="mt-2 text-xs text-accent">{error}</p>}
      {copied && <p role="status" className="sr-only">{copied} link copied.</p>}
    </section>
  );
}

export function AccountWorkspace({ personas, cvPassActive }: { personas: AccountCv[]; cvPassActive: boolean }) {
  const router = useRouter();
  const [notice, setNotice] = useState<string>();
  const needsPass = personas.length > 0 && !cvPassActive;

  return (
    <div className="space-y-6">
      {notice && <p role="status" className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-4 text-sm">{notice}</p>}
      <section aria-labelledby="cvs-heading" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="cvs-heading" className="text-xl font-semibold">Your CVs</h2>
            <p className="mt-1 text-sm text-muted">Choose a CV to continue editing, train its AI, or share it.</p>
            {needsPass && (
              <p className="mt-2 text-sm text-muted">
                Your first CV and all its designs are free. Get a lifetime pass to create additional CVs.
              </p>
            )}
          </div>
          {needsPass ? (
            <Link href="/account/billing/?feature=additional-cv" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-accent px-4 font-semibold text-on-accent">
              <Plus className="size-4" aria-hidden="true" /> Unlock additional CVs
            </Link>
          ) : (
            <Link href="/account/new/" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-accent px-4 font-semibold text-on-accent">
              <Plus className="size-4" aria-hidden="true" /> Create a CV
            </Link>
          )}
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
                  <DeleteCvButton
                    slug={persona.slug}
                    name={persona.name}
                    onDeleted={(warning) => {
                      setNotice(warning || `"${persona.name}" was permanently deleted.`);
                      router.refresh();
                    }}
                  />
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
