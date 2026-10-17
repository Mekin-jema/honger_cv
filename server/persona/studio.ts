import "server-only";
import { after } from "next/server";
import { PersonaDocSchema, formatIssues } from "@/lib/persona/schema";
import { runChecks } from "../brain/checks";
import { aiEnabled } from "../brain/model";
import { query } from "../db";
import { createJob, listJobs, runJob, type Job } from "../jobs";
import { getPersona } from "./cache";
import { compilePersona, docHash } from "./compile";
import { jobPersonaInput } from "./import-job";
import { publishedHash, PublishError } from "./publish";
import { listPersonas, listVersions, loadDraft, type PersonaRow, type VersionRow } from "./repo";

/** What the Persona Studio loads and reports about a draft. */

export type DraftState = {
  doc: unknown;
  rev: number;
  /** Where the doc came from before the first save: the live version, or the code content (job). */
  source: "draft" | "live" | "code";
  issues: string[];
  /** The draft differs from the live version (false when they are the same, null when it can't be compared). */
  changed: boolean | null;
};

export async function personaRow(slug: string): Promise<PersonaRow | null> {
  return (await listPersonas()).find((p) => p.slug === slug) ?? null;
}

/** Problems and "differs from live" for a document. */
export async function draftReport(slug: string, doc: unknown): Promise<{ issues: string[]; changed: boolean | null }> {
  const parsed = PersonaDocSchema.safeParse(doc);
  if (!parsed.success) return { issues: formatIssues(parsed.error, 50), changed: true };
  const live = await publishedHash(slug);
  return { issues: [], changed: live === null ? true : live !== docHash(parsed.data) };
}

/** The draft, or (before the first save) the live version, or for the job persona the code content. */
export async function editableDraft(slug: string): Promise<DraftState | null> {
  const draft = await loadDraft(slug);
  let doc: unknown = draft?.doc;
  let source: DraftState["source"] = "draft";
  if (!draft) {
    const live = await getPersona(slug);
    if (live?.compiled.versionId && live.compiled.slug === slug) {
      doc = live.compiled.doc;
      source = "live";
    } else if (slug === "job") {
      doc = jobPersonaInput();
      source = "code";
    } else return null;
  }
  return { doc, rev: draft?.rev ?? 0, source, ...(await draftReport(slug, doc)) };
}

export type StudioOverview = { versions: VersionRow[]; liveId: string | null; jobs: Job[]; ai: boolean };

export async function studioOverview(slug: string): Promise<StudioOverview> {
  const [versions, row, jobs] = await Promise.all([listVersions(slug, 10), personaRow(slug), listJobs(slug, 8)]);
  return { versions, liveId: row?.publishedVersionId ?? null, jobs, ai: aiEnabled() };
}

const CHECK_STEPS = [{ id: "checks", label: "Ask the test questions" }];

/**
 * Runs the checks against the current draft (not the live version) in the background, so the admin can
 * try changes before publishing. Same probes as the publish step; nothing is changed on the site.
 */
export async function startDraftChecks(slug: string): Promise<{ job: Job; existing: boolean }> {
  const draft = await loadDraft(slug);
  const doc = draft?.doc ?? (await editableDraft(slug))?.doc;
  const parsed = PersonaDocSchema.safeParse(doc);
  if (!parsed.success) throw new PublishError("The draft has problems to fix first.", formatIssues(parsed.error, 50));
  const hash = docHash(parsed.data);
  const res = await createJob("checks", slug, `checks:${slug}:${hash}`, CHECK_STEPS);
  if (!res.existing) {
    const compiled = compilePersona(slug, parsed.data);
    after(() =>
      runJob(res.job.id, {
        checks: async (ctx) => {
          const report = await runChecks(compiled, { budget: 60, onProgress: (done, total) => ctx.progress(`${done} of ${total}`) });
          ctx.setResult({ checks: report });
          if (report.skipped) return report.skipped;
          return `${report.results.filter((r) => r.ok).length} of ${report.results.length} as expected${report.leaks ? `, ${report.leaks} privacy problem(s)` : ""}`;
        },
      }).catch((err) => console.error(`[checks] ${slug}:`, err)),
    );
  }
  return res;
}

// ---------- review inbox ----------

export type ReviewEntry = {
  id: string;
  question: string;
  route: string;
  answer: string | null;
  intentId: string | null;
  tier: string;
  lang: string | null;
  declineReason: string | null;
  confidence: string | null;
  flags: Record<string, unknown> | null;
  down: number;
  createdAt: string;
};

/**
 * Questions worth a look: declined, sent to "ask for access", failed, unsure, flagged, or voted down,
 * and not yet reviewed. Newest first.
 */
