"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { AlertTriangle, ArrowLeft, Check, CloudOff, Eye, LoaderCircle, RefreshCw, Rocket, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-provider";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { SignOutButton } from "@/components/account/sign-out-button";
import { cn, withBase } from "@/lib/utils";
import { studioFetch, type StudioMode } from "./api";
import { ChecksTab } from "./checks";
import { DocumentTab } from "./document-access";
import { HeroRulesTab } from "./hero-rules";
import { IdentityTab } from "./identity";
import { JsonTab } from "./json";
import { KnowledgeTab } from "./knowledge";
import { OverviewTab, type Overview } from "./overview";
import { QuestionsTab } from "./questions";
import { ReviewTab } from "./review";
import { useDraft, type Doc, type DraftApi } from "./use-draft";
import { useJob, type JobView } from "./job";
import { TABS, type TabId } from "./tabs";

export type { TabId };


export type TabProps = {
  slug: string;
  draft: DraftApi;
  doc: Doc;
  bangla: boolean;
  ai: boolean;
  go: (tab: TabId, focus?: string) => void;
  /** Set by go(tab, focus): what the tab should open (a section key, a question id). */
  focus?: string;
  mode: StudioMode;
  notify: (toast: StudioToast) => void;
};

export type StudioToast = { title: string; description: string; details?: string[] };

type Props = {
  slug: string;
  name: string;
  initial: { doc: Doc; rev: number; issues: string[]; changed: boolean | null; source: "draft" | "live" | "code" };
  overview: Overview;
  tab: TabId;
  previewing: { slug: string; tier: string } | null;
  mode?: StudioMode;
};

function SaveStatus({ draft }: { draft: DraftApi }) {
  const { state, error } = draft.status;
  if (state === "conflict")
    return (
      <button type="button" onClick={() => window.location.reload()} className="flex items-center gap-1.5 rounded-lg bg-accent-soft px-2.5 py-1.5 text-sm font-semibold text-accent" title={error}>
        <RefreshCw className="size-4" /> Changed in another tab: reload
      </button>
    );
  if (state === "error")
    return (
      <button type="button" onClick={() => void draft.retry()} className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-accent" title={error}>
        <CloudOff className="size-4" /> Not saved: retry
      </button>
    );
  return (
    <span className="flex items-center gap-1.5 text-sm text-muted" role="status" aria-live="polite">
      {state === "saving" ? <LoaderCircle className="size-4 animate-spin" /> : state === "dirty" ? <span className="size-2 rounded-full bg-amber-500" /> : <Check className="size-4 text-emerald-600" />}
      <span className="hidden sm:inline">{state === "saving" ? "Saving..." : state === "dirty" ? "Unsaved" : "Saved"}</span>
    </span>
  );
}

