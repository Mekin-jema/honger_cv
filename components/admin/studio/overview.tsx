"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Eye, EyeOff, History, LoaderCircle, Rocket, Undo2 } from "lucide-react";
import { tabForPath } from "@/lib/persona/edit";
import { cn, withBase } from "@/lib/utils";
import { adminFetch } from "./api";
import { Panel, smallBtn } from "./controls";
import { JobProgress, type ClientJob, type JobView } from "./job";
import type { TabProps } from "./studio";

export type VersionInfo = { id: string; number: number; status: "building" | "ready" | "failed"; createdAt: string; publishedAt: string | null; report: Record<string, unknown> };
export type Overview = { versions: VersionInfo[]; liveId: string | null; jobs: ClientJob[]; ai: boolean };

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "");

type Props = TabProps & {
  overview: Overview;
  reloadOverview: () => Promise<void>;
  publish: JobView;
  startPublish: (force?: boolean) => Promise<void>;
  source: "draft" | "live" | "code";
  previewing: { slug: string; tier: string } | null;
};

export function OverviewTab({ slug, draft, doc, go, overview, reloadOverview, publish, startPublish, source, previewing }: Props) {
  const { issues, changed, state } = draft.status;
  const live = overview.versions.find((v) => v.id === overview.liveId);
  const [preview, setPreview] = useState(previewing?.slug === slug ? previewing.tier : null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string>();
  const watched = useRef(false);

  // A publish started earlier (another tab, before a reload) is shown as it runs.
  useEffect(() => {
    if (watched.current) return;
    watched.current = true;
    const running = overview.jobs.find((j) => j.kind === "publish" && (j.status === "queued" || j.status === "running"));
    if (running) publish.watch(running.id);
  }, [overview.jobs, publish]);

  const startPreview = async (tier: "public" | "unlocked") => {
    setBusy(`preview-${tier}`);
    setMessage(undefined);
    await draft.flush();
    const res = await adminFetch(`/api/admin/personas/${slug}/preview/`, { body: { tier } });
    setBusy(null);
    if (!res.ok) return setMessage(res.error);
    setPreview(tier);
    window.open(withBase("/"), "_blank", "noopener");
  };
  const stopPreview = async () => {
    setBusy("stop");
    const res = await adminFetch(`/api/admin/preview/`, { method: "DELETE" });
    setBusy(null);
    if (res.ok) setPreview(null);
    else setMessage(res.error);
  };
  const rollback = async (v: VersionInfo) => {
    if (!window.confirm(`Make version ${v.number} live again? The site switches right away; your draft is not changed.`)) return;
    setBusy(v.id);
    const res = await adminFetch(`/api/admin/personas/${slug}/versions/`, { body: { versionId: v.id } });
    setBusy(null);
    setMessage(res.ok ? `Version ${v.number} is live again.` : res.error);
    await Promise.all([reloadOverview(), draft.refreshReport()]);
  };

  const draftState =
    issues.length > 0
      ? { tone: "bad", text: `${issues.length} ${issues.length === 1 ? "problem" : "problems"} to fix before publishing` }
      : changed === false
        ? { tone: "ok", text: "The site already shows this draft" }
        : { tone: "ready", text: "Ready to publish: it has changes the site doesn't show yet" };

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <section className="card space-y-1 p-4 md:p-5" aria-labelledby="ov-live">
          <p id="ov-live" className="eyebrow">
            On the site
          </p>
          {live ? (
            <>
              <p className="text-lg font-semibold">Version {live.number}</p>
              <p className="text-sm text-muted">Published {when(live.publishedAt ?? live.createdAt)}</p>
            </>
          ) : (
            <>
              <p className="text-lg font-semibold">Not published yet</p>
              <p className="text-sm text-muted">{slug === "job" ? "The site shows the content built into the code until the first publish." : "Visitors don't see this persona until it is published."}</p>
            </>
          )}
        </section>
        <section className="card space-y-1 p-4 md:p-5" aria-labelledby="ov-draft">
          <p id="ov-draft" className="eyebrow">
            This draft
          </p>
          <p className={cn("flex items-center gap-2 text-lg font-semibold", draftState.tone === "bad" && "text-accent")}>
            {draftState.tone === "bad" ? <AlertTriangle className="size-5 shrink-0" /> : <CheckCircle2 className={cn("size-5 shrink-0", draftState.tone === "ok" ? "text-faint" : "text-emerald-600")} />}
            {draftState.text}
          </p>
          <p className="text-sm text-muted">
            {state === "conflict" ? "Reload to continue." : source === "code" && draft.status.rev === 0 ? "It starts from the content in the code; your first change creates the draft." : "Changes save on their own as you type (Ctrl+S saves at once)."}
          </p>
        </section>
      </div>

      {issues.length > 0 && (
        <Panel title="Problems to fix" description="Publishing is blocked until these are fixed. Each one says where it is.">
          <ul className="divide-y divide-line">
            {issues.map((issue) => {
              const path = issue.split(":")[0];
              return (
                <li key={issue} className="flex items-start gap-3 py-2 text-sm">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
                  <span className="min-w-0 flex-1 break-words">{issue}</span>
                  <button type="button" className={smallBtn} onClick={() => go(tabForPath(path), path)}>
                    Go to it
                  </button>
                </li>
              );
            })}
          </ul>
        </Panel>
      )}

      <Panel
        title="Publish & train"
        description="Checks the draft, rebuilds what the AI knows (per visitor level), indexes it for search, asks the test and privacy questions, then makes it live. The site switches without a rebuild; if anything fails, the live version stays as it is."
        actions={
          <>
            {changed === false && issues.length === 0 && (
              <button type="button" className={smallBtn} disabled={publish.running} onClick={() => void startPublish(true)} title="Run the whole publish again (for example after changing the AI model)">
                Publish again anyway
              </button>
            )}
            <button type="button" className="btn btn-primary px-4 py-2 text-sm disabled:opacity-50" disabled={publish.running || issues.length > 0 || state === "conflict"} onClick={() => void startPublish()}>
              {publish.running ? <LoaderCircle className="size-4 animate-spin" /> : <Rocket className="size-4" />} Publish & train
            </button>
          </>
        }
      >
        {!overview.ai && <p className="text-sm text-muted">AI is off on this server (no GEMINI_API_KEY): publishing works, but the search index and the test questions are skipped.</p>}
        <JobProgress view={publish} title="Publishing" />
      </Panel>

      <Panel
        title="Preview the draft"
        description="See the unpublished draft on the real site, in this browser only (other visitors keep seeing the live version). Nothing you do in the preview is recorded. It ends after two hours."
        actions={
          <>
            <button type="button" className={smallBtn} disabled={!!busy} onClick={() => void startPreview("public")}>
              {busy === "preview-public" ? <LoaderCircle className="size-4 animate-spin" /> : <Eye className="size-4" />} As a visitor
            </button>
            {doc.access?.mode !== "open" && doc.access?.mode !== undefined && (
              <button type="button" className={smallBtn} disabled={!!busy} onClick={() => void startPreview("unlocked")}>
                {busy === "preview-unlocked" ? <LoaderCircle className="size-4 animate-spin" /> : <Eye className="size-4" />} With an access code
              </button>
            )}
            {preview && (
              <button type="button" className={smallBtn} disabled={!!busy} onClick={() => void stopPreview()}>
                <EyeOff className="size-4" /> Stop previewing
              </button>
            )}
          </>
        }
      >
        <p className="text-sm" role="status">
          {preview ? `This browser shows the draft ${preview === "unlocked" ? "as a visitor with an access code" : "as a visitor"}. Open the site in a new tab to look.` : "Not previewing: this browser sees the live site."}
        </p>
      </Panel>

      {message && (
        <p role="status" className="text-sm font-medium">
          {message}
        </p>
      )}

      <Panel title="Versions" description="Every publish is kept. The last few can be made live again at once (their search index is kept).">
        {overview.versions.length === 0 ? (
          <p className="text-sm text-muted">No versions yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {overview.versions.map((v) => (
              <li key={v.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-sm">
                <History className="size-4 text-faint" aria-hidden="true" />
                <span className="font-semibold">Version {v.number}</span>
                <span className="text-muted">{when(v.publishedAt ?? v.createdAt)}</span>
                {v.id === overview.liveId && <span className="rounded-md bg-emerald-600/10 px-1.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">Live</span>}
                {v.status !== "ready" && <span className="rounded-md bg-surface px-1.5 py-0.5 text-xs font-semibold text-muted">{v.status === "failed" ? "Didn't finish" : "Building"}</span>}
                {v.status === "ready" && v.id !== overview.liveId && (
                  <button type="button" className={cn(smallBtn, "ml-auto")} disabled={busy === v.id} onClick={() => void rollback(v)}>
                    <Undo2 className="size-4" /> Make live
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
