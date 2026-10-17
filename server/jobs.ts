import "server-only";
import { randomUUID } from "node:crypto";
import { query } from "./db";

/**
 * Background work started from the admin (publish & train, PDF, checks, imports), tracked in admin_jobs
 * so the admin can poll progress, a reload still shows the truth, and a double click returns the job
 * that is already running instead of starting a second one. Jobs run in this process (one PM2
 * instance); a restart mid-job leaves it "running", so the next start marks it failed.
 */

export type JobKind = "publish" | "pdf" | "checks" | "import";
export type JobStatus = "queued" | "running" | "succeeded" | "failed";
export type StepState = "pending" | "running" | "done" | "failed" | "skipped";
export type JobStep = { id: string; label: string; state: StepState; ms?: number; detail?: string };
export type JobLog = { t: string; level: "info" | "warn" | "error"; msg: string };
export type JobProgress = { steps: JobStep[]; log: JobLog[]; warnings: string[]; result?: Record<string, unknown> };

export type Job = {
  id: string;
  kind: JobKind;
  slug: string;
  versionId: string | null;
  status: JobStatus;
  step: string | null;
  progress: JobProgress;
  error: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
};

type JobDb = {
  id: string;
  kind: JobKind;
  slug: string;
  version_id: string | null;
  status: JobStatus;
  step: string | null;
  progress: JobProgress;
  error: string | null;
  created_at: Date;
  started_at: Date | null;
  finished_at: Date | null;
};

const iso = (d: Date | null) => (d ? d.toISOString() : null);
const toJob = (r: JobDb): Job => ({
  id: r.id,
  kind: r.kind,
  slug: r.slug,
  versionId: r.version_id,
  status: r.status,
  step: r.step,
  progress: { ...r.progress, steps: r.progress?.steps ?? [], log: r.progress?.log ?? [], warnings: r.progress?.warnings ?? [] },
  error: r.error,
  createdAt: iso(r.created_at)!,
  startedAt: iso(r.started_at),
  finishedAt: iso(r.finished_at),
});

/** Creates a queued job, or returns the live one with the same key (existing: true). */
export async function createJob(kind: JobKind, slug: string, key: string, steps: { id: string; label: string }[]): Promise<{ job: Job; existing: boolean }> {
  const progress: JobProgress = { steps: steps.map((s) => ({ ...s, state: "pending" })), log: [], warnings: [] };
  const { rows } = await query<JobDb>(
    `INSERT INTO admin_jobs (id, kind, slug, idempotency_key, status, progress) VALUES ($1, $2, $3, $4, 'queued', $5)
     ON CONFLICT (idempotency_key) WHERE status IN ('queued', 'running') DO NOTHING RETURNING *`,
    [randomUUID(), kind, slug, key, JSON.stringify(progress)],
  );
  if (rows[0]) return { job: toJob(rows[0]), existing: false };
  const live = await query<JobDb>("SELECT * FROM admin_jobs WHERE idempotency_key = $1 AND status IN ('queued', 'running') ORDER BY created_at DESC LIMIT 1", [key]);
  if (live.rows[0]) return { job: toJob(live.rows[0]), existing: true };
  // It finished between the two statements: start a new one.
  return createJob(kind, slug, `${key}:${Date.now()}`, steps);
}

export async function getJob(id: string): Promise<Job | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { rows } = await query<JobDb>("SELECT * FROM admin_jobs WHERE id = $1", [id]);
  return rows[0] ? toJob(rows[0]) : null;
}

export async function listJobs(slug: string, limit = 10): Promise<Job[]> {
  const { rows } = await query<JobDb>("SELECT * FROM admin_jobs WHERE slug = $1 ORDER BY created_at DESC LIMIT $2", [slug, limit]);
  return rows.map(toJob);
}

/** Jobs left "running" by a restart are failed at the next start (so the admin never waits forever). */
export async function sweepInterruptedJobs(): Promise<void> {
  await query(
    `UPDATE admin_jobs SET status = 'failed', error = 'Interrupted: the server restarted while this was running. Start it again.', finished_at = now()
     WHERE status IN ('queued', 'running') AND COALESCE(heartbeat_at, created_at) < now() - interval '2 minutes'`,
  );
}

/**
 * Runs a job's steps in order, recording each one (state, duration, detail) as it goes. A step returns
 * an optional detail line; `ctx.warn()` adds a warning; throwing fails the step and the job. Steps not
 * listed in `fns` are marked skipped.
 */
export async function runJob(
  jobId: string,
  fns: Record<string, (ctx: JobContext) => Promise<string | void>>,
): Promise<{ ok: boolean; result?: Record<string, unknown>; error?: string }> {
  const job = await getJob(jobId);
  if (!job) return { ok: false, error: "Job not found" };
  const progress = job.progress;
  const save = (patch: { status?: JobStatus; step?: string | null; error?: string | null; versionId?: string | null; finished?: boolean; started?: boolean }) =>
    query(
      `UPDATE admin_jobs SET progress = $2, status = COALESCE($3, status), step = $4, error = COALESCE($5, error),
         version_id = COALESCE($6, version_id), heartbeat_at = now(),
         started_at = CASE WHEN $7 THEN now() ELSE started_at END,
         finished_at = CASE WHEN $8 THEN now() ELSE finished_at END
       WHERE id = $1`,
      [jobId, JSON.stringify(progress), patch.status ?? null, patch.step ?? null, patch.error ?? null, patch.versionId ?? null, !!patch.started, !!patch.finished],
    ).catch((err) => console.error(`[jobs] Could not record progress of ${jobId}:`, err instanceof Error ? err.message : err));

  const log = (level: JobLog["level"], msg: string) => {
    progress.log.push({ t: new Date().toISOString(), level, msg: msg.slice(0, 500) });
    if (progress.log.length > 200) progress.log.splice(0, progress.log.length - 200);
  };
  let versionId: string | null = null;
  const ctx: JobContext = {
    jobId,
    slug: job.slug,
    warn: (msg) => {
      progress.warnings.push(msg.slice(0, 300));
      log("warn", msg);
    },
    log: (msg) => log("info", msg),
    setVersion: (id) => {
      versionId = id;
    },
    setResult: (result) => {
      progress.result = { ...progress.result, ...result };
    },
    progress: async (detail) => {
      const current = progress.steps.find((s) => s.state === "running");
      if (current) current.detail = detail;
      await save({ step: current?.id ?? null, versionId });
    },
  };

  await save({ status: "running", started: true });
  for (const step of progress.steps) {
    const fn = fns[step.id];
    if (!fn) {
      step.state = "skipped";
      continue;
    }
    step.state = "running";
    await save({ step: step.id, versionId });
    const started = Date.now();
    try {
      const detail = await fn(ctx);
      step.state = "done";
      step.ms = Date.now() - started;
      if (detail) step.detail = detail;
      log("info", `${step.label}: ${detail || "done"}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      step.state = "failed";
      step.ms = Date.now() - started;
      step.detail = message.slice(0, 500);
      log("error", `${step.label}: ${message}`);
      await save({ status: "failed", step: step.id, error: message.slice(0, 2000), versionId, finished: true });
      return { ok: false, error: message };
    }
  }
  await save({ status: "succeeded", step: null, versionId, finished: true });
  return { ok: true, result: progress.result };
}

export type JobContext = {
  jobId: string;
  slug: string;
  warn: (msg: string) => void;
  log: (msg: string) => void;
  setVersion: (id: string) => void;
  setResult: (result: Record<string, unknown>) => void;
  /** Saves a progress note for the running step ("12 of 40 embedded"). */
  progress: (detail: string) => Promise<void>;
};
