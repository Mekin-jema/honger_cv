"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Check, ChevronDown, Circle, LoaderCircle, MinusCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { adminFetch } from "./api";

/** Background jobs (publish & train, checks) as the admin sees them: started, polled, shown step by step. */

export type JobStep = { id: string; label: string; state: "pending" | "running" | "done" | "failed" | "skipped"; ms?: number; detail?: string };
export type ClientJob = {
  id: string;
  kind: string;
  status: "queued" | "running" | "succeeded" | "failed";
  step: string | null;
  progress: { steps: JobStep[]; log: { t: string; level: string; msg: string }[]; warnings: string[]; result?: Record<string, unknown> };
  error: string | null;
  versionId: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
};

export type JobView = ReturnType<typeof useJob>;

const POLL_MS = 1000;

export function useJob() {
  const [job, setJob] = useState<ClientJob | null>(null);
  const [error, setError] = useState<string>();
  const [issues, setIssues] = useState<string[]>([]);
  const [note, setNote] = useState<string>();
  const [starting, setStarting] = useState(false);
  const [watchingId, setWatchingId] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const watching = useRef<string | null>(null);
  const pollRef = useRef<(id: string) => Promise<void>>(async () => {});
  const later = useCallback((id: string, ms: number) => {
    timer.current = setTimeout(() => void pollRef.current(id), ms);
  }, []);

  const poll = useCallback(async (id: string) => {
    if (watching.current !== id) return;
    // Hidden tab: check less often.
    if (document.hidden) return later(id, POLL_MS * 4);
    const res = await adminFetch<{ job: ClientJob }>(`/api/admin/jobs/${id}/`);
    if (watching.current !== id) return;
    if (res.ok) {
      setJob(res.data.job);
      if (res.data.job.status === "succeeded" || res.data.job.status === "failed") {
        watching.current = null;
        setWatchingId(null);
        return;
      }
    }
    later(id, res.ok ? POLL_MS : POLL_MS * 3);
  }, [later]);
  useEffect(() => {
    pollRef.current = poll;
  }, [poll]);

  const watch = useCallback(
    (id: string) => {
      clearTimeout(timer.current);
      watching.current = id;
      setWatchingId(id);
      void poll(id);
    },
    [poll],
  );

  useEffect(() => () => clearTimeout(timer.current), []);

  /** POSTs to `path`; a 202 { jobId } is then followed until it finishes. `immediate` turns other answers into a note. */
  const start = useCallback(
    async (path: string, body: Record<string, unknown>, immediate?: (data: Record<string, unknown>) => string | undefined) => {
      setStarting(true);
      setError(undefined);
      setIssues([]);
      setNote(undefined);
      const res = await adminFetch<{ jobId?: string } & Record<string, unknown>>(path, { body });
      setStarting(false);
      if (!res.ok) {
        setError(res.error);
        setIssues(Array.isArray(res.data.issues) ? (res.data.issues as string[]) : []);
        return;
      }
      if (res.data.jobId) {
        setJob(null);
        watch(res.data.jobId);
      } else setNote(immediate?.(res.data) ?? "Done.");
    },
    [watch],
  );

  const fail = useCallback((message: string) => setError(message), []);
  const running = starting || !!watchingId;
  return { job, error, issues, note, running, start, watch, fail };
}

const fmtMs = (ms?: number) => (ms === undefined ? "" : ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`);

function StepIcon({ state }: { state: JobStep["state"] }) {
  if (state === "done") return <Check className="size-4 text-emerald-600" aria-label="Done" />;
  if (state === "running") return <LoaderCircle className="size-4 animate-spin text-accent" aria-label="Running" />;
  if (state === "failed") return <X className="size-4 text-accent" aria-label="Failed" />;
  if (state === "skipped") return <MinusCircle className="size-4 text-faint" aria-label="Skipped" />;
  return <Circle className="size-4 text-faint" aria-label="Waiting" />;
}

/** Steps with state, time and detail; warnings; an expandable log. */
export function JobProgress({ view, title }: { view: JobView; title: string }) {
  const { job, error, issues, note } = view;
  const [showLog, setShowLog] = useState(false);
  if (!job && !error && !note) return null;
  return (
    <div className="space-y-3 rounded-xl border border-line bg-bg-soft p-4" aria-live="polite">
      {error && (
        <div role="alert" className="space-y-1">
          <p className="flex items-center gap-2 font-semibold text-accent">
            <AlertTriangle className="size-4 shrink-0" /> {error}
          </p>
          {issues.length > 0 && (
            <ul className="list-disc space-y-0.5 pl-6 text-sm text-muted">
              {issues.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      {note && <p className="text-sm font-medium">{note}</p>}
      {job && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{title}</h3>
            <span
              className={cn(
                "rounded-md px-1.5 py-0.5 text-xs font-semibold",
                job.status === "succeeded" && "bg-emerald-600/10 text-emerald-700 dark:text-emerald-400",
                job.status === "failed" && "bg-accent-soft text-accent",
                (job.status === "running" || job.status === "queued") && "bg-surface text-muted",
              )}
            >
              {job.status === "succeeded" ? "Done" : job.status === "failed" ? "Failed" : job.status === "queued" ? "Starting" : "Working"}
            </span>
          </div>
          <ol className="space-y-1.5">
            {job.progress.steps.map((s) => (
              <li key={s.id} className="flex items-start gap-2.5 text-sm">
                <span className="mt-0.5">
                  <StepIcon state={s.state} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={cn("font-medium", s.state === "pending" && "text-muted")}>{s.label}</span>
                  {s.detail && <span className={cn("block text-[13px]", s.state === "failed" ? "text-accent" : "text-muted")}>{s.detail}</span>}
                </span>
                <span className="text-xs text-faint tabular-nums">{fmtMs(s.ms)}</span>
              </li>
            ))}
          </ol>
          {job.status === "failed" && job.error && (
            <p role="alert" className="text-sm font-medium text-accent">
              {job.error}
            </p>
          )}
          {job.progress.warnings.length > 0 && (
            <div className="space-y-1">
              <p className="text-sm font-semibold">Worth a look</p>
              <ul className="list-disc space-y-0.5 pl-5 text-[13px] text-muted">
                {job.progress.warnings.slice(0, 12).map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}
          {job.progress.log.length > 0 && (
            <div>
              <button type="button" onClick={() => setShowLog((v) => !v)} aria-expanded={showLog} className="flex items-center gap-1 text-sm font-medium text-muted hover:text-fg">
                <ChevronDown className={cn("size-4 transition-transform", showLog && "rotate-180")} /> {showLog ? "Hide" : "Show"} the log
              </button>
              {showLog && (
                <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-card p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap text-muted">
                  {job.progress.log.map((l) => `${l.t.slice(11, 19)} ${l.level === "info" ? " " : l.level === "warn" ? "!" : "x"} ${l.msg}`).join("\n")}
                </pre>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