export function Studio({ slug, name, initial, overview: initialOverview, tab: initialTab, previewing, mode = "admin" }: Props) {
  const draft = useDraft(slug, initial, mode);
  const [tab, setTab] = useState<TabId>(initialTab);
  const [focus, setFocus] = useState<string>();
  const [overview, setOverview] = useState(initialOverview);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const publish = useJob(mode, slug);
  const [toast, setToast] = useState<StudioToast | null>(null);
  const reportedPublishError = useRef("");
  const doc = draft.doc;
  const bangla = (doc.site?.languages ?? ["en"]).includes("bn");
  const notify = useCallback((next: StudioToast) => setToast(next), []);
  const publishError = publish.error ?? (publish.job?.status === "failed" ? publish.job.error ?? undefined : undefined);

  useEffect(() => {
    if (!publishError) {
      reportedPublishError.current = "";
      return;
    }
    if (reportedPublishError.current === publishError) return;
    reportedPublishError.current = publishError;
    notify({
      title: "Publish & train could not finish",
      description: publishError,
      ...(publish.issues.length ? { details: publish.issues } : {}),
    });
  }, [notify, publish.issues, publishError]);

  const reloadOverview = useCallback(async () => {
    const res = await studioFetch<Overview>(mode, slug, `/api/admin/personas/${slug}/overview/`);
    if (res.ok) setOverview(res.data);
  }, [mode, slug]);

  const go = useCallback((next: TabId, target?: string) => {
    setTab(next);
    setFocus(target);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", next);
    window.history.replaceState(null, "", url);
    requestAnimationFrame(() => document.getElementById("studio-panel")?.scrollIntoView({ block: "start", behavior: "smooth" }));
  }, []);

  // A finished publish changes the live version: refresh the overview.
  const finished = publish.job?.status === "succeeded" || publish.job?.status === "failed";
  const { refreshReport } = draft;
  useEffect(() => {
    if (!finished) return;
    // Runs once per finished job; the requests' results update state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reloadOverview();
    void refreshReport();
  }, [finished, reloadOverview, refreshReport]);

  const startPublish = async (force = false) => {
    if (!(await draft.flush())) return publish.fail("Save the draft first (see the message at the top).");
    const path = mode === "customer" ? `/api/account/personas/${slug}/publish/` : `/api/admin/personas/${slug}/publish/`;
    await publish.start(path, { force }, (data) => (data.unchanged ? "The site already shows this draft: nothing to publish." : undefined));
  };

  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const n = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!n && e.key !== "Home" && e.key !== "End") return;
    e.preventDefault();
    const j = e.key === "Home" ? 0 : e.key === "End" ? TABS.length - 1 : (i + n + TABS.length) % TABS.length;
    go(TABS[j].id);
    tabRefs.current[TABS[j].id]?.focus();
  };

  const props: TabProps = { slug, draft, doc, bangla, ai: overview.ai, go, focus, mode, notify };
  const issues = draft.status.issues.length;
  const busy = publish.running;
  const publicPdfPath = mode === "customer" && doc.document?.kind === "cv" && !doc.document.gated && typeof doc.document.fileName === "string"
    ? `/u/${slug}/d/${encodeURIComponent(doc.document.fileName)}`
    : undefined;

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <header className="sticky top-0 z-20 border-b border-line bg-bg/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4 md:gap-3 md:px-6">
          <SidebarTrigger className="shrink-0" />
          <a href={withBase(mode === "customer" ? "/account/" : "/admin/personas/")} className="icon-btn shrink-0" aria-label={mode === "customer" ? "Your workspace" : "All personas"}>
            <ArrowLeft className="size-5" />
          </a>
          <div className="min-w-0 leading-tight">
            <p className="eyebrow">Persona</p>
            <h1 className="truncate text-[15px] font-semibold tracking-tight">{name}</h1>
          </div>
          <div className="ml-1 flex min-w-0 items-center">
            <SaveStatus draft={draft} />
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-1.5">
            {previewing?.slug === slug && (
              <span className="hidden items-center gap-1 rounded-md bg-accent-soft px-2 py-1 text-xs font-semibold text-accent md:flex">
                <Eye className="size-3.5" /> Previewing
              </span>
            )}
            {mode === "customer" && <SignOutButton variant="compact" />}
            <ThemeToggle className="admin-icon-btn" />
            <button
              type="button"
              onClick={() => void startPublish()}
              disabled={busy || issues > 0 || draft.status.state === "conflict"}
              title={issues ? "Fix the problems listed in the Overview first" : "Publish & train: make this draft live"}
              className="btn btn-primary px-3.5 py-2 text-sm disabled:opacity-50 pointer-coarse:min-h-11"
            >
              {busy ? <LoaderCircle className="size-4 animate-spin" /> : <Rocket className="size-4" />}
              <span className="hidden sm:inline">{busy ? "Publishing..." : "Publish & train"}</span>
              <span className="sm:hidden">Publish</span>
            </button>
          </div>
        </div>
        <div className="mx-auto max-w-6xl px-2 md:px-4">
          <div role="tablist" aria-label="Persona editor" className="no-scrollbar flex gap-1 overflow-x-auto pb-1.5">
            {TABS.map((t, i) => (
              <button
                key={t.id}
                ref={(el) => {
                  tabRefs.current[t.id] = el;
                }}
                role="tab"
                id={`tab-${t.id}`}
                aria-selected={tab === t.id}
                aria-controls="studio-panel"
                tabIndex={tab === t.id ? 0 : -1}
                onKeyDown={(e) => onTabKey(e, i)}
                onClick={() => go(t.id)}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold whitespace-nowrap text-muted transition-colors hover:text-fg pointer-coarse:min-h-11",
                  tab === t.id && "bg-surface text-fg",
                )}
              >
                {t.label}
                {t.id === "overview" && issues > 0 && (
                  <span className="grid min-w-5 place-items-center rounded-md bg-accent px-1 text-xs text-on-accent" aria-label={`${issues} problems`}>
                    {issues}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </header>

      {mode === "customer" && (
        <div className="flex items-center justify-center gap-2 border-b border-accent/15 bg-accent-soft/25 px-4 py-2 text-center text-xs leading-5 text-muted sm:text-sm">
          <Sparkles className="size-4 shrink-0 text-accent" aria-hidden="true" />
          <span>
            Pre-filled with Mekin&apos;s public demo information. Edit any fields or JSON, then <strong className="text-fg">Publish &amp; train</strong> to enable AI chat.
          </span>
        </div>
      )}

      {mode === "customer" && publish.job?.status === "succeeded" && (
        <section className="mx-auto mt-4 grid w-full max-w-6xl gap-3 rounded-2xl border border-emerald-600/25 bg-emerald-50 px-4 py-4 text-emerald-950 dark:bg-emerald-950/30 dark:text-emerald-100 sm:grid-cols-[1fr_auto] sm:items-center" aria-label="Published CV links">
          <div>
            <h2 className="font-semibold">Your CV is live and its AI has been trained.</h2>
            <p className="mt-1 text-sm">Share these links with anyone. They do not need an account; access-code protections you configured still apply.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/u/${slug}/`} target="_blank" className="rounded-lg border border-current/20 px-3 py-2 text-sm font-semibold">Portfolio</Link>
            {publicPdfPath && <a href={withBase(publicPdfPath)} className="rounded-lg border border-current/20 px-3 py-2 text-sm font-semibold">CV PDF / Save as PDF</a>}
            <Link href={`/u/${slug}/ask/`} target="_blank" className="rounded-lg border border-current/20 px-3 py-2 text-sm font-semibold">Public AI chat</Link>
            <Link href={`/account/#cv-${slug}`} className="rounded-lg bg-emerald-900 px-3 py-2 text-sm font-semibold text-white dark:bg-emerald-200 dark:text-emerald-950">Copy/share links</Link>
          </div>
          {publicPdfPath && <p className="text-xs sm:col-span-2">If a direct PDF file is unavailable, this link opens your selected CV design so you can save it as a PDF.</p>}
        </section>
      )}

      {draft.status.state === "conflict" && (
        <div role="alert" className="border-b border-accent/30 bg-accent-soft px-4 py-2.5 text-center text-sm font-medium text-accent">
          <AlertTriangle className="mr-1.5 inline size-4" />
          This draft was saved from another tab or device. Reload to continue from the latest version (changes made here since then are not saved).
        </div>
      )}

      <main id="studio-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} className="mx-auto w-full max-w-6xl scroll-mt-28 px-4 py-5 md:px-6">
        {tab === "overview" && (
          <OverviewTab {...props} overview={overview} reloadOverview={reloadOverview} publish={publish as JobView} startPublish={startPublish} source={initial.source} previewing={previewing} />
        )}
        {tab === "identity" && <IdentityTab {...props} />}
        {tab === "knowledge" && <KnowledgeTab {...props} />}
        {tab === "questions" && <QuestionsTab {...props} />}
        {tab === "hero" && <HeroRulesTab {...props} />}
        {tab === "document" && <DocumentTab {...props} />}
        {tab === "review" && <ReviewTab {...props} />}
        {tab === "checks" && <ChecksTab {...props} />}
        {tab === "json" && <JsonTab {...props} />}
      </main>
      {toast && (
        <aside
          role="alert"
          aria-live="assertive"
          className="fixed bottom-4 right-4 z-50 w-[min(28rem,calc(100vw-2rem))] rounded-2xl border border-red-300/70 bg-card p-4 text-fg shadow-2xl dark:border-red-900"
        >
          <div className="flex items-start gap-3">
            <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300">
              <AlertTriangle className="size-4" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold">{toast.title}</h2>
              <p className="mt-1 break-words text-sm leading-5 text-muted">{toast.description}</p>
              {toast.details && toast.details.length > 0 && (
                <ul className="mt-2 max-h-40 list-disc space-y-1 overflow-auto pl-5 text-xs leading-5 text-muted">
                  {toast.details.map((detail) => <li key={detail} className="break-words">{detail}</li>)}
                </ul>
              )}
            </div>
            <button type="button" onClick={() => setToast(null)} className="grid size-8 shrink-0 place-items-center rounded-lg text-muted hover:bg-surface hover:text-fg" aria-label="Dismiss error notification">
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        </aside>
      )}
    </div>
  );
}