export async function reviewEntries(slug: string, limit = 200): Promise<ReviewEntry[]> {
  const { rows } = await query<{
    id: string;
    question: string;
    route: string;
    answer: string | null;
    intent_id: string | null;
    tier: string;
    lang: string | null;
    decline_reason: string | null;
    confidence: string | null;
    flags: Record<string, unknown> | null;
    down: string | number;
    created_at: Date;
  }>(
    `SELECT a.id, a.question, a.route, a.answer, a.intent_id, a.tier, a.lang, a.decline_reason, a.confidence, a.flags, a.created_at,
            (SELECT count(*) FROM votes v WHERE v.answer_id = a.id::text AND v.value = 'down') AS down
       FROM ai_answers a
      WHERE a.persona = $1 AND a.reviewed_at IS NULL
        AND (a.route IN ('decline', 'gated', 'error') OR a.confidence = 'low' OR a.decline_reason IS NOT NULL OR a.flags ? 'leak'
             OR EXISTS (SELECT 1 FROM votes v WHERE v.answer_id = a.id::text AND v.value = 'down'))
      ORDER BY a.created_at DESC
      LIMIT $2`,
    [slug, limit],
  );
  return rows.map((r) => ({
    id: r.id,
    question: r.question,
    route: r.route,
    answer: r.answer,
    intentId: r.intent_id,
    tier: r.tier,
    lang: r.lang,
    declineReason: r.decline_reason,
    confidence: r.confidence,
    flags: r.flags,
    down: Number(r.down),
    createdAt: r.created_at.toISOString(),
  }));
}

/** Marks answers reviewed; `promotedTo` notes what they became ("fact:family/father-job", "question:dowry"). */
export async function markReviewed(slug: string, ids: string[], promotedTo?: string): Promise<number> {
  const res = await query("UPDATE ai_answers SET reviewed_at = now(), promoted_to = COALESCE($3, promoted_to) WHERE persona = $1 AND id::text = ANY($2::text[]) AND reviewed_at IS NULL", [
    slug,
    ids,
    promotedTo ?? null,
  ]);
  return res.rowCount ?? 0;
}

// ---------- persona list ----------

export type PersonaSummary = {
  slug: string;
  name: string;
  live: { number: number; publishedAt: string | null } | null;
  draftRev: number;
  draftUpdatedAt: string | null;
  createdAt: string;
};

/** Every persona with its live version number and draft state (one query). */
export async function personaSummaries(): Promise<PersonaSummary[]> {
  const { rows } = await query<{
    slug: string;
    name: string;
    number: number | null;
    published_at: Date | null;
    rev: number | null;
    draft_at: Date | null;
    created_at: Date;
  }>(
    `SELECT p.slug, p.name, v.number, v.published_at, d.rev, d.updated_at AS draft_at, p.created_at
       FROM personas p
       LEFT JOIN persona_versions v ON v.id = p.published_version_id
       LEFT JOIN persona_drafts d ON d.slug = p.slug
      ORDER BY p.created_at, p.slug`,
  );
  return rows.map((r) => ({
    slug: r.slug,
    name: r.name,
    live: r.number === null ? null : { number: r.number, publishedAt: r.published_at?.toISOString() ?? null },
    draftRev: r.rev ?? 0,
    draftUpdatedAt: r.draft_at?.toISOString() ?? null,
    createdAt: r.created_at.toISOString(),
  }));
}

// ---------- access requests ----------

export type AccessRequest = {
  id: string;
  name: string;
  relation: string | null;
  phone: string | null;
  email: string | null;
  message: string;
  status: "new" | "approved" | "declined";
  codeId: string | null;
  createdAt: string;
};

export async function accessRequests(slug: string): Promise<AccessRequest[]> {
  const { rows } = await query<{ id: string; name: string; relation: string | null; phone: string | null; email: string | null; message: string; status: AccessRequest["status"]; code_id: string | null; created_at: Date }>(
    "SELECT id, name, relation, phone, email, message, status, code_id, created_at FROM contacts WHERE persona = $1 AND kind = 'access' ORDER BY (status = 'new') DESC, created_at DESC LIMIT 200",
    [slug],
  );
  return rows.map((r) => ({ id: r.id, name: r.name, relation: r.relation, phone: r.phone, email: r.email, message: r.message, status: r.status, codeId: r.code_id, createdAt: r.created_at.toISOString() }));
}

/** Declines a request, or approves it with a new code (returned once, to send to the person). */
export async function decideAccessRequest(slug: string, id: string, action: "approve" | "decline"): Promise<{ code?: string } | null> {
  const { rows } = await query<{ name: string; relation: string | null; status: string }>("SELECT name, relation, status FROM contacts WHERE id = $1 AND persona = $2 AND kind = 'access'", [id, slug]);
  const row = rows[0];
  if (!row) return null;
  if (action === "decline") {
    await query("UPDATE contacts SET status = 'declined' WHERE id = $1", [id]);
    return {};
  }
  const { createCode } = await import("../access/codes");
  const { code, entry } = await createCode(slug, { label: `${row.name}${row.relation ? ` (${row.relation})` : ""}`.slice(0, 80), maxUses: 5, days: 60 });
  await query("UPDATE contacts SET status = 'approved', code_id = $2 WHERE id = $1", [id, entry.id]);
  return { code };
}
